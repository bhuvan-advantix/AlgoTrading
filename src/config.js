// API Keys (Replace with your actual keys in production)
export const ZERODHA_API_KEY = "73k6zq3vc6hr7ver"; // Placeholder for frontend client ID
export const FINNHUB_API_KEY = "d3o7cd1r01qmj8304e7gd3o7cd1r01qmj8304e80"; // Replace with your actual Finnhub API key
export const TWELVEDATA_API_KEY = "293f5d774ee04a54ac65869553752fd4"; // Replace with your actual TwelveData API key

// Base API URL - Production Backend
export const API_BASE = "https://algotrading-2sbm.onrender.com/api";
// Market data proxy (search/quote/chart)
export const MARKET_API_BASE = "https://algotrading-2sbm.onrender.com/api";

// App configuration
export const APP_CONFIG = {
    tradingWindow: {
        start: '09:15',  // IST
        end: '11:15'     // IST
    },
    riskDefaults: {
        dailyCapital: 100000.00,
        maxTrades: 2,
        dailyLossCap: -1500.00,
        allowAIOverride: true
    },
    refreshIntervals: {
        marketData: 60000,   // 1 minute
        news: 300000        // 5 minutes
    }
};

// Webhook for production (used by GlobalMarkets chat/alerts)
export const WEBHOOK_URL = 'https://bhuvan145201.app.n8n.cloud/webhook/31767e89-184b-418e-8bd9-3bbdac2b9636';