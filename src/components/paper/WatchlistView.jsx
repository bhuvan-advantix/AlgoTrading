import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = import.meta.env.VITE_MARKET_API_URL || "http://localhost:8081/api";

export default function WatchlistView() {
  const [watchlist, setWatchlist] = useState(() => {
    return JSON.parse(localStorage.getItem("watchlist") || "[]");
  });

  const [quotes, setQuotes] = useState({});
  const [newSymbol, setNewSymbol] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 🔄 Fetch live quotes periodically
  useEffect(() => {
    if (watchlist.length === 0) return;

    const updateQuotes = async () => {
      try {
        const responses = await Promise.all(
          watchlist.map((symbol) =>
            fetch(`${API_BASE}/quote/${symbol}`).then((res) => res.json())
          )
        );

        const data = {};
        responses.forEach((res) => {
          if (res.ok) {
            data[res.symbol] = {
              price: res.price,
              change: res.change,
              volume: res.raw.volume,
              high: res.raw.dayHigh,
              low: res.raw.dayLow,
              open: res.raw.open,
              previousClose: res.raw.previousClose,
            };
          }
        });

        setQuotes(data);
      } catch (err) {
        console.error("Quote fetch error:", err);
        setError("Failed to load live data.");
      }
    };

    updateQuotes();
    const interval = setInterval(updateQuotes, 15000);
    return () => clearInterval(interval);
  }, [watchlist]);

  // 🔍 Search API
  const handleSearch = async (query) => {
    setNewSymbol(query.toUpperCase());
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/search?query=${query}`);
      const data = await res.json();
      if (data.ok) setSearchResults(data.results.slice(0, 6));
    } catch (err) {
      console.error("Search error:", err);
    }
  };

  // ➕ Add symbol
  const handleAddSymbol = async (symbolParam) => {
    const symbol = (symbolParam || newSymbol).trim().toUpperCase();
    if (!symbol) return;
    if (watchlist.includes(symbol)) {
      alert("Symbol already in your watchlist!");
      setNewSymbol("");
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/quote/${symbol}`);
      const data = await res.json();
      if (!data.ok) throw new Error("Invalid stock symbol");

      const updatedList = [...watchlist, symbol];
      setWatchlist(updatedList);
      localStorage.setItem("watchlist", JSON.stringify(updatedList));
      setQuotes((prev) => ({
        ...prev,
        [symbol]: {
          price: data.price,
          change: data.change,
          volume: data.raw.volume,
          high: data.raw.dayHigh,
          low: data.raw.dayLow,
          open: data.raw.open,
          previousClose: data.raw.previousClose,
        },
      }));
      setNewSymbol("");
      setSearchResults([]);
    } catch (err) {
      console.error("Add error:", err);
      alert("Couldn't add this symbol.");
    } finally {
      setLoading(false);
    }
  };

  // ❌ Remove symbol
  const handleRemoveSymbol = (symbol) => {
    const updated = watchlist.filter((s) => s !== symbol);
    setWatchlist(updated);
    localStorage.setItem("watchlist", JSON.stringify(updated));
  };

  // 🎨 Helpers
  const formatPrice = (value) =>
    value != null
      ? `$${Number(value).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
      : "—";

  return (
    <div className="space-y-6">
      {/* Search & Add Bar */}
      <div className="relative">
        <div className="flex gap-2">
          <input
            type="text"
            value={newSymbol}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="🔍 Search stocks (e.g., NVDA, INFY, RELIANCE)"
            className="flex-1 bg-[#0d1324] border border-cyan-700/60 focus:border-cyan-400 rounded-xl p-3 text-white placeholder-gray-500 outline-none transition-all"
            onKeyDown={(e) => e.key === "Enter" && handleAddSymbol()}
          />
          <button
            onClick={() => handleAddSymbol()}
            className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-500 hover:from-cyan-500 hover:to-blue-400 rounded-xl text-white font-semibold transition-all shadow-md"
          >
            Add
          </button>
        </div>

        {/* Search Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute z-20 mt-2 bg-[#0b1120] border border-cyan-800 rounded-xl w-full shadow-xl backdrop-blur-lg">
            {searchResults.map((item) => (
              <div
                key={item.symbol}
                onClick={() => handleAddSymbol(item.symbol)}
                className="px-4 py-2 cursor-pointer hover:bg-cyan-900/40 text-white text-sm flex justify-between"
              >
                <span>
                  <span className="font-semibold">{item.symbol}</span> —{" "}
                  <span className="text-gray-400">{item.name}</span>
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
            Search and add your favorite stocks to start tracking live prices.
          </p>
        </motion.div>
      )}

      {/* Error */}
      {error && (
        <div className="text-red-400 text-sm text-center mt-2">{error}</div>
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
                  {formatPrice(quote?.price)}
                  {quote?.change != null && (
                    <span className="ml-2 text-sm">
                      ({isPositive ? "+" : ""}
                      {quote.change.toFixed(2)}%)
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  O:{formatPrice(quote?.open)} | H:{formatPrice(quote?.high)} | L:
                  {formatPrice(quote?.low)} | Vol:{" "}
                  {quote?.volume
                    ? quote.volume.toLocaleString()
                    : "—"} | Prev: {formatPrice(quote?.previousClose)}
                </div>
              </div>

              {/* Remove Button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleRemoveSymbol(symbol)}
                className="ml-4 text-gray-400 hover:text-red-400 transition-all text-lg"
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
