// src/components/paper/TradeHistory.jsx
import React, { useState, useEffect } from 'react';
import { readState } from '../../utils/paperTradingStore';

export default function TradeHistory() {
  const [state, setState] = useState(null);

  useEffect(() => {
    const loadState = () => setState(readState());
    loadState();

    const handleUpdate = () => loadState();
    window.addEventListener('paper-trade-update', handleUpdate);
    return () => window.removeEventListener('paper-trade-update', handleUpdate);
  }, []);

  if (!state) return <div className="text-slate-400">Loading...</div>;

  const orders = state.orders || [];

  return (
    <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/40 border border-slate-700/30 rounded-xl p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Trade History</h3>
        <div className="text-sm text-slate-400">Total trades: {orders.length}</div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          No trades yet
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700/30">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Symbol</th>
                <th className="py-3 px-4">Side</th>
                <th className="py-3 px-4 text-right">Quantity</th>
                <th className="py-3 px-4 text-right">Price</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o, idx) => (
                <tr key={o.id || idx} className="border-b border-slate-700/20 hover:bg-slate-700/20 transition-colors">
                  <td className="py-3 px-4 text-slate-300 text-xs">
                    {new Date(o.ts).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 font-semibold text-white">{o.symbol}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      o.side === 'BUY' 
                        ? 'bg-emerald-600/20 text-emerald-300' 
                        : 'bg-rose-600/20 text-rose-300'
                    }`}>
                      {o.side}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-200">
                    {o.qty.toFixed(6)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-200">
                    ₹{o.price.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-white">
                    ₹{o.amount.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right text-xs text-emerald-400 font-semibold">
                    {o.status || 'FILLED'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {orders.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-700/30 text-xs text-slate-500 flex justify-between">
          <span>Total executed trades: {orders.length}</span>
          <span>Last trade: {new Date(orders[0]?.ts).toLocaleString('en-IN')}</span>
        </div>
      )}
    </div>
  );
}
