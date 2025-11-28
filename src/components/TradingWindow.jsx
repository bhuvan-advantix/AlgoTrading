import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, Lock, Unlock, CheckCircle, XCircle } from 'lucide-react';

// Trading status types
const TRADE_STATUS = {
            {/* Trade Status */}
            {tradeStatus && (
                <div className={`mt-4 rounded-lg p-4 flex items-center space-x-2
                    ${tradeStatus.type === TRADE_STATUS.COMPLETED ? 'bg-green-900/20 text-green-400' :
                      tradeStatus.type === TRADE_STATUS.FAILED ? 'bg-red-900/20 text-red-400' :
                      tradeStatus.type === TRADE_STATUS.EXECUTING ? 'bg-blue-900/20 text-blue-400' :
                      'bg-gray-800/40 text-gray-400'}`}
                >
                    {tradeStatus.type === TRADE_STATUS.COMPLETED ? <CheckCircle className="w-5 h-5" /> :
                     tradeStatus.type === TRADE_STATUS.FAILED ? <XCircle className="w-5 h-5" /> :
                     <Clock className="w-5 h-5 animate-spin" />}
                    <span>{tradeStatus.message}</span>
                </div>
            )}

            {/* Active Orders */}
            {activeOrders.length > 0 && (
                <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-medium text-gray-400">Active Orders</h4>
                    {activeOrders.map((order) => (
                        <div key={order.id} className="bg-gray-800/40 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <span className="font-medium text-white">{order.symbol}</span>
                                    <span className={`text-sm ${order.type === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                                        {order.type}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-400">
                                    @ {order.price}
                                </div>
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                                SL: {order.stopLoss} | Target: {order.target} | Qty: {order.quantity}
                            </div>
                        </div>
                    ))}
                </div>
            )}
    PENDING: 'pending',
    EXECUTING: 'executing',
    COMPLETED: 'completed',
    FAILED: 'failed'
};

// Trading window configuration
const TRADING_WINDOW = {
    start: "09:15",
    end: "11:15",
    timezone: "Asia/Kolkata"
};

// Trade limits configuration
const TRADE_LIMITS = {
    maxTradesPerDay: 2,
    minimumTradeInterval: 5 // minutes
};

const TradingWindow = ({ onStatusChange, aiRecommendations, symbol, riskParams }) => {
    const [status, setStatus] = useState({
        isWithinWindow: false,
        remainingTrades: TRADE_LIMITS.maxTradesPerDay,
        nextTradeAvailable: null,
        currentTime: "",
        message: ""
    });
    const [activeOrders, setActiveOrders] = useState([]);
    const [tradeStatus, setTradeStatus] = useState(null);

    useEffect(() => {
        const checkTradingWindow = () => {
            const now = new Date();
            const istTime = new Intl.DateTimeFormat('en-US', {
                timeZone: TRADING_WINDOW.timezone,
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).format(now);

            const [currentHour, currentMinute] = istTime.split(':').map(Number);
            const currentMinutes = currentHour * 60 + currentMinute;

            const [startHour, startMinute] = TRADING_WINDOW.start.split(':').map(Number);
            const [endHour, endMinute] = TRADING_WINDOW.end.split(':').map(Number);

            const startMinutes = startHour * 60 + startMinute;
            const endMinutes = endHour * 60 + endMinute;

            const isWithinWindow = currentMinutes >= startMinutes && currentMinutes <= endMinutes;

            let message = isWithinWindow 
                ? "Trading window is open"
                : currentMinutes < startMinutes
                    ? "Trading window opens soon"
                    : "Trading window is closed";

            setStatus(prev => ({
                ...prev,
                isWithinWindow,
                currentTime: istTime,
                message
            }));

            // Notify parent component of status change
            onStatusChange?.({
                isWithinWindow,
                remainingTrades: status.remainingTrades,
                canTrade: isWithinWindow && status.remainingTrades > 0 && !status.nextTradeAvailable
            });
        };

        // Initial check
        checkTradingWindow();
        
        // Set up interval
        const interval = setInterval(checkTradingWindow, 1000);
        
        // Cleanup
        return () => clearInterval(interval);
    }, [onStatusChange, status.remainingTrades, status.nextTradeAvailable]);

    const statusColor = status.isWithinWindow 
        ? status.remainingTrades > 0 
            ? 'bg-green-900/50 text-green-400 border-green-700'
            : 'bg-yellow-900/50 text-yellow-400 border-yellow-700'
        : 'bg-red-900/50 text-red-400 border-red-700';

    return (
        <div className="rounded-xl border bg-gray-800/50 shadow-lg p-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-purple-400" />
                    <div>
                        <h3 className="font-semibold text-white">Trading Window Status</h3>
                        <p className="text-sm text-gray-400">
                            {TRADING_WINDOW.start} - {TRADING_WINDOW.end} IST
                        </p>
                    </div>
                </div>
                {status.isWithinWindow ? (
                    <Unlock className="w-5 h-5 text-green-400" />
                ) : (
                    <Lock className="w-5 h-5 text-red-400" />
                )}
            </div>

            <div className={`rounded-lg p-4 ${statusColor}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        {status.isWithinWindow ? (
                            status.remainingTrades > 0 ? (
                                <Clock className="w-5 h-5" />
                            ) : (
                                <AlertTriangle className="w-5 h-5" />
                            )
                        ) : (
                            <Lock className="w-5 h-5" />
                        )}
                        <span className="font-medium">{status.message}</span>
                    </div>
                    <span className="text-sm font-mono">{status.currentTime}</span>
                </div>
                
                {status.isWithinWindow && (
                    <div className="mt-2 text-sm">
                        <p>Remaining trades today: {status.remainingTrades}/{TRADE_LIMITS.maxTradesPerDay}</p>
                        {status.nextTradeAvailable && (
                            <p>Next trade available in: {status.nextTradeAvailable}</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TradingWindow;