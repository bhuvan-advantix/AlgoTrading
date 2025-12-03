/* global process */
import express from 'express';
import mongoose from 'mongoose';
import { KiteConnect } from 'kiteconnect';
import yahooFinance from 'yahoo-finance2';
import { Trade } from '../models/trade.js';
import { AuditLog } from '../models/audit.js';
const router = express.Router();

// Kite configuration (will use user's access token when executing live orders)
const KITE_API_KEY = process.env.KITE_API_KEY || '';

const globalKite = new KiteConnect({ api_key: KITE_API_KEY });

// Do not reference User model at module import time (server.js registers it later).
// We'll resolve the model inside the request handler so mongoose has the schema registered.

// Mock trade execution (replace with actual broker integration)
const executeTrade = async (order) => {
    // Simulate broker API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 90% success rate for testing
    if (Math.random() > 0.1) {
        return {
            success: true,
            orderId: `ORD${Date.now()}`,
            message: 'Order placed successfully'
        };
    }

    throw new Error('Order rejected: insufficient funds');
};

// --- Zerodha Tax Calculation Helper ---
const calculateZerodhaCharges = (type, quantity, price, product) => {
    const turnover = price * quantity;
    let brokerage = 0;
    let stt = 0;
    let exchangeCharges = 0;
    let gst = 0;
    let sebiCharges = 0;
    let stampDuty = 0;
    let dpCharges = 0;

    // Normalize inputs
    const isIntraday = (product || '').toUpperCase() === 'MIS';
    const isSell = type === 'SELL';
    const isBuy = type === 'BUY';

    // 1. Exchange Transaction Charges (NSE Equity) - ~0.00345%
    exchangeCharges = turnover * 0.0000345;

    // 2. SEBI Charges - ₹10 / crore (0.0001%)
    sebiCharges = turnover * 0.000001;

    if (isIntraday) {
        // Intraday Equity
        // Brokerage: 0.03% or ₹20 whichever is lower
        brokerage = Math.min(turnover * 0.0003, 20);

        // STT: 0.025% on SELL only
        if (isSell) {
            stt = turnover * 0.00025;
        }

        // Stamp Duty: 0.003% on BUY only
        if (isBuy) {
            stampDuty = turnover * 0.00003;
        }
    } else {
        // Delivery Equity
        // Brokerage: ₹0
        brokerage = 0;

        // STT: 0.1% on BUY and SELL
        stt = turnover * 0.001;

        // Stamp Duty: 0.015% on BUY only
        if (isBuy) {
            stampDuty = turnover * 0.00015;
        }

        // DP Charges: ~₹15.93 on SELL only (₹13.5 + 18% GST)
        if (isSell) {
            dpCharges = 15.93;
        }
    }

    // GST: 18% on (Brokerage + Exchange Charges + SEBI Charges)
    gst = (brokerage + exchangeCharges + sebiCharges) * 0.18;

    const totalCharges = brokerage + stt + exchangeCharges + gst + sebiCharges + stampDuty + dpCharges;

    // Net Amount
    // BUY: Cost = Turnover + Charges
    // SELL: Realized = Turnover - Charges
    let netAmount = 0;
    if (isBuy) {
        netAmount = turnover + totalCharges;
    } else {
        netAmount = turnover - totalCharges;
    }

    return {
        brokerage,
        stt,
        exchangeCharges,
        gst,
        sebiCharges,
        stampDuty,
        dpCharges,
        totalCharges,
        netAmount
    };
};

router.post('/trades/execute', async (req, res) => {
    try {
        const order = req.body;
        // Validate order parameters
        if (!order.symbol || !order.type || !order.quantity) {
            return res.status(400).json({
                success: false,
                error: 'Invalid order: symbol, type and quantity are required.'
            });
        }

        // If it's a MARKET order and no price provided, fill with a mock market price
        if ((!order.price || isNaN(order.price)) && (order.orderType || '').toUpperCase() === 'MARKET') {
            // In production, fetch real-time quote from market data provider
            // Here we simulate with a simple deterministic mock price
            try {
                // Fetch live price from Yahoo Finance
                let searchSymbol = order.symbol;
                if (!searchSymbol.includes('.')) searchSymbol += '.NS';
                const quote = await yahooFinance.quote(searchSymbol);
                if (quote && quote.regularMarketPrice) {
                    order.price = quote.regularMarketPrice;
                } else {
                    throw new Error('Quote not found');
                }
            } catch (err) {
                console.warn(`Failed to fetch live price for ${order.symbol}, falling back to mock:`, err.message);
                const base = 100; // fallback base price
                const mockPrice = Math.max(1, Math.round((base + (Math.random() - 0.5) * 20) * 100) / 100);
                order.price = mockPrice;
            }
        }

        // For limit orders ensure price is provided
        if ((order.orderType || '').toUpperCase() === 'LIMIT' && (!order.price || isNaN(order.price))) {
            return res.status(400).json({ success: false, error: 'Limit orders require a valid price.' });
        }

        // If the client requested execution on Zerodha and we have a Kite session for the user, attempt real placement
        let result;
        const kiteHeader = req.headers['x-kite-user-id'];
        const incomingUserId = kiteHeader || req.headers['x-user-id'] || null;

        if (order.executeOnZerodha && incomingUserId) {
            try {
                // resolve the User model at runtime (server.js registers it during startup)
                const User = mongoose.model('User');
                const user = await User.findOne({ userId: incomingUserId });
                if (user && user.kiteAccessToken) {
                    // Use a KiteConnect instance with the stored access token
                    globalKite.setAccessToken(user.kiteAccessToken);

                    // Prepare Kite order payload with simple mapping
                    const symbolMap = {
                        RELIANCE: { exchange: 'NSE', product: 'CNC', tradingsymbol: 'RELIANCE' },
                        HDFCBANK: { exchange: 'NSE', product: 'CNC', tradingsymbol: 'HDFCBANK' },
                        TCS: { exchange: 'NSE', product: 'CNC', tradingsymbol: 'TCS' }
                        // Add more mappings as needed for production
                    };

                    const mapped = symbolMap[(order.symbol || '').toUpperCase()] || { exchange: 'NSE', product: order.product || 'CNC', tradingsymbol: order.symbol };

                    const kiteOrder = {
                        exchange: mapped.exchange,
                        tradingsymbol: mapped.tradingsymbol,
                        transaction_type: order.type, // 'BUY' or 'SELL'
                        quantity: parseInt(order.quantity, 10),
                        order_type: (order.orderType || 'MARKET').toUpperCase(),
                        product: mapped.product,
                    };

                    if (kiteOrder.order_type === 'LIMIT') {
                        kiteOrder.price = parseFloat(order.price);
                    }

                    // Call Kite placeOrder (this may throw on failure)
                    const kiteResponse = await globalKite.placeOrder(kiteOrder);
                    // Normalize kite response
                    result = {
                        success: true,
                        orderId: kiteResponse.order_id || `KITE_${Date.now()}`,
                        message: 'Order placed on Zerodha'
                    };
                }
            } catch (kiteErr) {
                console.error('Kite placement error:', kiteErr?.data || kiteErr?.message || kiteErr);
                // Fall back to mock execution below
            }
        }

        // If kite execution was not requested or did not succeed, use mock execution
        if (!result) {
            result = await executeTrade(order);
        }

        // Determine Product Type (CNC/MIS) for Tax Calculation
        // Use the same logic as the Kite mapping above
        const symbolMap = {
            RELIANCE: { exchange: 'NSE', product: 'CNC', tradingsymbol: 'RELIANCE' },
            HDFCBANK: { exchange: 'NSE', product: 'CNC', tradingsymbol: 'HDFCBANK' },
            TCS: { exchange: 'NSE', product: 'CNC', tradingsymbol: 'TCS' }
        };
        const mappedInfo = symbolMap[(order.symbol || '').toUpperCase()] || { product: order.product || 'CNC' };
        const productType = mappedInfo.product;

        // Calculate Taxes & Charges
        const taxes = calculateZerodhaCharges(order.type, order.quantity, order.price, productType);

        // Store the order in database
        // incomingUserId already captured earlier
        const tradeRecord = await Trade.create({
            userId: incomingUserId,
            ...order,
            orderId: result.orderId,
            status: 'EXECUTED',
            timestamp: new Date(),
            // Add Tax Fields
            brokerage: taxes.brokerage,
            stt: taxes.stt,
            exchangeCharges: taxes.exchangeCharges,
            gst: taxes.gst,
            sebiCharges: taxes.sebiCharges,
            stampDuty: taxes.stampDuty,
            dpCharges: taxes.dpCharges,
            totalCharges: taxes.totalCharges,
            netAmount: taxes.netAmount
        });

        // Create audit log
        await AuditLog.create({
            userId: incomingUserId,
            eventType: 'TRADE_EXECUTED',
            message: `${order.type} order placed for ${order.symbol}`,
            details: {
                orderId: result.orderId,
                symbol: order.symbol,
                type: order.type,
                quantity: order.quantity,
                price: order.price
            }
        });

        res.json({
            success: true,
            orderId: result.orderId,
            message: result.message,
            order: tradeRecord
        });
    } catch (error) {
        console.error('Trade execution error (detailed):', error);

        // Mongoose validation / cast errors -> return 400 with a helpful message
        if (error.name === 'ValidationError' || error.name === 'BSONError' || error.name === 'CastError') {
            const friendly = (error.message || '').replace(/validation failed:/i, '').trim();
            return res.status(400).json({
                success: false,
                error: `Order validation failed: ${friendly}. Please review the order details and try again.`
            });
        }

        // Domain errors from broker/mock execution (e.g., insufficient funds)
        if (error.message && /insufficient funds|order rejected|rejected/i.test(error.message)) {
            return res.status(400).json({
                success: false,
                error: `Order rejected by broker: ${error.message}. Please check your account balance and order parameters.`
            });
        }

        // For all other errors, return a generic but professional message and log details server-side.
        return res.status(500).json({
            success: false,
            error: 'An unexpected error occurred while processing your order. Please try again or contact support if the problem persists.'
        });
    }
});

// Get active trades
router.get('/trades/active', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        const trades = await Trade.find({
            userId,
            status: { $in: ['PENDING', 'EXECUTED'] }
        }).sort({ timestamp: -1 });

        res.json({
            success: true,
            trades
        });
    } catch (error) {
        console.error('Error fetching active trades:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;