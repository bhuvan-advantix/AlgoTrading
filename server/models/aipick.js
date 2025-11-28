import mongoose from 'mongoose';

const AiPickSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    symbol: { type: String, required: true },
    confidence: { type: Number, required: true },
    reason: { type: String },
    action: { type: String, enum: ['BUY', 'SELL', 'HOLD'], required: true },
    suggestedSL: { type: Number },
    suggestedTP: { type: Number },
    isUserSelected: { type: Boolean, default: false },
    lastUpdated: { type: Date, default: Date.now }
});

export const AiPick = mongoose.models.AiPick || mongoose.model('AiPick', AiPickSchema);