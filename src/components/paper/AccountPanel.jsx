// src/components/paper/AccountPanel.jsx
import React from 'react';
import { getState } from '../../utils/paperStore';

export default function AccountPanel({ state, refresh }) {
  const st = state;
  const wallet = st.wallet || { cash: 0 };
  const equity = st.equityHistory && st.equityHistory[0] ? st.equityHistory[0].equity : wallet.cash;
  return (
    <div>
      <div className="text-teal-300 font-semibold mb-2">Account</div>
      <div className="bg-[#0f1724] p-3 rounded border border-slate-800 text-sm">
        <div>Starting Capital: ₹{st.config.startingBalance.toLocaleString()}</div>
        <div className="mt-2">Current Balance: <strong>₹{wallet.cash.toFixed(2)}</strong></div>
        <div>Equity: <strong>₹{equity.toFixed(2)}</strong></div>
        <div className="mt-3 flex gap-2">
          <button onClick={()=>{ const amt = Number(prompt('Add amount (₹)', '10000')); if(!isNaN(amt)){ const s=getState(); s.wallet.cash+=amt; localStorage.setItem('advantix_paper_v3', JSON.stringify(s)); refresh(); }}} className="px-3 py-1 rounded bg-cyan-600">Add Funds</button>
          <button onClick={()=>{ if(confirm('Reset session?')){ localStorage.removeItem('advantix_paper_v3'); refresh(); } }} className="px-3 py-1 rounded bg-rose-500">Reset</button>
        </div>
      </div>
    </div>
  );
}
