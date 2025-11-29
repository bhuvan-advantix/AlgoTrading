import React, { useState, useEffect, useMemo, useCallback } from 'react';

// --- Placeholder Dependencies for Canvas Environment ---
const Card = ({ title, className = 'bg-gray-800/80', titleIcon: TitleIcon, children }) => (
    <div className={`rounded-xl p-6 ${className}`}>
        {title && (
            <div className="flex items-center gap-3 mb-4 border-b border-gray-700 pb-3">
                {TitleIcon && <TitleIcon className="w-6 h-6 text-teal-400 flex-shrink-0" />}
                <h2 className="text-xl font-semibold text-white">{title}</h2>
            </div>
        )}
        {children}
    </div>
);
const ZapIcon = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
);
const BarChart2Icon = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
);
// Enhanced Search Icon (more professional and bold)
const SearchIcon = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
);
const XIcon = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18" /><path d="M6 6L18 18" /></svg>
);
// -----------------------------------------------------

// --- API Configuration ---
// --- API Configuration ---
const FINNHUB_API_KEY = "d3o7cd1r01qmj8304e7gd3o7cd1r01qmj8304e80";

// Finnhub (for news data)
const FINNHUB_NEWS_URL = () => {
    // Finnhub General News (Market News) endpoint. Limited to the latest 50 articles.
    return `https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_API_KEY}`;
};

// --- Helper for fetching (with exponential backoff) ---
const fetchWithRetry = async (url, options = {}, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                // Throw error to trigger retry logic on network or API failure
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response;
        } catch (error) {
            if (i === retries - 1) {
                console.error("Max retries reached. Fetch failed:", error);
                throw error;
            }
            const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
            console.warn(`Fetch failed, retrying in ${delay / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
};

// --- Helper for News Deduplication (CRITICAL) ---
const deduplicateNews = (newsList) => {
    const seenKeys = new Set();
    return newsList.filter(item => {
        // Use a combination of the lower-cased headline and source to uniquely identify articles
        const key = `${item.headline.toLowerCase()}|||${item.source.toLowerCase()}`;
        if (seenKeys.has(key)) {
            return false;
        }
        seenKeys.add(key);
        return true;
    });
};


const NewsAnalysisPage = () => {
    // rawNews holds the full, unfiltered list fetched from Finnhub (max ~50 articles)
    const [rawNews, setRawNews] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAILoading, setIsAILoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [aiAnalysis, setAiAnalysis] = useState({
        marketSentiment: "Analyzing...",
        keyFactors: [],
        recommendation: "Fetching latest market data...",
        confidenceScore: 0
    });

    // --- Filtered News (Client-Side Search) ---
    // This memoized value is used to render the news list based on the search query
    const filteredNews = useMemo(() => {
        if (!searchQuery) {
            return rawNews;
        }
        const lowerCaseQuery = searchQuery.toLowerCase();

        return rawNews.filter(item =>
            item.headline.toLowerCase().includes(lowerCaseQuery) ||
            item.summary.toLowerCase().includes(lowerCaseQuery)
        );
    }, [rawNews, searchQuery]);


    // --- 1. Generate AI Analysis using Backend Endpoint ---
    const generateAIAnalysis = useCallback(async (newsData) => {
        setIsAILoading(true);
        try {
            const analysisData = newsData.slice(0, 15);
            if (analysisData.length === 0) {
                setAiAnalysis(prev => ({ ...prev, marketSentiment: "No Data", recommendation: "No news available for analysis." }));
                return;
            }

            // Call the backend endpoint instead of Gemini directly
            // Using environment variable for API URL to support both local and production
            const apiUrl = import.meta.env.VITE_API_URL || 'https://algotrading-2sbm.onrender.com';
            console.log('[NewsAnalysis] Calling:', `${apiUrl}/api/ai/news-analysis`);
            const response = await fetchWithRetry(`${apiUrl}/api/ai/news-analysis`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ news: analysisData })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[NewsAnalysis] Backend error:', response.status, errorText);
                throw new Error(`Backend returned ${response.status}: ${errorText.substring(0, 200)}`);
            }

            const result = await response.json();
            console.log('[NewsAnalysis] Result:', result);

            if (result && result.marketSentiment) {
                setAiAnalysis(result);
            } else {
                throw new Error('Invalid response structure from server.');
            }

        } catch (error) {
            console.error('Error generating AI analysis:', error);
            setAiAnalysis(prev => ({
                ...prev,
                marketSentiment: "Analysis Error",
                keyFactors: ["Server Connection Failure"],
                recommendation: `Backend Error: ${error.message || 'Please check if backend is deployed and running.'}`
            }));
        } finally {
            setIsAILoading(false);
        }
    }, []);

    // --- 2. Fetch News from Finnhub (Initial Load) ---
    const fetchNewsData = useCallback(async () => {
        setIsLoading(true);

        try {
            if (!FINNHUB_API_KEY) {
                throw new Error("Finnhub API Key is required to fetch news.");
            }

            const url = FINNHUB_NEWS_URL();
            const response = await fetchWithRetry(url);
            const data = await response.json();

            if (Array.isArray(data)) {
                // Finnhub structure: item.headline, item.summary, item.datetime (UNIX), item.source, item.url
                const processedNews = data.map(item => ({
                    id: item.id, // Finnhub often provides an ID
                    headline: item.headline,
                    summary: item.summary,
                    timestamp: item.datetime, // UNIX timestamp (seconds)
                    url: item.url,
                    source: item.source || 'Unknown' // Added source for better deduplication/display
                }));

                // Deduplicate the entire fetched list
                const deduplicatedNews = deduplicateNews(processedNews);

                // Store the full, deduplicated raw news list
                setRawNews(deduplicatedNews);

                // Trigger AI Analysis generation on the top 10 articles
                if (deduplicatedNews.length > 0) {
                    generateAIAnalysis(deduplicatedNews);
                } else {
                    setAiAnalysis(prev => ({ ...prev, marketSentiment: "No Data", recommendation: "No recent market news found." }));
                }

            } else {
                throw new Error('Invalid API response from Finnhub.');
            }
        } catch (error) {
            console.error('Error fetching news:', error);
            setRawNews([{ id: 'error', headline: "API Configuration Error", summary: `Failed to fetch market news. Error: ${error.message}`, timestamp: Math.floor(Date.now() / 1000), url: "#", source: "System" }]);
            setAiAnalysis(prev => ({
                ...prev,
                marketSentiment: "Service Down",
                keyFactors: ["API Key Issue"],
                recommendation: `Cannot perform analysis without news data. Check FINNHUB_API_KEY.`
            }));
        } finally {
            setIsLoading(false);
        }
    }, [generateAIAnalysis]);

    // Handler for updating the search input value (making it a controlled component)
    const handleInputChange = (e) => {
        setSearchQuery(e.target.value);
    };

    // Handler for the Search Form submission (just prevents default, filtering is automatic)
    const handleSearch = (e) => {
        e.preventDefault();
        // Filtering happens automatically via the useMemo hook as searchQuery changes.
        // We only need to prevent the form from submitting normally.
    };

    // Handler for clearing the search
    const clearSearch = () => {
        setSearchQuery('');
    };

    // Initial load and periodic refresh
    useEffect(() => {
        fetchNewsData(); // Initial load

        // Refresh data and analysis every 5 minutes (300000 ms) 
        // to get the latest Finnhub headlines.
        const intervalId = setInterval(fetchNewsData, 300000);

        return () => clearInterval(intervalId);
    }, [fetchNewsData]);


    // --- Helper for Sentiment Styling ---
    const getSentimentClasses = (sentiment) => {
        const lowerSentiment = sentiment ? sentiment.toLowerCase() : 'neutral';

        switch (lowerSentiment) {
            case 'bullish':
            case 'positive':
                return { text: 'text-green-400', bg: 'bg-green-800/20', border: 'border-green-500' };
            case 'bearish':
            case 'negative':
                return { text: 'text-red-400', bg: 'bg-red-800/20', border: 'border-red-500' };
            case 'neutral':
            default:
                return { text: 'text-yellow-400', bg: 'bg-yellow-800/20', border: 'border-yellow-500' };
        }
    };

    const sentimentStyle = getSentimentClasses(aiAnalysis.marketSentiment);

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto min-h-screen bg-gray-900 font-sans">
            <h1 className="text-3xl font-extrabold text-white border-b border-teal-500/50 pb-3 mb-6">
                Market News & Predictive AI
            </h1>

            {/* AI Market Analysis Card */}
            <Card className="bg-gray-800/80 p-4 md:p-6 shadow-2xl rounded-xl border border-gray-700">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
                    <ZapIcon className="w-7 h-7 text-teal-400 flex-shrink-0" />
                    <h2 className="text-2xl font-bold text-white">Quantitative AI Analysis</h2>
                </div>

                {isAILoading || isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <ZapIcon className="w-10 h-10 text-teal-400 animate-pulse" />
                        <p className="mt-4 text-lg font-medium">Analyzing the latest Finnhub articles...</p>
                        <p className="text-sm">Using Advantix AGI LLM for structured financial assessment.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                        {/* 1. Sentiment Score */}
                        <div className={`p-4 rounded-lg flex flex-col justify-center items-center ${sentimentStyle.bg} border-l-4 ${sentimentStyle.border} w-full`}>
                            <span className="text-sm text-gray-400 uppercase">Market Sentiment</span>
                            <span className={`text-4xl font-extrabold mt-1 ${sentimentStyle.text}`}>
                                {aiAnalysis.marketSentiment}
                            </span>
                            <div className="mt-3 w-full">
                                <span className="text-xs text-gray-400 block mb-1">Confidence: {(aiAnalysis.confidenceScore * 100).toFixed(0)}%</span>
                                <div className="w-full bg-gray-700 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full ${sentimentStyle.border.replace('border-', 'bg-')}`}
                                        style={{ width: `${Math.min(100, aiAnalysis.confidenceScore * 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Key Factors */}
                        <div className="md:col-span-2 p-4 bg-gray-700/30 rounded-lg w-full">
                            <h3 className="text-lg font-semibold text-gray-200 mb-3">Key Drivers Summary</h3>
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                {aiAnalysis.keyFactors.map((factor, index) => (
                                    <li key={index} className="flex items-start text-gray-300">
                                        <svg className="w-4 h-4 mr-2 mt-1 text-teal-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        {factor}
                                    </li>
                                ))}
                            </ul>
                            {aiAnalysis.keyFactors.length === 0 && <p className="text-gray-500 italic">No key factors identified in the current data.</p>}
                        </div>

                        {/* 3. Recommendation */}
                        <div className="md:col-span-3 mt-4 p-4 bg-gray-700/50 rounded-lg border border-teal-500/50 w-full">
                            <h3 className="text-lg font-semibold text-teal-400 mb-2">Professional Recommendation</h3>
                            <p className="text-white text-base leading-relaxed">{aiAnalysis.recommendation}</p>
                        </div>
                    </div>
                )}
            </Card>

            {/* News Feed with Search and Results */}
            <Card title="Latest Market Headlines" titleIcon={BarChart2Icon} className="bg-gray-800/80 p-6 shadow-2xl rounded-xl border border-gray-700">

                {/* Professional Search Bar (Windmill UI inspired) */}
                <form onSubmit={handleSearch} className="mb-6">
                    <div className="relative flex items-center h-12">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal-400">
                            <SearchIcon className="w-5 h-5" />
                        </div>
                        <input
                            type="text"
                            name="search"
                            value={searchQuery}
                            onChange={handleInputChange}
                            placeholder="Search headlines (filtering client-side from latest 50 articles)"
                            // Enhanced Tailwind styling for professional look
                            className="w-full p-3 pl-12 pr-12 bg-gray-700 border border-transparent rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-base h-full shadow-inner"
                        />

                        {/* Conditional Clear Button */}
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={clearSearch}
                                aria-label="Clear Search"
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-teal-400 hover:text-teal-200 transition-colors z-10 p-1 rounded-full bg-teal-900/10 hover:bg-teal-800/20 focus:outline-none focus:ring-2 focus:ring-teal-400"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </form>

                {/* News List */}
                {isLoading ? (
                    <div className="flex flex-col sm:flex-row items-center justify-center p-6 gap-3">
                        <ZapIcon className="w-8 h-8 text-teal-400 animate-spin" />
                        <p className="text-center text-gray-400">Fetching latest Finnhub news...</p>
                    </div>
                ) : (
                    <div className="space-y-4">

                        {filteredNews.length === 0 && (
                            <div className="p-6 text-center text-gray-400 bg-gray-700/50 rounded-lg">
                                No recent news articles found matching your query.
                            </div>
                        )}

                        {filteredNews.map((item) => (
                            <a
                                key={`${item.id}-${item.timestamp}`} // Use combined key for stability
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-4 bg-gray-700/30 rounded-lg transition-all duration-300 hover:bg-gray-700/50 hover:shadow-xl border-l-4 border-gray-500 hover:border-teal-500 w-full"
                            >
                                <h3 className="text-lg font-semibold text-white leading-snug">{item.headline}</h3>
                                <p className="text-gray-300 text-sm mt-1 line-clamp-2">{item.summary}</p>
                                <div className="flex justify-between items-center mt-3 text-xs text-gray-500">
                                    <span className="font-medium text-teal-400 hover:underline">{item.source}</span>
                                    <span>
                                        {new Date(item.timestamp * 1000).toLocaleDateString()} at {new Date(item.timestamp * 1000).toLocaleTimeString()}
                                    </span>
                                </div>
                            </a>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
};

export default NewsAnalysisPage;
