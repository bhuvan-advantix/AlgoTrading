import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import ChartSection from './ChartSection';
import OrderForm from './OrderForm';
import PortfolioSummary from './PortfolioSummary';
import MarketDataService from '../../services/marketDataService';
import { placeMarketOrder, readState, subscribePrice, setPrice } from '../../utils/paperTradingStore';

/*
  TradingViewProfessional.jsx
  - Single polished header (no duplicates)
  - Professional, compact, responsive Market Top Bar (horizontal scroll on mobile)
  - Clean market cards, clear Open/Closed state using timezone-aware checks
  - Responsive layout: stacked on mobile, 3/1 grid on desktop
  - Uses live MarketDataService.getQuote for data (no dummy values)
  - Accessible, keyboard-friendly search placement and clear visual hierarchy
*/

const MAJOR_INDICES = [
  { symbol: '^NSEI', name: 'NIFTY 50', market: 'India', currency: 'INR' },
  { symbol: '^BSESN', name: 'SENSEX', market: 'India', currency: 'INR' },
  { symbol: '^GSPC', name: 'S&P 500', market: 'US', currency: 'USD' },
  { symbol: '^DJI', name: 'Dow Jones', market: 'US', currency: 'USD' },
  { symbol: '^IXIC', name: 'NASDAQ', market: 'US', currency: 'USD' },
  { symbol: '^N225', name: 'Nikkei 225', market: 'Japan', currency: 'JPY' },
  { symbol: '^FTSE', name: 'FTSE 100', market: 'UK', currency: 'GBP' },
  { symbol: 'EURUSD=X', name: 'EUR/USD', market: 'Forex', currency: 'USD' }
];

const formatCurrency = (value, currency) => {
  if (value === null || value === undefined) return '—';
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 2 }).format(value);
  } catch {
    return typeof value === 'number' ? value.toFixed(2) : String(value);
  }
};

function getTimePartsForZone(date = new Date(), timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short'
  }).formatToParts(date);

  const hour = Number(parts.find(p => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find(p => p.type === 'minute')?.value ?? 0);
  const weekday = parts.find(p => p.type === 'weekday')?.value ?? 'Sun';
  return { hour, minute, weekday };
}

function isMarketOpenFor(symbol, now = new Date()) {
  switch (symbol) {
    case '^NSEI':
    case '^BSESN': {
      const { hour, minute, weekday } = getTimePartsForZone(now, 'Asia/Kolkata');
      if (weekday === 'Sat' || weekday === 'Sun') return false;
      const minutes = hour * 60 + minute;
      return minutes >= (9 * 60 + 15) && minutes <= (15 * 60 + 30);
    }
    case '^GSPC':
    case '^DJI':
    case '^IXIC': {
      const { hour, minute, weekday } = getTimePartsForZone(now, 'America/New_York');
      if (weekday === 'Sat' || weekday === 'Sun') return false;
      const minutes = hour * 60 + minute;
      return minutes >= (9 * 60 + 30) && minutes < (16 * 60);
    }
    case '^N225': {
      const { hour, minute, weekday } = getTimePartsForZone(now, 'Asia/Tokyo');
      if (weekday === 'Sat' || weekday === 'Sun') return false;
      const minutes = hour * 60 + minute;
      return (minutes >= 9 * 60 && minutes < 11 * 60 + 30) || (minutes >= 12 * 60 + 30 && minutes < 15 * 60);
    }
    case '^FTSE': {
      const { hour, minute, weekday } = getTimePartsForZone(now, 'Europe/London');
      if (weekday === 'Sat' || weekday === 'Sun') return false;
      const minutes = hour * 60 + minute;
      return minutes >= 8 * 60 && minutes < (16 * 60 + 30);
    }
    case 'EURUSD=X': {
      const { weekday } = getTimePartsForZone(now, 'UTC');
      if (weekday === 'Sat' || weekday === 'Sun') return false;
      return true;
    }
    default:
      return false;
  }
}

const MarketChip = ({ item }) => {
  const price = item.quote?.price ?? null;
  const change = item.quote?.changePercent ?? 0;
  const open = isMarketOpenFor(item.symbol);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-[220px] min-w-[200px] md:w-56 bg-gradient-to-br from-slate-800/60 to-slate-900/50 border border-slate-700/30 p-3 rounded-2xl shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs text-slate-300 font-semibold">{item.name}</div>
          <div className="mt-1 text-lg font-semibold text-white">{formatCurrency(price, item.currency)}</div>
        </div>
        <div className="text-right">
          <div className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${open ? 'bg-emerald-600/10 text-emerald-300' : 'bg-red-600/10 text-red-300'}`}>
            {open ? 'Open' : 'Closed'}
          </div>
          <div className={`mt-2 text-sm font-medium ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function TradingViewProfessional() {
  const [indicesData, setIndicesData] = useState([]);
  const [symbol, setSymbol] = useState('AAPL');
  const [quote, setQuote] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimer = useRef(null);
  const [now, setNow] = useState(new Date());

  // Clock update
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch indices periodically
  useEffect(() => {
    let mounted = true;

    const fetchIndices = async () => {
      try {
        const res = await Promise.all(
          MAJOR_INDICES.map(async (idx) => {
            try {
              const q = await MarketDataService.getQuote(idx.symbol);
              return { ...idx, quote: { price: q?.price ?? q?.lastPrice ?? null, changePercent: q?.percentChange ?? q?.changePercent ?? q?.percent ?? 0 } };
            } catch {
              console.error('Index fetch error', idx.symbol);
              return { ...idx, quote: { price: null, changePercent: 0 } };
            }
          })
        );
        if (mounted) setIndicesData(res);
      } catch {
        console.error('Fetch indices failed');
      }
    };

    fetchIndices();
    const id = setInterval(fetchIndices, 15000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  // Fetch selected symbol quote
  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      try {
        const q = await MarketDataService.getQuote(symbol);
        if (mounted) {
          if (q && q.price !== undefined && q.price !== null) {
            try { setPrice(symbol, Number(q.price)); } catch (err) { console.error('setPrice error', err); }
          }
          setQuote(q ?? null);
        }
      } catch {
        console.error('Quote fetch failed');
      }
    };
    if (symbol) fetch();
    return () => { mounted = false; };
  }, [symbol]);

  // Live price + store price subscription for the selected symbol
  useEffect(() => {
    if (!symbol) return;
    // start market data live updates (polling service)
    const stopMarket = MarketDataService.startLiveUpdates(symbol, (q) => {
      if (q && q.price !== undefined && q.price !== null) {
        try { setPrice(symbol, Number(q.price)); } catch (err) { console.error('setPrice error', err); }
      }
      setQuote(prev => ({ ...(prev || {}), ...q }));
    });

    // also subscribe to simulated store prices so OrderForm and portfolio see real ticks
    const unsub = subscribePrice(symbol, (price) => {
      setQuote(prev => ({ ...(prev || {}), price }));
    });

    return () => {
      try { stopMarket(); } catch (e) { console.error(e); }
      try { unsub(); } catch (e) { console.error(e); }
    };
  }, [symbol]);

  // Load persisted orders & wallet on mount
  useEffect(() => {
    const onIntent = async (e) => {
      const payload = e?.detail;
      if (!payload) return;
      try {
        const sym = (payload.symbol || '').toUpperCase();
        // Ensure store price syncs to the current authoritative quote before placing the order
        try {
          if (quote && quote.price !== undefined && quote.price !== null) {
            try { setPrice(sym, Number(quote.price)); } catch (err) { console.error('setPrice error', err); }
          }
        } catch (err) {
          console.error('Failed to set store price before order:', err);
        }

        const res = placeMarketOrder({ symbol: sym, side: payload.side, amount: payload.amount, qty: payload.qty });
        if (res && res.success) {
          // notify other components (Orders, Portfolio, Account) to refresh
          window.dispatchEvent(new CustomEvent('paper-trade-update'));
          window.dispatchEvent(new CustomEvent('paper-order-confirmed', { detail: res.order }));
        } else {
          window.dispatchEvent(new CustomEvent('paper-order-failed', { detail: res }));
        }
      } catch (err) {
        console.error('Order intent handler error', err);
      }
    };
    window.addEventListener('paper-order-intent', onIntent);

    return () => {
      window.removeEventListener('paper-order-intent', onIntent);
    };
  }, [quote]);

  // Instant search (queries backend search endpoint)
  const doSearch = useCallback(async (q) => {
    if (!q || q.length < 1) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      // Local matches from watchlist and major indices for instant suggestions
      const st = readState();
      const local = [];
      const qlow = q.toLowerCase();
      const wl = (st?.watchlist || []);
      wl.forEach(sym => {
        if (sym.toLowerCase().includes(qlow)) local.push({ symbol: sym, name: '' });
      });
      MAJOR_INDICES.forEach(mi => {
        if (mi.symbol.toLowerCase().includes(qlow) || mi.name.toLowerCase().includes(qlow)) local.push(mi);
      });

      // backend search (may be slow) - merge results, prefer backend
      let backend = [];
      try {
        const res = await fetch(`http://localhost:8081/api/search?query=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (Array.isArray(data.results)) backend = data.results;
      } catch {
        // ignore backend errors, rely on local
      }

      // Merge preserving uniqueness by symbol
      const map = new Map();
      backend.concat(local).forEach(it => {
        const key = (it.symbol || it.id || it.name || Math.random()).toString();
        if (!map.has(key)) map.set(key, it);
      });
      const merged = Array.from(map.values()).slice(0, 30);
      setSearchResults(merged);
    } catch (err) {
      console.error('Search error', err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const onSearchChange = (v) => {
    setSearchQuery(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => doSearch(v.trim()), 200);
  };

  const onSelectSearch = async (item) => {
    const s = item?.symbol || item;
    setSymbol(s);
    setSearchResults([]);
    setSearchQuery('');
    // fetch fresh quote
    try {
      const q = await MarketDataService.getQuote(s);
      if (q && q.price !== undefined && q.price !== null) {
        try { setPrice(s, Number(q.price)); } catch (err) { console.error('setPrice error', err); }
      }
      setQuote(q ?? null);
    } catch (e) { console.error(e); }
  };



  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-[#061226] text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header: single */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="w-full md:w-auto">
            {/* Mobile: Shorter title */}
            <h1 className="block md:hidden text-lg font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-emerald-300">Paper Trading</h1>
            {/* Desktop: Full title */}
            <h1 className="hidden md:block text-2xl lg:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-emerald-300">Paper Trading Terminal</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">Practice trading with live market data</p>
          </div>

          <div className="flex w-full md:w-auto items-center justify-between md:justify-end gap-4">
            <div className="hidden sm:flex flex-col text-right text-xs text-slate-400">
              <span>Local time</span>
              <span className="font-medium">{now.toLocaleString()}</span>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <button className="flex-1 md:flex-none justify-center items-center px-3 py-2 bg-slate-800/60 border border-slate-700/30 rounded-lg text-xs sm:text-sm text-slate-200 hover:bg-slate-800/80 whitespace-nowrap">Export</button>
              <button className="flex-1 md:flex-none justify-center items-center px-3 py-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-lg text-xs sm:text-sm font-semibold shadow-md whitespace-nowrap">Reset</button>
            </div>
          </div>
        </header>

        {/* Market Top Bar */}
        <section className="mb-6">
          <div className="rounded-2xl bg-gradient-to-bl from-slate-800/60 to-slate-900/50 border border-slate-700/30 p-4 shadow">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm text-slate-300 font-semibold">Major Markets</h2>
              <div className="text-xs text-slate-400">Live · updates every 15s</div>
            </div>

            <div className="overflow-x-auto no-scrollbar -mx-2 px-2">
              <div className="flex gap-3 py-2">
                {indicesData.length === 0 ? (
                  <div className="text-slate-400 text-sm">Loading markets...</div>
                ) : (
                  indicesData.map((it) => <MarketChip key={it.symbol} item={it} />)
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Main content */}
        <main className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            {/* Inline Search */}
            <div className="bg-slate-800/55 rounded-2xl border border-slate-700/25 p-4 shadow-sm">
              <label className="text-xs text-slate-400 mb-2 block">Search stocks</label>
              <div className="relative">
                <input
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Type symbol or name (e.g., RELIANCE.NS, AAPL)"
                  className="w-full px-3 py-2 bg-slate-900/50 text-white rounded-lg border border-slate-700/50 focus:border-cyan-600/50 focus:outline-none"
                />
                {searchLoading && <div className="absolute right-3 top-2 text-xs text-slate-400">Searching…</div>}
              </div>
              {searchResults.length > 0 && (
                <div className="mt-2 max-h-48 overflow-auto rounded-lg border border-slate-700/25 bg-slate-900/60">
                  {searchResults.map((it) => (
                    <div
                      key={it.symbol || it.id || Math.random()}
                      onClick={() => onSelectSearch(it)}
                      className="px-3 py-2 cursor-pointer hover:bg-slate-800/40 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-sm font-medium">{it.symbol}</div>
                        <div className="text-xs text-slate-400">{it.name || it.description || ''}</div>
                      </div>
                      <div className="text-sm text-slate-300">{it.currency || ''}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chart */}
            <div className="bg-slate-800/55 rounded-2xl border border-slate-700/25 p-4 shadow-sm">
              <ChartSection symbol={symbol} quote={quote} />
            </div>

            {/* Buy / Sell panel moved below chart */}
            <div className="bg-slate-800/55 rounded-2xl border border-slate-700/25 p-4 shadow-sm">
              <OrderForm symbol={symbol} quote={quote} />
            </div>
          </div>

          {/* Right side - Portfolio only, no orders shown on trading page */}
          <aside className="space-y-6">
            <div className="bg-slate-800/55 rounded-2xl border border-slate-700/25 p-4 shadow-sm">
              <PortfolioSummary />
            </div>
          </aside>
        </main>

        {/* Footer small note */}
        <div className="mt-6 text-xs text-slate-500">Data provided by your configured MarketDataService — live feeds, no dummy data. Make sure API keys are configured on the backend.</div>
      </div>
    </div>
  );
}
