import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { readState } from '../../utils/paperTradingStore';

export default function OrdersView() {
  const [orders, setOrders] = useState(() => {
    const st = readState();
    return (st.orders || []).sort((a, b) => new Date(b.ts) - new Date(a.ts));
  });

  const [filter, setFilter] = useState('ALL'); // ALL, BUY, SELL
  const [timeRange, setTimeRange] = useState('1D'); // 1D, 1W, 1M, ALL

  // Subscribe to trade updates so orders stay in sync
  useEffect(() => {
    const onUpdate = () => {
      const st = readState();
      setOrders((st.orders || []).sort((a, b) => new Date(b.ts) - new Date(a.ts)));
    };
    window.addEventListener('paper-trade-update', onUpdate);
    return () => window.removeEventListener('paper-trade-update', onUpdate);
  }, []);

  const getFilteredOrders = () => {
    let filtered = [...orders];

    // Apply type filter
    if (filter !== 'ALL') {
      filtered = filtered.filter(order => order.side === filter);
    }

    // Apply time range filter
    const now = new Date();
    const ranges = {
      '1D': now.setDate(now.getDate() - 1),
      '1W': now.setDate(now.getDate() - 7),
      '1M': now.setMonth(now.getMonth() - 1)
    };

    if (timeRange !== 'ALL') {
      filtered = filtered.filter(order =>
        new Date(order.ts) > ranges[timeRange]
      );
    }

    return filtered;
  };

  return (
    <div className="space-y-4">
      {/* Filters - Responsive Grid Layout */}
      <div className="bg-[#111526] p-3 sm:p-4 rounded-xl border border-cyan-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          {/* Type Filter */}
          <div className="w-full sm:w-auto">
            <div className="grid grid-cols-3 gap-1 sm:flex sm:gap-2">
              {['ALL', 'BUY', 'SELL'].map(type => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${filter === type
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
          <div className="w-full sm:w-auto">
            <div className="grid grid-cols-4 gap-1 sm:flex sm:gap-2">
              {['1D', '1W', '1M', 'ALL'].map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${timeRange === range
                    ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow-lg'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
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
                {getFilteredOrders().map(order => {
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
                        {Number(order.qty).toFixed(8)}
                      </td>
                      <td className="p-2 sm:p-4 text-right text-xs sm:text-sm text-white">
                        {currencySymbol}{Number(order.price).toFixed(2)}
                      </td>
                      <td className="p-2 sm:p-4 text-right text-xs sm:text-sm text-gray-400">
                        {currencySymbol}{Number(order.amount).toFixed(2)}
                      </td>
                      <td className="p-2 sm:p-4 text-right text-xs sm:text-sm text-yellow-500">
                        {currencySymbol}{Number(order.brokerage || 0).toFixed(2)}
                      </td>
                      <td className="p-2 sm:p-4 text-right text-xs sm:text-sm text-red-400">
                        {currencySymbol}{Number(order.totalCharges || 0).toFixed(2)}
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

                {getFilteredOrders().length === 0 && (
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
              ...getFilteredOrders().map(o => [
                new Date(o.ts).toLocaleString(),
                o.symbol,
                o.side,
                Number(o.qty).toFixed(8),
                Number(o.price).toFixed(2),
                Number(o.amount).toFixed(2),
                Number(o.brokerage || 0).toFixed(2),
                Number(o.totalCharges || 0).toFixed(2),
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