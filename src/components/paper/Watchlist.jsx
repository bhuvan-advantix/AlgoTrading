import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import MarketDataService from '../../services/marketDataService';

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState(() => {
    return JSON.parse(localStorage.getItem('paper_watchlist') || JSON.stringify(MarketDataService.defaultWatchlist));
  });
  const [quotes, setQuotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [newSymbol, setNewSymbol] = useState('');

  useEffect(() => {
    if (watchlist.length === 0) return;
    setLoading(true);

    // Start real-time updates
    const stopUpdates = MarketDataService.startRealtimeUpdates(
      watchlist,
      (newQuotes) => {
        setQuotes(prev => ({ ...prev, ...newQuotes }));
        setLoading(false);
      }
    );z

    return () => stopUpdates();
  }, [watchlist]);

  // Save watchlist changes
  useEffect(() => {
    localStorage.setItem('paper_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  const handleAddSymbol = () => {
    if (!newSymbol) return;
    const symbol = newSymbol.toUpperCase();
    if (!watchlist.includes(symbol)) {
      setWatchlist(prev => [...prev, symbol]);
      setNewSymbol('');
    }
  };

  const handleRemoveSymbol = (symbol) => {
    setWatchlist(prev => prev.filter(s => s !== symbol));
  };

  return (
    <div className="space-y-4">
      {/* Add Symbol Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newSymbol}
          onChange={(e) => setNewSymbol(e.target.value)}
          placeholder="Add symbol (e.g., RELIANCE.NS)"
          className="flex-1 bg-[#111526] border border-cyan-800 rounded-xl p-3 text-white"
        />
        <button
          onClick={handleAddSymbol}
          className="px-6 py-2 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-xl text-white"
        >
          Add
        </button>
      </div>

      {/* Watchlist Items */}
      <div className="space-y-2">
        {watchlist.map(symbol => {
          const quote = quotes[symbol] || {};
          const isPositive = (quote.change || 0) >= 0;
          
          return (
            <motion.div
              key={symbol}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-between p-4 bg-[#111526] rounded-xl border border-cyan-800"
            >
              <div className="flex-1">
                <div className="font-medium text-white">{symbol}</div>
                <div className={`text-lg ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                  ₹{quote.price?.toFixed(2) || '—'}
                  {quote.change && (
                    <span className="ml-2 text-sm">
                      ({isPositive ? '+' : ''}{quote.change.toFixed(2)}%)
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleRemoveSymbol(symbol)}
                className="ml-4 p-2 text-gray-400 hover:text-red-400 transition-colors"
              >
                ×
              </button>
            </motion.div>
          );
        })}
      </div>

      {watchlist.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          No symbols in watchlist
        </div>
      )}
    </div>
  );
}