import React, { useState, useEffect } from 'react';
import { readState, placeMarketOrder } from '../../utils/paperTradingStore';
import { API_BASE } from '../../config';

export default function Portfolio() {
  const [portfolioData, setPortfolioData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSymbol, setLoadingSymbol] = useState(null);
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
      // Use the new backend endpoint
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
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchPortfolioData();
    const interval = setInterval(fetchPortfolioData, 5000); // 5 seconds refresh
    return () => clearInterval(interval);
  }, [refreshKey]);

  // Listen for local trade updates to trigger immediate refresh
  useEffect(() => {
    const handleUpdate = () => {
      fetchPortfolioData();
    };
    window.addEventListener('paper-trade-update', handleUpdate);
    return () => window.removeEventListener('paper-trade-update', handleUpdate);
  }, []);

  const handleClosePosition = async (symbol, currentPrice) => {
    if (!currentPrice) {
      alert('Price not available');
      return;
    }

    setLoadingSymbol(symbol);
    try {
      const pos = portfolioData.find(p => p.symbol === symbol);
      if (!pos) return;

      const result = placeMarketOrder({
        symbol,
        side: 'SELL',
        qty: pos.quantity
      });

      if (result.success) {
        alert(`Closed position: sold ${pos.quantity.toFixed(4)} @ ₹${result.order.price.toFixed(2)}`);
        window.dispatchEvent(new Event('paper-trade-update'));
        setRefreshKey(k => k + 1);
      } else {
        alert(`Error: ${result.reason}`);
      }
    } finally {
      setLoadingSymbol(null);
    }
  };

  // Calculate totals from backend data
  const totalValue = portfolioData.reduce((sum, p) => sum + (p.market_value || 0), 0);
  const totalDailyPnl = portfolioData.reduce((sum, p) => sum + (p.daily_pnl || 0), 0);
  const totalUnrealizedPnl = portfolioData.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0);

  if (loading && portfolioData.length === 0) return <div className="text-slate-400">Loading portfolio...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/40 border border-slate-700/30 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <h3 className="text-xl font-semibold text-white">Open Positions</h3>
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-slate-400">Total Value: </span>
              <span className="text-white font-semibold">₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span className="text-slate-400">Day's P&L: </span>
              <span className={`font-semibold ${totalDailyPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totalDailyPnl >= 0 ? '+' : ''}₹{totalDailyPnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Total P&L: </span>
              <span className={`font-semibold ${totalUnrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totalUnrealizedPnl >= 0 ? '+' : ''}₹{totalUnrealizedPnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {portfolioData.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            No open positions
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700/30">
                <tr>
                  <th className="text-left py-3 px-4">Symbol</th>
                  <th className="text-right py-3 px-4">Qty</th>
                  <th className="text-right py-3 px-4">Avg Price</th>
                  <th className="text-right py-3 px-4">LTP</th>
                  <th className="text-right py-3 px-4">Prev Close</th>
                  <th className="text-right py-3 px-4">Value</th>
                  <th className="text-right py-3 px-4">Day's P&L</th>
                  <th className="text-right py-3 px-4">Unrealized P&L</th>
                  <th className="text-center py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {portfolioData.map((pos) => {
                  const { symbol, quantity, avg_price, current_price, prev_close, market_value, unrealized_pnl, daily_pnl } = pos;

                  return (
                    <tr key={symbol} className="border-b border-slate-700/20 hover:bg-slate-700/20 transition-colors">
                      <td className="py-3 px-4 font-semibold text-white">{symbol}</td>
                      <td className="py-3 px-4 text-right text-slate-200">{quantity?.toFixed(4)}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-300">₹{avg_price?.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-200">
                        {current_price ? `₹${current_price.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">
                        {prev_close ? `₹${prev_close.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-200">
                        {market_value ? `₹${market_value.toFixed(2)}` : '—'}
                      </td>
                      <td className={`py-3 px-4 text-right font-semibold ${daily_pnl !== null ? (daily_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400') : 'text-slate-500'}`}>
                        {daily_pnl !== null ? `${daily_pnl >= 0 ? '+' : ''}₹${daily_pnl.toFixed(2)}` : '—'}
                      </td>
                      <td className={`py-3 px-4 text-right font-semibold ${unrealized_pnl !== null ? (unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400') : 'text-slate-500'}`}>
                        {unrealized_pnl !== null ? `${unrealized_pnl >= 0 ? '+' : ''}₹${unrealized_pnl.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleClosePosition(symbol, current_price)}
                          disabled={loadingSymbol === symbol || !current_price}
                          className="px-3 py-1 bg-rose-600/20 text-rose-400 border border-rose-600/30 rounded-lg hover:bg-rose-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                        >
                          {loadingSymbol === symbol ? 'Closing...' : 'Close'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-xs text-slate-500 text-center mt-4">
        * Prices & P&L updated live from Yahoo Finance every 5 seconds. Day's P&L = (LTP - Prev Close) * Qty.
      </div>
    </div>
  );
}
