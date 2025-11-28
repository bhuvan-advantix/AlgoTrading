// src/components/paper/WalletCard.jsx
import React from 'react';
import { readState } from '../../utils/paperTradingStore';

export default function WalletCard({ state, refresh, setSelectedSymbol }) {
  // show top-level wallet/summary
  const wallet = state.wallet || { cash: 0 };
  const positions = state.positions || {};
  const invested = Object.entries(positions).reduce((s, [sym, p]) => {
    const price = state.prices[sym]?.price || 0;
    return s + (p.qty * price);
  }, 0);
  const total = Number((wallet.cash + invested).toFixed(2));
  const unreal = Number((invested).toFixed(2));
  const realized = state.orders?.reduce((s, o) => s + (o.side === 'SELL' ? (o.amount - (o.qty * (state.positions[o.symbol]?.avgPrice || o.price))) : 0), 0);

  return (
    <div className="bg-[#0f1724] p-4 rounded-2xl border border-slate-800 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-teal-300 font-semibold">Portfolio Summary</h3>
          <div className="mt-3 space-y-1 text-slate-300">
            <div>Starting Balance: <span className="text-slate-100 font-medium">₹{state.config.startingBalance.toLocaleString()}</span></div>
            <div>Current Balance: <span className="text-slate-100 font-medium">₹{wallet.cash.toFixed(2)}</span></div>
            <div>Trader Value: <span className="text-slate-100 font-medium">₹{invested.toFixed(2)}</span></div>
            <div>Unrealized P/L: <span className="text-teal-300 font-medium">₹{unreal.toFixed(2)}</span></div>
          </div>
        </div>
        <div className="space-y-2 text-right">
          <button onClick={() => {
            const res = prompt('Set starting balance (number)', String(state.config.startingBalance));
            if (!res) return;
            const n = Number(res);
            if (isNaN(n)) return alert('invalid number');
            const st = readState();
            st.config.startingBalance = n;
            st.wallet.cash = n;
            localStorage.setItem('adv_paper_v2', JSON.stringify(st));
            refresh();
          }} className="px-3 py-1 rounded bg-slate-800 text-sm">Edit Start</button>
          <button onClick={() => {
            if (!confirm('Reset all trades and wallet?')) return;
            localStorage.removeItem('adv_paper_v2');
            refresh();
          }} className="px-3 py-1 rounded bg-red-600 text-sm">Reset All</button>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-sm text-slate-400">Watchlist</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {(state.watchlist || []).map(s => (
            <button key={s} onClick={() => setSelectedSymbol(s)}
              className="px-3 py-1 rounded-full bg-slate-800 text-slate-100 text-sm border border-slate-700 hover:scale-105">{s}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
