// Trading window configuration
export const TRADING_WINDOW = {
    start: "09:15",
    end: "11:15",
    timezone: "Asia/Kolkata"
};

// Trade limits configuration
export const TRADE_LIMITS = {
    maxTradesPerDay: 2,
    minimumTradeInterval: 5 // minutes
};

// API configuration
export const API_CONFIG = {
    baseUrl: import.meta.env.VITE_API_URL || 'https://algotrading-2sbm.onrender.com',
    timeout: 30000, // 30 seconds
    retryCount: 3,
    retryDelay: 1000, // 1 second
};

// Market regimes
export const MARKET_REGIMES = {
    CALM: 'Calm',
    NORMAL: 'Normal',
    ELEVATED: 'Elevated',
    EXTREME: 'Extreme'
};

// Trade types
export const TRADE_TYPES = {
    BUY: 'BUY',
    SELL: 'SELL'
};

// Trade status
export const TRADE_STATUS = {
    PENDING: 'PENDING',
    COMPLETE: 'COMPLETE',
    REJECTED: 'REJECTED',
    CANCELLED: 'CANCELLED'
};

// Strategy types
export const STRATEGY_TYPES = {
    ORB: 'Opening Range Breakout',
    MOMENTUM: 'Open Momentum on Gap',
    MEAN_REVERSION: 'Mean Reversion to VWAP'
};

export default {
    TRADING_WINDOW,
    TRADE_LIMITS,
    API_CONFIG,
    MARKET_REGIMES,
    TRADE_TYPES,
    TRADE_STATUS,
    STRATEGY_TYPES
};