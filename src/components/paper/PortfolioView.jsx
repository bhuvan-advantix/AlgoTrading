import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { readState } from '../../utils/paperTradingStore';
import { API_BASE } from '../../config';

export default function PortfolioView() {
  const [portfolioData, setPortfolioData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load local state to get positions list
  const getLocalPositions = () => {
    const state = readState();
    if (!state || !state.positions) return [];
    return Object.entries(state.positions).map(([symbol, pos]) => ({
      symbol,
      quantity: pos.qty,
      avgPrice: pos.avgPrice
    }));
  };

  const fetchPortfolioData = async () => {
    const positions = getLocalPositions();
    if (positions.length === 0) {
      setPortfolioData([]);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/paper-trading/portfolio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positions })
      });

      if (!res.ok) throw new Error('Failed to fetch portfolio data');

      const data = await res.json();
      setPortfolioData(data);
    } catch (err) {
      console.error('Error fetching portfolio P&L:', err);
      // Fallback: show local positions with null market data
      const fallbackData = positions.map(p => ({
        symbol: p.symbol,
        quantity: p.quantity,
        avg_price: p.avgPrice,
        current_price: null,
        prev_close: null,
        market_value: null,
        unrealized_pnl: null,
        daily_pnl: null
      }));
      setPortfolioData(fallbackData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolioData();
    const interval = setInterval(fetchPortfolioData, 5000);
    return () => clearInterval(interval);
  }, [refreshKey]);

  useEffect(() => {
    const handleUpdate = () => {
      setRefreshKey(prev => prev + 1);
    };
    window.addEventListener('paper-trade-update', handleUpdate);
    return () => window.removeEventListener('paper-trade-update', handleUpdate);
  }, []);

  // Calculate totals
  const totals = portfolioData.reduce((acc, pos) => {
    acc.invested += (pos.quantity * pos.avg_price);
    acc.current += (pos.market_value || 0);
    acc.pnl += (pos.unrealized_pnl || 0);
    acc.dailyPnl += (pos.daily_pnl || 0);
    return acc;
  }, { invested: 0, current: 0, pnl: 0, dailyPnl: 0 });

  return (
    <div className="space-y-4">
      {/* Portfolio Summary */}
      <div className="bg-[#111526] p-4 rounded-xl border border-cyan-800">
        <h3 className="text-lg font-semibold text-white">Portfolio Summary</h3>
        <div className="flex flex-wrap gap-8 mt-2">
          <div>
            <div className="text-xs text-gray-400">Amount Invested</div>
            <div className="text-lg font-bold text-cyan-400">
              ₹{totals.invested.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Current Value</div>
            <div className="text-lg font-bold text-cyan-400">
              ₹{totals.current.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Unrealized P&L</div>
            <div className={totals.pnl >= 0 ? 'text-lg font-bold text-green-400' : 'text-lg font-bold text-red-400'}>
              ₹{totals.pnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-xs ml-2">({totals.invested === 0 ? '0.00' : (totals.pnl / totals.invested * 100).toFixed(2)}%)</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Day's P&L</div>
            <div className={totals.dailyPnl >= 0 ? 'text-lg font-bold text-green-400' : 'text-lg font-bold text-red-400'}>
              ₹{totals.dailyPnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Positions Table */}
      <div className="bg-[#111526] rounded-xl border border-cyan-800 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="text-left p-4 text-gray-400">Symbol</th>
              <th className="text-right p-4 text-gray-400">Quantity</th>
              <th className="text-right p-4 text-gray-400">Avg Price</th>
              <th className="text-right p-4 text-gray-400">Amount Invested</th>
              <th className="text-right p-4 text-gray-400">Current Price</th>
              <th className="text-right p-4 text-gray-400">Market Value</th>
              <th className="text-right p-4 text-gray-400">Day's P&L</th>
              <th className="text-right p-4 text-gray-400">Unrealized P&L</th>
            </tr>
          </thead>
          <tbody>
            {portfolioData.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-8 text-gray-400">
                  {loading ? 'Loading...' : 'No open positions'}
                </td>
              </tr>
            ) : (
              portfolioData.map(pos => {
                const invested = pos.quantity * pos.avg_price;
                const pnlPct = invested === 0 ? 0 : (pos.unrealized_pnl / invested) * 100;

                return (
                  <motion.tr
                    key={pos.symbol}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-t border-gray-800"
                  >
                    <td className="p-4">
                      <div className="font-medium text-white">{pos.symbol}</div>
                    </td>
                    <td className="text-right p-4 text-white">
                      {Number(pos.quantity).toFixed(4)}
                    </td>
                    <td className="text-right p-4 text-white">
                      ₹{Number(pos.avg_price).toFixed(2)}
                    </td>
                    <td className="text-right p-4 text-white">
                      ₹{Number(invested).toFixed(2)}
                    </td>
                    <td className="text-right p-4 text-white">
                      {pos.current_price ? `₹${pos.current_price.toFixed(2)}` : '—'}
                    </td>
                    <td className="text-right p-4 text-white">
                      {pos.market_value ? `₹${pos.market_value.toFixed(2)}` : '—'}
                    </td>
                    <td className="text-right p-4">
                      <div className={pos.daily_pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {pos.daily_pnl !== null ? `₹${pos.daily_pnl.toFixed(2)}` : '—'}
                      </div>
                    </td>
                    <td className="text-right p-4">
                      <div className={pos.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {pos.unrealized_pnl !== null ? `₹${pos.unrealized_pnl.toFixed(2)}` : '—'}
                        <span className="text-sm ml-1">
                          ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)
                        </span>
                      </div>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}