// src/components/paper/PortfolioPanel.jsx
import React from 'react';
import { placeMarketOrder } from '../../utils/paperStore';

export default function PortfolioPanel({ state, quotes = {}, refresh }) {
  const pos = state.positions || {};
  async function close(sym) {
    if (!confirm(`Close full position ${sym}?`)) return;
    const p = pos[sym];
    const res = await placeMarketOrder({ symbol: sym, side: 'SELL', qty: p.qty });
    if (!res.success) alert('Close failed: ' + res.reason);
    else refresh();
  }
  return (
    <div>
      <div className="text-teal-300 font-semibold mb-2">Open Positions</div>
      <div className="overflow-x-auto bg-[#0f1724] p-3 rounded border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-400 border-b border-slate-700">
            <tr><th>Symbol</th><th>Qty</th><th>Avg</th><th>LTP</th><th>P&L</th><th></th></tr>
          </thead>
          <tbody>
            {Object.keys(pos).length === 0 && <tr><td colSpan="6" className="py-6 text-center text-slate-500">No open positions</td></tr>}
            {Object.entries(pos).map(([sym,p]) => {
              const ltp = (quotes[sym] && quotes[sym].price) || p.avgPrice;
              const pnl = (ltp - p.avgPrice) * p.qty;
              return (
                <tr key={sym} className="border-b border-slate-800">
                  <td className="py-3">{sym}</td>
                  <td>{p.qty.toFixed(4)}</td>
                  <td>₹{p.avgPrice.toFixed(2)}</td>
                  <td>₹{ltp.toFixed(2)}</td>
                  <td className={pnl>=0?'text-green-400':'text-rose-400'}>₹{pnl.toFixed(2)}</td>
                  <td><button onClick={()=>close(sym)} className="px-3 py-1 rounded bg-slate-800">Close</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
