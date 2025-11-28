// src/components/paper/OrdersPanel.jsx
import React from 'react';

export default function OrdersPanel({ orders = [] }) {
  return (
    <div>
      <div className="text-teal-300 font-semibold mb-2">Orders</div>
      <div className="bg-[#0f1724] p-3 rounded border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-400 border-b border-slate-700">
            <tr><th>Date</th><th>Symbol</th><th>Type</th><th>Qty</th><th>Price</th><th>Status</th></tr>
          </thead>
          <tbody>
            {orders.length===0 && <tr><td colSpan="6" className="py-6 text-center text-slate-500">No orders yet</td></tr>}
            {orders.map(o => (
              <tr key={o.id} className="border-b border-slate-800">
                <td>{new Date(o.ts).toLocaleString()}</td>
                <td>{o.symbol}</td>
                <td className={o.side==='BUY'?'text-green-400':'text-rose-400'}>{o.side}</td>
                <td>{o.qty}</td>
                <td>₹{o.price.toFixed(2)}</td>
                <td>{o.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
