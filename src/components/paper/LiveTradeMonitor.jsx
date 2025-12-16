/**
 * Live Trade Monitor - Real-time popup showing trade monitoring status
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { tradeMonitorService } from '../../services/tradeMonitorService';

export default function LiveTradeMonitor({ show, onClose }) {
    const [monitorStatus, setMonitorStatus] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(new Date());

    useEffect(() => {
        if (!show) return;

        // Update status every second
        const interval = setInterval(() => {
            const status = tradeMonitorService.getStatus();
            setMonitorStatus(status);
            setLastUpdate(new Date());
        }, 1000);

        return () => clearInterval(interval);
    }, [show]);

    if (!show || !monitorStatus) return null;

    const getStatusColor = (status) => {
        switch (status) {
            case 'WAITING_ENTRY': return 'text-yellow-400 bg-yellow-500/10';
            case 'POSITION_OPEN': return 'text-green-400 bg-green-500/10';
            case 'CLOSED': return 'text-gray-400 bg-gray-500/10';
            default: return 'text-blue-400 bg-blue-500/10';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'WAITING_ENTRY': return '⏳';
            case 'POSITION_OPEN': return '📈';
            case 'CLOSED': return '✅';
            default: return '🔄';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'WAITING_ENTRY': return 'Waiting for Entry';
            case 'POSITION_OPEN': return 'Position Active';
            case 'CLOSED': return 'Closed';
            default: return 'Monitoring';
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-start justify-end p-4 pointer-events-none">
                <motion.div
                    initial={{ opacity: 0, x: 100, y: -20 }}
                    animate={{ opacity: 1, x: 0, y: 0 }}
                    exit={{ opacity: 0, x: 100 }}
                    className="pointer-events-auto w-96 max-h-[80vh] overflow-hidden"
                >
                    {/* Main Container */}
                    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 backdrop-blur-xl">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-4 border-b border-slate-700/50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                                        <span className="text-xl">🎯</span>
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold text-lg">Live Monitor</h3>
                                        <p className="text-slate-400 text-xs">
                                            {monitorStatus.totalMonitored} stocks • Updated {lastUpdate.toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Stats Bar */}
                        <div className="grid grid-cols-3 gap-2 p-4 bg-slate-800/30">
                            <div className="text-center p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                                <div className="text-2xl font-bold text-yellow-400">{monitorStatus.waitingEntry}</div>
                                <div className="text-xs text-yellow-300/70">Waiting</div>
                            </div>
                            <div className="text-center p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                                <div className="text-2xl font-bold text-green-400">{monitorStatus.positionsOpen}</div>
                                <div className="text-xs text-green-300/70">Active</div>
                            </div>
                            <div className="text-center p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                <div className="text-2xl font-bold text-blue-400">{monitorStatus.totalMonitored}</div>
                                <div className="text-xs text-blue-300/70">Total</div>
                            </div>
                        </div>

                        {/* Stocks List */}
                        <div className="max-h-96 overflow-y-auto p-4 space-y-3">
                            {monitorStatus.monitors.map((monitor, index) => (
                                <motion.div
                                    key={monitor.symbol}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 hover:border-slate-600/50 transition-all"
                                >
                                    {/* Stock Header */}
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl">{getStatusIcon(monitor.status)}</span>
                                            <div>
                                                <div className="text-white font-bold">{monitor.symbol.replace('.NS', '')}</div>
                                                <div className="text-slate-400 text-xs">{monitor.name}</div>
                                            </div>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(monitor.status)}`}>
                                            {getStatusText(monitor.status)}
                                        </div>
                                    </div>

                                    {/* Price Info */}
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div className="bg-slate-900/50 rounded-lg p-2">
                                            <div className="text-slate-400 text-xs mb-1">Current Price</div>
                                            <div className="text-white font-bold text-lg">
                                                ₹{monitor.currentPrice ? monitor.currentPrice.toFixed(2) : '--'}
                                            </div>
                                        </div>
                                        <div className="bg-slate-900/50 rounded-lg p-2">
                                            <div className="text-slate-400 text-xs mb-1">Entry Price</div>
                                            <div className="text-blue-400 font-bold text-lg">₹{monitor.entry.toFixed(2)}</div>
                                        </div>
                                    </div>

                                    {/* Stop & Target */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                            <div>
                                                <div className="text-slate-400 text-xs">Stop Loss</div>
                                                <div className="text-red-400 font-medium text-sm">₹{monitor.stop.toFixed(2)}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                            <div>
                                                <div className="text-slate-400 text-xs">Target</div>
                                                <div className="text-green-400 font-medium text-sm">₹{monitor.target.toFixed(2)}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    {monitor.status === 'POSITION_OPEN' && monitor.currentPrice && (
                                        <div className="mt-3">
                                            <div className="h-2 bg-slate-900/50 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all ${monitor.currentPrice >= monitor.target
                                                            ? 'bg-green-500'
                                                            : monitor.currentPrice <= monitor.stop
                                                                ? 'bg-red-500'
                                                                : 'bg-blue-500'
                                                        }`}
                                                    style={{
                                                        width: `${Math.min(
                                                            100,
                                                            Math.max(
                                                                0,
                                                                ((monitor.currentPrice - monitor.stop) /
                                                                    (monitor.target - monitor.stop)) *
                                                                100
                                                            )
                                                        )}%`
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Time Info */}
                                    {monitor.entryTime && (
                                        <div className="mt-2 text-xs text-slate-500">
                                            Entered: {new Date(monitor.entryTime).toLocaleTimeString()}
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-slate-800/30 border-t border-slate-700/50">
                            <div className="flex items-center justify-between text-xs text-slate-400">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                    <span>Monitoring Active</span>
                                </div>
                                <button
                                    onClick={() => tradeMonitorService.stopMonitoring()}
                                    className="px-3 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                >
                                    Stop All
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
