import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { readState } from '../../utils/paperTradingStore';

// Simple Trading History - Shows ALL orders
export default function ComprehensiveTradingHistory() {
    const [allOrders, setAllOrders] = useState([]);
    const [dateFilter, setDateFilter] = useState('all');
    const [stockFilter, setStockFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'buy', 'sell'
    const [tradeTypeFilter, setTradeTypeFilter] = useState('all'); // 'all', 'manual', 'ai'

    const currency = '₹';

    useEffect(() => {
        const state = readState();
        setAllOrders(state.orders || []);
    }, []);

    // Filter orders
    const getFilteredOrders = () => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

        return allOrders.filter(order => {
            // Date filter
            const orderDate = new Date(order.timestamp);
            let passDateFilter = true;
            switch (dateFilter) {
                case 'today':
                    passDateFilter = orderDate >= today;
                    break;
                case 'week':
                    passDateFilter = orderDate >= weekAgo;
                    break;
                case 'month':
                    passDateFilter = orderDate >= monthAgo;
                    break;
            }

            // Stock filter
            const passStockFilter = !stockFilter ||
                order.symbol.toLowerCase().includes(stockFilter.toLowerCase());

            // Type filter
            let passTypeFilter = true;
            if (typeFilter === 'buy') passTypeFilter = order.side === 'BUY';
            if (typeFilter === 'sell') passTypeFilter = order.side === 'SELL';

            // Trade type filter
            let passTradeTypeFilter = true;
            if (tradeTypeFilter === 'ai') passTradeTypeFilter = order.isAIOrder;
            if (tradeTypeFilter === 'manual') passTradeTypeFilter = !order.isAIOrder;

            return passDateFilter && passStockFilter && passTypeFilter && passTradeTypeFilter;
        }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    };

    const filteredOrders = getFilteredOrders();

    // Calculate summary
    const calculateSummary = () => {
        const buyOrders = filteredOrders.filter(o => o.side === 'BUY');
        const sellOrders = filteredOrders.filter(o => o.side === 'SELL');

        const totalBuyValue = buyOrders.reduce((sum, o) => sum + (o.price * o.quantity), 0);
        const totalSellValue = sellOrders.reduce((sum, o) => sum + (o.price * o.quantity), 0);
        const totalBrokerage = filteredOrders.reduce((sum, o) => sum + (o.brokerage || 0), 0);
        const totalTaxes = filteredOrders.reduce((sum, o) => sum + (o.taxes || 0), 0);
        const totalCharges = totalBrokerage + totalTaxes;

        return {
            totalOrders: filteredOrders.length,
            buyOrders: buyOrders.length,
            sellOrders: sellOrders.length,
            totalBuyValue,
            totalSellValue,
            totalBrokerage,
            totalTaxes,
            totalCharges
        };
    };

    const summary = calculateSummary();

    // Export to CSV
    const exportToCSV = () => {
        const headers = ['Date', 'Time', 'Symbol', 'Type', 'Trade Type', 'Qty', 'Price', 'Amount', 'Brokerage', 'Taxes', 'Total'];

        const rows = filteredOrders.map(o => {
            const amount = o.price * o.quantity;
            const brokerage = o.brokerage || 0;
            const taxes = o.taxes || 0;
            const total = o.side === 'BUY' ? amount + brokerage + taxes : amount - brokerage - taxes;

            return [
                new Date(o.timestamp).toLocaleDateString('en-IN'),
                new Date(o.timestamp).toLocaleTimeString('en-IN'),
                o.symbol,
                o.side,
                o.isAIOrder ? 'AI' : 'Manual',
                o.quantity,
                o.price.toFixed(2),
                amount.toFixed(2),
                brokerage.toFixed(2),
                taxes.toFixed(2),
                total.toFixed(2)
            ];
        });

        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trading_history_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gradient-to-br from-[#111526] to-[#1a1f3a] p-6 rounded-xl border border-cyan-500/30 shadow-2xl mb-4"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="text-2xl">📊</span> Trading History
                </h3>
                <button
                    onClick={exportToCSV}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-all"
                >
                    📥 Export CSV
                </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div>
                    <label className="text-xs text-gray-400 mb-1 block">Date Range</label>
                    <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="w-full bg-slate-800 text-white px-3 py-2 rounded-lg text-sm border border-slate-700 focus:border-cyan-500 outline-none"
                    >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                    </select>
                </div>

                <div>
                    <label className="text-xs text-gray-400 mb-1 block">Stock Symbol</label>
                    <input
                        type="text"
                        value={stockFilter}
                        onChange={(e) => setStockFilter(e.target.value)}
                        placeholder="Search..."
                        className="w-full bg-slate-800 text-white px-3 py-2 rounded-lg text-sm border border-slate-700 focus:border-cyan-500 outline-none"
                    />
                </div>

                <div>
                    <label className="text-xs text-gray-400 mb-1 block">Order Type</label>
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="w-full bg-slate-800 text-white px-3 py-2 rounded-lg text-sm border border-slate-700 focus:border-cyan-500 outline-none"
                    >
                        <option value="all">All Orders</option>
                        <option value="buy">Buy Only</option>
                        <option value="sell">Sell Only</option>
                    </select>
                </div>

                <div>
                    <label className="text-xs text-gray-400 mb-1 block">Trade Type</label>
                    <select
                        value={tradeTypeFilter}
                        onChange={(e) => setTradeTypeFilter(e.target.value)}
                        className="w-full bg-slate-800 text-white px-3 py-2 rounded-lg text-sm border border-slate-700 focus:border-cyan-500 outline-none"
                    >
                        <option value="all">All</option>
                        <option value="manual">Manual</option>
                        <option value="ai">AI Trades</option>
                    </select>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-blue-900/20 p-3 rounded-lg border border-blue-500/50">
                    <div className="text-xs text-gray-400 mb-1">Total Buy Value</div>
                    <div className="text-lg font-bold text-blue-400">{currency}{summary.totalBuyValue.toFixed(2)}</div>
                    <div className="text-xs text-gray-500 mt-1">{summary.buyOrders} buy orders</div>
                </div>

                <div className="bg-green-900/20 p-3 rounded-lg border border-green-500/50">
                    <div className="text-xs text-gray-400 mb-1">Total Sell Value</div>
                    <div className="text-lg font-bold text-green-400">{currency}{summary.totalSellValue.toFixed(2)}</div>
                    <div className="text-xs text-gray-500 mt-1">{summary.sellOrders} sell orders</div>
                </div>

                <div className="bg-yellow-900/20 p-3 rounded-lg border border-yellow-500/50">
                    <div className="text-xs text-gray-400 mb-1">Total Brokerage</div>
                    <div className="text-lg font-bold text-yellow-400">{currency}{summary.totalBrokerage.toFixed(2)}</div>
                    <div className="text-xs text-gray-500 mt-1">Broker fees</div>
                </div>

                <div className="bg-orange-900/20 p-3 rounded-lg border border-orange-500/50">
                    <div className="text-xs text-gray-400 mb-1">Total Taxes</div>
                    <div className="text-lg font-bold text-orange-400">{currency}{summary.totalTaxes.toFixed(2)}</div>
                    <div className="text-xs text-gray-500 mt-1">GST + STT</div>
                </div>
            </div>

            {/* Orders Table */}
            {filteredOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                    <div className="text-4xl mb-2">📄</div>
                    <div>No orders found</div>
                    <div className="text-xs mt-1">Try adjusting your filters</div>
                </div>
            ) : (
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="w-full">
                        <thead className="bg-slate-800/70 sticky top-0">
                            <tr>
                                <th className="text-left p-2 text-xs font-semibold text-cyan-300">Date & Time</th>
                                <th className="text-left p-2 text-xs font-semibold text-cyan-300">Stock</th>
                                <th className="text-center p-2 text-xs font-semibold text-cyan-300">Type</th>
                                <th className="text-center p-2 text-xs font-semibold text-cyan-300">Trade Type</th>
                                <th className="text-right p-2 text-xs font-semibold text-cyan-300">Qty</th>
                                <th className="text-right p-2 text-xs font-semibold text-cyan-300">Price</th>
                                <th className="text-right p-2 text-xs font-semibold text-cyan-300">Amount</th>
                                <th className="text-right p-2 text-xs font-semibold text-cyan-300">Brokerage</th>
                                <th className="text-right p-2 text-xs font-semibold text-cyan-300">Taxes</th>
                                <th className="text-right p-2 text-xs font-semibold text-cyan-300">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map((order, idx) => {
                                const amount = order.price * order.quantity;
                                const brokerage = order.brokerage || 0;
                                const taxes = order.taxes || 0;
                                const total = order.side === 'BUY' ? amount + brokerage + taxes : amount - brokerage - taxes;
                                const isBuy = order.side === 'BUY';

                                return (
                                    <tr key={idx} className="border-t border-slate-700/50 hover:bg-slate-800/30 transition-colors">
                                        <td className="p-2 text-xs text-gray-400">
                                            {new Date(order.timestamp).toLocaleString('en-IN', {
                                                day: '2-digit',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </td>
                                        <td className="p-2">
                                            <div className="flex items-center gap-2">
                                                {order.isAIOrder && <span className="text-base">🤖</span>}
                                                <div className="font-bold text-white text-sm">{order.symbol.replace('.NS', '')}</div>
                                            </div>
                                        </td>
                                        <td className="text-center p-2">
                                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${isBuy ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                                                }`}>
                                                {order.side}
                                            </span>
                                        </td>
                                        <td className="text-center p-2">
                                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${order.isAIOrder ? 'bg-purple-900/30 text-purple-400' : 'bg-blue-900/30 text-blue-400'
                                                }`}>
                                                {order.isAIOrder ? 'AI' : 'Manual'}
                                            </span>
                                        </td>
                                        <td className="text-right p-2 text-white font-semibold text-sm">{order.quantity}</td>
                                        <td className="text-right p-2 text-cyan-400 font-semibold text-sm">{currency}{order.price.toFixed(2)}</td>
                                        <td className="text-right p-2 text-white font-bold text-sm">{currency}{amount.toFixed(2)}</td>
                                        <td className="text-right p-2 text-yellow-400 text-xs">{currency}{brokerage.toFixed(2)}</td>
                                        <td className="text-right p-2 text-orange-400 text-xs">{currency}{taxes.toFixed(2)}</td>
                                        <td className="text-right p-2">
                                            <div className={`font-bold text-sm ${isBuy ? 'text-red-400' : 'text-green-400'}`}>
                                                {isBuy ? '-' : '+'}{currency}{total.toFixed(2)}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-slate-700/50 text-sm text-gray-400 flex justify-between items-center">
                <div>Showing {filteredOrders.length} of {allOrders.length} orders</div>
                <div className="text-xs">
                    {summary.buyOrders} buys • {summary.sellOrders} sells
                </div>
            </div>
        </motion.div>
    );
}
