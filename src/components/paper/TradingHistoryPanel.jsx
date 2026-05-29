import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { readState } from '../../utils/paperTradingStore';

export default function TradingHistoryPanel() {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [orders, setOrders] = useState([]);

    useEffect(() => {
        const state = readState();
        setOrders(state.orders || []);
    }, []);
 
    const getTodayDate = () => new Date().toISOString().split('T')[0];
    const getDaysAgo = (days) => {
        const date = new Date();
        date.setDate(date.getDate() - days);
        return date.toISOString().split('T')[0];
    };

    const getFilteredOrders = () => {
        if (!startDate && !endDate) return orders;
        return orders.filter(order => {
            const orderDate = new Date(order.ts);
            const start = startDate ? new Date(startDate) : new Date(0);
            const end = endDate ? new Date(endDate) : new Date();
            end.setHours(23, 59, 59, 999);
            return orderDate >= start && orderDate <= end;
        });
    };

    const filteredOrders = getFilteredOrders();

    const stats = filteredOrders.reduce((acc, order) => {
        const gross = Number(order.price) * Number(order.qty);
        const brokerage = Number(order.charges?.brokerage || 0);
        const totalCharges = Number(order.totalCharges || 0);
        const taxes = totalCharges - brokerage;

        if (order.side === 'BUY') {
            acc.totalBought += gross;
            acc.buyCount++;
        } else {
            acc.totalSold += gross;
            acc.sellCount++;
        }

        acc.totalBrokerage += brokerage;
        acc.totalTaxes += taxes;
        acc.totalCharges += totalCharges;
        return acc;
    }, {
        totalBought: 0,
        totalSold: 0,
        totalBrokerage: 0,
        totalTaxes: 0,
        totalCharges: 0,
        buyCount: 0,
        sellCount: 0
    });

    const profit = stats.totalSold - stats.totalBought - stats.totalCharges;
    const profitPercent = stats.totalBought > 0 ? ((profit / stats.totalBought) * 100) : 0;

    // Calculate Period P&L (for selected date range)
    const selectedPeriodPnL = profit;

    const stockPerformance = {};
    filteredOrders.forEach(order => {
        if (!stockPerformance[order.symbol]) {
            stockPerformance[order.symbol] = { bought: 0, sold: 0 };
        }
        const gross = Number(order.price) * Number(order.qty);
        if (order.side === 'BUY') {
            stockPerformance[order.symbol].bought += gross;
        } else {
            stockPerformance[order.symbol].sold += gross;
        }
    });

    const stockProfits = Object.entries(stockPerformance).map(([symbol, data]) => ({
        symbol,
        profit: data.sold - data.bought,
        trades: filteredOrders.filter(o => o.symbol === symbol).length
    })).filter(s => s.profit !== 0).sort((a, b) => b.profit - a.profit);

    const bestStock = stockProfits[0];
    const worstStock = stockProfits[stockProfits.length - 1];

    const dailyPnL = {};
    filteredOrders.forEach(order => {
        const date = new Date(order.ts).toLocaleDateString('en-IN');
        if (!dailyPnL[date]) {
            dailyPnL[date] = { bought: 0, sold: 0, charges: 0 };
        }
        const gross = Number(order.price) * Number(order.qty);
        const totalCharges = Number(order.totalCharges || 0);

        if (order.side === 'BUY') {
            dailyPnL[date].bought += gross;
        } else {
            dailyPnL[date].sold += gross;
        }
        dailyPnL[date].charges += totalCharges;
    });

    const exportToCSV = () => {
        const headers = ['Date & Time', 'Stock', 'Buy/Sell', 'Quantity', 'Price', 'Total Amount', 'Brokerage', 'Taxes', 'Final Amount'];
        const rows = filteredOrders.map(order => {
            const gross = Number(order.price) * Number(order.qty);
            const brokerage = Number(order.charges?.brokerage || 0);
            const totalCharges = Number(order.totalCharges || 0);
            const taxes = totalCharges - brokerage;
            const net = Number(order.netAmount || gross);
            const currency = order.currency === 'INR' ? '₹' : '$';

            return [
                new Date(order.ts).toLocaleString('en-IN'),
                order.symbol,
                order.side,
                Number(order.qty).toFixed(4),
                `${currency}${Number(order.price).toFixed(2)}`,
                `${currency}${gross.toFixed(2)}`,
                `${currency}${brokerage.toFixed(2)}`,
                `${currency}${taxes.toFixed(2)}`,
                `${currency}${net.toFixed(2)}`
            ];
        });

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trading-history-${getTodayDate()}.csv`;
        a.click();
    };

    const getSuggestions = () => {
        const suggestions = [];

        if (stats.buyCount > stats.sellCount * 2) {
            suggestions.push({ icon: '💡', text: 'You are buying more than selling. Consider taking profits on winning stocks.', type: 'tip' });
        }

        if (stats.sellCount > stats.buyCount * 2) {
            suggestions.push({ icon: '📈', text: 'You are selling more than buying. Look for good buying opportunities.', type: 'tip' });
        }

        if (stats.totalCharges > profit && profit > 0) {
            suggestions.push({ icon: '⚠️', text: 'Your fees are eating your profits! Try to reduce trading frequency.', type: 'warning' });
        }

        if (profit < 0 && Math.abs(profit) > stats.totalBought * 0.1) {
            suggestions.push({ icon: '🛑', text: 'Your losses are more than 10%. Review your strategy and learn from mistakes.', type: 'warning' });
        }

        if (profit > 0 && profitPercent > 5) {
            suggestions.push({ icon: '🎉', text: `Great job! You made ${profitPercent.toFixed(1)}% profit. Keep up the good work!`, type: 'success' });
        }

        if (filteredOrders.length > 20) {
            suggestions.push({ icon: '📊', text: 'You are an active trader! Make sure each trade has a clear reason.', type: 'tip' });
        }

        if (suggestions.length === 0) {
            suggestions.push({ icon: '✨', text: 'Keep learning and improving your trading skills!', type: 'tip' });
        }

        return suggestions;
    };

    const suggestions = getSuggestions();

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gradient-to-br from-[#111526] to-[#1a1f3a] p-6 rounded-xl border border-cyan-800 shadow-2xl"
        >
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">📊 My Trading History</h3>
                <button
                    onClick={exportToCSV}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-2"
                >
                    📥 Download Excel
                </button>
            </div>

            {/* Quick Date Filters */}
            <div className="bg-gray-800/50 p-4 rounded-lg mb-4">
                <div className="flex flex-wrap gap-2 mb-3">
                    <button
                        onClick={() => { setStartDate(getTodayDate()); setEndDate(getTodayDate()); }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition"
                    >
                        Today
                    </button>
                    <button
                        onClick={() => { setStartDate(getDaysAgo(7)); setEndDate(getTodayDate()); }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition"
                    >
                        Last 7 Days
                    </button>
                    <button
                        onClick={() => { setStartDate(getDaysAgo(30)); setEndDate(getTodayDate()); }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition"
                    >
                        Last 30 Days
                    </button>
                    <button
                        onClick={() => { setStartDate(''); setEndDate(''); }}
                        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs font-medium transition"
                    >
                        All Time
                    </button>
                </div>
                <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <label className="text-xs text-gray-400 block mb-1">From Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                        />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="text-xs text-gray-400 block mb-1">To Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Smart Suggestions */}
            {filteredOrders.length > 0 && (
                <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 p-4 rounded-lg mb-4">
                    <h4 className="text-sm font-semibold text-purple-300 mb-2">💡 Smart Tips for You</h4>
                    <div className="space-y-2">
                        {suggestions.map((sug, idx) => (
                            <div key={idx} className={`flex items-start gap-2 text-sm p-2 rounded ${sug.type === 'success' ? 'bg-green-900/20' :
                                sug.type === 'warning' ? 'bg-orange-900/20' : 'bg-blue-900/20'
                                }`}>
                                <span className="text-lg">{sug.icon}</span>
                                <span className="text-gray-200">{sug.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                <div className="bg-green-900/20 border border-green-700/30 p-3 rounded-lg">
                    <div className="text-xs text-green-400 mb-1">Money Spent (Buying)</div>
                    <div className="text-lg font-bold text-green-300">₹{stats.totalBought.toFixed(2)}</div>
                    <div className="text-xs text-gray-400">{stats.buyCount} buys</div>
                </div>
                <div className="bg-red-900/20 border border-red-700/30 p-3 rounded-lg">
                    <div className="text-xs text-red-400 mb-1">Money Received (Selling)</div>
                    <div className="text-lg font-bold text-red-300">₹{stats.totalSold.toFixed(2)}</div>
                    <div className="text-xs text-gray-400">{stats.sellCount} sells</div>
                </div>
                <div className="bg-yellow-900/20 border border-yellow-700/30 p-3 rounded-lg">
                    <div className="text-xs text-yellow-400 mb-1">Brokerage Paid</div>
                    <div className="text-lg font-bold text-yellow-300">₹{stats.totalBrokerage.toFixed(2)}</div>
                </div>
                <div className="bg-orange-900/20 border border-orange-700/30 p-3 rounded-lg">
                    <div className="text-xs text-orange-400 mb-1">Taxes Paid</div>
                    <div className="text-lg font-bold text-orange-300">₹{stats.totalTaxes.toFixed(2)}</div>
                </div>
                <div className={`border p-3 rounded-lg ${selectedPeriodPnL >= 0 ? 'bg-emerald-900/20 border-emerald-700/30' : 'bg-red-900/20 border-red-700/30'}`}>
                    <div className={`text-xs mb-1 ${selectedPeriodPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>Period P&L</div>
                    <div className={`text-lg font-bold ${selectedPeriodPnL >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                        {selectedPeriodPnL >= 0 ? '+' : ''}₹{selectedPeriodPnL.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-400">For selected dates</div>
                </div>
            </div>

            {/* Profit/Loss Summary */}
            <div className={`p-4 rounded-lg border-2 mb-4 ${profit >= 0 ? 'bg-emerald-900/20 border-emerald-500' : 'bg-red-900/20 border-red-500'}`}>
                <div className="flex justify-between items-center">
                    <div>
                        <div className="text-sm text-gray-300 mb-1">
                            {profit >= 0 ? '✅ Your Total Profit' : '❌ Your Total Loss'}
                        </div>
                        <div className={`text-3xl font-extrabold ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {profit >= 0 ? '+' : ''}₹{profit.toFixed(2)}
                            <span className="text-lg ml-2">({profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(1)}%)</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-gray-400">Total Fees</div>
                        <div className="text-lg font-bold text-orange-400">₹{stats.totalCharges.toFixed(2)}</div>
                    </div>
                </div>
                <div className="mt-3 text-xs text-gray-300 bg-black/20 p-2 rounded">
                    <strong>How we calculated:</strong> Money Received (₹{stats.totalSold.toFixed(2)}) - Money Spent (₹{stats.totalBought.toFixed(2)}) - Total Fees (₹{stats.totalCharges.toFixed(2)}) = <span className={profit >= 0 ? 'text-emerald-400' : 'text-red-400'}>₹{profit.toFixed(2)}</span>
                </div>
            </div>

            {/* Best & Worst Stocks */}
            {(bestStock || worstStock) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {bestStock && bestStock.profit > 0 && (
                        <div className="bg-green-900/20 border border-green-700/30 p-3 rounded-lg">
                            <div className="text-xs text-green-400 mb-1">🏆 Your Best Stock</div>
                            <div className="text-lg font-bold text-green-300">{bestStock.symbol}</div>
                            <div className="text-sm text-gray-300">Profit: +₹{bestStock.profit.toFixed(2)} ({bestStock.trades} trades)</div>
                        </div>
                    )}
                    {worstStock && worstStock.profit < 0 && (
                        <div className="bg-red-900/20 border border-red-700/30 p-3 rounded-lg">
                            <div className="text-xs text-red-400 mb-1">📉 Needs Improvement</div>
                            <div className="text-lg font-bold text-red-300">{worstStock.symbol}</div>
                            <div className="text-sm text-gray-300">Loss: ₹{worstStock.profit.toFixed(2)} ({worstStock.trades} trades)</div>
                        </div>
                    )}
                </div>
            )}

            {/* Trade History - All Stocks You Bought */}
            <div className="bg-gray-800/50 rounded-lg overflow-hidden">
                <div className="p-3 bg-gray-900/50 border-b border-gray-700">
                    <h4 className="text-sm font-semibold text-white">📜 Your Trade History ({Object.keys(stockPerformance).length} stocks)</h4>
                </div>
                <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-900/50 sticky top-0">
                            <tr className="text-gray-400 text-xs">
                                <th className="px-3 py-2 text-left">Stock Name</th>
                                <th className="px-3 py-2 text-center">AI Trade</th>
                                <th className="px-3 py-2 text-left">Buy Date</th>
                                <th className="px-3 py-2 text-right">Buy Qty</th>
                                <th className="px-3 py-2 text-right">Buy Price (Avg)</th>
                                <th className="px-3 py-2 text-right">Total Buy Amount</th>
                                <th className="px-3 py-2 text-left">Sell Date</th>
                                <th className="px-3 py-2 text-right">Sell Qty</th>
                                <th className="px-3 py-2 text-right">Sell Price (Avg)</th>
                                <th className="px-3 py-2 text-right">Total Sell Amount</th>
                                <th className="px-3 py-2 text-right">Profit/Loss</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.keys(stockPerformance).length === 0 ? (
                                <tr>
                                    <td colSpan="11" className="text-center py-8 text-gray-400">
                                        No trades found for selected dates
                                    </td>
                                </tr>
                            ) : (
                                <>
                                    {Object.entries(stockPerformance).map(([symbol, data]) => {
                                        const profit = data.sold - data.bought;
                                        const profitPercent = data.bought > 0 ? ((profit / data.bought) * 100) : 0;

                                        // Check if any order for this symbol is AI
                                        const isAITrade = filteredOrders.some(o => o.symbol === symbol && o.isAIOrder);

                                        // Get buy and sell details
                                        const buyOrders = filteredOrders.filter(o => o.symbol === symbol && o.side === 'BUY');
                                        const sellOrders = filteredOrders.filter(o => o.symbol === symbol && o.side === 'SELL');

                                        const totalBuyQty = buyOrders.reduce((sum, o) => sum + Number(o.qty), 0);
                                        const totalSellQty = sellOrders.reduce((sum, o) => sum + Number(o.qty), 0);

                                        const avgBuyPrice = totalBuyQty > 0 ? data.bought / totalBuyQty : 0;
                                        const avgSellPrice = totalSellQty > 0 ? data.sold / totalSellQty : 0;

                                        // Get first buy and sell dates
                                        const firstBuyDate = buyOrders.length > 0 ? new Date(buyOrders[0].ts) : null;
                                        const firstSellDate = sellOrders.length > 0 ? new Date(sellOrders[0].ts) : null;

                                        return (
                                            <tr key={symbol} className="border-t border-gray-700 hover:bg-gray-700/30">
                                                <td className="px-3 py-2 text-white font-medium">{symbol}</td>
                                                <td className="px-3 py-2 text-center">
                                                    {isAITrade && <span className="text-lg">🤖</span>}
                                                </td>
                                                <td className="px-3 py-2 text-gray-300 text-xs">
                                                    {firstBuyDate ? firstBuyDate.toLocaleString('en-IN', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    }) : '—'}
                                                </td>
                                                <td className="px-3 py-2 text-right text-white font-semibold">{totalBuyQty > 0 ? totalBuyQty.toFixed(0) : '—'}</td>
                                                <td className="px-3 py-2 text-right text-green-400 font-semibold">
                                                    {totalBuyQty > 0 ? `₹${avgBuyPrice.toFixed(2)}` : '—'}
                                                </td>
                                                <td className="px-3 py-2 text-right text-green-300 font-bold">
                                                    {data.bought > 0 ? `₹${data.bought.toFixed(2)}` : '—'}
                                                </td>
                                                <td className="px-3 py-2 text-gray-300 text-xs">
                                                    {firstSellDate ? firstSellDate.toLocaleString('en-IN', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    }) : '—'}
                                                </td>
                                                <td className="px-3 py-2 text-right text-white font-semibold">{totalSellQty > 0 ? totalSellQty.toFixed(0) : '—'}</td>
                                                <td className="px-3 py-2 text-right text-red-400 font-semibold">
                                                    {totalSellQty > 0 ? `₹${avgSellPrice.toFixed(2)}` : '—'}
                                                </td>
                                                <td className="px-3 py-2 text-right text-red-300 font-bold">
                                                    {data.sold > 0 ? `₹${data.sold.toFixed(2)}` : '—'}
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    {data.sold > 0 ? (
                                                        <div className={`font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                            {profit >= 0 ? '+' : ''}₹{profit.toFixed(2)}
                                                            <div className="text-xs">({profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(1)}%)</div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-500 text-xs">Holding</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {/* Total Profit/Loss Row */}
                                    <tr className="border-t-2 border-purple-500/50 bg-slate-900/50">
                                        <td colSpan="10" className="px-3 py-3 text-right text-white font-bold text-base">
                                            TOTAL PROFIT/LOSS:
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                            <div className={`font-extrabold text-lg ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {profit >= 0 ? '+' : ''}₹{profit.toFixed(2)}
                                                <div className="text-xs">({profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(1)}%)</div>
                                            </div>
                                        </td>
                                    </tr>
                                </>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </motion.div>
    );
}
