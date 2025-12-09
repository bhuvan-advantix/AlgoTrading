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
    const [currentStep, setCurrentStep] = useState(1);
    const [suggestedStocks, setSuggestedStocks] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [declinedStocks, setDeclinedStocks] = useState([]);
    const [stockPool, setStockPool] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [approvedStocks, setApprovedStocks] = useState([]);
    const [stockQuantities, setStockQuantities] = useState({});

    // Complete stock pool - expanded list
    const allStocksPool = [
        { symbol: 'RELIANCE.NS', name: 'Reliance Industries', price: 2456.75, change: 1.25, aiScore: 92, reason: 'Strong momentum, high volume' },
        { symbol: 'TCS.NS', name: 'Tata Consultancy Services', price: 3542.30, change: 0.85, aiScore: 88, reason: 'Stable growth, good fundamentals' },
        { symbol: 'HDFCBANK.NS', name: 'HDFC Bank', price: 1678.90, change: -0.45, aiScore: 85, reason: 'Banking sector leader' },
        { symbol: 'INFY.NS', name: 'Infosys', price: 1456.20, change: 3.12, aiScore: 90, reason: 'IT sector strength' },
        { symbol: 'ICICIBANK.NS', name: 'ICICI Bank', price: 1089.45, change: 1.23, aiScore: 87, reason: 'Good technical setup' },
        { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel', price: 1523.60, change: 2.56, aiScore: 78, reason: 'Telecom recovery' },
        { symbol: 'AXISBANK.NS', name: 'Axis Bank', price: 1123.50, change: -1.12, aiScore: 84, reason: 'Value opportunity' },
        { symbol: 'TATAMOTORS.NS', name: 'Tata Motors', price: 789.30, change: 2.34, aiScore: 86, reason: 'Auto sector momentum' },
        { symbol: 'WIPRO.NS', name: 'Wipro', price: 456.80, change: -1.45, aiScore: 75, reason: 'IT services growth' },
        { symbol: 'SBIN.NS', name: 'State Bank of India', price: 623.45, change: 1.89, aiScore: 83, reason: 'Banking sector strength' },
        { symbol: 'LT.NS', name: 'Larsen & Toubro', price: 3234.50, change: 2.12, aiScore: 89, reason: 'Infrastructure boom' },
        { symbol: 'MARUTI.NS', name: 'Maruti Suzuki', price: 9876.20, change: 0.67, aiScore: 81, reason: 'Auto sector leader' },
        { symbol: 'SUNPHARMA.NS', name: 'Sun Pharma', price: 1234.90, change: 1.45, aiScore: 80, reason: 'Pharma sector growth' },
        { symbol: 'TITAN.NS', name: 'Titan Company', price: 3456.30, change: 2.89, aiScore: 87, reason: 'Consumer goods strength' },
        { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank', price: 1789.60, change: 0.95, aiScore: 86, reason: 'Private banking growth' },
        { symbol: 'ASIANPAINT.NS', name: 'Asian Paints', price: 2987.40, change: 1.67, aiScore: 82, reason: 'Paint sector leader' },
        // Lower priced stocks for smaller budgets
        { symbol: 'ITC.NS', name: 'ITC Limited', price: 456.30, change: 0.89, aiScore: 79, reason: 'FMCG sector stability' },
        { symbol: 'POWERGRID.NS', name: 'Power Grid Corp', price: 289.50, change: 1.23, aiScore: 77, reason: 'Utility sector strength' },
        { symbol: 'NTPC.NS', name: 'NTPC Limited', price: 345.80, change: 0.67, aiScore: 76, reason: 'Power sector growth' },
        { symbol: 'COALINDIA.NS', name: 'Coal India', price: 412.90, change: -0.45, aiScore: 74, reason: 'Energy sector play' },
    ];

    // Search stocks using real API
    const handleSearch = async (query) => {
        console.log('🔍 Search triggered:', query);
        setSearchQuery(query);

        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        try {
            console.log('📡 Fetching search results for:', query);
            // Use MarketDataService for real search
            const MarketDataService = (await import('../../services/marketDataService')).default;
            const results = await MarketDataService.searchStocks(query);
            console.log('✅ Search API returned:', results);

            if (!results || results.length === 0) {
                console.log('⚠️ No results from API, using fallback');
                // Fallback to local search
                const localResults = allStocksPool.filter(stock =>
                    stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
                    stock.name.toLowerCase().includes(query.toLowerCase())
                ).slice(0, 5);
                console.log('📋 Local results:', localResults);
                setSearchResults(localResults);
                return;
            }

            // Fetch live prices for search results
            console.log('💰 Fetching prices for results...');
            const resultsWithPrices = await Promise.all(
                results.slice(0, 5).map(async (r) => {
                    try {
                        const quote = await MarketDataService.getQuote(r.symbol);
                        return {
                            symbol: r.symbol,
                            name: r.name || r.symbol,
                            price: quote?.price || 100,
                            change: quote?.changePercent || 0,
                            aiScore: 75,
                            reason: 'User selected stock'
                        };
                    } catch (error) {
                        console.log(`⚠️ Price fetch failed for ${r.symbol}, using default`);
                        return {
                            symbol: r.symbol,
                            name: r.name || r.symbol,
                            price: 100,
                            change: 0,
                            aiScore: 75,
                            reason: 'User selected stock'
                        };
                    }
                })
            );

            console.log('✅ Final search results with prices:', resultsWithPrices);
            setSearchResults(resultsWithPrices);
        } catch (error) {
            console.error('❌ Search error:', error);
            // Fallback to local search
            const results = allStocksPool.filter(stock =>
                stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
                stock.name.toLowerCase().includes(query.toLowerCase())
            ).slice(0, 5);
            console.log('📋 Fallback local results:', results);
            setSearchResults(results);
        }
    };

    // Add stock from search
    const addStockFromSearch = (stock) => {
        if (!config.selectedStocks.includes(stock.symbol)) {
            setConfig(prev => ({
                ...prev,
                selectedStocks: [...prev.selectedStocks, stock.symbol]
            }));
        }
        setSearchQuery('');
        setSearchResults([]);
    };

    // Generate stock suggestions based on budget with live prices
    const generateStockSuggestions = async () => {
        setIsGenerating(true);

        const budget = Number(config.totalBudget) || 100000;
        const perTrade = config.perTradeType === 'fixed'
            ? Number(config.perTradeAmount) || budget
            : (budget * Number(config.perTradePercent || 100)) / 100;

        try {
            // Import MarketDataService
            const MarketDataService = (await import('../../services/marketDataService')).default;

            // Fetch live prices for all stocks
            const stocksWithLivePrices = await Promise.all(
                allStocksPool.map(async (stock) => {
                    try {
                        const quote = await MarketDataService.getQuote(stock.symbol);
                        return {
                            ...stock,
                            price: quote?.price || stock.price,
                            change: quote?.changePercent || stock.change
                        };
                    } catch (error) {
                        console.log(`Using cached price for ${stock.symbol}`);
                        return stock;
                    }
                })
            );

            // Filter: affordable, not selected, not declined
            let available = stocksWithLivePrices.filter(s =>
                s.price <= perTrade &&
                !config.selectedStocks.includes(s.symbol) &&
                !declinedStocks.includes(s.symbol)
            );

            available.sort((a, b) => b.aiScore - a.aiScore);
            setStockPool(available);
            setSuggestedStocks(available.slice(0, 5));
        } catch (error) {
            console.error('Error fetching live prices:', error);
            // Fallback to cached prices
            let available = allStocksPool.filter(s =>
                s.price <= perTrade &&
                !config.selectedStocks.includes(s.symbol) &&
                !declinedStocks.includes(s.symbol)
            );
            available.sort((a, b) => b.aiScore - a.aiScore);
            setStockPool(available);
            setSuggestedStocks(available.slice(0, 5));
        }

        setIsGenerating(false);
    };

    const approveStock = (stock) => {
        if (!config.selectedStocks.includes(stock.symbol)) {
            setConfig(prev => ({
                ...prev,
                selectedStocks: [...prev.selectedStocks, stock.symbol]
            }));
        }

        // Remove from suggested list
        const remaining = suggestedStocks.filter(s => s.symbol !== stock.symbol);

        // Get next stock from pool
        const nextStock = stockPool.find(s =>
            !remaining.some(r => r.symbol === s.symbol) &&
            !config.selectedStocks.includes(s.symbol) &&
            !declinedStocks.includes(s.symbol) &&
            s.symbol !== stock.symbol
        );

        if (nextStock) {
            setSuggestedStocks([...remaining, nextStock]);
        } else {
            setSuggestedStocks(remaining);
        }
    };

    const declineStock = (stock) => {
        // Add to declined list
        setDeclinedStocks(prev => [...prev, stock.symbol]);

        // Remove from current suggestions
        const remaining = suggestedStocks.filter(s => s.symbol !== stock.symbol);

        // Find next available stock from pool
        const nextStock = stockPool.find(s =>
            !remaining.some(r => r.symbol === s.symbol) &&
            !config.selectedStocks.includes(s.symbol) &&
            !declinedStocks.includes(s.symbol) &&
            s.symbol !== stock.symbol
        );

        // Add new stock to the end
        if (nextStock) {
            setSuggestedStocks([...remaining, nextStock]);
        } else {
            setSuggestedStocks(remaining);
        }
    };

    const updateConfig = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const canProceed = () => {
        if (currentStep === 1) return config.strategy;
        if (currentStep === 2) return config.totalBudget > 0;
        if (currentStep === 3) return config.stopLoss && config.takeProfit;
        if (currentStep === 4) return config.selectedStocks.length > 0;
        return true;
    };

    useEffect(() => {
        if (currentStep === 4 && suggestedStocks.length === 0) {
            generateStockSuggestions();
        }
    }, [currentStep]);

    // Reset state when modal closes
    useEffect(() => {
        if (!show) {
            setApprovedStocks([]);
            setDeclinedStocks([]);
            setStockQuantities({});
            setSuggestedStocks([]);
            setSearchQuery('');
            setSearchResults([]);
            setCurrentStep(1);
        }
    }, [show]);

    // Remove stock from approved list
    const removeStock = (symbol) => {
        setConfig(prev => ({
            ...prev,
            selectedStocks: prev.selectedStocks.filter(s => s !== symbol),
            stockQuantities: {
                ...prev.stockQuantities,
                [symbol]: undefined
            }
        }));
        setApprovedStocks(prev => prev.filter(s => s !== symbol));
    };

    if (!show) return null;

    const steps = [
        { num: 1, title: 'Strategy', icon: '🎯' },
        { num: 2, title: 'Budget', icon: '💰' },
        { num: 3, title: 'Safety', icon: '🛡️' },
        { num: 4, title: 'Stocks', icon: '📊' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl border border-purple-500/20 shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col">

                {/* Header */}
                <div className="relative bg-gradient-to-r from-purple-600/10 via-indigo-600/10 to-purple-600/10 p-6 border-b border-purple-500/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                                AI Trading Setup
                            </h2>
                            <p className="text-sm text-slate-400 mt-1">Configure your automated trading in 4 simple steps</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/5 rounded-xl transition-all group"
                        >
                            <svg className="w-6 h-6 text-slate-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Progress Steps */}
                    <div className="flex items-center justify-between mt-8 gap-2">
                        {steps.map((step, idx) => (
                            <React.Fragment key={step.num}>
                                <div className="flex flex-col items-center flex-1">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold transition-all duration-300 ${currentStep === step.num
                                        ? 'bg-gradient-to-br from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/50 scale-110'
                                        : currentStep > step.num
                                            ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30'
                                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                                        }`}>
                                        {currentStep > step.num ? '✓' : step.icon}
                                    </div>
                                    <div className={`text-xs mt-2 font-medium transition-colors ${currentStep === step.num ? 'text-purple-400' : currentStep > step.num ? 'text-green-400' : 'text-slate-500'
                                        }`}>
                                        {step.title}
                                    </div>
                                </div>
                                {idx < steps.length - 1 && (
                                    <div className={`h-1 flex-1 rounded-full transition-all duration-300 ${currentStep > step.num ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-slate-800'
                                        }`} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8">

                    {/* Step 1: Trading Strategy */}
                    {currentStep === 1 && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-bold text-white mb-2">Choose Your Trading Style</h3>
                                <p className="text-slate-400">How long do you want to hold stocks?</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[
                                    { value: 'intraday', label: 'Day Trading', desc: 'Buy and sell same day', time: 'Few hours', icon: '⚡', color: 'from-yellow-500 to-orange-500' },
                                    { value: 'swing', label: 'Swing Trading', desc: 'Hold for few days', time: '2-5 days', icon: '📈', color: 'from-blue-500 to-cyan-500' },
                                    { value: 'longterm', label: 'Long Term', desc: 'Hold for weeks/months', time: 'Weeks+', icon: '🎯', color: 'from-purple-500 to-pink-500' }
                                ].map(strategy => (
                                    <button
                                        key={strategy.value}
                                        onClick={() => updateConfig('strategy', strategy.value)}
                                        className={`group relative p-8 rounded-2xl border-2 transition-all duration-300 ${config.strategy === strategy.value
                                            ? 'bg-gradient-to-br from-purple-600/20 to-indigo-600/20 border-purple-500 shadow-xl shadow-purple-500/20 scale-105'
                                            : 'bg-slate-800/30 border-slate-700 hover:border-slate-600 hover:bg-slate-800/50'
                                            }`}
                                    >
                                        <div className="text-5xl mb-4">{strategy.icon}</div>
                                        <div className="text-xl font-bold text-white mb-2">{strategy.label}</div>
                                        <div className="text-sm text-slate-400 mb-3">{strategy.desc}</div>
                                        <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${strategy.color} text-white`}>
                                            ⏱️ {strategy.time}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Budget & Execution */}
                    {currentStep === 2 && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-bold text-white mb-2">Set Your Budget & Rules</h3>
                                <p className="text-slate-400">How much money do you want to invest?</p>
                            </div>

                            <div className="space-y-6">
                                {/* Trading Mode Selection */}
                                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-6 border border-slate-700">
                                    <label className="block text-sm font-semibold text-slate-300 mb-4">📝 Trading Mode</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => updateConfig('executionMode', 'paper')}
                                            className={`p-6 rounded-xl font-semibold transition-all duration-300 ${config.executionMode === 'paper'
                                                ? 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30'
                                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
                                                }`}
                                        >
                                            <div className="text-3xl mb-2">📝</div>
                                            <div className="text-lg">Paper Trading</div>
                                            <div className="text-xs opacity-70 mt-1">Practice with virtual money</div>
                                        </button>
                                        <button
                                            onClick={() => updateConfig('executionMode', 'live')}
                                            className={`p-6 rounded-xl font-semibold transition-all duration-300 ${config.executionMode === 'live'
                                                ? 'bg-gradient-to-br from-emerald-600 to-green-600 text-white shadow-lg shadow-green-500/30'
                                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
                                                }`}
                                        >
                                            <div className="text-3xl mb-2">🔴</div>
                                            <div className="text-lg">Live Trading</div>
                                            <div className="text-xs opacity-70 mt-1">Trade with real money</div>
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-6 border border-slate-700">
                                    <label className="block text-sm font-semibold text-slate-300 mb-4">💰 Total Budget</label>
                                    <input
                                        type="number"
                                        value={config.totalBudget}
                                        onChange={(e) => updateConfig('totalBudget', e.target.value)}
                                        placeholder="Enter amount in ₹"
                                        className="w-full px-6 py-4 bg-slate-900/50 border border-slate-600 rounded-xl text-white text-xl font-semibold focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all"
                                    />
                                    <p className="text-xs text-slate-500 mt-3">💡 Example: ₹100000 (1 Lakh)</p>
                                </div>

                                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-6 border border-slate-700">
                                    <label className="block text-sm font-semibold text-slate-300 mb-4">📊 Money Per Stock</label>
                                    <div className="flex gap-4">
                                        <select
                                            value={config.perTradeType}
                                            onChange={(e) => updateConfig('perTradeType', e.target.value)}
                                            className="px-4 py-4 bg-slate-900/50 border border-slate-600 rounded-xl text-white font-medium focus:border-purple-500 focus:outline-none transition-all"
                                        >
                                            <option value="fixed">Fixed Amount (₹)</option>
                                            <option value="percentage">Percentage (%)</option>
                                        </select>
                                        <input
                                            type="number"
                                            value={config.perTradeType === 'fixed' ? config.perTradeAmount : config.perTradePercent}
                                            onChange={(e) => updateConfig(
                                                config.perTradeType === 'fixed' ? 'perTradeAmount' : 'perTradePercent',
                                                e.target.value
                                            )}
                                            placeholder={config.perTradeType === 'fixed' ? 'Amount' : 'Percentage'}
                                            className="flex-1 px-6 py-4 bg-slate-900/50 border border-slate-600 rounded-xl text-white font-semibold focus:border-purple-500 focus:outline-none transition-all"
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-3">
                                        💡 {config.perTradeType === 'fixed'
                                            ? 'How much to invest in each stock'
                                            : 'What % of total budget per stock'}
                                    </p>
                                </div>

                                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-6 border border-slate-700">
                                    <label className="block text-sm font-semibold text-slate-300 mb-4">🔢 Max Trades Per Day</label>
                                    <input
                                        type="number"
                                        value={config.maxTradesPerDay}
                                        onChange={(e) => updateConfig('maxTradesPerDay', e.target.value)}
                                        className="w-full px-6 py-4 bg-slate-900/50 border border-slate-600 rounded-xl text-white font-semibold focus:border-purple-500 focus:outline-none transition-all"
                                    />
                                    <p className="text-xs text-slate-500 mt-3">💡 Limit number of trades per day</p>
                                </div>

                                {/* Extra Budget Features */}
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-6 border border-slate-700">
                                        <label className="block text-sm font-semibold text-slate-300 mb-4">📦 Order Type</label>
                                        <select
                                            value={config.orderType || 'market'}
                                            onChange={(e) => updateConfig('orderType', e.target.value)}
                                            className="w-full px-4 py-4 bg-slate-900/50 border border-slate-600 rounded-xl text-white font-medium focus:border-purple-500 focus:outline-none"
                                        >
                                            <option value="market">Market Order</option>
                                            <option value="limit">Limit Order</option>
                                        </select>
                                        <p className="text-xs text-slate-500 mt-3">💡 Market = Instant, Limit = At specific price</p>
                                    </div>

                                    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-6 border border-slate-700">
                                        <label className="block text-sm font-semibold text-slate-300 mb-4">⚖️ Position Sizing</label>
                                        <select
                                            value={config.positionSizing || 'equal'}
                                            onChange={(e) => updateConfig('positionSizing', e.target.value)}
                                            className="w-full px-4 py-4 bg-slate-900/50 border border-slate-600 rounded-xl text-white font-medium focus:border-purple-500 focus:outline-none"
                                        >
                                            <option value="equal">Equal Weight</option>
                                            <option value="aiScore">AI Score Based</option>
                                            <option value="volatility">Volatility Based</option>
                                        </select>
                                        <p className="text-xs text-slate-500 mt-3">💡 How to distribute money across stocks</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Risk & Profit */}
                    {currentStep === 3 && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-bold text-white mb-2">Protect Your Money</h3>
                                <p className="text-slate-400">Set limits to control losses and lock profits</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-gradient-to-br from-red-900/20 to-red-800/10 rounded-2xl p-6 border border-red-700/30">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-12 h-12 rounded-xl bg-red-600/20 flex items-center justify-center text-2xl">
                                            🛑
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-lg">Stop Loss</h4>
                                            <p className="text-xs text-red-300">Auto-sell if losing money</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <select
                                            value={config.stopLossType}
                                            onChange={(e) => updateConfig('stopLossType', e.target.value)}
                                            className="px-4 py-3 bg-slate-900/50 border border-red-600/30 rounded-xl text-white text-sm focus:border-red-500 focus:outline-none"
                                        >
                                            <option value="percentage">%</option>
                                            <option value="fixed">₹</option>
                                        </select>
                                        <input
                                            type="number"
                                            value={config.stopLoss}
                                            onChange={(e) => updateConfig('stopLoss', e.target.value)}
                                            placeholder="e.g., 2"
                                            className="flex-1 px-4 py-3 bg-slate-900/50 border border-red-600/30 rounded-xl text-white font-semibold focus:border-red-500 focus:outline-none"
                                        />
                                    </div>
                                    <p className="text-xs text-red-400 mt-4 bg-red-900/20 p-3 rounded-lg">
                                        💡 Example: 2% means sell if stock falls 2%
                                    </p>
                                </div>

                                <div className="bg-gradient-to-br from-green-900/20 to-green-800/10 rounded-2xl p-6 border border-green-700/30">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-12 h-12 rounded-xl bg-green-600/20 flex items-center justify-center text-2xl">
                                            🎯
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-lg">Take Profit</h4>
                                            <p className="text-xs text-green-300">Auto-sell when target reached</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <select
                                            value={config.takeProfitType}
                                            onChange={(e) => updateConfig('takeProfitType', e.target.value)}
                                            className="px-4 py-3 bg-slate-900/50 border border-green-600/30 rounded-xl text-white text-sm focus:border-green-500 focus:outline-none"
                                        >
                                            <option value="percentage">%</option>
                                            <option value="fixed">₹</option>
                                        </select>
                                        <input
                                            type="number"
                                            value={config.takeProfit}
                                            onChange={(e) => updateConfig('takeProfit', e.target.value)}
                                            placeholder="e.g., 5"
                                            className="flex-1 px-4 py-3 bg-slate-900/50 border border-green-600/30 rounded-xl text-white font-semibold focus:border-green-500 focus:outline-none"
                                        />
                                    </div>
                                    <p className="text-xs text-green-400 mt-4 bg-green-900/20 p-3 rounded-lg">
                                        💡 Example: 5% means sell if stock rises 5%
                                    </p>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-6 border border-slate-700">
                                <h4 className="font-bold text-white mb-6 flex items-center gap-2">
                                    <span className="text-2xl">🚨</span>
                                    Daily Safety Limits
                                </h4>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm text-slate-300 mb-3 font-medium">Max Daily Loss (%)</label>
                                        <input
                                            type="number"
                                            value={config.maxDailyLoss}
                                            onChange={(e) => updateConfig('maxDailyLoss', e.target.value)}
                                            placeholder="e.g., 5"
                                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white font-semibold focus:border-purple-500 focus:outline-none"
                                        />
                                        <p className="text-xs text-slate-500 mt-2">Stop if you lose this much</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-300 mb-3 font-medium">Max Daily Profit (%)</label>
                                        <input
                                            type="number"
                                            value={config.maxDailyProfit}
                                            onChange={(e) => updateConfig('maxDailyProfit', e.target.value)}
                                            placeholder="e.g., 10"
                                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white font-semibold focus:border-purple-500 focus:outline-none"
                                        />
                                        <p className="text-xs text-slate-500 mt-2">Stop after reaching profit</p>
                                    </div>
                                </div>
                            </div>

                            {/* Time Controls */}
                            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-6 border border-slate-700">
                                <h4 className="font-bold text-white mb-6 flex items-center gap-2">
                                    <span className="text-2xl">⏰</span>
                                    Trading Time Controls
                                </h4>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm text-slate-300 mb-3 font-medium">Entry Time (Start)</label>
                                            <input
                                                type="time"
                                                value={config.entryTimeFrom || '09:15'}
                                                onChange={(e) => updateConfig('entryTimeFrom', e.target.value)}
                                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white font-semibold focus:border-purple-500 focus:outline-none"
                                            />
                                            <p className="text-xs text-slate-500 mt-2">When to start trading</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm text-slate-300 mb-3 font-medium">Entry Time (End)</label>
                                            <input
                                                type="time"
                                                value={config.entryTimeTo || '15:00'}
                                                onChange={(e) => updateConfig('entryTimeTo', e.target.value)}
                                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white font-semibold focus:border-purple-500 focus:outline-none"
                                            />
                                            <p className="text-xs text-slate-500 mt-2">Last time to enter trades</p>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-300 mb-3 font-medium">Exit Time (Close All Positions)</label>
                                        <input
                                            type="time"
                                            value={config.exitTime || '15:20'}
                                            onChange={(e) => updateConfig('exitTime', e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white font-semibold focus:border-purple-500 focus:outline-none"
                                        />
                                        <p className="text-xs text-slate-500 mt-2">Auto-exit all positions at this time</p>
                                    </div>
                                </div>
                            </div>

                            {/* Trailing Stop Loss */}
                            <div className="bg-gradient-to-br from-blue-900/20 to-indigo-900/20 rounded-2xl p-6 border border-blue-700/30">
                                <label className="flex items-center justify-between cursor-pointer">
                                    <div>
                                        <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                                            <span className="text-2xl">📈</span>
                                            Trailing Stop Loss
                                        </h4>
                                        <p className="text-sm text-slate-400">Lock profits as stock price rises</p>
                                        {config.useTrailingStop && (
                                            <input
                                                type="number"
                                                value={config.trailingStopPercent || 1}
                                                onChange={(e) => updateConfig('trailingStopPercent', e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                placeholder="%"
                                                className="mt-3 w-32 px-4 py-2 bg-slate-900/50 border border-blue-600/30 rounded-lg text-white font-semibold focus:border-blue-500 focus:outline-none"
                                            />
                                        )}
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={config.useTrailingStop || false}
                                        onChange={(e) => updateConfig('useTrailingStop', e.target.checked)}
                                        className="w-6 h-6 rounded bg-slate-600 border-slate-500"
                                    />
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Stock Selection */}
                    {currentStep === 4 && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-bold text-white mb-2">AI Recommended Stocks</h3>
                                <p className="text-slate-400">Based on your budget of ₹{config.totalBudget?.toLocaleString()}</p>
                            </div>

                            {/* Search Bar */}
                            <div className="relative">
                                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-4 border border-slate-700">
                                    <label className="block text-sm font-semibold text-slate-300 mb-3">
                                        🔍 Search & Add Stock Manually
                                        {searchQuery && (
                                            <span className="ml-2 text-xs text-purple-400">
                                                ({searchResults.length} results)
                                            </span>
                                        )}
                                    </label>
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => handleSearch(e.target.value)}
                                        placeholder="Type stock name or symbol (e.g., RELIANCE, TCS)"
                                        className="w-full px-6 py-4 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all"
                                    />
                                </div>

                                {/* Search Results Dropdown */}
                                {searchResults.length > 0 && (
                                    <div className="absolute z-20 w-full mt-2 bg-slate-800 border border-purple-500/30 rounded-xl shadow-2xl max-h-80 overflow-y-auto">
                                        {searchResults.map(stock => (
                                            <button
                                                key={stock.symbol}
                                                onClick={() => addStockFromSearch(stock)}
                                                className="w-full px-6 py-4 text-left hover:bg-purple-600/20 transition-all border-b border-slate-700 last:border-b-0 group"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <div className="text-white font-bold text-lg group-hover:text-purple-400 transition-colors">
                                                            {stock.symbol.replace('.NS', '')}
                                                        </div>
                                                        <div className="text-sm text-slate-400">{stock.name}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-white font-semibold">₹{stock.price.toFixed(2)}</div>
                                                        <div className={`text-sm ${stock.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                            {stock.change >= 0 ? '+' : ''}{stock.change}%
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="border-t border-slate-700 pt-6">
                                <h4 className="text-lg font-bold text-white mb-4">💡 AI Suggestions</h4>
                            </div>

                            {suggestedStocks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16">
                                    <div className="text-6xl mb-4">🎉</div>
                                    <p className="text-xl text-white font-semibold mb-2">All stocks reviewed!</p>
                                    <p className="text-slate-400">You've approved {config.selectedStocks.length} stocks</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {suggestedStocks.map((stock, idx) => (
                                        <div
                                            key={stock.symbol}
                                            className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-6 border border-slate-700 hover:border-purple-500/50 transition-all duration-300"
                                        >
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <h4 className="text-2xl font-bold text-white">{stock.symbol.replace('.NS', '')}</h4>
                                                        <span className="px-4 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-full text-sm font-bold shadow-lg shadow-green-500/20">
                                                            AI Score: {stock.aiScore}/100
                                                        </span>
                                                    </div>
                                                    <p className="text-slate-400 mb-4">{stock.name}</p>

                                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                                        <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700">
                                                            <div className="text-xs text-slate-400 mb-1">Price</div>
                                                            <div className="text-xl font-bold text-white">₹{stock.price.toFixed(2)}</div>
                                                        </div>
                                                        <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700">
                                                            <div className="text-xs text-slate-400 mb-1">Change</div>
                                                            <div className={`text-xl font-bold ${stock.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                                {stock.change >= 0 ? '+' : ''}{stock.change}%
                                                            </div>
                                                        </div>
                                                        <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700">
                                                            <div className="text-xs text-slate-400 mb-1">Action</div>
                                                            <div className="text-xl font-bold text-purple-400">BUY</div>
                                                        </div>
                                                    </div>

                                                    <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-700/30 rounded-xl p-4">
                                                        <div className="text-xs text-blue-400 font-semibold mb-2 flex items-center gap-2">
                                                            <span className="text-lg">💡</span>
                                                            Why AI Recommends This:
                                                        </div>
                                                        <div className="text-sm text-slate-300">{stock.reason}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Quantity Input */}
                                            <div className="mb-4">
                                                <label className="block text-sm text-slate-300 mb-2 font-medium">
                                                    📦 Quantity (How many shares?)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={stockQuantities[stock.symbol] || 1}
                                                    onChange={(e) => {
                                                        const qty = e.target.value === '' ? '' : Number(e.target.value);
                                                        setStockQuantities(prev => ({
                                                            ...prev,
                                                            [stock.symbol]: qty
                                                        }));
                                                    }}
                                                    onBlur={(e) => {
                                                        const qty = Math.max(1, parseInt(e.target.value) || 1);
                                                        setStockQuantities(prev => ({
                                                            ...prev,
                                                            [stock.symbol]: qty
                                                        }));
                                                    }}
                                                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white font-semibold focus:border-purple-500 focus:outline-none"
                                                />
                                                <p className="text-xs text-slate-500 mt-2">
                                                    💰 Total: ₹{(stock.price * (stockQuantities[stock.symbol] || 1)).toFixed(2)}
                                                </p>
                                            </div>

                                            <div className="flex gap-4">
                                                <button
                                                    onClick={() => approveStock(stock)}
                                                    disabled={approvedStocks.includes(stock.symbol)}
                                                    className={`flex-1 py-4 font-bold rounded-xl transition-all shadow-lg ${approvedStocks.includes(stock.symbol)
                                                        ? 'bg-green-800 text-white cursor-not-allowed opacity-75'
                                                        : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-green-500/20 hover:shadow-green-500/40 hover:scale-105'
                                                        }`}
                                                >
                                                    {approvedStocks.includes(stock.symbol) ? '✅ Approved' : '✅ Approve & Add'}
                                                </button>
                                                <button
                                                    onClick={() => declineStock(stock)}
                                                    disabled={declinedStocks.includes(stock.symbol)}
                                                    className={`flex-1 py-4 font-bold rounded-xl transition-all shadow-lg ${declinedStocks.includes(stock.symbol)
                                                        ? 'bg-red-800 text-white cursor-not-allowed opacity-75'
                                                        : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-red-500/20 hover:shadow-red-500/40 hover:scale-105'
                                                        }`}
                                                >
                                                    {declinedStocks.includes(stock.symbol) ? '❌ Declined' : '❌ Decline'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {config.selectedStocks.length > 0 && (
                                <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-700/30 rounded-2xl p-6">
                                    <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                                        <span className="text-2xl">✅</span>
                                        Approved Stocks ({config.selectedStocks.length})
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {config.selectedStocks.map(stock => (
                                            <div
                                                key={stock}
                                                className="bg-gradient-to-r from-green-600/10 to-emerald-600/10 border border-green-500/30 rounded-xl p-4"
                                            >
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <div className="text-lg font-bold text-green-300">
                                                            {stock.replace('.NS', '')}
                                                        </div>
                                                        <div className="text-xs text-slate-400">Approved Stock</div>
                                                    </div>
                                                    <button
                                                        onClick={() => removeStock(stock)}
                                                        className="p-2 hover:bg-red-600/20 rounded-lg transition-all group"
                                                        title="Remove stock"
                                                    >
                                                        <svg className="w-5 h-5 text-slate-400 group-hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-slate-400 mb-2">Quantity</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={config.stockQuantities?.[stock] || stockQuantities[stock] || 1}
                                                        onChange={(e) => {
                                                            const qty = e.target.value === '' ? '' : Number(e.target.value);
                                                            setStockQuantities(prev => ({
                                                                ...prev,
                                                                [stock]: qty
                                                            }));
                                                            setConfig(prev => ({
                                                                ...prev,
                                                                stockQuantities: {
                                                                    ...prev.stockQuantities,
                                                                    [stock]: qty
                                                                }
                                                            }));
                                                        }}
                                                        onBlur={(e) => {
                                                            // Ensure minimum value of 1 on blur
                                                            const qty = Math.max(1, parseInt(e.target.value) || 1);
                                                            setStockQuantities(prev => ({
                                                                ...prev,
                                                                [stock]: qty
                                                            }));
                                                            setConfig(prev => ({
                                                                ...prev,
                                                                stockQuantities: {
                                                                    ...prev.stockQuantities,
                                                                    [stock]: qty
                                                                }
                                                            }));
                                                        }}
                                                        className="w-full px-3 py-2 bg-slate-900/50 border border-green-600/30 rounded-lg text-white font-semibold focus:border-green-500 focus:outline-none"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-slate-900/95 backdrop-blur-sm p-6 border-t border-slate-700">
                    <div className="flex gap-4">
                        {currentStep > 1 && (
                            <button
                                onClick={() => setCurrentStep(prev => prev - 1)}
                                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-all border border-slate-700"
                            >
                                ← Back
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-all border border-slate-700"
                        >
                            Cancel
                        </button>
                        <div className="flex-1"></div>
                        {currentStep < 4 ? (
                            <button
                                onClick={() => setCurrentStep(prev => prev + 1)}
                                disabled={!canProceed()}
                                className={`px-10 py-3 font-bold rounded-xl transition-all duration-300 ${canProceed()
                                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105'
                                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                    }`}
                            >
                                Next Step →
                            </button>
                        ) : (
                            <button
                                onClick={onStart}
                                disabled={!canProceed() || isActive}
                                className={`px-10 py-3 font-bold rounded-xl transition-all duration-300 ${canProceed() && !isActive
                                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:scale-105'
                                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                    }`}
                            >
                                {isActive ? '⚡ AI Trading Active' : '🚀 Start AI Trading'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
