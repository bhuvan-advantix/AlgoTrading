/* global process */
import express from "express";
import { KiteConnect } from "kiteconnect";
import fs from "fs";
import cors from "cors";
import axios from "axios";
import path from "path";
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import aiAnalysisRouter from './routes/aiAnalysis.js';
import tradesRouter from './routes/trades.js';
import paperTradingRouter from './routes/paperTrading.js';

// Load environment variables early
dotenv.config();

const app = express();

// --- ENVIRONMENT VARIABLES (Assumed to be loaded from .env) ---
const KITE_API_KEY = process.env.KITE_API_KEY || '73k6zq3vc6hr7ver';
const KITE_API_SECRET = process.env.KITE_API_SECRET || 'h7oqtuehtvkil8s6fdursq6tvto7iz60';
const KITE_REDIRECT_URI = process.env.KITE_REDIRECT_URI || 'https://advantix-trading.netlify.app/redirect';
const TWELVEDATA_API_KEY = process.env.TWELVEDATA_API_KEY || '293f5d774ee04a54ac65869553752fd4';
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'd3o7cd1r01qmj8304e7gd3o7cd1r01qmj8304e80';
// --- END ENV VARS ---

// CORS configuration
app.use(cors({
    origin: [
        process.env.FRONTEND_URL || 'https://advantix-trading.netlify.app',
        'http://localhost:5173',
        'http://localhost:5174'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-user-id', 'Authorization']
}));
app.use(express.json());

// Mount routers
console.log('[server] aiAnalysisRouter present:', !!aiAnalysisRouter);
console.log('[server] tradesRouter present:', !!tradesRouter);
// aiAnalysis router contains routes defined like '/stock-advice' and '/n8n-stock-advice'
// and expects to be mounted under '/api/ai' so endpoints become '/api/ai/...'
app.use('/api/ai', aiAnalysisRouter);
// Keep trades router mounted at '/api' for existing /api/kite/* endpoints
// Keep trades router mounted at '/api' for existing /api/kite/* endpoints
app.use('/api', tradesRouter);
app.use('/api/paper-trading', paperTradingRouter);

// MongoDB Configuration
const mongoDbUri = process.env.MONGODB_URI || "mongodb+srv://bhuvank_db_user:LzlPyIrq8Vvyz8FD@stockdatabase.uxs1iik.mongodb.net/stockdb?retryWrites=true&w=majority";

mongoose.connect(mongoDbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000
})
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch(err => {
        console.error("🚫 MongoDB Connection Error:", err);
        process.exit(1);
    });

// --- Schemas & Models ---
const UserSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },  // For Zerodha user ID
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: String,
    zerodhaConnected: { type: Boolean, default: false },
    kiteAccessToken: String,
    userName: String,
    createdAt: { type: Date, default: Date.now }
});

const SettingsSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dailyAllocation: { type: Number, default: 100000 },
    dailyLossCap: { type: Number, default: 5000 },
    maxTrades: { type: Number, default: 2 },
    tradeAllocationPct: { type: Number, default: 20 },
    strategyType: { type: String, default: 'Simple Momentum' },
    isLive: { type: Boolean, default: false },
    isAIAssisted: { type: Boolean, default: true },
    zerodhaConnected: { type: Boolean, default: false },
    kiteAccessToken: { type: String, default: null },
    kitePublicToken: { type: String, default: null }
});

const NewsSettingsSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    preferredCategories: { type: [String], default: ['Market', 'Stocks', 'AI/ML'] },
    keywords: { type: [String], default: [] }
});

const User = mongoose.model('User', UserSchema);
const Settings = mongoose.model('Settings', SettingsSchema);
const NewsSettings = mongoose.model('NewsSettings', NewsSettingsSchema);

// Import other models
import { Trade } from './models/trade.js';
import { AuditLog } from './models/audit.js';
import { AiPick } from './models/aipick.js';

// Temporary DB clear (remove in production)
mongoose.connection.once('open', async () => {
    try {
        await mongoose.connection.db.dropDatabase();
        console.log('Database cleared');
    } catch (err) {
        console.error('Error clearing database:', err);
    }
});

// --- Kite helper: create Kite client per-user using the stored access token ---
function makeKiteClient(accessToken) {
    if (!accessToken) throw new Error('Access token is required to create Kite client');
    const kite = new KiteConnect({ api_key: KITE_API_KEY });
    kite.setAccessToken(accessToken);
    return kite;
}

// --- Mock Global Stock Data (unchanged) ---
const GLOBAL_SYMBOLS = ['AAPL', 'MSFT', 'GOOG', 'TSLA', 'AMZN', 'NVDA', 'JPM', 'V', 'PG', 'KO'];
const getMockGlobalStockData = (symbol) => {
    const prices = { 'AAPL': 185.20, 'MSFT': 420.55, 'GOOG': 155.10, 'TSLA': 201.80, 'AMZN': 180.30, 'NVDA': 920.00, 'JPM': 190.50, 'V': 275.30, 'PG': 160.00, 'KO': 61.20 };
    const history = Array.from({ length: 30 }, (_, i) => prices[symbol] + (Math.random() - 0.5) * 5 * Math.sin(i / 10));
    const change = (Math.random() - 0.4) * 2;
    return {
        symbol,
        currentPrice: prices[symbol],
        dailyChangePct: change.toFixed(2),
        historicalPrices: history.map(p => parseFloat(p.toFixed(2))),
        marketTime: new Date().toISOString()
    };
};

// KiteConnect client (for login URL & token exchange)
const kc = new KiteConnect({ api_key: KITE_API_KEY });

// --- KITE AUTHENTICATION SETUP (login & token exchange) ---
app.get("/api/kite/login", async (req, res) => {
    try {
        // ZERODHA UPDATE: STRICTLY use user-specific API Key
        const userId = req.query.userId || req.headers['x-user-id'];

        if (!userId) {
            return res.status(400).json({ success: false, error: "User ID is required to login to Zerodha." });
        }

        const user = await User.findOne({ userId });
        if (!user || !user.kiteApiKey) {
            return res.status(400).json({ success: false, error: "Zerodha API Key not found for this user. Please configure it in settings." });
        }

        const apiKey = user.kiteApiKey;
        const kite = new KiteConnect({ api_key: apiKey });
        const loginUrl = kite.getLoginURL();

        console.log(`Generated Zerodha login URL for user ${userId} with key ${apiKey}`);
        res.json({ success: true, data: { loginUrl } });
    } catch (error) {
        console.error('Kite Login Error:', error);
        res.status(500).json({ success: false, error: 'Could not generate Zerodha login URL.' });
    }
});

app.post(["/api/kite/token", "/api/kite/exchange-token"], async (req, res) => {
    const requestToken = req.query.request_token || req.body.request_token;
    const userId = req.headers['x-user-id']; // Expect user ID in header

    if (!requestToken) {
        return res.status(400).json({ success: false, error: "request_token is required in either query params or request body" });
    }

    try {
        console.log('🔄 Exchanging request token for access token...');

        // ZERODHA UPDATE ADDED HERE: Fetch user secrets
        let apiKey = KITE_API_KEY;
        let apiSecret = KITE_API_SECRET;

        if (userId) {
            const user = await User.findOne({ userId });
            if (user) {
                if (user.kiteApiKey) apiKey = user.kiteApiKey;
                if (user.kiteApiSecret) apiSecret = user.kiteApiSecret;
            }
        }

        const kite = new KiteConnect({ api_key: apiKey });
        const response = await kite.generateSession(requestToken, apiSecret);
        console.log('Kite response:', response);

        const accessToken = response.access_token;
        const userName = response.user_name || 'Unknown User';
        if (!accessToken) throw new Error('No access token received from Kite');

        // set access token on client and persist user
        // Note: In a multi-user env, 'kc' global is risky, but we'll update it for backward compat if used elsewhere
        // Better to instantiate per request or use the user's token in subsequent requests.
        // kc.setAccessToken(accessToken); 

        const userData = {
            userId: response.user_id, // This might overwrite our internal userId if they differ. 
            // Ideally we should map Zerodha ID to our User ID or keep them separate.
            // For this update, we follow existing logic but ensure keys are preserved.
            email: response.email,
            name: response.user_shortname,
            zerodhaConnected: true,
            kiteAccessToken: accessToken,
            userName: userName,
            // password: response.user_id // Don't overwrite password if it exists
        };

        // Update user but preserve keys if they exist (though we just used them)
        await User.findOneAndUpdate(
            { userId: response.user_id },
            userData,
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        console.log(`✅ Zerodha session established for user ${userName}`);
        res.json({
            success: true,
            message: "Authorization successful",
            sessionKey: accessToken,
            data: { connected: true, userName: userName, kiteUserId: response.user_id }
        });
    } catch (error) {
        console.error('Kite Token Exchange Error:', error.response?.data || error);
        if (error.response?.data) {
            const kiteError = error.response.data;
            if (kiteError.error_type === 'TokenException') {
                return res.status(401).json({ success: false, error: kiteError.message || 'Token validation failed', error_type: kiteError.error_type });
            }
        }
        if (error.message?.includes('invalid api_key')) {
            return res.status(401).json({ success: false, error: 'Invalid API key configuration', error_type: 'ConfigurationError' });
        }
        res.status(500).json({ success: false, error: error.message || 'Token exchange failed', error_type: error.response?.data?.error_type || 'UnknownError' });
    }
});

// --- Existing routes (kept) ---
// ... (I left all your existing routes intact exactly as you provided earlier) ...
// For brevity in this snippet, assume all previous routes from your file remain unchanged.
// In the actual file you paste below, keep the earlier code you had up to the "Search stocks" route.
// -------------------------------------------------------------------------------

// ----------------- NEW: Zerodha/Kite Account & Trading Endpoints -----------------

/**
 * Middleware: Find user by x-user-id header and attach user to req.user
 * (Used by kite endpoints to avoid repeating DB lookup)
 */
async function findUserFromHeader(req, res, next) {
    try {
        const kiteUserId = req.headers['x-user-id'];
        if (!kiteUserId) return res.status(400).json({ success: false, error: 'x-user-id header required' });

        const user = await User.findOne({ userId: kiteUserId });
        if (!user) return res.status(404).json({ success: false, error: 'User not found or not connected' });

        req.user = user;
        next();
    } catch (err) {
        console.error('findUserFromHeader error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

/**
 * GET /api/kite/account
 * Returns profile + margins + holdings + positions + recent orders for the connected Zerodha user
 */
app.get('/api/kite/account', findUserFromHeader, async (req, res) => {
    try {
        const user = req.user;
        if (!user.kiteAccessToken) {
            return res.status(401).json({ success: false, error: 'User not authenticated with Zerodha (no access token)' });
        }

        const kite = makeKiteClient(user.kiteAccessToken);

        // Request multiple kite endpoints in parallel
        const [
            profileResp,
            holdingsResp,
            positionsResp,
            marginsResp,
            ordersResp
        ] = await Promise.allSettled([
            kite.getProfile(),          // basic profile
            kite.getHoldings(),         // holdings
            kite.getPositions(),        // positions (net and day)
            kite.getMargins(),          // overall margins
            kite.getOrders()            // orders for the day
        ]);

        // Helper to unwrap Promise.allSettled results
        const unwrap = (p) => p.status === 'fulfilled' ? p.value : null;

        const profile = unwrap(profileResp);
        const holdings = unwrap(holdingsResp);
        const positions = unwrap(positionsResp);
        const margins = unwrap(marginsResp);
        const orders = unwrap(ordersResp);

        res.json({
            success: true,
            data: {
                profile,
                holdings,
                positions,
                margins,
                recentOrders: orders ? orders.slice(-50) : []
            }
        });
    } catch (error) {
        console.error('Error fetching Kite account:', error);
        // Kite returns error response inside error.response.data sometimes
        const kiteErr = error?.response?.data || error?.message || 'Unknown Kite error';
        res.status(500).json({ success: false, error: kiteErr });
    }
});

/**
 * POST /api/kite/order
 * Place an order (BUY/SELL). Body:
 * {
 *   exchange: 'NSE' | 'BSE' | 'NFO' | ...,
 *   tradingsymbol: 'RELIANCE' | 'TCS' | 'AAPL' | ...,
 *   transaction_type: 'BUY' | 'SELL',
 *   quantity: 1,
 *   order_type: 'MARKET' | 'LIMIT',
 *   product: 'MIS' | 'CNC' | 'NRML',
 *   price?: 123.45,    // required for LIMIT
 *   validity?: 'DAY' | 'IOC'
 * }
 */
app.post('/api/kite/order', findUserFromHeader, async (req, res) => {
    try {
        const user = req.user;
        if (!user.kiteAccessToken) {
            return res.status(401).json({ success: false, error: 'Not connected to Zerodha' });
        }

        const {
            exchange,
            tradingsymbol,
            transaction_type,
            quantity,
            order_type = 'MARKET',
            product = 'MIS',
            price,
            validity = 'DAY',
            variety = 'regular' // could be 'regular' | 'bo' | 'co' etc. Keep default 'regular'
        } = req.body;

        // Basic validation
        if (!exchange || !tradingsymbol || !transaction_type || !quantity) {
            return res.status(400).json({ success: false, error: 'exchange, tradingsymbol, transaction_type and quantity are required' });
        }
        if (order_type === 'LIMIT' && (price === undefined || price === null)) {
            return res.status(400).json({ success: false, error: 'price is required for LIMIT orders' });
        }

        const kite = makeKiteClient(user.kiteAccessToken);

        // Build payload for Kite; pass 'variety' as the first argument to placeOrder
        const orderPayload = {
            exchange,
            tradingsymbol,
            transaction_type,
            quantity: Number(quantity),
            order_type,
            product,
            // price only for limit orders
            ...(order_type === 'LIMIT' ? { price: Number(price) } : {}),
            validity
        };

        console.log('Placing order on Kite (variety=%s) with payload:', variety, orderPayload);

        // KiteConnect JS expects placeOrder(variety, orderParams) in many versions — pass variety explicitly.
        let kiteOrderResponse;
        try {
            kiteOrderResponse = await kite.placeOrder(variety, orderPayload);
        } catch (kiteErr) {
            // Normalize kite error to a readable string
            console.error('Kite placeOrder threw:', kiteErr);
            const detail = (kiteErr && (kiteErr.response?.data || kiteErr.data || kiteErr.message)) || String(kiteErr);
            return res.status(500).json({ success: false, error: `Kite order error: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` });
        }

        // Save a light audit log entry
        await AuditLog.create({
            userId: user._id,
            eventType: 'KITE_ORDER_PLACED',
            message: `Order placed ${transaction_type} ${tradingsymbol} qty ${quantity}`,
            details: { kiteResp: kiteOrderResponse }
        });

        res.json({
            success: true,
            data: kiteOrderResponse
        });
    } catch (error) {
        console.error('Error placing Kite order:', error);
        const kiteErr = error?.response?.data || error?.message || 'Error placing order';
        const errMsg = typeof kiteErr === 'string' ? kiteErr : JSON.stringify(kiteErr);
        res.status(500).json({ success: false, error: errMsg });
    }
});

/**
 * GET /api/kite/orders
 * Get orders (optionally: ?from=YYYY-MM-DD&to=YYYY-MM-DD)
 */
app.get('/api/kite/orders', findUserFromHeader, async (req, res) => {
    try {
        const user = req.user;
        if (!user.kiteAccessToken) return res.status(401).json({ success: false, error: 'Not connected to Zerodha' });

        const kite = makeKiteClient(user.kiteAccessToken);
        const orders = await kite.getOrders(); // returns day's orders; kite.connect APIs vary by lib version

        res.json({ success: true, data: orders });
    } catch (error) {
        console.error('Error fetching orders:', error);
        const kiteErr = error?.response?.data || error?.message || 'Error fetching orders';
        res.status(500).json({ success: false, error: kiteErr });
    }
});

/**
 * GET /api/kite/order/:orderId/status
 * Get order status by orderId
 */
app.get('/api/kite/order/:orderId/status', findUserFromHeader, async (req, res) => {
    try {
        const user = req.user;
        const { orderId } = req.params;
        if (!user.kiteAccessToken) return res.status(401).json({ success: false, error: 'Not connected to Zerodha' });
        if (!orderId) return res.status(400).json({ success: false, error: 'orderId is required' });

        const kite = makeKiteClient(user.kiteAccessToken);
        const orderStatus = await kite.getOrderHistory(orderId); // some kite libs provide getOrderHistory(orderId)
        // fallback: try getOrder if available
        res.json({ success: true, data: orderStatus });
    } catch (error) {
        console.error('Error fetching order status:', error);
        const kiteErr = error?.response?.data || error?.message || 'Error fetching order status';
        res.status(500).json({ success: false, error: kiteErr });
    }
});

/**
 * DELETE /api/kite/order/:orderId
 * Cancel an order by orderId
 * Query param optional: variety (default 'regular')
 */
app.delete('/api/kite/order/:orderId', findUserFromHeader, async (req, res) => {
    try {
        const user = req.user;
        const { orderId } = req.params;
        const { variety = 'regular' } = req.query;
        if (!user.kiteAccessToken) return res.status(401).json({ success: false, error: 'Not connected to Zerodha' });
        if (!orderId) return res.status(400).json({ success: false, error: 'orderId required' });

        const kite = makeKiteClient(user.kiteAccessToken);

        const cancelResponse = await kite.cancelOrder(orderId, variety);

        await AuditLog.create({
            userId: user._id,
            eventType: 'KITE_ORDER_CANCELLED',
            message: `Order ${orderId} cancelled`,
            details: { cancelResponse }
        });

        res.json({ success: true, data: cancelResponse });
    } catch (error) {
        console.error('Error cancelling order:', error);
        const kiteErr = error?.response?.data || error?.message || 'Error cancelling order';
        res.status(500).json({ success: false, error: kiteErr });
    }
});

// --- User Settings: Save Kite API Keys ---
app.post('/api/user/save-kite-keys', async (req, res) => {
    try {
        const { userId, apiKey, apiSecret } = req.body;

        if (!userId || !apiKey || !apiSecret) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        // Find user and update keys
        const user = await User.findOneAndUpdate(
            { userId },
            {
                kiteApiKey: apiKey,
                kiteApiSecret: apiSecret
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        console.log(`Saved Kite keys for user: ${userId}`);
        res.json({ success: true, message: 'Keys saved successfully' });
    } catch (error) {
        console.error('Error saving Kite keys:', error);
        res.status(500).json({ success: false, error: 'Failed to save keys' });
    }
});

// Error handler middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
});
