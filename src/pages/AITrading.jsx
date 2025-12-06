import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function AITrading() {
    const [loading, setLoading] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [showSetupPanel, setShowSetupPanel] = useState(false);

    // 1. Trading Style / Holding Period
    const [tradingStyle, setTradingStyle] = useState('intraday');

    // 2. Stock Filters
    const [market, setMarket] = useState('NSE');
    const [selectedIndex, setSelectedIndex] = useState('NIFTY50');
    const [includedSectors, setIncludedSectors] = useState([]);
    const [excludedSectors, setExcludedSectors] = useState([]);
    const [priceRange, setPriceRange] = useState({ min: '', max: '' });
    const [volumeFilter, setVolumeFilter] = useState('medium');
    const [volatilityFilter, setVolatilityFilter] = useState('medium');

    // 3. Time & Session Controls
    const [entryWindow, setEntryWindow] = useState({ from: '09:15', to: '15:30' });
    const [exitMethod, setExitMethod] = useState('time'); // 'time' or 'sltp'
    const [exitTime, setExitTime] = useState('15:15');

    // 4. Risk & Money Management
    const [totalCapital, setTotalCapital] = useState('100000');
    const [amountPerTrade, setAmountPerTrade] = useState('10000');
    const [amountType, setAmountType] = useState('fixed'); // 'fixed' or 'percentage'
    const [maxOpenPositions, setMaxOpenPositions] = useState('3');
    const [orderType, setOrderType] = useState('MARKET');
    const [productType, setProductType] = useState('MIS');

    // 5. Stop Loss & Take Profit
    const [stopLossType, setStopLossType] = useState('percentage'); // 'percentage' or 'points'
    const [stopLossValue, setStopLossValue] = useState('2');
    const [takeProfitType, setTakeProfitType] = useState('percentage');
    const [takeProfitValue, setTakeProfitValue] = useState('5');
    const [useTrailingSL, setUseTrailingSL] = useState(false);
    const [trailingValue, setTrailingValue] = useState('1');

    // 6. Global Safety Limits
    const [maxDailyLoss, setMaxDailyLoss] = useState('5000');
    const [maxDailyLossType, setMaxDailyLossType] = useState('amount'); // 'amount' or 'percentage'
    const [maxDailyProfit, setMaxDailyProfit] = useState('');
    const [maxTradesPerDay, setMaxTradesPerDay] = useState('5');
    const [closeOnLimit, setCloseOnLimit] = useState(true);

    // 7. Execution Mode
    const [executionMode, setExecutionMode] = useState('paper');

    // Available options
    const markets = ['NSE', 'BSE', 'F&O'];
    const indices = ['NIFTY50', 'NIFTY100', 'NIFTY500', 'BANKNIFTY', 'SENSEX', 'Custom Watchlist'];
    const sectors = ['Banking', 'IT', 'Pharma', 'Auto', 'FMCG', 'Energy', 'Metals', 'Realty'];
    const productTypes = ['CNC', 'MIS', 'NRML'];

    const handleStartAITrading = async () => {
        setLoading(true);

        // Simulate loading
        await new Promise(resolve => setTimeout(resolve, 1500));

        const config = {
            tradingStyle,
            filters: {
                market,
                index: selectedIndex,
                includedSectors,
                excludedSectors,
                priceRange,
                volumeFilter,
                volatilityFilter
            },
            timeControls: {
                entryWindow,
                exitMethod,
                exitTime
            },
            riskManagement: {
                totalCapital: parseFloat(totalCapital),
                amountPerTrade: parseFloat(amountPerTrade),
                amountType,
                maxOpenPositions: parseInt(maxOpenPositions),
                orderType,
                productType
            },
            stopLoss: {
                type: stopLossType,
                value: parseFloat(stopLossValue),
                useTrailing: useTrailingSL,
                trailingValue: parseFloat(trailingValue)
            },
            takeProfit: {
                type: takeProfitType,
                value: parseFloat(takeProfitValue)
            },
            safetyLimits: {
                maxDailyLoss: parseFloat(maxDailyLoss),
                maxDailyLossType,
                maxDailyProfit: maxDailyProfit ? parseFloat(maxDailyProfit) : null,
                maxTradesPerDay: parseInt(maxTradesPerDay),
                closeOnLimit
            },
            executionMode
        };

        console.log('AI Trading Config:', config);

        // TODO: Send to backend API
        // const response = await fetch('/api/ai-trading/start', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(config)
        // });

        setIsRunning(true);
        setLoading(false);
        setShowSetupPanel(false);
    };

    const handleStopAITrading = () => {
        setIsRunning(false);
    };

    const handleOpenSetup = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            setShowSetupPanel(true);
        }, 800);
    };

    return (
        <div className="min-h-screen bg-[#0b0e1b] text-white p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                            🤖 AI Trading
                        </h1>
                        <p className="text-gray-400 text-sm mt-1">Automated stock selection and trading powered by AI</p>
                    </div>

                    <div className="flex gap-2">
                        {!isRunning ? (
                            <button
                                onClick={handleOpenSetup}
                                disabled={loading}
                                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:opacity-90 transition-opacity font-semibold disabled:opacity-50"
                            >
                                {loading ? '⏳ Loading...' : '⚙️ Setup AI Trading'}
                            </button>
                        ) : (
                            <button
                                onClick={handleStopAITrading}
                                className="px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 rounded-lg hover:opacity-90 transition-opacity font-semibold"
                            >
                                🛑 Stop AI Trading
                            </button>
                        )}
                    </div>
                </div>

                {/* Status Card */}
                {isRunning && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-xl p-6 mb-6"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                            <h3 className="text-xl font-bold text-green-400">AI Trading Active</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                                <p className="text-gray-400">Mode</p>
                                <p className="font-semibold text-white">{executionMode === 'paper' ? '📝 Paper Trading' : '🔴 Live Trading'}</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Trading Style</p>
                                <p className="font-semibold text-white capitalize">{tradingStyle}</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Max Positions</p>
                                <p className="font-semibold text-white">{maxOpenPositions}</p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Setup Panel */}
                {showSetupPanel && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6 space-y-6"
                    >
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold">AI Trading Setup</h2>
                            <button
                                onClick={() => setShowSetupPanel(false)}
                                className="text-gray-400 hover:text-white text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        {/* 1. Trading Style */}
                        <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-purple-400">1. Trading Style / Holding Period</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {['intraday', 'swing', 'longterm'].map(style => (
                                    <button
                                        key={style}
                                        onClick={() => setTradingStyle(style)}
                                        className={`p-4 rounded-lg border-2 transition-all ${tradingStyle === style
                                                ? 'border-purple-500 bg-purple-500/20'
                                                : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                                            }`}
                                    >
                                        <div className="font-semibold capitalize">{style}</div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            {style === 'intraday' && '~10 stocks for today'}
                                            {style === 'swing' && '~3 days holding'}
                                            {style === 'longterm' && 'Multi-week/month'}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 2. Stock Filters */}
                        <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-purple-400">2. Stock Filters</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Market */}
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Market / Segment</label>
                                    <select
                                        value={market}
                                        onChange={(e) => setMarket(e.target.value)}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                                    >
                                        {markets.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>

                                {/* Index */}
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Index / Watchlist</label>
                                    <select
                                        value={selectedIndex}
                                        onChange={(e) => setSelectedIndex(e.target.value)}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                                    >
                                        {indices.map(idx => <option key={idx} value={idx}>{idx}</option>)}
                                    </select>
                                </div>

                                {/* Price Range */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm text-gray-400 mb-2">Price Range (₹)</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <input
                                            type="number"
                                            placeholder="Min"
                                            value={priceRange.min}
                                            onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                                            className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                                        />
                                        <input
                                            type="number"
                                            placeholder="Max"
                                            value={priceRange.max}
                                            onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                                            className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                                        />
                                    </div>
                                </div>

                                {/* Volume Filter */}
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Volume / Liquidity</label>
                                    <select
                                        value={volumeFilter}
                                        onChange={(e) => setVolumeFilter(e.target.value)}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>

                                {/* Volatility Filter */}
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Volatility</label>
                                    <select
                                        value={volatilityFilter}
                                        onChange={(e) => setVolatilityFilter(e.target.value)}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                            </div>

                            {/* Sectors */}
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Sectors (Click to toggle)</label>
                                <div className="flex flex-wrap gap-2">
                                    {sectors.map(sector => {
                                        const isIncluded = includedSectors.includes(sector);
                                        const isExcluded = excludedSectors.includes(sector);

                                        return (
                                            <button
                                                key={sector}
                                                onClick={() => {
                                                    if (isIncluded) {
                                                        setIncludedSectors(includedSectors.filter(s => s !== sector));
                                                        setExcludedSectors([...excludedSectors, sector]);
                                                    } else if (isExcluded) {
                                                        setExcludedSectors(excludedSectors.filter(s => s !== sector));
                                                    } else {
                                                        setIncludedSectors([...includedSectors, sector]);
                                                    }
                                                }}
                                                className={`px-3 py-1 rounded-full text-sm transition-all ${isIncluded
                                                        ? 'bg-green-600 text-white'
                                                        : isExcluded
                                                            ? 'bg-red-600/30 text-red-300 line-through'
                                                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                    }`}
                                            >
                                                {sector}
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    Green = Include, Red = Exclude, Gray = Neutral
                                </p>
                            </div>
                        </div>

                        {/* 3. Time & Session Controls */}
                        <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-purple-400">3. Time & Session Controls</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Entry Window</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="time"
                                            value={entryWindow.from}
                                            onChange={(e) => setEntryWindow({ ...entryWindow, from: e.target.value })}
                                            className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                                        />
                                        <input
                                            type="time"
                                            value={entryWindow.to}
                                            onChange={(e) => setEntryWindow({ ...entryWindow, to: e.target.value })}
                                            className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Exit Method</label>
                                    <select
                                        value={exitMethod}
                                        onChange={(e) => setExitMethod(e.target.value)}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                                    >
                                        <option value="time">By Time</option>
                                        <option value="sltp">By Stop Loss / Take Profit</option>
                                    </select>
                                </div>

                                {exitMethod === 'time' && (
                                    <div className="md:col-span-2">
                                        <label className="block text-sm text-gray-400 mb-2">Exit Time</label>
                                        <input
                                            type="time"
                                            value={exitTime}
                                            onChange={(e) => setExitTime(e.target.value)}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 4. Risk & Money Management */}
                        <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-purple-400">4. Risk & Money Management</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Total Capital (₹)</label>
                                    <input
                                        type="number"
                                        value={totalCapital}
                                        onChange={(e) => setTotalCapital(e.target.value)}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Amount Per Trade</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            value={amountPerTrade}
                                            onChange={(e) => setAmountPerTrade(e.target.value)}
                                            className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                                        />
                                        <select
                                            value={amountType}
                                            onChange={(e) => setAmountType(e.target.value)}
                                            className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                                        >
                                            <option value="fixed">₹</option>
                                            <option value="percentage">%</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Max Open Positions</label>
                                    <input
                                        type="number"
                                        value={maxOpenPositions}
                                        onChange={(e) => setMaxOpenPositions(e.target.value)}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Order Type</label>
                                    <select
                                        value={orderType}
                                        onChange={(e) => setOrderType(e.target.value)}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                                    >
                                        <option value="MARKET">Market</option>
                                        <option value="LIMIT">Limit</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Product Type</label>
                                    <select
                                        value={productType}
                                        onChange={(e) => setProductType(e.target.value)}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                                    >
                                        {productTypes.map(pt => <option key={pt} value={pt}>{pt}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* 5. Stop Loss & Take Profit */}
                        <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-purple-400">5. Stop Loss & Take Profit</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Stop Loss</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            value={stopLossValue}
                                            onChange={(e) => setStopLossValue(e.target.value)}
                                            className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                                        />
                                        <select
                                            value={stopLossType}
                                            onChange={(e) => setStopLossType(e.target.value)}
                                            className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                                        >
                                            <option value="percentage">%</option>
                                            <option value="points">Points</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Take Profit</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            value={takeProfitValue}
                                            onChange={(e) => setTakeProfitValue(e.target.value)}
                                            className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                                        />
                                        <select
                                            value={takeProfitType}
                                            onChange={(e) => setTakeProfitType(e.target.value)}
                                            className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                                        >
                                            <option value="percentage">%</option>
                                            <option value="points">Points</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={useTrailingSL}
                                            onChange={(e) => setUseTrailingSL(e.target.checked)}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm text-gray-300">Enable Trailing Stop Loss</span>
                                    </label>

                                    {useTrailingSL && (
                                        <div className="mt-2 flex gap-2">
                                            <input
                                                type="number"
                                                value={trailingValue}
                                                onChange={(e) => setTrailingValue(e.target.value)}
                                                placeholder="Trail by"
                                                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                                            />
                                            <span className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white">
                                                {stopLossType === 'percentage' ? '%' : 'Points'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 6. Global Safety Limits */}
                        <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-purple-400">6. Global Safety Limits</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Max Daily Loss</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            value={maxDailyLoss}
                                            onChange={(e) => setMaxDailyLoss(e.target.value)}
                                            className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                                        />
                                        <select
                                            value={maxDailyLossType}
                                            onChange={(e) => setMaxDailyLossType(e.target.value)}
                                            className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                                        >
                                            <option value="amount">₹</option>
                                            <option value="percentage">%</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Max Daily Profit (Optional)</label>
                                    <input
                                        type="number"
                                        value={maxDailyProfit}
                                        onChange={(e) => setMaxDailyProfit(e.target.value)}
                                        placeholder="Leave empty for no limit"
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Max Trades Per Day</label>
                                    <input
                                        type="number"
                                        value={maxTradesPerDay}
                                        onChange={(e) => setMaxTradesPerDay(e.target.value)}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                                    />
                                </div>

                                <div className="flex items-center">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={closeOnLimit}
                                            onChange={(e) => setCloseOnLimit(e.target.checked)}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm text-gray-300">Close all positions on limit breach</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* 7. Execution Mode */}
                        <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-purple-400">7. Execution Mode</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <button
                                    onClick={() => setExecutionMode('paper')}
                                    className={`p-4 rounded-lg border-2 transition-all ${executionMode === 'paper'
                                            ? 'border-blue-500 bg-blue-500/20'
                                            : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                                        }`}
                                >
                                    <div className="font-semibold">📝 Paper Trade</div>
                                    <div className="text-xs text-gray-400 mt-1">Simulated trading with virtual money</div>
                                </button>

                                <button
                                    onClick={() => setExecutionMode('live')}
                                    className={`p-4 rounded-lg border-2 transition-all ${executionMode === 'live'
                                            ? 'border-red-500 bg-red-500/20'
                                            : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                                        }`}
                                >
                                    <div className="font-semibold">🔴 Live Trade</div>
                                    <div className="text-xs text-gray-400 mt-1">Real orders on your Zerodha account</div>
                                </button>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4 border-t border-gray-700">
                            <button
                                onClick={() => setShowSetupPanel(false)}
                                className="flex-1 px-6 py-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleStartAITrading}
                                disabled={loading}
                                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:opacity-90 transition-opacity font-semibold disabled:opacity-50"
                            >
                                {loading ? '⏳ Starting...' : '🚀 Start AI Trading'}
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Info Card when not running and setup not shown */}
                {!isRunning && !showSetupPanel && (
                    <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-8 text-center">
                        <div className="text-6xl mb-4">🤖</div>
                        <h3 className="text-xl font-bold mb-2">AI Trading Not Active</h3>
                        <p className="text-gray-400 mb-6">
                            Configure your AI trading parameters and let the system automatically select and trade stocks based on your criteria.
                        </p>
                        <button
                            onClick={handleOpenSetup}
                            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:opacity-90 transition-opacity font-semibold"
                        >
                            ⚙️ Setup AI Trading
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
