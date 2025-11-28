// src/components/paper/PositionsTable.jsx
import React, { useState, useEffect } from 'react';
import { subscribePrice, readState, placeMarketOrder } from '../../utils/paperTradingStore';

export default function PositionsTable({ state, refresh }) {
  const [prices, setPrices] = useState({});
  useEffect(() => {
    // subscribe to known symbols
    const syms = Object.keys(state.positions || {});
    const unsubs = syms.map(sym => subscribePrice(sym, (p) => {
      setPrices(prev => ({...prev, [sym]: p}));
    }));
    return () => unsubs.forEach(u => u && u());
  }, [state.positions]);

  function closePosition(sym) {
    const pos = state.positions[sym];
    if (!pos) return;
    const qty = pos.qty;
    if (!confirm(`Close ${qty.toFixed(6)} ${sym}?`)) return;
    const res = placeMarketOrder({ symbol: sym, side: 'SELL', qty });
    if (!res.success) alert('Close failed: ' + res.reason);
    else {
      refresh();
      alert('Closed ' + sym);
    }
  }

  return (
    <div className="bg-[#0f1724] p-4 rounded-2xl border border-slate-800">
      <h3 className="text-teal-300 font-semibold mb-3">Open Positions</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-400">
            <tr>
              <th>Symbol</th><th>Qty</th><th>Avg Price</th><th>LTP</th><th>P&L</th><th></th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(state.positions || {}).length === 0 && (
              <tr><td colSpan="6" className="py-4 text-slate-500">No open positions</td></tr>
            )}
            {Object.entries(state.positions || {}).map(([sym,pos]) => {
              const ltp = prices[sym] || state.prices[sym]?.price || 0;
              const pl = Number((pos.qty * (ltp - pos.avgPrice)).toFixed(4));
              return (
                <tr key={sym} className="border-t border-slate-800">
                  <td className="py-2">{sym}</td>
                  <td>{pos.qty.toFixed(6)}</td>
                  <td>₹{pos.avgPrice.toFixed(4)}</td>
                  <td>₹{ltp.toFixed(2)}</td>
                  <td className={pl >= 0 ? 'text-teal-300' : 'text-rose-400'}>₹{pl.toFixed(2)}</td>
                  <td><button onClick={()=>closePosition(sym)} className="px-3 py-1 rounded bg-slate-800">Close</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
