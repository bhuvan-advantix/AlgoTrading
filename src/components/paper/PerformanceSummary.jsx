// src/components/paper/PerformanceSummary.jsx
import React from 'react';

export default function PerformanceSummary({ state }) {
  const orders = state.orders || [];
  const trades = orders.length;
  const wins = orders.filter(o => o.side === 'SELL' && o.amount > 0).length; // naive
  const winRate = trades ? Math.round((wins / trades) * 100) : 0;

  // simple realized P/L: sum of sells - buys (not precise but fine for display)
  const realized = orders.reduce((s, o) => {
    if (o.side === 'SELL') return s + o.amount;
    if (o.side === 'BUY') return s - o.amount;
    return s;
  }, 0);

  return (
    <div className="bg-[#0f1724] p-4 rounded-2xl border border-slate-800">
      <h3 className="text-teal-300 font-semibold mb-3">Performance Summary</h3>
      <div className="grid grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-slate-400">Win Rate</div>
          <div className="text-white font-bold">{winRate}%</div>
        </div>
        <div>
          <div className="text-slate-400">Total Trades</div>
          <div className="text-white font-bold">{trades}</div>
        </div>
        <div>
          <div className="text-slate-400">Realized P/L</div>
          <div className="text-teal-300 font-bold">₹{realized.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-slate-400">Positions</div>
          <div className="text-white font-bold">{Object.keys(state.positions || {}).length}</div>
        </div>
      </div>
    </div>
  );
}