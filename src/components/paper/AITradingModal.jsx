import React, { useState, useEffect } from 'react';

export default function AITradingModal({
    show,
    onClose,
    config,
    setConfig,
    onStart,
    isActive,
    logs
}) {
    // All hooks MUST be called before any conditional returns
    const [showFilters, setShowFilters] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [aiSuggestions, setAiSuggestions] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);

    // Generate AI suggestions (mock data for now - can be replaced with real API)
    const generateAISuggestions = () => {
        setIsGenerating(true);
        setAiSuggestions([]);

        // Simulate AI analysis
        setTimeout(() => {
            const suggestions = [
                { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', price: 2456.75, change: 1.25, volume: '12.5M', marketCap: '16.5L Cr', pe: 24.5, recommendation: 'Strong Buy', aiScore: 92, sector: 'Energy' },
                { symbol: 'TCS', name: 'Tata Consultancy Services', price: 3542.30, change: 0.85, volume: '8.2M', marketCap: '12.8L Cr', pe: 28.2, recommendation: 'Buy', aiScore: 88, sector: 'IT' },
                { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', price: 1678.90, change: -0.45, volume: '15.3M', marketCap: '9.2L Cr', pe: 19.8, recommendation: 'Buy', aiScore: 85, sector: 'Banking' },
                { symbol: 'INFY', name: 'Infosys Ltd', price: 1456.20, change: 3.12, volume: '10.1M', marketCap: '6.1L Cr', pe: 26.4, recommendation: 'Strong Buy', aiScore: 90, sector: 'IT' },
                { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', price: 1089.45, change: 1.23, volume: '18.7M', marketCap: '7.6L Cr', pe: 18.2, recommendation: 'Buy', aiScore: 87, sector: 'Banking' },
                { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd', price: 1523.60, change: 2.56, volume: '9.4M', marketCap: '8.9L Cr', pe: 45.3, recommendation: 'Hold', aiScore: 78, sector: 'Telecom' },
                { symbol: 'WIPRO', name: 'Wipro Ltd', price: 456.80, change: -1.45, volume: '7.2M', marketCap: '2.5L Cr', pe: 22.1, recommendation: 'Sell', aiScore: 42, sector: 'IT' },
                { symbol: 'AXISBANK', name: 'Axis Bank Ltd', price: 1123.50, change: -1.12, volume: '11.8M', marketCap: '3.5L Cr', pe: 14.6, recommendation: 'Buy', aiScore: 84, sector: 'Banking' }
            ];

            // Apply filters
            let filtered = suggestions;
            if (config.priceMin) {
                filtered = filtered.filter(s => s.price >= Number(config.priceMin));
            }
            if (config.priceMax) {
                filtered = filtered.filter(s => s.price <= Number(config.priceMax));
            }
            if (config.marketTrend !== 'any') {
                if (config.marketTrend === 'bullish') {
                    filtered = filtered.filter(s => s.change > 0);
                } else if (config.marketTrend === 'bearish') {
                    filtered = filtered.filter(s => s.change < 0);
                }
            }

            filtered.sort((a, b) => b.aiScore - a.aiScore);
            setAiSuggestions(filtered.slice(0, 8));
            setIsGenerating(false);
        }, 1000);
    };

    // Search stocks
    const handleSearch = (query) => {
        setSearchQuery(query);

        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        // Expanded mock search results
        const allStocks = [
            { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', exchange: 'NSE' },
            { symbol: 'TCS', name: 'Tata Consultancy Services', exchange: 'NSE' },
            { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', exchange: 'NSE' },
            { symbol: 'INFY', name: 'Infosys Ltd', exchange: 'NSE' },
            { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', exchange: 'NSE' },
            { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd', exchange: 'NSE' },
            { symbol: 'WIPRO', name: 'Wipro Ltd', exchange: 'NSE' },
            { symbol: 'AXISBANK', name: 'Axis Bank Ltd', exchange: 'NSE' },
            { symbol: 'SBIN', name: 'State Bank of India', exchange: 'NSE' },
            { symbol: 'LT', name: 'Larsen & Toubro Ltd', exchange: 'NSE' },
            { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd', exchange: 'NSE' },
            { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd', exchange: 'NSE' },
            { symbol: 'ADANIENT', name: 'Adani Enterprises Ltd', exchange: 'NSE' },
            { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical Industries', exchange: 'NSE' },
            { symbol: 'TITAN', name: 'Titan Company Ltd', exchange: 'NSE' }
        ];

        const results = allStocks.filter(stock =>
            stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
            stock.name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5);

        setSearchResults(results);
    };

    const addStockFromSearch = (stock) => {
        // Ensure .NS suffix for consistency with OrderForm
        const symbolWithSuffix = stock.symbol.endsWith('.NS') ? stock.symbol : `${stock.symbol}.NS`;

        if (!config.selectedStocks.includes(symbolWithSuffix)) {
            setConfig(prev => ({
                ...prev,
                selectedStocks: [...prev.selectedStocks, symbolWithSuffix]
            }));
        }
        setSearchQuery('');
        setSearchResults([]);
    };

    const addStockFromAI = (stock) => {
        // Ensure .NS suffix for consistency with OrderForm
        const symbolWithSuffix = stock.symbol.endsWith('.NS') ? stock.symbol : `${stock.symbol}.NS`;

        if (!config.selectedStocks.includes(symbolWithSuffix)) {
            setConfig(prev => ({
                ...prev,
                selectedStocks: [...prev.selectedStocks, symbolWithSuffix]
            }));
        }
    };

    const removeStock = (stock) => {
        setConfig(prev => ({
            ...prev,
            selectedStocks: prev.selectedStocks.filter(s => s !== stock)
        }));
    };

    const updateConfig = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const toggleArrayItem = (key, item) => {
        setConfig(prev => ({
            ...prev,
            [key]: prev[key].includes(item)
                ? prev[key].filter(i => i !== item)
                : [...prev[key], item]
        }));
    };

    // Load AI suggestions when modal opens
    useEffect(() => {
        if (show && config.useAISuggestions && aiSuggestions.length === 0) {
            generateAISuggestions();
        }
    }, [show, config.useAISuggestions]);

    // Reload suggestions when filters change
    useEffect(() => {
        if (show && config.useAISuggestions && aiSuggestions.length > 0) {
            generateAISuggestions();
        }
    }, [config.priceMin, config.priceMax, config.marketTrend, show]);

    // Early return AFTER all hooks
    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-purple-500/30 shadow-2xl shadow-purple-900/50 max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">

                {/* Header */}
                <div className="bg-gradient-to-r from-purple-900/95 to-indigo-900/95 backdrop-blur-sm p-4 sm:p-6 border-b border-purple-500/30">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-600/20 rounded-lg">
                                <span className="text-2xl">⚡</span>
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-bold text-white">AI Trading Setup</h2>
                                <p className="text-xs sm:text-sm text-purple-200">Configure your automated trading strategy</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

                    {/* Stock Selection Section */}
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <span>📊</span> Stock Selection
                            </h3>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-purple-200 text-sm transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                </svg>
                                Filters
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="mb-4 relative">
                            <label className="block text-sm text-slate-300 mb-2">Search Stocks</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    placeholder="Search by symbol or company name..."
                                    className="w-full px-4 py-2.5 pl-10 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 text-sm focus:border-purple-500 focus:outline-none"
                                />
                                <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>

                            {/* Search Results Dropdown */}
                            {searchResults.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                    {searchResults.map(stock => (
                                        <button
                                            key={stock.symbol}
                                            onClick={() => addStockFromSearch(stock)}
                                            className="w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors border-b border-slate-700 last:border-b-0"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="text-white font-medium">{stock.symbol}</div>
                                                    <div className="text-xs text-slate-400">{stock.name}</div>
                                                </div>
                                                <span className="text-xs text-purple-400">{stock.exchange}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Selected Stocks */}
                        {config.selectedStocks.length > 0 && (
                            <div className="mb-4">
                                <label className="block text-sm text-slate-300 mb-2">Selected Stocks ({config.selectedStocks.length})</label>
                                <div className="flex flex-wrap gap-2">
                                    {config.selectedStocks.map(stock => (
                                        <span key={stock} className="px-3 py-1.5 bg-purple-600/20 border border-purple-500/30 rounded-full text-purple-200 text-sm flex items-center gap-2">
                                            {stock}
                                            <button onClick={() => removeStock(stock)} className="hover:text-white text-lg leading-none">×</button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* AI Suggestions Toggle */}
                        <label className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer mb-4">
                            <span className="text-sm text-slate-200">Use AI Auto-Suggestions</span>
                            <input
                                type="checkbox"
                                checked={config.useAISuggestions}
                                onChange={(e) => {
                                    updateConfig('useAISuggestions', e.target.checked);
                                    if (e.target.checked) generateAISuggestions();
                                }}
                                className="w-5 h-5 rounded bg-slate-600 border-slate-500"
                            />
                        </label>

                        {/* AI Suggested Stocks */}
                        {config.useAISuggestions && (
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="block text-sm text-slate-300">AI Recommended Stocks</label>
                                    <button
                                        onClick={generateAISuggestions}
                                        disabled={isGenerating}
                                        className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                                    >
                                        <svg className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        Refresh
                                    </button>
                                </div>

                                {isGenerating ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                                        <span className="ml-3 text-slate-400">Analyzing market data...</span>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                                        {aiSuggestions.map(stock => (
                                            <div
                                                key={stock.symbol}
                                                className="p-4 bg-slate-700/30 border border-slate-600 rounded-lg hover:border-purple-500/50 transition-all"
                                            >
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h4 className="text-white font-semibold">{stock.symbol}</h4>
                                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${stock.aiScore >= 85 ? 'bg-emerald-600/20 text-emerald-300' :
                                                                stock.aiScore >= 75 ? 'bg-blue-600/20 text-blue-300' :
                                                                    'bg-yellow-600/20 text-yellow-300'
                                                                }`}>
                                                                AI Score: {stock.aiScore}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-400 mb-2">{stock.name}</p>

                                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                                            <div>
                                                                <span className="text-slate-400">Price: </span>
                                                                <span className="text-white font-medium">₹{stock.price.toFixed(2)}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-slate-400">Change: </span>
                                                                <span className={stock.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                                                    {stock.change >= 0 ? '+' : ''}{stock.change}%
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-slate-400">Volume: </span>
                                                                <span className="text-white">{stock.volume}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-slate-400">P/E: </span>
                                                                <span className="text-white">{stock.pe}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-slate-400">Sector: </span>
                                                                <span className="text-purple-300">{stock.sector}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-slate-400">Recommendation: </span>
                                                                <span className={`font-medium ${stock.recommendation === 'Strong Buy' ? 'text-emerald-400' :
                                                                    stock.recommendation === 'Buy' ? 'text-blue-400' :
                                                                        'text-yellow-400'
                                                                    }`}>{stock.recommendation}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => addStockFromAI(stock)}
                                                        disabled={config.selectedStocks.includes(stock.symbol)}
                                                        className={`ml-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${config.selectedStocks.includes(stock.symbol)
                                                            ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                                                            : 'bg-purple-600 hover:bg-purple-700 text-white'
                                                            }`}
                                                    >
                                                        {config.selectedStocks.includes(stock.symbol) ? 'Added' : 'Add'}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Filters Panel - Collapsible */}
                    {showFilters && (
                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 animate-fadeIn">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <span>🔍</span> Advanced Filters
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                {/* Segment */}
                                <div>
                                    <label className="block text-sm text-slate-300 mb-2">Segment</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['NSE', 'BSE', 'F&O', 'Equity'].map(seg => (
                                            <button
                                                key={seg}
                                                onClick={() => toggleArrayItem('segment', seg)}
                                                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${config.segment.includes(seg)
                                                    ? 'bg-purple-600 text-white'
                                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                                    }`}
                                            >
                                                {seg}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Price Range */}
                                <div>
                                    <label className="block text-sm text-slate-300 mb-2">Price Range (₹)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            value={config.priceMin}
                                            onChange={(e) => updateConfig('priceMin', e.target.value)}
                                            placeholder="Min"
                                            className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
                                        />
                                        <input
                                            type="number"
                                            value={config.priceMax}
                                            onChange={(e) => updateConfig('priceMax', e.target.value)}
                                            placeholder="Max"
                                            className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Volume Filter */}
                                <div>
                                    <label className="block text-sm text-slate-300 mb-2">Volume</label>
                                    <select
                                        value={config.volumeFilter}
                                        onChange={(e) => updateConfig('volumeFilter', e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
                                    >
                                        <option value="any">Any</option>
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>

                                {/* Volatility */}
                                <div>
                                    <label className="block text-sm text-slate-300 mb-2">Volatility</label>
                                    <select
                                        value={config.volatilityFilter}
                                        onChange={(e) => updateConfig('volatilityFilter', e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>

                                {/* Market Trend */}
                                <div className="sm:col-span-2">
                                    <label className="block text-sm text-slate-300 mb-2">Market Trend</label>
                                    <div className="flex gap-2">
                                        {['Bullish', 'Bearish', 'Neutral', 'Any'].map(trend => (
                                            <button
                                                key={trend}
                                                onClick={() => updateConfig('marketTrend', trend.toLowerCase())}
                                                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${config.marketTrend === trend.toLowerCase()
                                                    ? 'bg-purple-600 text-white'
                                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                                    }`}
                                            >
                                                {trend}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Strategy Selection */}
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <span>🎯</span> Trading Strategy
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {[
                                { value: 'intraday', label: 'Intraday', desc: 'Same day' },
                                { value: 'swing', label: 'Swing', desc: '~3 days' },
                                { value: 'longterm', label: 'Long-term', desc: 'Weeks+' }
                            ].map(strategy => (
                                <button
                                    key={strategy.value}
                                    onClick={() => updateConfig('strategy', strategy.value)}
                                    className={`p-3 rounded-lg border-2 transition-all ${config.strategy === strategy.value
                                        ? 'bg-purple-600/20 border-purple-500 text-white'
                                        : 'bg-slate-700/30 border-slate-600 text-slate-300 hover:border-slate-500'
                                        }`}
                                >
                                    <div className="font-semibold text-sm">{strategy.label}</div>
                                    <div className="text-xs opacity-70">{strategy.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Order Execution Rules */}
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <span>⚙️</span> Execution Rules
                        </h3>
                        <div className="space-y-4">

                            {/* Execution Mode */}
                            <div>
                                <label className="block text-sm text-slate-300 mb-2">Mode</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => updateConfig('executionMode', 'paper')}
                                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${config.executionMode === 'paper'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                            }`}
                                    >
                                        📝 Paper Trade
                                    </button>
                                    <button
                                        onClick={() => updateConfig('executionMode', 'live')}
                                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${config.executionMode === 'live'
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                            }`}
                                    >
                                        🔴 Live Trade
                                    </button>
                                </div>
                            </div>

                            {/* Capital Allocation */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-300 mb-2">Total Budget (₹)</label>
                                    <input
                                        type="number"
                                        value={config.totalBudget}
                                        onChange={(e) => updateConfig('totalBudget', e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-300 mb-2">Per Trade</label>
                                    <div className="flex gap-2">
                                        <select
                                            value={config.perTradeType}
                                            onChange={(e) => updateConfig('perTradeType', e.target.value)}
                                            className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
                                        >
                                            <option value="fixed">₹</option>
                                            <option value="percentage">%</option>
                                        </select>
                                        <input
                                            type="number"
                                            value={config.perTradeType === 'fixed' ? config.perTradeAmount : config.perTradePercent}
                                            onChange={(e) => updateConfig(
                                                config.perTradeType === 'fixed' ? 'perTradeAmount' : 'perTradePercent',
                                                e.target.value
                                            )}
                                            className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Order Type & Max Trades */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-300 mb-2">Order Type</label>
                                    <select
                                        value={config.orderType}
                                        onChange={(e) => updateConfig('orderType', e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
                                    >
                                        <option value="market">Market</option>
                                        <option value="limit">Limit</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-300 mb-2">Max Trades/Day</label>
                                    <input
                                        type="number"
                                        value={config.maxTradesPerDay}
                                        onChange={(e) => updateConfig('maxTradesPerDay', e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Risk & Profit System */}
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <span>🛡️</span> Risk & Profit Management
                        </h3>
                        <div className="space-y-4">

                            {/* Stop Loss & Take Profit */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-300 mb-2">Stop Loss</label>
                                    <div className="flex gap-2">
                                        <select
                                            value={config.stopLossType}
                                            onChange={(e) => updateConfig('stopLossType', e.target.value)}
                                            className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
                                        >
                                            <option value="percentage">%</option>
                                            <option value="fixed">₹</option>
                                        </select>
                                        <input
                                            type="number"
                                            value={config.stopLoss}
                                            onChange={(e) => updateConfig('stopLoss', e.target.value)}
                                            className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-300 mb-2">Take Profit</label>
                                    <div className="flex gap-2">
                                        <select
                                            value={config.takeProfitType}
                                            onChange={(e) => updateConfig('takeProfitType', e.target.value)}
                                            className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
                                        >
                                            <option value="percentage">%</option>
                                            <option value="fixed">₹</option>
                                        </select>
                                        <input
                                            type="number"
                                            value={config.takeProfit}
                                            onChange={(e) => updateConfig('takeProfit', e.target.value)}
                                            className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Trailing Stop Loss */}
                            <label className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer">
                                <div>
                                    <span className="text-sm text-slate-200">Trailing Stop Loss</span>
                                    {config.useTrailingStop && (
                                        <input
                                            type="number"
                                            value={config.trailingStopPercent}
                                            onChange={(e) => updateConfig('trailingStopPercent', e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            placeholder="%"
                                            className="ml-2 w-16 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-xs focus:border-purple-500 focus:outline-none"
                                        />
                                    )}
                                </div>
                                <input
                                    type="checkbox"
                                    checked={config.useTrailingStop}
                                    onChange={(e) => updateConfig('useTrailingStop', e.target.checked)}
                                    className="w-5 h-5 rounded bg-slate-600 border-slate-500"
                                />
                            </label>

                            {/* Global Safety Limits */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-300 mb-2">Max Daily Loss (%)</label>
                                    <input
                                        type="number"
                                        value={config.maxDailyLoss}
                                        onChange={(e) => updateConfig('maxDailyLoss', e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-300 mb-2">Max Daily Profit (%)</label>
                                    <input
                                        type="number"
                                        value={config.maxDailyProfit}
                                        onChange={(e) => updateConfig('maxDailyProfit', e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Time Controls */}
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <span>⏰</span> Time Controls
                        </h3>
                        <div className="space-y-4">

                            {/* Entry Time Window */}
                            <div>
                                <label className="block text-sm text-slate-300 mb-2">Entry Time Window</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="time"
                                        value={config.entryTimeFrom}
                                        onChange={(e) => updateConfig('entryTimeFrom', e.target.value)}
                                        className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
                                    />
                                    <input
                                        type="time"
                                        value={config.entryTimeTo}
                                        onChange={(e) => updateConfig('entryTimeTo', e.target.value)}
                                        className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Exit Method */}
                            <div>
                                <label className="block text-sm text-slate-300 mb-2">Exit Method</label>
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        {[
                                            { value: 'time', label: 'Exit at Time' },
                                            { value: 'sltp', label: 'SL/TP Only' },
                                            { value: 'either', label: 'Whichever First' }
                                        ].map(method => (
                                            <button
                                                key={method.value}
                                                onClick={() => updateConfig('exitMethod', method.value)}
                                                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${config.exitMethod === method.value
                                                    ? 'bg-purple-600 text-white'
                                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                                    }`}
                                            >
                                                {method.label}
                                            </button>
                                        ))}
                                    </div>
                                    {(config.exitMethod === 'time' || config.exitMethod === 'either') && (
                                        <input
                                            type="time"
                                            value={config.exitTime}
                                            onChange={(e) => updateConfig('exitTime', e.target.value)}
                                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Status & Logs (when active) */}
                    {isActive && logs.length > 0 && (
                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <span>📋</span> Trading Logs
                            </h3>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {logs.map((log, idx) => (
                                    <div key={idx} className="p-2 bg-slate-700/50 rounded text-xs text-slate-300">
                                        <span className="text-slate-400">{log.time}</span> - {log.message}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="bg-slate-900/95 backdrop-blur-sm p-4 sm:p-6 border-t border-slate-700">
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 bg-slate-700 text-white font-medium rounded-lg hover:bg-slate-600 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onStart}
                            disabled={isActive}
                            className={`flex-1 py-3 font-bold rounded-lg transition-all shadow-lg ${isActive
                                ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-purple-900/50'
                                }`}
                        >
                            {isActive ? '⚡ AI Trading Active' : '🚀 Start AI Trading'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
