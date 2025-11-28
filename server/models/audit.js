import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
    // Support ObjectId or external string user identifiers (UUID) for test environments
    userId: { type: mongoose.Schema.Types.Mixed, required: true },
    timestamp: { type: Date, default: Date.now },
    eventType: {
        type: String,
        required: true,
        enum: [
            'USER_REGISTERED',
            'USER_LOGIN',
            'TRADE_EXECUTED',
            'TRADE_COMPLETED',
            'TRADE_CANCELLED',
            'SETTINGS_UPDATED',
            'AI_RECOMMENDATION',
            'RISK_ALERT',
            'TRADING_WINDOW_CHANGE',
            'ERROR'
        ]
    },
    message: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed },
    severity: {
        type: String,
        enum: ['INFO', 'WARNING', 'ERROR', 'CRITICAL'],
        default: 'INFO'
    },
    source: {
        type: String,
        enum: ['SYSTEM', 'USER', 'AI', 'TRADING', 'RISK'],
        default: 'SYSTEM'
    }
});

export const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);