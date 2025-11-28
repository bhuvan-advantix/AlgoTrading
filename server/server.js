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
const KITE_REDIRECT_URI = process.env.KITE_REDIRECT_URI || 'https://advantix-trading.netlify.app';
const TWELVEDATA_API_KEY = process.env.TWELVEDATA_API_KEY || '293f5d774ee04a54ac65869553752fd4';
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'd3o7cd1r01qmj8304e7gd3o7cd1r01qmj8304e80';
// --- END ENV VARS ---

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'https://advantix-trading.netlify.app',
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
    email: { type: String }, // Made optional
    password: { type: String }, // Made optional
    name: String,
    zerodhaConnected: { type: Boolean, default: false },
    kiteApiKey: String,
    kiteApiSecret: String,
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
res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
});
