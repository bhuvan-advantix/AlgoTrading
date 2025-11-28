import React from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function AccountSummary() {
  // Get account data from localStorage
  const balance = parseFloat(localStorage.getItem('paper_balance') || '100000');
  const positions = JSON.parse(localStorage.getItem('paper_positions') || '[]');
  const orders = JSON.parse(localStorage.getItem('paper_orders') || '[]');

  // Calculate metrics
  const investedValue = positions.reduce((sum, pos) => sum + (pos.quantity * pos.entryPrice), 0);
  const todayPnL = positions.reduce((sum, pos) => {
    const todayOpen = pos.dayOpenPrice || pos.entryPrice;
    return sum + ((pos.currentPrice - todayOpen) * pos.quantity);
  }, 0);

  // Generate dummy history data for the chart
  const history = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29-i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
    balance: balance + (Math.random() - 0.5) * 10000
  }));

  return (
    <div className="grid gap-4">
      {/* Account Overview Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div className="bg-[#111526] p-6 rounded-xl border border-cyan-800">
          <div className="text-sm text-gray-400">Available Balance</div>
          <div className="text-2xl font-bold text-white mt-1">₹{balance.toFixed(2)}</div>
        </div>

        <div className="bg-[#111526] p-6 rounded-xl border border-cyan-800">
          <div className="text-sm text-gray-400">Invested Value</div>
          <div className="text-2xl font-bold text-white mt-1">₹{investedValue.toFixed(2)}</div>
        </div>

        <div className="bg-[#111526] p-6 rounded-xl border border-cyan-800">
          <div className="text-sm text-gray-400">Today's P&L</div>
          <div className={`text-2xl font-bold mt-1 ${todayPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {todayPnL >= 0 ? '+' : ''}₹{todayPnL.toFixed(2)}
          </div>
        </div>
      </motion.div>

      {/* Balance History Chart */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#111526] p-6 rounded-xl border border-cyan-800"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Balance History</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <Line 
                type="monotone" 
                dataKey="balance" 
                stroke="#00f5d4" 
                strokeWidth={2}
                dot={false}
              />
              <XAxis 
                dataKey="date" 
                stroke="#4b5563"
                tickMargin={10}
              />
              <YAxis 
                stroke="#4b5563"
                tickFormatter={value => `₹${(value/1000).toFixed(1)}K`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1a1a2e',
                  border: '1px solid #00f5d4',
                  borderRadius: '8px',
                  padding: '8px'
                }}
                formatter={value => [`₹${value.toFixed(2)}`, 'Balance']}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-2"
      >
        <button 
          onClick={() => {
            const newBalance = balance + 10000;
            localStorage.setItem('paper_balance', newBalance);
            window.location.reload();
          }}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-500 
                     rounded-lg text-white hover:opacity-90 transition-opacity"
        >
          Add ₹10,000
        </button>

        <button
          onClick={() => {
            if (confirm('Reset account? This will clear all positions and orders.')) {
              localStorage.setItem('paper_balance', '100000');
              localStorage.setItem('paper_positions', '[]');
              localStorage.setItem('paper_orders', '[]');
              window.location.reload();
            }
          }}
          className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg 
                     hover:bg-red-500/30 transition-colors"
        >
          Reset Account
        </button>
      </motion.div>
    </div>
  );
}