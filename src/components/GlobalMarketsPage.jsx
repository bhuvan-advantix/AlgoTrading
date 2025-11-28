import React, { useState } from 'react';
import TradingViewWidget from './TradingViewWidget';
import IndexMini from './IndexMini';
import { Card } from './Card';
import { BarChart2Icon, MaximizeIcon } from '../icons/index.jsx';
import { TWELVEDATA_API_KEY, FINNHUB_API_KEY } from '../config';

// API Keys
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyAtB2ZCy_X5R1MC8LKyrKAg3rqHlFE08Ko';

// Helper functions
async function fetchTwelveQuotes(symbols = []) {
    const results = await Promise.all(symbols.map(async (s) => {
        try {
            const res = await fetch(`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(s)}&apikey=${TWELVEDATA_API_KEY}`);
            if (!res.ok) {
                throw new Error(`API error: ${res.status}`);
            }
            const json = await res.json();
            if (json.status === 'error') {
                throw new Error(json.message || 'API returned error');
            }
            return { symbol: s, data: json };
        } catch (e) {
            console.error(`Error fetching ${s}:`, e.message);
            return { symbol: s, error: e.message };
        }
    }));
    return results;
}

async function fetchFinnhubNews(limit = 20) {
    const url = `https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_API_KEY}`;
    try {
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`API error: ${res.status}`);
        }
        const json = await res.json();
        if (!Array.isArray(json)) {
            throw new Error('Invalid API response format');
        }
        const filtered = json.filter(item => {
            const txt = (item.headline || '') + ' ' + (item.summary || '');
            return txt.toLowerCase().includes('market') ||
                txt.toLowerCase().includes('economy') ||
                txt.toLowerCase().includes('oil') ||
                txt.toLowerCase().includes('inflation') ||
                txt.toLowerCase().includes('fomc') ||
                txt.toLowerCase().includes('cpi');
        }).slice(0, limit);
        return filtered;
    } catch (e) {
        console.error('Finnhub news error:', e);
        return [];
    }
}

async function generateMarketSummary(payload) {
    try {
        // Using n8n webhook for market analysis
        const endpoint = 'https://bhuvan21.app.n8n.cloud/webhook/b765c25e-1f8c-4aac-b65a-53523229ce8e';

        console.log('Sending payload to n8n:', {
            marketData: payload.markets,
            commodities: payload.commodities,
            vix: payload.vix,
            headlines: payload.headlines?.length,
            volatility: payload.volatility_regime_local
        });

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                marketData: payload.markets,
                commodities: payload.commodities,
                vix: payload.vix,
                headlines: payload.headlines,
                volatility: payload.volatility_regime_local,
                timestamp: payload.timestamp
            })
        });

        if (!res.ok) {
            throw new Error(`API call failed: ${res.status} ${res.statusText}`);
        }

        // Get the response text first to handle empty responses
        const text = await res.text();
        if (!text || text.trim() === '') {
            throw new Error('Empty response from n8n webhook. Please check your workflow configuration.');
        }

        // Try to parse JSON
        let json;
        try {
            json = JSON.parse(text);
        } catch (parseError) {
            throw new Error(`Invalid JSON response from webhook: ${text.substring(0, 100)}...`);
        }

        console.log('Full n8n response:', json); // Detailed response logging

        // Helper: try to extract a string (markdown) from many possible shapes n8n might return
        const tryExtractString = (val) => {
            if (!val && val !== 0) return null;
            if (typeof val === 'string') return val;
            if (Array.isArray(val)) {
                for (const item of val) {
                    const s = tryExtractString(item);
                    if (s) return s;
                }
                return null;
            }
            if (typeof val === 'object') {
                // Common n8n node output shapes
                const candidates = [
                    'cleaned_text', 'cleanedText', 'output', 'body', 'text', 'markdown', 'report', 'fullReport', 'data'
                ];
                for (const k of candidates) {
                    if (k in val) {
                        const s = tryExtractString(val[k]);
                        if (s) return s;
                    }
                }
                // n8n often wraps payload under `.json`
                if ('json' in val) {
                    const s = tryExtractString(val.json);
                    if (s) return s;
                }
                // also check top-level string-y keys
                for (const key of Object.keys(val)) {
                    const s = tryExtractString(val[key]);
                    if (s) return s;
                }
                return null;
            }
            return null;
        };

        const markdown = tryExtractString(json) || '';
        if (!markdown) {
            console.warn('No markdown found in n8n response; returning empty report.');
        }
        return { fullReport: markdown };
    } catch (e) {
        console.error('n8n webhook error:', e);
        throw new Error(`AI summary generation failed: ${e.message}`);
    }
}

function computeVolatilityRegime(marketDeltas = []) {
    const absMean = marketDeltas.reduce((s, v) => s + Math.abs(v), 0) / Math.max(1, marketDeltas.length);
    if (absMean > 1.2) return 'Elevated';
    if (absMean > 0.4) return 'Normal';
    return 'Calm';
}

export const GlobalMarketsPage = () => {
    // Removed unused marketData, setMarketData, isLoading, setIsLoading
    const [summary, setSummary] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [tvSymbol, setTvSymbol] = useState('NASDAQ:TSLA');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState(null);


    const indicesList = React.useMemo(() => [
        { symbol: 'SPY', name: 'S&P 500 (ETF: SPY)' },
        { symbol: 'QQQ', name: 'NASDAQ 100 (ETF: QQQ)' },
        { symbol: 'DIA', name: 'Dow Jones (ETF: DIA)' },
        { symbol: '^FTSE', name: 'FTSE 100' },
        { symbol: 'N225', name: 'Nikkei 225' }
    ], []);

    // Async function to run the global summary
    const runGlobalSummaryNow = async () => {
        setIsGenerating(true);
        setError(null);
        try {
            // 1) Fetch indices
            const quotes = await fetchTwelveQuotes(indicesList.map(i => i.symbol));
            const marketDeltas = quotes.map(q => parseFloat(q.data?.percent_change || 0));

            // 2) Fetch commodity & vix via TwelveData
            const comm = await fetchTwelveQuotes(['BRENT', 'WTI', 'GC=F']); // Brent, WTI, Gold
            const vix = await fetchTwelveQuotes(['^VIX']);

            // 3) Fetch headlines from Finnhub
            const headlines = await fetchFinnhubNews();

            // 4) Prepare payload for n8n
            const payload = {
                timestamp: new Date().toISOString(),
                markets: quotes.map(q => ({ symbol: q.symbol, data: q.data })),
                commodities: comm.map(c => ({ symbol: c.symbol, data: c.data })),
                vix: vix.map(v => ({ symbol: v.symbol, data: v.data })),
                headlines: headlines.slice(0, 10)
            };

            // 5) Compute quick volatility regime locally too
            payload.volatility_regime_local = computeVolatilityRegime(marketDeltas);

            // 6) Call n8n webhook for analysis
            const ai = await generateMarketSummary(payload);

            // 7) Set state
            setSummary(ai);
            // if AI provided recommendations array -> set them
            if (ai?.recommendations && Array.isArray(ai.recommendations)) {
                setRecommendations(ai.recommendations);
            }
        } catch (e) {
            console.error('runGlobalSummaryNow error', e);
            setError(e.message || String(e));
        } finally {
            setIsGenerating(false);
        }
    };

    // Simple UI helper to render recommendation cards
    const RecommendationCard = ({ rec }) => {
        const getTimeframeStyle = (timeframe) => {
            if (timeframe.toLowerCase().includes('long')) {
                return {
                    color: 'text-emerald-300',
                    bg: 'bg-emerald-900/30',
                    border: 'border-emerald-700/50'
                };
            }
            if (timeframe.toLowerCase().includes('week')) {
                return {
                    color: 'text-amber-300',
                    bg: 'bg-amber-900/30',
                    border: 'border-amber-700/50'
                };
            }
            return {
                color: 'text-blue-300',
                bg: 'bg-blue-900/30',
                border: 'border-blue-700/50'
            };
        };

        const style = getTimeframeStyle(rec.holding_window);

        return (
            <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden hover:border-gray-600 transition-colors">
                <div className={`px-4 py-2 border-b ${style.bg} ${style.border}`}>
                    <div className="flex items-center justify-between">
                        <div className="text-lg font-bold text-white">{rec.symbol}</div>
                        <div className={`text-sm font-medium px-2 py-0.5 rounded ${style.color} ${style.bg} ${style.border} border`}>
                            {rec.holding_window}
                        </div>
                    </div>
                </div>
                <div className="p-4">
                    <div className="text-sm text-gray-300 leading-relaxed">{rec.reason}</div>
                </div>
            </div>
        );
    };

    const quickSymbols = ['NASDAQ:TSLA', 'NASDAQ:AAPL', 'NASDAQ:MSFT', 'NASDAQ:GOOGL', 'NYSE:BRK.B'];

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-4xl font-extrabold text-white tracking-tight">Global Markets — Pre-open Summary</h1>

            {/* <Card title="Global Indices" titleIcon={BarChart2Icon}>
        <div className="p-6 text-gray-400">(Global indices overview removed for now)</div>
      </Card> */}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Today's Global Summary" className="min-h-[220px]">
                    <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-sm text-gray-300">Auto-generated AI summary of global markets (ex-India)</div>
                            <div className="flex gap-2">
                                <button onClick={runGlobalSummaryNow} disabled={isGenerating} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-sm font-medium">{isGenerating ? 'Generating...' : 'Run Summary Now'}</button>
                                <button onClick={() => { setSummary(null); setRecommendations([]); }} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm">Clear</button>
                            </div>
                        </div>

                        <div className="overflow-auto">
                            {summary && summary.fullReport ? (
                                <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                                    <div className="prose prose-invert max-w-none">
                                        {summary.fullReport.split('\n').map((line, idx) => {
                                            // Highlight markdown headings and subheadings
                                            if (/^#+/.test(line)) {
                                                return <h3 key={idx} className="text-emerald-400 font-bold mt-6 mb-2">{line.replace(/^#+\s*/, '')}</h3>;
                                            }
                                            if (/^\*\*.*\*\*$/.test(line)) {
                                                return <h2 key={idx} className="text-emerald-300 font-bold text-xl mt-8 mb-4">{line.replace(/\*\*/g, '')}</h2>;
                                            }
                                            if (/^\|.*\|$/.test(line)) {
                                                // Table row
                                                return <div key={idx} className="font-mono text-xs text-gray-300 whitespace-pre">{line}</div>;
                                            }
                                            if (/^- /.test(line)) {
                                                // Bullet points
                                                return <li key={idx} className="ml-6 list-disc text-indigo-300">{line.replace(/^- /, '')}</li>;
                                            }
                                            return <p key={idx} className="text-gray-200 leading-relaxed whitespace-pre-line">{line}</p>;
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-gray-400">No summary yet. Press <strong>Run Summary Now</strong> to fetch live data and generate the AI summary.</div>
                            )}
                        </div>

                        {error && <div className="text-sm text-red-400 mt-3">{error}</div>}
                    </div>
                </Card>

                <Card title="AI Stock & Theme Recommendations" className="min-h-[220px]">
                    <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-sm text-gray-300">AI will recommend global stocks/ETFs and a holding suggestion (short-term / 1-3 months / long-term)</div>
                            <div>
                                <button onClick={runGlobalSummaryNow} disabled={isGenerating} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-sm font-medium">{isGenerating ? 'Generating...' : 'Run AI Recommendations'}</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {recommendations && recommendations.length > 0 ? (
                                recommendations.map((rec, idx) => <RecommendationCard key={idx} rec={rec} />)
                            ) : (
                                <div className="text-gray-400">No recommendations yet. Run the AI to generate picks based on today's global summary.</div>
                            )}
                        </div>
                    </div>
                </Card>
            </div>

            <Card title="Interactive Chart" titleIcon={MaximizeIcon} className="!p-0">
                <div className="p-4 border-b border-gray-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                        <div className="text-sm text-gray-300">Use TradingView search to load symbols. Charts, indicators, and history come from TradingView.</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {quickSymbols.map(s => (
                            <button key={s} onClick={() => setTvSymbol(s)} className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-md text-sm text-gray-200 hover:bg-gray-700">
                                {s.split(':').pop()}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="h-64 sm:h-80 md:h-96 lg:h-[720px] bg-gray-700/30 rounded-b-lg overflow-hidden">
                    <TradingViewWidget symbol={tvSymbol} interval="D" autosize={true} theme="dark" />
                </div>
            </Card>

        </div>
    );
};
