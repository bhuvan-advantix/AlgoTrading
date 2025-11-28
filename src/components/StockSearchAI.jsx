import React, { useState } from 'react';
import { ZapIcon } from 'lucide-react';
import { MARKET_API_BASE } from '../config';

const Card = ({ title, children, className = '', titleIcon: TitleIcon }) => (
  <div className={`bg-gray-800 rounded-xl p-5 shadow-lg border border-gray-700 ${className}`}>
    {title && (
      <div className="flex items-center mb-4 pb-2 border-b border-gray-700">
        {TitleIcon && <TitleIcon className="w-5 h-5 mr-2 text-teal-400" />}
        <h2 className="text-lg font-semibold text-gray-100">{title}</h2>
      </div>
    )}
    {children}
  </div>
);

const Button = ({ children, onClick, disabled, className = '', variant = 'primary', type = 'button' }) => {
  let baseStyles = 'flex items-center justify-center px-4 py-2 font-medium rounded-lg transition-all duration-200 shadow-md transform active:scale-[0.98]';
  let variantStyles = '';

  switch (variant) {
    case 'primary':
      variantStyles = 'bg-gradient-to-r from-purple-600 to-teal-500 hover:from-purple-700 hover:to-teal-600 text-white';
      break;
    case 'secondary':
      variantStyles = 'bg-gray-700 text-gray-100 hover:bg-gray-600 border border-gray-600';
      break;
    default:
      variantStyles = 'bg-transparent text-teal-400 border border-teal-400 hover:bg-teal-900/30';
  }

  if (disabled) {
    variantStyles = 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-70';
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles} ${className}`}
    >
      {children}
    </button>
  );
};

export default function StockSearchAI() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'json'

  // Backend proxy endpoints (backend must be running on port 5000)
  // Backend proxy endpoints
  const LOCAL_URL = `${MARKET_API_BASE}/ai/local`;
  const GLOBAL_URL = `${MARKET_API_BASE}/ai/global`;

  async function fetchAnalysis(url, symbol) {
    // The proxy endpoints expect a POST request with the body that N8N expects
    // N8N likely expects { symbol: "..." } or similar in the body
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, query: symbol }) // Sending both to be safe
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Server returned ${res.status}: ${res.statusText} ${text ? `- ${text}` : ''}`);
    }

    const text = await res.text();
    if (!text) return {}; // Handle empty response

    try {
      const json = JSON.parse(text);
      // If backend returned a structured `content` object, normalize it for the frontend
      if (json && json.content) {
        return json;
      }
      return json;
    } catch (e) {
      console.warn('Response was not JSON:', text.slice(0, 100));
      throw new Error('Received invalid JSON from server');
    }
  }

  async function handleSearch(type) {
    if (!query.trim()) {
      setError('Please enter a stock symbol (e.g., TCS)');
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const url = type === 'local' ? LOCAL_URL : GLOBAL_URL;
      const json = await fetchAnalysis(url, query);

      // Handle array response from n8n (it often returns an array of items)
      let root = Array.isArray(json) ? json[0] : json;
      if (!root) root = {};

      // Try to normalize content so UI can render it as a nice table when possible
      let content = root.content || root.output || root.body || root.data || root;

      // If content is a string that contains JSON (code fence or raw), try to parse it
      if (typeof content === 'string') {
        const s = content.replace(/```json\s*/i, '').replace(/```/g, '').trim();
        try {
          const parsed = JSON.parse(s);
          if (parsed && typeof parsed === 'object') {
            content = parsed;
          }
        } catch (e) {
          // leave as string
        }
      }

      // If we found a structured object, assign it to root.content so the UI uses the table view
      if (content && typeof content === 'object' && !Array.isArray(content)) {
        // If the parsed content has an 'output' field that is ALSO a string (double nested), try one more time
        if (content.output && typeof content.output === 'string') {
          const s2 = content.output.replace(/```json\s*/i, '').replace(/```/g, '').trim();
          try {
            const parsed2 = JSON.parse(s2);
            if (parsed2 && typeof parsed2 === 'object') {
              content = parsed2;
            }
          } catch (e) { }
        }
        root.content = content;
      }

      setData(root);
    } catch (err) {
      console.error('Search error:', err);
      setError(`${err.message}. Make sure backend (port 5000) and n8n (port 5678) are running.`);
    } finally {
      setLoading(false);
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSearch('local');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 bg-gray-900/50 p-4 rounded-2xl">
        <input
          className="flex-1 bg-gray-900 text-white p-3 rounded-xl outline-none border border-gray-700 focus:border-teal-500 transition"
          placeholder="Enter stock symbol (e.g., TCS, INFY, RELIANCE)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <div className="flex gap-2">
          <Button onClick={() => handleSearch('local')} disabled={loading} className="px-5 py-3 text-sm">
            {loading ? 'Analyzing...' : 'Local AI'}
          </Button>
          <Button onClick={() => handleSearch('global')} disabled={loading} variant="secondary" className="px-5 py-3 text-sm">
            {loading ? 'Analyzing...' : 'Global AI'}
          </Button>
        </div>
      </div>

      {loading && <div className="text-center text-teal-400 text-sm animate-pulse font-medium">Fetching institutional-grade analysis...</div>}

      {error && <div className="bg-red-900/20 border border-red-500/50 text-red-400 text-sm p-3 rounded-lg">{error}</div>}

      {data && (
        <Card title="AI Analysis Result" titleIcon={ZapIcon} className="bg-gray-900/80 backdrop-blur-xl border border-gray-700">
          <div className="space-y-4">
            {data.content ? (
              (() => {
                const content = data.content;

                const formatNumber = (n) => {
                  if (n === null || n === undefined) return '-';
                  if (typeof n === 'number') return n.toLocaleString();
                  const parsed = Number(String(n).replace(/[,\s]/g, ''));
                  return Number.isFinite(parsed) ? parsed.toLocaleString() : String(n);
                };

                const sentimentColor = (s) => {
                  if (!s) return 'bg-gray-700 text-gray-200';
                  const key = String(s).toLowerCase();
                  if (key.includes('bull') || key.includes('buy') || key.includes('positive')) return 'bg-emerald-600 text-white';
                  if (key.includes('bear') || key.includes('sell') || key.includes('negative')) return 'bg-red-600 text-white';
                  return 'bg-yellow-500 text-black';
                };

                const renderValue = (v) => {
                  if (v === null || v === undefined) return <span className="text-gray-400">-</span>;
                  if (Array.isArray(v)) {
                    return (
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-200">
                        {v.map((it, i) => <li key={i}>{typeof it === 'object' ? JSON.stringify(it) : String(it)}</li>)}
                      </ul>
                    );
                  }
                  if (typeof v === 'object') {
                    return (
                      <div className="space-y-1">
                        {Object.entries(v).map(([k, val]) => (
                          <div key={k} className="flex text-sm">
                            <span className="text-gray-400 mr-2 capitalize min-w-[80px]">{k.replace(/_/g, ' ')}:</span>
                            <span className="text-gray-200 font-medium">{String(val)}</span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return <span className="text-gray-200">{String(v)}</span>;
                };

                // A more structured, ordered table view for common fields
                const renderCustomTable = (obj) => {
                  if (!obj || typeof obj !== 'object') return null;

                  const rows = [
                    { key: 'stock', label: 'Stock' },
                    { key: 'symbol', label: 'Symbol' },
                    { key: 'price', label: 'Price' },

                    { key: 'target', label: 'Target' },
                    { key: 'stoploss', label: 'Stop Loss' },
                    { key: 'sentiment', label: 'Sentiment' },
                    { key: 'decision', label: 'Recommendation' },
                    { key: 'confidence', label: 'Confidence' },
                    { key: 'timeframe_view', label: 'Timeframe Analysis' },
                    { key: 'short_term', label: 'Short Term View' },
                    { key: 'medium_term', label: 'Medium Term View' },
                    { key: 'long_term', label: 'Long Term View' },
                    { key: 'news_summary', label: 'News Summary' },
                    { key: 'reason', label: 'Reason' },
                    { key: 'summary', label: 'Summary' }
                  ];

                  // Helper to get value with fallbacks
                  const getVal = (k) => obj[k] ?? obj[k.toLowerCase()] ?? obj[k.toUpperCase()] ?? '';

                  return (
                    <div>
                      <div className="flex items-center justify-end gap-2 mb-3">

                      </div>

                      {viewMode === 'table' ? (
                        <div className="overflow-x-auto">
                          <table className="min-w-full bg-gray-900 rounded-lg overflow-hidden">
                            <tbody>
                              {rows.map(r => {
                                const v = getVal(r.key);
                                if (v === '' || v === null || v === undefined) return null;
                                return (
                                  <tr key={r.key} className="border-b border-gray-800">
                                    <td className="w-1/3 py-3 px-4 text-xs font-semibold text-teal-300 bg-gray-800">{r.label}</td>
                                    <td className="py-3 px-4 text-sm text-gray-200">{renderValue(v)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <pre className="bg-gray-800 p-4 rounded-md text-sm text-gray-200 overflow-auto max-h-96">{JSON.stringify(obj, null, 2)}</pre>
                      )}
                    </div>
                  );
                };

                // pick common summary fields when available
                const stockName = content.stock || content.symbol || content.ticker || '';
                const price = content.price || content.currentPrice || content.last_price || content.price_usd;
                const sentiment = content.sentiment || content.overall_sentiment || content.decision || '';
                const decision = content.decision || content.recommendation || '';
                const confidence = content.confidence || content.conviction || '';

                // build a flat list of keys to show in details (exclude summary keys)
                const exclude = new Set(['stock', 'symbol', 'ticker', 'price', 'currentPrice', 'last_price', 'price_usd', 'sentiment', 'overall_sentiment', 'decision', 'recommendation', 'confidence']);

                const detailEntries = Object.entries(content).filter(([k]) => !exclude.has(k));

                return (
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="text-sm text-teal-300 font-medium">{stockName}</div>
                          <div className="text-2xl font-bold text-gray-100">{formatNumber(price)}</div>
                        </div>
                        <div className="hidden md:block">
                          {/* small summary badges */}
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${sentimentColor(sentiment)}`}>{sentiment || 'Neutral'}</span>
                            {decision && <span className="px-3 py-1 rounded-full text-xs bg-sky-600 text-white font-semibold">{decision}</span>}
                            {confidence && <span className="px-3 py-1 rounded-full text-xs bg-indigo-600 text-white font-medium">{confidence}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">

                      </div>
                    </div>

                    <div className="mt-4">
                      {renderCustomTable(content) || (
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {detailEntries.map(([key, value]) => (
                            <div key={key} className="bg-gray-800/60 p-4 rounded-lg border border-gray-700">
                              <div className="text-xs text-teal-300 font-semibold mb-2">{key.replace(/_/g, ' ')}</div>
                              <div className="text-sm">{renderValue(value)}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {data.generated_at && <div className="text-xs text-gray-500 pt-3 border-t border-gray-700 mt-4">Generated at: {new Date(data.generated_at).toLocaleString()}</div>}
                  </div>
                );
              })()
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead>
                    <tr className="text-left text-xs uppercase text-gray-400">
                      <th className="py-3 px-4 font-semibold">Field</th>
                      <th className="py-3 px-4 font-semibold">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700 text-sm">
                    {Object.entries(data).map(([key, value]) => (
                      <tr key={key} className="hover:bg-gray-800/50 transition">
                        <td className="py-3 px-4 font-semibold text-teal-400 capitalize">{key.replace(/_/g, ' ')}</td>
                        <td className="py-3 px-4 text-gray-300 whitespace-pre-wrap max-w-md">{typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      )}

      {!data && !loading && !error && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">Enter a stock symbol and click "Local AI" or "Global AI" to get institutional-grade analysis</p>
        </div>
      )}
    </div>
  );

}
