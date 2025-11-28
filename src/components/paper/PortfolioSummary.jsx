import React, { useState, useEffect } from 'react';
import { readState } from '../../utils/paperTradingStore';
import { API_BASE } from '../../config';

export default function PortfolioSummary() {
  const [summaryData, setSummaryData] = useState({
    totalValue: 0,
    dailyPnl: 0,
    unrealizedPnl: 0,
    cash: 0,
    positions: []
  });
  const [loading, setLoading] = useState(true);

  const fetchPortfolioData = async () => {
    const state = readState();
    if (!state) return;

    const cash = state.wallet?.cash || 0;
    const localPositions = Object.entries(state.positions || {}).map(([symbol, pos]) => ({
      symbol,
      quantity: pos.qty,
      avgPrice: pos.avgPrice
    }));

    if (localPositions.length === 0) {
      setSummaryData({
        totalValue: cash,
        dailyPnl: 0,
        unrealizedPnl: 0,
        cash,
        positions: []
      });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/paper-trading/portfolio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positions: localPositions })
      });

      if (!res.ok) throw new Error('Failed to fetch portfolio data');

      const data = await res.json();

      const positionsValue = data.reduce((sum, p) => sum + (p.market_value || 0), 0);
      const totalDailyPnl = data.reduce((sum, p) => sum + (p.daily_pnl || 0), 0);
      const totalUnrealizedPnl = data.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0);

      setSummaryData({
        totalValue: cash + positionsValue,
        dailyPnl: totalDailyPnl,
        unrealizedPnl: totalUnrealizedPnl,
        cash,
        positions: data
      });
    } catch (err) {
      console.error('Error fetching portfolio summary:', err);
      // Fallback: calculate what we can locally
      const positionsValue = localPositions.reduce((sum, p) => sum + (p.quantity * p.avgPrice), 0);

      setSummaryData({
        totalValue: cash + positionsValue,
        dailyPnl: 0,
        unrealizedPnl: 0,
        cash,
        positions: localPositions.map(p => ({
          ...p,
          avg_price: p.avgPrice,
          current_price: null,
          market_value: null,
          unrealized_pnl: null,
          daily_pnl: null
        }))
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolioData();
    const interval = setInterval(fetchPortfolioData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleUpdate = () => fetchPortfolioData();
    window.addEventListener('paper-trade-update', handleUpdate);
    return () => window.removeEventListener('paper-trade-update', handleUpdate);
  }, []);

  if (loading && !summaryData.totalValue) return <div className="text-slate-400">Loading...</div>;

  const { totalValue, dailyPnl, cash, positions } = summaryData;
  const dayGainPct = totalValue > 0 ? (dailyPnl / totalValue) * 100 : 0;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Portfolio Summary</h3>

      <div className="space-y-3">
        <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 border border-slate-700/25 rounded-lg p-3">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm">Cash Balance</span>
            <span className="text-white font-semibold">
              ₹{cash.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 border border-slate-700/25 rounded-lg p-3">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm">Positions</span>
            <span className="text-white font-semibold">{positions.length}</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 border border-slate-700/25 rounded-lg p-3">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm">Total Portfolio Value</span>
            <span className="text-white font-semibold">
              ₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className={`p-3 rounded-lg border ${dailyPnl >= 0 ? 'bg-emerald-600/15 border-emerald-600/30' : 'bg-rose-600/15 border-rose-600/30'}`}>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm">Day's P&L</span>
            <span className={`font-semibold ${dailyPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {dailyPnl >= 0 ? '+' : ''}₹{dailyPnl.toFixed(2)} ({dayGainPct >= 0 ? '+' : ''}{dayGainPct.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      {positions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-700/30">
          <h4 className="text-sm font-semibold text-slate-300 mb-3">Open Positions</h4>
          <div className="space-y-2">
            {positions.map((pos) => {
              const gain = pos.unrealized_pnl || 0;
              const invested = pos.quantity * pos.avg_price;
              const gainPct = invested > 0 ? (gain / invested) * 100 : 0;

              return (
                <div
                  key={pos.symbol}
                  className={`p-2.5 rounded-lg border ${gain >= 0 ? 'bg-emerald-600/10 border-emerald-600/20' : 'bg-rose-600/10 border-rose-600/20'}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-white">{pos.symbol}</div>
                      <div className="text-xs text-slate-400 mt-1">{pos.quantity.toFixed(4)} @ ₹{pos.current_price ? pos.current_price.toFixed(2) : '—'}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {gain >= 0 ? '+' : ''}₹{gain.toFixed(2)}
                      </div>
                      <div className={`text-xs ${gain >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {gainPct >= 0 ? '+' : ''}{gainPct.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
