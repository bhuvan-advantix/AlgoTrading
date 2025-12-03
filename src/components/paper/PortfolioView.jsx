import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { readState } from '../../utils/paperTradingStore';
import MarketDataService from '../../services/marketDataService';

export default function PortfolioView() {
  const [positions, setPositions] = useState([]);
  const [prices, setPrices] = useState({});
  const [refreshKey, setRefreshKey] = useState(0);

  // Load positions from local store
  useEffect(() => {
    const loadPositions = () => {
      const state = readState();
      if (state && state.positions) {
        const posArray = Object.entries(state.positions).map(([symbol, pos]) => ({
          symbol,
          quantity: pos.qty,
          avgPrice: pos.avgPrice
        }));
        setPositions(posArray);
      } else {
        setPositions([]);
      }
    };

    loadPositions();

    // Listen for trade updates to reload positions
    const handleUpdate = () => {
      loadPositions();
      setRefreshKey(prev => prev + 1);
    };
    window.addEventListener('paper-trade-update', handleUpdate);
    return () => window.removeEventListener('paper-trade-update', handleUpdate);
  }, []);

  // Fetch prices for all positions
  useEffect(() => {
    if (positions.length === 0) return;

    const fetchPrices = async () => {
      const newPrices = { ...prices };

      await Promise.all(positions.map(async (p) => {
        const quote = await MarketDataService.getQuote(p.symbol);
        if (quote && quote.price) {
          newPrices[p.symbol] = {
            price: quote.price,
            // Estimate prev close if not available
            prevClose: quote.price / (1 + (quote.changePercent / 100))
          };
        }
      }));

      setPrices(newPrices);
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 5000); // Update every 5s
    return () => clearInterval(interval);
  }, [positions.map(p => p.symbol).join(','), refreshKey]);

  // Helper to get currency symbol
  const getCurrencySymbol = (symbol) => {
    const sym = (symbol || '').toUpperCase();
    return (sym.endsWith('.NS') || sym.endsWith('.BO')) ? '₹' : '$';
  };

  // Calculate totals
  const totals = positions.reduce((acc, pos) => {
    const priceData = prices[pos.symbol];
    const currentPrice = priceData ? priceData.price : pos.avgPrice; // Fallback to avgPrice if no live data
    const prevClose = priceData ? priceData.prevClose : currentPrice;

    const invested = pos.quantity * pos.avgPrice;
    const currentVal = pos.quantity * currentPrice;
    const pnl = currentVal - invested;
    const dailyPnl = (currentPrice - prevClose) * pos.quantity;

    acc.invested += invested;
    acc.current += currentVal;
    acc.pnl += pnl;
    acc.dailyPnl += dailyPnl;
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
            {positions.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-8 text-gray-400">
                  No open positions
                </td>
              </tr>
            ) : (
              positions.map(pos => {
                const currency = getCurrencySymbol(pos.symbol);
                const priceData = prices[pos.symbol];
                const currentPrice = priceData ? priceData.price : null;
                const prevClose = priceData ? priceData.prevClose : null;

                const invested = pos.quantity * pos.avgPrice;
                const marketValue = currentPrice ? (pos.quantity * currentPrice) : null;
                const unrealizedPnl = marketValue ? (marketValue - invested) : null;
                const pnlPct = invested === 0 ? 0 : (unrealizedPnl / invested) * 100;

                const dailyPnl = (currentPrice && prevClose)
                  ? (currentPrice - prevClose) * pos.quantity
                  : null;

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
                      {currency}{Number(pos.avgPrice).toFixed(2)}
                    </td>
                    <td className="text-right p-4 text-white">
                      {currency}{Number(invested).toFixed(2)}
                    </td>
                    <td className="text-right p-4 text-white">
                      {currentPrice ? `${currency}${currentPrice.toFixed(2)}` : '—'}
                    </td>
                    <td className="text-right p-4 text-white">
                      {marketValue ? `${currency}${marketValue.toFixed(2)}` : '—'}
                    </td>
                    <td className="text-right p-4">
                      <div className={dailyPnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {dailyPnl !== null ? `${currency}${dailyPnl.toFixed(2)}` : '—'}
                      </div>
                    </td>
                    <td className="text-right p-4">
                      <div className={unrealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {unrealizedPnl !== null ? `${currency}${unrealizedPnl.toFixed(2)}` : '—'}
                        <span className="text-sm ml-1">
                          {unrealizedPnl !== null ? `(${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%)` : ''}
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