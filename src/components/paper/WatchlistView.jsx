import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { readState } from '../../utils/paperTradingStore';
import MarketDataService from '../../services/marketDataService';

const STORAGE_KEY = 'adv_paper_v2';

export default function WatchlistView() {
  const [watchlist, setWatchlist] = useState([]);
  const [quotes, setQuotes] = useState({});
  const [newSymbol, setNewSymbol] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load watchlist from paper trading store
  useEffect(() => {
    const state = readState();
    setWatchlist(state.watchlist || []);
  }, []);

  // 🔄 Fetch live quotes periodically
  useEffect(() => {
    if (watchlist.length === 0) return;

    const updateQuotes = async () => {
      try {
        const quotesData = {};

        await Promise.all(
          watchlist.map(async (symbol) => {
            try {
              const quote = await MarketDataService.getQuote(symbol);
              if (quote && quote.price) {
                quotesData[symbol] = {
                  price: quote.price,
                  change: quote.changePercent || 0,
                  volume: quote.volume || 0,
                  high: quote.dayHigh || quote.price,
                  low: quote.dayLow || quote.price,
                  open: quote.open || quote.price,
                  previousClose: quote.previousClose || quote.price,
                };
              }
            } catch (err) {
              console.error(`Error fetching quote for ${symbol}:`, err);
            }
          })
        );

        setQuotes(quotesData);
        setError("");
      } catch (err) {
        console.error("Quote fetch error:", err);
        setError("Failed to load live data.");
      }
    };

    updateQuotes();
    const interval = setInterval(updateQuotes, 15000);
    return () => clearInterval(interval);
  }, [watchlist]);

  // 🔍 Search API - triggers with just 1 letter
  const handleSearch = async (query) => {
    setNewSymbol(query.toUpperCase());

    console.log('Search triggered for:', query);

    if (query.length < 1) {
      setSearchResults([]);
      return;
    }

    try {
      console.log('Calling MarketDataService.searchStocks with:', query);
      const results = await MarketDataService.searchStocks(query);
      console.log('Search results received:', results);

      if (results && results.length > 0) {
        setSearchResults(results.slice(0, 10));
      } else {
        console.log('No results found');
        setSearchResults([]);
      }
    } catch (err) {
      console.error("Search error:", err);
      setSearchResults([]);
    }
  };

  // ➕ Add symbol - with auto .NS for Indian stocks
  const handleAddSymbol = async (symbolParam) => {
    let symbol = (symbolParam || newSymbol).trim().toUpperCase();
    if (!symbol) return;

    // If typing directly (not from dropdown), try to add .NS for Indian stocks
    if (!symbolParam && !symbol.includes('.')) {
      const indianStocks = ['TCS', 'RELIANCE', 'INFY', 'HDFC', 'ICICI', 'WIPRO', 'BHARTI', 'ITC', 'SBIN', 'HCLT', 'TATAMOTORS', 'TATA', 'BAJAJ', 'MARUTI', 'ADANI'];
      const usStocks = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA', 'AMD', 'NFLX', 'INTC'];

      if (indianStocks.some(s => symbol.startsWith(s))) {
        symbol = `${symbol}.NS`;
      } else if (!usStocks.includes(symbol)) {
        symbol = `${symbol}.NS`;
      }
    }

    if (watchlist.includes(symbol)) {
      alert("Stock already in your watchlist!");
      setNewSymbol("");
      setSearchResults([]);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const quote = await MarketDataService.getQuote(symbol);
      if (!quote || !quote.price) {
        throw new Error("Invalid stock symbol");
      }

      const state = readState();
      const updatedList = [...(state.watchlist || []), symbol];

      const updatedState = { ...state, watchlist: updatedList };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedState));

      setWatchlist(updatedList);

      setQuotes((prev) => ({
        ...prev,
        [symbol]: {
          price: quote.price,
          change: quote.changePercent || 0,
          volume: quote.volume || 0,
          high: quote.dayHigh || quote.price,
          low: quote.dayLow || quote.price,
          open: quote.open || quote.price,
          previousClose: quote.previousClose || quote.price,
        },
      }));

      setNewSymbol("");
      setSearchResults([]);
      setError("");
    } catch (err) {
      console.error("Add error:", err);
      setError(`Could not find "${symbol}". Try selecting from search dropdown or use full symbol (e.g., TCS.NS).`);
    } finally {
      setLoading(false);
    }
  };

  // ❌ Remove symbol
  const handleRemoveSymbol = (symbol) => {
    const state = readState();
    const updated = (state.watchlist || []).filter((s) => s !== symbol);

    const updatedState = { ...state, watchlist: updated };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedState));

    setWatchlist(updated);
  };

  // 🎨 Helpers
  const formatPrice = (value, symbol) => {
    if (value == null) return "—";
    const currency = (symbol && (symbol.endsWith('.NS') || symbol.endsWith('.BO'))) ? '₹' : '$';
    return `${currency}${Number(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="space-y-6">
      {/* Search & Add Bar */}
      <div className="relative">
        <div className="flex gap-2">
          <input
            type="text"
            value={newSymbol}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="🔍 Type to search stocks (e.g., A for AAPL, T for TCS)"
            className="flex-1 bg-[#0d1324] border border-cyan-700/60 focus:border-cyan-400 rounded-xl p-3 text-white placeholder-gray-500 outline-none transition-all"
            onKeyDown={(e) => e.key === "Enter" && handleAddSymbol()}
          />
          <button
            onClick={() => handleAddSymbol()}
            disabled={loading}
            className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-500 hover:from-cyan-500 hover:to-blue-400 rounded-xl text-white font-semibold transition-all shadow-md disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add'}
          </button>
        </div>

        {/* Search Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute z-20 mt-2 bg-[#0b1120] border border-cyan-800 rounded-xl w-full shadow-xl backdrop-blur-lg max-h-96 overflow-y-auto">
            {searchResults.map((item) => (
              <div
                key={item.symbol}
                onClick={() => handleAddSymbol(item.symbol)}
                className="px-4 py-3 cursor-pointer hover:bg-cyan-900/40 text-white text-sm flex justify-between border-b border-gray-800 last:border-b-0"
              >
                <span>
                  <span className="font-semibold text-cyan-400">{item.symbol}</span> —{" "}
                  <span className="text-gray-300">{item.name}</span>
                </span>
                <span className="text-gray-500 text-xs">{item.exchange}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Empty State */}
      {watchlist.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-gray-400 py-20 border border-cyan-900 rounded-xl bg-[#0b1120]/50"
        >
          <p className="text-lg font-semibold text-white mb-2">
            No stocks added yet 📭
          </p>
          <p className="text-sm text-gray-500">
            Type any letter to search and add stocks.
          </p>
          <p className="text-xs text-gray-600 mt-2">
            💡 Tip: Select from dropdown for best results!
          </p>
        </motion.div>
      )}

      {/* Error */}
      {error && (
        <div className="text-red-400 text-sm text-center mt-2 bg-red-900/20 p-3 rounded-lg border border-red-700/30">
          {error}
        </div>
      )}

      {/* Watchlist Items */}
      <AnimatePresence>
        {watchlist.map((symbol) => {
          const quote = quotes[symbol];
          const isPositive = quote?.change >= 0;

          return (
            <motion.div
              key={symbol}
              layout
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center justify-between p-5 rounded-xl border border-cyan-800/60 bg-gradient-to-br from-[#0d1729] to-[#0a101f] hover:border-cyan-500/70 hover:shadow-lg transition-all"
            >
              {/* Symbol */}
              <div>
                <div className="text-white font-semibold text-lg tracking-wide">
                  {symbol}
                </div>
                <div
                  className={`text-xl font-bold ${isPositive ? "text-green-400" : "text-red-400"
                    }`}
                >
                  {quote ? formatPrice(quote.price, symbol) : "Loading..."}
                  {quote?.change != null && (
                    <span className="ml-2 text-sm">
                      ({isPositive ? "+" : ""}
                      {quote.change.toFixed(2)}%)
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  O:{formatPrice(quote?.open, symbol)} | H:{formatPrice(quote?.high, symbol)} | L:
                  {formatPrice(quote?.low, symbol)} | Vol:{" "}
                  {quote?.volume
                    ? quote.volume.toLocaleString()
                    : "—"} | Prev: {formatPrice(quote?.previousClose, symbol)}
                </div>
              </div>

              {/* Remove Button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleRemoveSymbol(symbol)}
                className="ml-4 text-gray-400 hover:text-red-400 transition-all text-2xl font-bold"
                title="Remove stock"
              >
                ×
              </motion.button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
