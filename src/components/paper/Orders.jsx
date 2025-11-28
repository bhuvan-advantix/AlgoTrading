import React from 'react';
import { motion } from 'framer-motion';

export default function Orders() {
  // Get orders from localStorage or state management
  const orders = JSON.parse(localStorage.getItem('paper_orders') || '[]');

  return (
    <div className="bg-[#111526] rounded-xl p-4 border border-cyan-800">
      <h3 className="text-lg font-semibold text-white mb-4">Order History</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-gray-400 border-b border-gray-700">
            <tr>
              <th className="text-left py-2">Date</th>
              <th className="text-left py-2">Symbol</th>
              <th className="text-left py-2">Type</th>
              <th className="text-right py-2">Qty</th>
              <th className="text-right py-2">Price</th>
              <th className="text-right py-2">Total</th>
              <th className="text-center py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, index) => (
              <motion.tr
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border-b border-gray-800"
              >
                <td className="py-2">{new Date(order.timestamp).toLocaleString()}</td>
                <td className="py-2">{order.symbol}</td>
                <td className={`py-2 ${order.type === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                  {order.type}
                </td>
                <td className="text-right py-2">{order.quantity}</td>
                <td className="text-right py-2">₹{order.price.toFixed(2)}</td>
                <td className="text-right py-2">₹{(order.quantity * order.price).toFixed(2)}</td>
                <td className="text-center py-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    order.status === 'COMPLETED' 
                      ? 'bg-green-900/50 text-green-400' 
                      : 'bg-yellow-900/50 text-yellow-400'
                  }`}>
                    {order.status}
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>

        {orders.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            No orders yet
          </div>
        )}
      </div>

      {/* Export Button */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => {
            const csv = [
              ['Date', 'Symbol', 'Type', 'Quantity', 'Price', 'Total', 'Status'],
              ...orders.map(o => [
                new Date(o.timestamp).toLocaleString(),
                o.symbol,
                o.type,
                o.quantity,
                o.price,
                o.quantity * o.price,
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
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300"
        >
          Export CSV
        </button>
      </div>
    </div>
  );
}