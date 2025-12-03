import mongoose from 'mongoose';

const tradeSchema = new mongoose.Schema({
    // Allow userId to be stored as either ObjectId or string (UUID) to support mock users and external IDs
    userId: { type: mongoose.Schema.Types.Mixed, required: true },
    symbol: { type: String, required: true },
    type: { type: String, required: true, enum: ['BUY', 'SELL'] },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    orderId: { type: String },
    stopLoss: { type: Number },
    target: { type: Number },
    status: { type: String, default: 'PENDING', enum: ['PENDING', 'EXECUTED', 'COMPLETED', 'CANCELLED'] },
    pnl: { type: Number },
    timestamp: { type: Date, default: Date.now },
    confidence: { type: Number }, // AI recommendation confidence
    aiRecommendation: { type: String }, // Store AI's analysis basis
    executionTime: { type: Number }, // Time taken to execute
    tradingWindow: { type: String }, // Record which trading window this was executed in

    // --- Zerodha Brokerage & Tax Fields ---
    brokerage: { type: Number, default: 0 },
    stt: { type: Number, default: 0 },
    exchangeCharges: { type: Number, default: 0 },
    gst: { type: Number, default: 0 },
    sebiCharges: { type: Number, default: 0 },
    stampDuty: { type: Number, default: 0 },
    dpCharges: { type: Number, default: 0 },
    totalCharges: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 }, // Final amount (Price * Qty +/- Charges)
});

export const Trade = mongoose.models.Trade || mongoose.model('Trade', tradeSchema);