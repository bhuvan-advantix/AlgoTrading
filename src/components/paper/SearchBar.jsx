import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { MARKET_API_BASE } from '../../config';

const SearchBar = ({ onSelect, onSearch }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchRef = useRef(null);
  const controllerRef = useRef(null);

  /* ------------------------------------
     CLOSE DROPDOWN WHEN CLICK OUTSIDE
  ------------------------------------ */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setResults([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ------------------------------------
     LIVE SEARCH (FULL LIST ON ANY LETTER)
  ------------------------------------ */
  useEffect(() => {
    const handleSearch = async () => {
      if (!query || query.trim().length === 0) {
        setResults([]);
        return;
      }

      // cancel running request
      if (controllerRef.current) controllerRef.current.abort();
      controllerRef.current = new AbortController();

      setLoading(true);
      setError(null);

      try {
        const base = MARKET_API_BASE || 'https://algotrading-1-v2p7.onrender.com/api';
        const res = await fetch(
          `${base}/search?query=${encodeURIComponent(query)}`,
          { signal: controllerRef.current.signal }
        );

        // If server returns non-json, try reading text for debug
        const contentType = res.headers.get('content-type') || '';
        let data = null;
        if (contentType.includes('application/json')) {
          data = await res.json();
        } else {
          const txt = await res.text();
          // fallback: try parse
          try { data = JSON.parse(txt); } catch { data = { results: [] }; }
        }

        let backendResults = [];

        // Accept common backend response shapes
        if (Array.isArray(data)) {
          backendResults = data;
        } else if (data && Array.isArray(data.results)) {
          backendResults = data.results;
        } else if (data && Array.isArray(data.data)) {
          backendResults = data.data;
        } else if (data && data.result && Array.isArray(data.result)) {
          backendResults = data.result;
        }

        // If backend returned many results, further refine using multi-token matching
        const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

        const refined = backendResults.filter(item => {
          const hay = ((item.symbol || '') + ' ' + (item.name || '') + ' ' + (item.exchange || '')).toLowerCase();
          // all tokens must appear somewhere (AND semantics)
          return tokens.every(t => hay.indexOf(t) !== -1);
        });

        // If refined is empty but backend had results, fallback to backendResults
        const finalResults = refined.length > 0 ? refined : backendResults;

        setResults(finalResults);
        onSearch?.(backendResults);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError("Failed to search stocks");
        }
      } finally {
        setLoading(false);
      }
    };

    const delay = setTimeout(handleSearch, 200); // faster, smoother
    return () => clearTimeout(delay);
  }, [query, onSearch]);

  /* ------------------------------------
     SELECT STOCK
  ------------------------------------ */
  const handleSelect = (symbol) => {
    onSelect?.(symbol);
    setQuery("");
    setResults([]);
  };

  return (
    <div ref={searchRef} className="relative z-[999] w-full">
      {/* INPUT BOX */}
      <div className="relative">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (results.length > 0) {
                handleSelect(results[0].symbol || results[0].tradingsymbol);
              } else if (query.trim()) {
                // Fallback: use typed query if no results (user might know the symbol)
                handleSelect(query.trim().toUpperCase());
              }
            }
          }}
          placeholder="Search stocks (TCS, RELIANCE, INFY...)"
          className="w-full pl-12 pr-4 py-3 bg-[#0d1b2a] text-white rounded-xl
          border border-blue-500/20 focus:border-blue-500/40
          focus:ring-2 focus:ring-blue-500/10 outline-none
          transition-all duration-150"
        />

        {loading && (
          <div className="absolute inset-y-0 right-4 flex items-center">
            <div className="animate-spin h-5 w-5 border-2 border-blue-400/50 rounded-full border-t-transparent"></div>
          </div>
        )}
      </div>

      {/* RESULTS */}
      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute w-full mt-2 bg-[#0d1b2a]/95 backdrop-blur-xl
             rounded-xl border border-blue-500/20 shadow-xl overflow-hidden"
          >
            <div className="max-h-[350px] overflow-y-auto">
              {results.map((stock, idx) => (
                <motion.button
                  key={`${stock.symbol || stock.tradingsymbol}-${idx}`}
                  onClick={() => handleSelect(stock.symbol || stock.tradingsymbol)}
                  whileHover={{ backgroundColor: "rgba(59,130,246,0.06)" }}
                  className="w-full px-4 py-3 flex items-center justify-between
                  border-b border-blue-500/10 last:border-0 text-left hover:bg-slate-800"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="text-white font-semibold">{(stock.symbol || stock.tradingsymbol || '').toUpperCase()}</div>
                      <div className="text-xs text-gray-400">{stock.exchange || stock.exch || ''}</div>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{stock.name || stock.description || stock.company || "—"}</div>
                  </div>
                  <div className="text-right ml-4">
                    {stock.price ? <div className="text-sm text-green-300">₹{Number(stock.price).toFixed(2)}</div> : null}
                    <div className="text-xs text-gray-400">{stock.sector || ''}</div>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ERROR BOX */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute w-full mt-2 p-3 bg-red-500/10 border border-red-500/20
            rounded-lg text-red-400 text-sm"
        >
          {error}
        </motion.div>
      )}
    </div>
  );
};

export default SearchBar;
