import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { readState } from '../../utils/paperTradingStore';

export default function OrdersView() {
  // Helper to format quantity without excessive zeros
  const formatQty = (v) => {
    if (!v) return '0';
    const n = Number(v);
    if (Number.isInteger(n)) return n.toString();
    return n.toFixed(8).replace(/\.?0+$/, '');
  };

  const [orders, setOrders] = useState(() => {
    const st = readState();
    return (st.orders || []).sort((a, b) => new Date(b.ts) - new Date(a.ts));
  });

  const [filter, setFilter] = useState('ALL'); // ALL, BUY, SELL
  const [timeRange, setTimeRange] = useState('1D'); // 1D, 1W, 1M, ALL, CUSTOM
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  // Subscribe to trade updates so orders stay in sync
  useEffect(() => {
    const onUpdate = () => {
      const st = readState();
      setOrders((st.orders || []).sort((a, b) => new Date(b.ts) - new Date(a.ts)));
    };
    window.addEventListener('paper-trade-update', onUpdate);
    return () => window.removeEventListener('paper-trade-update', onUpdate);
  }, []);

  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    // Apply type filter
    if (filter !== 'ALL') {
      filtered = filtered.filter(order => order.side === filter);
    }

    // Apply time range filter
    const now = new Date();
    if (timeRange === 'CUSTOM' && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999); // Include entire end date
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.ts);
        return orderDate >= start && orderDate <= end;
      });
    } else if (timeRange !== 'ALL') {
      const ranges = {
        '1D': new Date(now.setDate(now.getDate() - 1)),
        '1W': new Date(now.setDate(now.getDate() - 7)),
        '1M': new Date(now.setMonth(now.getMonth() - 1))
      };
      filtered = filtered.filter(order =>
        new Date(order.ts) > ranges[timeRange]
      );
    }

    return filtered;
  }, [orders, filter, timeRange, customStartDate, customEndDate]);

  // Calculate statistics from filtered orders
  const stats = useMemo(() => {
    let totalBought = 0;
    let totalSold = 0;
    let totalBrokerage = 0;
    let totalTaxes = 0;
    let totalCharges = 0;

    // Use filtered orders for stats calculation
    filteredOrders.forEach(order => {
      const grossAmt = order.amount || 0;

      // Extract charges
      const brokerage = order.charges?.brokerage || 0;
      const stt = order.charges?.stt || 0;
      const exchangeCharges = order.charges?.exchangeCharges || 0;
      const gst = order.charges?.gst || 0;
      const sebiCharges = order.charges?.sebiCharges || 0;
      const stampDuty = order.charges?.stampDuty || 0;
      const dpCharges = order.charges?.dpCharges || 0;

      const taxes = stt + exchangeCharges + gst + sebiCharges + stampDuty + dpCharges;
      const charges = order.totalCharges || 0;

      if (order.side === 'BUY') {
        totalBought += grossAmt;
      } else {
        totalSold += grossAmt;
      }

      totalBrokerage += brokerage;
      totalTaxes += taxes;
      totalCharges += charges;
    });

    const grossProfit = totalSold - totalBought;
    const netProfit = grossProfit - totalCharges;

    return {
      totalBought,
      totalSold,
      totalBrokerage,
      totalTaxes,
      totalCharges,
      grossProfit,
      netProfit,
      tradeCount: filteredOrders.length
    };
  }, [filteredOrders]);

  return (
    <div className="space-y-4">
      {/* Summary Panel */}
      <div className="bg-gradient-to-br from-[#111526] to-[#1a1f3a] p-4 rounded-xl border border-cyan-800 shadow-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
            <div className="text-xs text-gray-400">Money Spent (Buying)</div>
            <div className="text-lg font-bold text-cyan-400">₹{stats.totalBought.toFixed(2)}</div>
          </div>
          <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
            <div className="text-xs text-gray-400">Money Received (Selling)</div>
            <div className="text-lg font-bold text-purple-400">₹{stats.totalSold.toFixed(2)}</div>
          </div>
          <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
            <div className="text-xs text-gray-400">Brokerage Fees</div>
            <div className="text-lg font-bold text-yellow-500">₹{stats.totalBrokerage.toFixed(2)}</div>
          </div>
          <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
            <div className="text-xs text-gray-400">Taxes Paid</div>
            <div className="text-lg font-bold text-red-400">₹{stats.totalTaxes.toFixed(2)}</div>
          </div>
          <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
            <div className="text-xs text-gray-400">Total Fees</div>
            <div className="text-lg font-bold text-orange-400">₹{stats.totalCharges.toFixed(2)}</div>
          </div>
          <div className={`p-4 rounded-lg border-2 ${stats.netProfit >= 0 ? 'bg-emerald-600/20 border-emerald-500' : 'bg-red-600/20 border-red-500'}`}>
            <div className="text-xs text-gray-300 font-semibold">
              {stats.netProfit >= 0 ? '✅ YOUR PROFIT' : '❌ YOUR LOSS'}
            </div>
            <div className={`text-2xl font-extrabold ${stats.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {stats.netProfit >= 0 ? '+' : ''}₹{stats.netProfit.toFixed(2)}
            </div>
            <div className="text-xs text-gray-400 mt-1">After all fees</div>
          </div>
        </div>
        <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg">
          <div className="text-xs text-blue-300">
            <strong>How it works:</strong> Money Received - Money Spent - Total Fees =
            <span className={`font-bold ml-1 ${stats.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {stats.netProfit >= 0 ? 'Profit ✅' : 'Loss ❌'}
            </span>
          </div>
        </div>
      </div>

      {/* Filters - Responsive Grid Layout */}
      <div className="bg-[#111526] p-3 sm:p-4 rounded-xl border border-cyan-800">
        <div className="flex flex-col gap-3">
          {/* Type Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-400 mr-2">Type:</span>
            <div className="flex gap-2">
              {['ALL', 'BUY', 'SELL'].map(type => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${filter === type
                    ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow-lg'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Time Range Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-400 mr-2">Period:</span>
            <div className="flex gap-2">
              {['1D', '1W', '1M', 'ALL', 'CUSTOM'].map(range => (
                <button
                  key={range}
                  onClick={() => {
                    setTimeRange(range);
                    if (range === 'CUSTOM') {
                      setShowCustomDatePicker(true);
                    } else {
                      setShowCustomDatePicker(false);
                    }
                  }}
                  className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${timeRange === range
                    ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow-lg'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Picker */}
          {showCustomDatePicker && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-700"
            >
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-400">From:</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-400">To:</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Orders Table - Horizontal Scroll on Mobile */}
      <div className="bg-[#111526] rounded-xl border border-cyan-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="text-left p-2 sm:p-4 text-xs sm:text-sm text-gray-400">Date & Time</th>
                <th className="text-left p-2 sm:p-4 text-xs sm:text-sm text-gray-400">Symbol</th>
                <th className="text-center p-2 sm:p-4 text-xs sm:text-sm text-gray-400">Type</th>
                <th className="text-right p-2 sm:p-4 text-xs sm:text-sm text-gray-400">Quantity</th>
                <th className="text-right p-2 sm:p-4 text-xs sm:text-sm text-gray-400">Price</th>
                <th className="text-right p-2 sm:p-4 text-xs sm:text-sm text-gray-400">Gross Amt</th>
                <th className="text-right p-2 sm:p-4 text-xs sm:text-sm text-yellow-500">Brokerage</th>
                <th className="text-right p-2 sm:p-4 text-xs sm:text-sm text-red-400">Taxes</th>
                <th className="text-right p-2 sm:p-4 text-xs sm:text-sm text-emerald-400">Net Amount</th>
                <th className="text-center p-2 sm:p-4 text-xs sm:text-sm text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filteredOrders.map(order => {
                  const isAI = order.isAIOrder === true || order.isAIOrder === 'true' || order.aiSymbol === '🤖' || order.tag === 'AI_TRADING' || order.source === 'AI';
                  const currencySymbol = order.currency
                    ? (order.currency === 'INR' ? '₹' : '$')
                    : ((order.symbol || '').toUpperCase().endsWith('.NS') || (order.symbol || '').toUpperCase().endsWith('.BO') ? '₹' : '$');

                  return (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="border-t border-gray-800"
                    >
                      <td className="p-2 sm:p-4 text-xs sm:text-sm text-white">
                        {new Date(order.ts).toLocaleString()}
                      </td>
                      <td className="p-2 sm:p-4 text-xs sm:text-sm font-medium text-white">
                        {isAI && <span className="mr-1 text-purple-400">🤖</span>}
                        {order.symbol}
                      </td>
                      <td className="p-2 sm:p-4 text-center">
                        <span className={`px-2 sm:px-3 py-1 rounded-full text-xs ${order.side === 'BUY'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                          }`}>
                          {order.side}
                        </span>
                      </td>
                      <td className="p-2 sm:p-4 text-right text-xs sm:text-sm text-white">
                        {formatQty(order.qty)}
                      </td>
                      <td className="p-2 sm:p-4 text-right text-xs sm:text-sm text-white">
                        {currencySymbol}{Number(order.price).toFixed(2)}
                      </td>
                      <td className="p-2 sm:p-4 text-right text-xs sm:text-sm text-gray-400">
                        {currencySymbol}{Number(order.amount).toFixed(2)}
                      </td>
                      <td className="p-2 sm:p-4 text-right text-xs sm:text-sm text-yellow-500">
                        {currencySymbol}{Number(order.charges?.brokerage || 0).toFixed(2)}
                      </td>
                      <td className="p-2 sm:p-4 text-right text-xs sm:text-sm text-red-400">
                        {currencySymbol}{(Number(order.totalCharges || 0) - Number(order.charges?.brokerage || 0)).toFixed(2)}
                      </td>
                      <td className="p-2 sm:p-4 text-right text-xs sm:text-sm font-bold text-emerald-400">
                        {currencySymbol}{Number(order.netAmount || order.amount).toFixed(2)}
                      </td>
                      <td className="p-2 sm:p-4 text-center">
                        <span className={`px-2 sm:px-3 py-1 rounded-full text-xs ${order.status === 'FILLED'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                          {order.status}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}

                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan="10" className="text-center py-8 text-sm text-gray-400">
                      No orders found
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            const csv = [
              ['Date', 'Symbol', 'Type', 'Quantity', 'Price', 'Gross Amount', 'Brokerage', 'Taxes', 'Net Amount', 'Status'],
              ...filteredOrders.map(o => [
                new Date(o.ts).toLocaleString(),
                (o.isAIOrder ? '🤖 ' : '') + o.symbol,
                o.side,
                formatQty(o.qty),
                Number(o.price).toFixed(2),
                Number(o.amount).toFixed(2),
                Number(o.charges?.brokerage || 0).toFixed(2),
                (Number(o.totalCharges || 0) - Number(o.charges?.brokerage || 0)).toFixed(2),
                Number(o.netAmount || o.amount).toFixed(2),
                o.status
              ])
            ].map(row => row.join(',')).join('\n');

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'paper-trading-orders.csv';
            a.click();
          }}
          className="px-3 sm:px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs sm:text-sm text-gray-300 transition-colors whitespace-nowrap"
        >
          Export CSV
        </button>
      </div>
    </div>
  );
}