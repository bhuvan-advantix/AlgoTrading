import React, { useState, useEffect, useMemo, useContext } from 'react';
import { motion as Motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { readState, resetSession, subscribePrice } from '../../utils/paperTradingStore';
import { AppContext } from '../../context/AppContext';
import { API_URL, MARKET_API_BASE } from '../../config';
import SearchBar from './SearchBar';
import MarketDataService from '../../services/marketDataService';

// --- Helper Components ---
const Card = ({ title, value, prefix = '', suffix = '', color, children }) => {
  const renderVal = () => {
    if (value === null || value === undefined) return children || '—';
    if (typeof value === 'number') return value.toLocaleString('en-US', { minimumFractionDigits: 2 });
    try { return String(value); } catch { return '—'; }
  };
  return (
    <Motion.div
      whileHover={{ scale: 1.03 }}
      className="bg-[#111526] p-6 rounded-xl border border-cyan-800 shadow-sm transition-all"
    >
      <div className="text-sm text-gray-400">{title}</div>
      <div className="text-2xl font-bold mt-1" style={{ color }}>
        {prefix}
        {renderVal()}
        {suffix}
      </div>
    </Motion.div>
  );
};

const ChartCard = ({ title, children }) => (
  <div className="bg-[#111526] p-5 rounded-xl border border-cyan-800">
    <h4 className="text-white font-semibold mb-2 text-sm">{title}</h4>
    {children}
  </div>
);

export default function AccountView() {
  // Read from the paper trading store
  const [balance, setBalance] = useState(() => {
    const st = readState();
    return st.wallet?.cash || 100000;
  });

  const [positions, setPositions] = useState(() => {
    const st = readState();
    return Object.entries(st.positions || {}).map(([sym, pos]) => ({
      symbol: sym,
      qty: pos.qty,
      avgPrice: pos.avgPrice
    }));
  });

  const [orders, setOrders] = useState(() => {
    const st = readState();
    return st.orders || [];
  });

  const [equityHistory, setEquityHistory] = useState(() => {
    const st = readState();
    return st.equityHistory || [];
  });

  const [prices, setPrices] = useState({});
  const [marketPrices, setMarketPrices] = useState({});
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshIntervalMs, setRefreshIntervalMs] = useState(30000);
  const [kiteAccount, setKiteAccount] = useState(null);
  const [kiteLoading, setKiteLoading] = useState(false);
  const [kiteError, setKiteError] = useState(null);

  // Simple order form state for live trading via Zerodha
  const [orderSymbol, setOrderSymbol] = useState('');
  const [orderQty, setOrderQty] = useState(1);
  const [orderSide, setOrderSide] = useState('BUY');
  const [orderExchange, setOrderExchange] = useState('NSE');
  const [orderProduct, setOrderProduct] = useState('MIS');
  const [showConfirm, setShowConfirm] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  const [confirmPayload, setConfirmPayload] = useState(null);

  const [kiteOrders, setKiteOrders] = useState([]);
  const [kiteLastUpdated, setKiteLastUpdated] = useState(null);
  const [activeZerodhaTab, setActiveZerodhaTab] = useState('successful'); // 'successful' | 'failed'

  // Debounce timer for order fetching to prevent rate limiting
  const _orderFetchTimerRef = React.useRef(null);
  const _lastOrderFetchRef = React.useRef(0);

  // Fetch live prices using MarketDataService
  useEffect(() => {
    if (positions.length === 0) return;

    const fetchPrices = async () => {
      const newPrices = { ...prices };

      await Promise.all(positions.map(async (p) => {
        const quote = await MarketDataService.getQuote(p.symbol);
        if (quote && quote.price) {
          newPrices[p.symbol] = {
            price: quote.price,
            prevClose: quote.price / (1 + (quote.changePercent / 100)) // Estimate prev close
          };
        }
      }));

      setPrices(newPrices);
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 5000); // Update every 5s
    return () => clearInterval(interval);
  }, [positions.map(p => p.symbol).join(',')]);

  // Calculate invested value using live prices
  const currentMarketValue = positions.reduce((sum, pos) => {
    const priceData = prices[pos.symbol];
    const livePrice = priceData ? priceData.price : pos.avgPrice;
    return sum + (pos.qty * livePrice);
  }, 0);

  // Calculate Total Unrealized P&L (Invested vs Current)
  const costBasis = positions.reduce((sum, pos) => {
    return sum + (pos.qty * pos.avgPrice);
  }, 0);
  const totalUnrealizedPnL = currentMarketValue - costBasis;

  // Calculate Today's P&L (Prev Close vs Current)
  const todaysPnL = positions.reduce((sum, pos) => {
    const priceData = prices[pos.symbol];
    if (!priceData || !priceData.prevClose) return sum;
    return sum + ((priceData.price - priceData.prevClose) * pos.qty);
  }, 0);

  const totalValue = balance + currentMarketValue;
  const pnlPercent = costBasis === 0 ? 0 : ((todaysPnL / costBasis) * 100).toFixed(2);

  // Listen for trade updates to refresh account data
  useEffect(() => {
    const onUpdate = () => {
      const st = readState();
      setBalance(st.wallet?.cash || 100000);
      setPositions(Object.entries(st.positions || {}).map(([sym, pos]) => ({
        symbol: sym,
        qty: pos.qty,
        avgPrice: pos.avgPrice
      })));
      setOrders(st.orders || []);
      setEquityHistory(st.equityHistory || []);
    };
    window.addEventListener('paper-trade-update', onUpdate);
    return () => window.removeEventListener('paper-trade-update', onUpdate);
  }, [positions]);

  const { kiteUserId: ctxKiteUserId } = useContext(AppContext) || {};

  // Fetch Zerodha account details
  const fetchKiteAccount = React.useCallback(async () => {
    const kiteUserId = ctxKiteUserId || (() => { try { return localStorage.getItem('kiteUserId'); } catch { return null; } })();
    if (!kiteUserId) return;

    setKiteLoading(true);
    setKiteError(null);
    try {
      const r = await fetch(`${API_URL}/api/kite/account`, { headers: { 'x-user-id': kiteUserId } });
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(`Server returned ${r.status}: ${txt}`);
      }
      const j = await r.json();
      if (j.success) {
        setKiteAccount(j.data);
        setKiteLastUpdated(Date.now());
      } else {
        throw new Error(j.error || 'Failed to fetch account');
      }
    } catch (err) {
      console.warn('fetchKiteAccount error', err);
      setKiteError(err.message);
    } finally {
      setKiteLoading(false);
    }
  }, [ctxKiteUserId]);

  // Fetch Zerodha/Kite account details if user has connected (kiteUserId in context or localStorage)
  useEffect(() => {
    fetchKiteAccount();
  }, [fetchKiteAccount]);

  // Fetch kite orders explicitly from backend (define first before use in deps)
  const fetchKiteOrders = React.useCallback(async (kiteUserId) => {
    // Debounce: skip if we fetched orders less than 5 seconds ago
    const now = Date.now();
    if (now - _lastOrderFetchRef.current < 5000) return;
    _lastOrderFetchRef.current = now;

    if (!kiteUserId) return;
    try {
      const r = await fetch(`${API_URL}/api/kite/orders`, { headers: { 'x-user-id': kiteUserId } });
      if (!r.ok) return;
      const ct = r.headers.get('content-type') || '';
      if (!ct.includes('application/json')) return;
      const j = await r.json().catch(() => null);
      if (j && j.success && Array.isArray(j.data)) {
        setKiteOrders(j.data || []);
        setKiteLastUpdated(Date.now());
      } else if (Array.isArray(j)) {
        setKiteOrders(j || []);
        setKiteLastUpdated(Date.now());
      }
    } catch (e) {
      console.warn('fetchKiteOrders error', e);
    }
  }, []);

  // Fetch live market prices for positions using market-data proxy
  const fetchLivePricesForPositions = React.useCallback(async (posList) => {
    try {
      const base = MARKET_API_BASE || 'https://algotrading-1-v2p7.onrender.com/api';
      const syms = (posList || positions || []).map(p => (p.symbol || p.tradingsymbol || '').toUpperCase()).filter(Boolean);
      if (!syms.length) return;
      const uniq = Array.from(new Set(syms)).slice(0, 40);
      const promises = uniq.map(s => fetch(`${base}/quote/${encodeURIComponent(s)}`).then(r => {
        if (!r.ok) return null;
        const ct = r.headers.get('content-type') || '';
        return ct.includes('application/json') ? r.json().catch(() => null) : r.text().then(() => null);
      }).catch(() => null));
      const results = await Promise.all(promises);
      const map = {};
      results.forEach((res, i) => {
        const s = uniq[i];
        if (res && res.price !== undefined) map[s] = Number(res.price);
        else if (res && (res.lastPrice || res.ltp)) map[s] = Number(res.lastPrice || res.ltp || 0);
      });
      setMarketPrices(prev => ({ ...prev, ...map }));
    } catch (err) {
      console.warn('fetchLivePricesForPositions error', err);
    }
  }, [positions]);

  // Auto-refresh market prices and kite account periodically
  useEffect(() => {
    let timer = null;
    if (autoRefresh && (kiteAccount || positions.length > 0)) {
      // initial fetch
      fetchLivePricesForPositions(positions);
      if (kiteAccount) {
        const kiteUserId = ctxKiteUserId || (() => { try { return localStorage.getItem('kiteUserId'); } catch { return null; } })();
        if (kiteUserId) {
          fetch(`${API_URL}/api/kite/account`, { headers: { 'x-user-id': kiteUserId } })
            .then(async r => {
              if (r.ok) {
                try { const d = await r.json(); if (d?.success) setKiteAccount(d.data || {}); }
                catch (e) { console.warn('parse kite account after interval error', e); }
              }
            }).catch(e => { console.warn('refresh kite account error', e); });
        }
      }
      timer = setInterval(() => {
        fetchLivePricesForPositions(positions);
      }, refreshIntervalMs);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [autoRefresh, refreshIntervalMs, kiteAccount, positions, ctxKiteUserId, fetchLivePricesForPositions, fetchKiteOrders]);

  // Call fetchKiteOrders on mount if user is connected
  useEffect(() => {
    const kiteUserId = ctxKiteUserId || (() => { try { return localStorage.getItem('kiteUserId'); } catch { return null; } })();
    if (kiteUserId) fetchKiteOrders(kiteUserId);
  }, [ctxKiteUserId, fetchKiteOrders]);

  // Helpers for formatting
  const formatCurrency = (v, opts = { locale: 'en-IN', currencySymbol: '₹' }) => {
    if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';
    try {
      return `${opts.currencySymbol}${Number(v).toLocaleString(opts.locale, { minimumFractionDigits: 2 })}`;
    } catch { return `${opts.currencySymbol}${Number(v).toFixed(2)}`; }
  };

  const formatNumber = (v, options = {}) => {
    if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';
    try { return Number(v).toLocaleString('en-IN', options); } catch { return String(v); }
  };

  // Order flow helpers
  const handleInitiateOrder = () => {
    if (kiteLoading) { alert('Please wait — loading account info'); return; }
    const kiteUserId = ctxKiteUserId || (() => { try { return localStorage.getItem('kiteUserId'); } catch { return null; } })();
    if (!kiteUserId) { alert('Zerodha not connected'); return; }
    if (!orderSymbol || !orderQty) { alert('Symbol and quantity required'); return; }
    const estPrice = marketPrices[orderSymbol.toUpperCase()] || 0;
    const estimatedCost = estPrice * orderQty;
    // For Kite, tradingsymbol should NOT have .NS suffix
    const kiteSymbol = orderSymbol.split('.')[0];
    setConfirmPayload({
      kiteUserId,
      exchange: orderExchange,
      tradingsymbol: kiteSymbol,
      transaction_type: orderSide,
      quantity: orderQty,
      order_type: 'MARKET',
      product: orderProduct,
      estPrice,
      estimatedCost
    });
    setShowConfirm(true);
  };

  const handlePlaceOrder = async () => {
    if (!confirmPayload) return;
    setPlacingOrder(true);
    setOrderResult(null);

    // Determine the correct backend URL (same as OrderForm)
    const backendUrl = window.location.hostname === 'localhost'
      ? 'http://localhost:5000'
      : 'https://algotrading-2sbm.onrender.com';

    try {
      const res = await fetch(`${backendUrl}/api/kite/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': confirmPayload.kiteUserId },
        body: JSON.stringify({
          exchange: confirmPayload.exchange,
          tradingsymbol: confirmPayload.tradingsymbol,
          transaction_type: confirmPayload.transaction_type,
          quantity: confirmPayload.quantity,
          order_type: confirmPayload.order_type,
          product: confirmPayload.product
        })
      });

      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        const txt = await res.text();
        setOrderResult({ ok: false, msg: `Server error: ${res.status}. ${txt.slice(0, 200)}` });
        return;
      }

      const j = await res.json().catch(e => {
        console.error('JSON parse error:', e);
        return null;
      });

      if (!j) {
        setOrderResult({ ok: false, msg: 'Invalid server response' });
        return;
      }

      if (j.success) {
        setOrderResult({ ok: true, msg: '✅ Order placed successfully! Updating live data...' });
        // Refresh kite account and orders immediately
        try {
          const acct = await fetch(`${backendUrl}/api/kite/account`, { headers: { 'x-user-id': confirmPayload.kiteUserId } });
          if (acct.ok) {
            const aj = await acct.json().catch(() => null);
            if (aj?.success) {
              setKiteAccount(aj.data);
              if (Array.isArray(aj.data.orders)) setKiteOrders(aj.data.orders);
            }
          }
        } catch (e) {
          console.warn('account refresh error:', e);
        }
        // Also fetch orders explicitly
        fetchKiteOrders(confirmPayload.kiteUserId);
        // Clear form
        setOrderSymbol('');
        setOrderQty(1);
      } else {
        // Parse error for user-friendly message
        let errorMsg = j.error || j.message || 'Order placement failed';

        // Make error messages user-friendly
        if (errorMsg.toLowerCase().includes('insufficient funds') ||
          errorMsg.toLowerCase().includes('margin')) {
          errorMsg = '💰 Insufficient funds in your account. Please add funds to place this order.';
        } else if (errorMsg.toLowerCase().includes('invalid symbol') ||
          errorMsg.toLowerCase().includes('tradingsymbol')) {
          errorMsg = '🔍 Invalid stock symbol. Please check the symbol and try again.';
        } else if (errorMsg.toLowerCase().includes('market closed') ||
          errorMsg.toLowerCase().includes('trading hours')) {
          errorMsg = '⏰ Market is closed. Orders can only be placed during trading hours (9:15 AM - 3:30 PM).';
        } else if (errorMsg.toLowerCase().includes('quantity')) {
          errorMsg = '📊 Invalid quantity. Please check the lot size and quantity requirements.';
        } else if (errorMsg.toLowerCase().includes('price')) {
          errorMsg = '💵 Invalid price. Please check the price limits for this stock.';
        } else if (errorMsg.toLowerCase().includes('token') ||
          errorMsg.toLowerCase().includes('session')) {
          errorMsg = '🔐 Session expired. Please reconnect your Zerodha account.';
        }

        setOrderResult({ ok: false, msg: errorMsg });
      }
    } catch (err) {
      // Network or connection errors
      let errorMsg = err.message || String(err);

      if (errorMsg.includes('fetch') || errorMsg.includes('Failed to fetch')) {
        errorMsg = '🌐 Cannot connect to server. Please check your internet connection.';
      } else if (errorMsg.includes('timeout')) {
        errorMsg = '⏱️ Request timed out. Please try again.';
      } else if (errorMsg.includes('Server error')) {
        errorMsg = '🔧 Server error. Please try again in a moment.';
      }

      setOrderResult({ ok: false, msg: errorMsg });
    } finally {
      setPlacingOrder(false);
      // Auto-close after 2 seconds on success, keep open on error for user to see
      if (orderResult?.ok) {
        setTimeout(() => { setShowConfirm(false); setOrderResult(null); setConfirmPayload(null); }, 2000);
      }
    }
  };

  // Combined orders view (kite + local store)
  const combinedOrders = useMemo(() => {
    const local = Array.isArray(orders) ? orders : [];
    // If kiteOrders present, use them prominently
    if (kiteOrders && kiteOrders.length) return [...kiteOrders, ...local].slice(0, 200);
    return [...local].slice(0, 200);
  }, [kiteOrders, orders]);

  // Use only kiteOrders (Zerodha live), not combined with local paper trading orders
  const zerodhaSuccessfulOrders = useMemo(() => (kiteOrders || []).filter(o => {
    const s = String(o.status || o.order_status || o.state || '').toLowerCase();
    if (!s && !o.error && (o.filled_quantity || o.filled_qty || o.qty || o.quantity)) return true;
    return /fill|complete|success|executed/i.test(s) && !/reject|cancel|rejected/i.test(s);
  }), [kiteOrders]);

  const zerodhaFailedOrders = useMemo(() => (kiteOrders || []).filter(o => {
    const s = String(o.status || o.order_status || o.state || '').toLowerCase();
    return /reject|fail|error|rejected|cancelled/i.test(s) || Boolean(o.error);
  }), [kiteOrders]);

  const portfolioHistory = useMemo(() => {
    const hist = equityHistory.map(e => ({
      time: new Date(e.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      value: e.equity
    }));
    return hist.slice(-30);
  }, [equityHistory]);

  // --- Chart Data ---
  const pieData = [
    { name: 'Cash', value: balance },
    { name: 'Invested', value: currentMarketValue },
  ];
  const profitData = [
    { name: 'Unrealized', value: todaysPnL },
    { name: 'Cash', value: balance },
  ];
  const COLORS = ['#00bcd4', '#1e88e5', '#00e676', '#ff5252'];

  // --- Add Funds ---
  const handleAddFunds = () => {
    console.log('Add funds not yet supported');
  };

  // --- Reset Account ---
  const handleResetAccount = () => {
    if (confirm('Reset account and clear all data?')) {
      resetSession();
      window.location.reload();
    }
  };

  // Helper to format quantity without excessive zeros
  const formatQty = (v) => {
    if (!v) return '0';
    const n = Number(v);
    if (Number.isInteger(n)) return n.toString();
    return n.toFixed(4).replace(/\.?0+$/, '');
  };

  // --- UI ---
  return (
    <div className="space-y-6">
      {/* === Account Summary === */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Available Balance" value={balance} color="#00bcd4" prefix="$" />
        <Card title="Invested Value" value={currentMarketValue} color="#1e88e5" prefix="$" />
        <Card
          title="Today's P&L"
          value={Math.abs(todaysPnL)}
          color={todaysPnL >= 0 ? '#00e676' : '#ff5252'}
          prefix={todaysPnL >= 0 ? '+$' : '-$'}
          suffix={` (${pnlPercent}%)`}
        />
      </div>

      {/* === Charts Section === */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Portfolio Value Line Chart */}
        <ChartCard title="Portfolio Value Over Time">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={portfolioHistory}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis dataKey="time" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0b1526',
                  border: '1px solid #00bcd4',
                  color: '#fff',
                }}
                formatter={(v) => [`$${v.toFixed(2)}`, 'Value']}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#00bcd4"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Cash vs Invested Pie Chart */}
        <ChartCard title="Cash vs Invested">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={70}
                innerRadius={40}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `$${v.toFixed(2)}`} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Profit Breakdown Bar Chart */}
        <ChartCard title="Profit Breakdown">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={profitData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip formatter={(v) => `$${v.toFixed(2)}`} />
              <Bar dataKey="value" barSize={40}>
                {profitData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i + 2]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* === ZERODHA LIVE ACCOUNT SECTION === */}
      <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-slate-950/40 p-6 sm:p-8 rounded-2xl border border-indigo-500/20 shadow-2xl backdrop-blur-sm">
        {/* Header with Live Badge */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-4">
            {/* Zerodha Logo/Icon */}
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 18c-3.86-.96-7-5.27-7-9V8.3l7-3.5 7 3.5V11c0 3.73-3.14 8.04-7 9z" />
                  <path d="M12 6L7 8.5V13c0 2.76 2.24 5.96 5 6.71 2.76-.75 5-3.95 5-6.71V8.5L12 6z" />
                </svg>
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              </div>
            </div>

            {/* Account Info */}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  Zerodha Live Account
                </h2>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-500/30">
                  LIVE
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className="text-sm text-indigo-300 font-medium">
                  {kiteAccount?.profile?.user_name || kiteAccount?.profile?.user_shortname || kiteAccount?.profile?.user_id || 'Trader'}
                </span>
                {kiteLastUpdated && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="text-xs text-slate-400">
                      Updated {new Date(kiteLastUpdated).toLocaleTimeString()}
                    </span>
                  </>
                )}
              </div>
              {kiteError && (
                <div className="mt-2 text-red-400 text-xs bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 inline-block">
                  ⚠️ {kiteError}
                </div>
              )}
            </div>
          </div>


          {/* Auto-refresh Controls */}
          <div className="flex items-center gap-3 bg-slate-800/30 px-4 py-2 rounded-lg border border-slate-700/50">
            <label className="text-xs text-slate-400 font-medium">Auto-refresh</label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 cursor-pointer accent-blue-600"
            />
            <select
              value={refreshIntervalMs}
              onChange={(e) => setRefreshIntervalMs(Number(e.target.value))}
              className="bg-slate-700/50 text-xs text-slate-300 px-3 py-1.5 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
            >
              <option value={5000}>5s</option>
              <option value={10000}>10s</option>
              <option value={15000}>15s</option>
              <option value={30000}>30s</option>
            </select>
          </div>
        </div>


        {
          kiteLoading ? (
            <div className="text-center py-12">
              <div className="inline-flex flex-col items-center gap-3">
                <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                <div className="text-slate-300 font-medium">Loading Zerodha account details...</div>
              </div>
            </div>
          ) : !kiteAccount ? (
            <div className="bg-gradient-to-br from-blue-950/30 to-indigo-950/30 border border-blue-600/30 p-8 rounded-xl text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-600/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="text-blue-300 font-bold text-lg mb-2">Zerodha Not Connected</div>
              <div className="text-blue-200/70 text-sm mb-4">Connect your Zerodha account to enable live trading</div>
              <button className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-600/30">
              </button>
            </div>
          ) : (
            <>
              {/* === Dashboard Tab === */}
              <div className="space-y-6">
                {/* Key Account Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-[#1a2332] p-4 rounded-lg border border-gray-700">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Account Equity</div>
                    <div className="text-2xl font-bold text-white mt-2">
                      {formatCurrency(kiteAccount.margins?.equity?.net ?? 0)}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Live Balance</div>
                  </div>

                  <div className="bg-[#1a2332] p-4 rounded-lg border border-gray-700">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Available Cash</div>
                    <div className="text-2xl font-bold text-emerald-400 mt-2">
                      {formatCurrency(kiteAccount.margins?.equity?.available?.cash ?? 0)}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">For Trading</div>
                  </div>

                  <div className="bg-[#1a2332] p-4 rounded-lg border border-gray-700">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Holdings</div>
                    <div className="text-2xl font-bold text-blue-400 mt-2">
                      {(kiteAccount.holdings && kiteAccount.holdings.length) || 0}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Active Holdings</div>
                  </div>

                  <div className="bg-[#1a2332] p-4 rounded-lg border border-gray-700">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Total Orders</div>
                    <div className="text-2xl font-bold text-cyan-400 mt-2">{kiteOrders.length}</div>
                    <div className="text-xs text-gray-400 mt-1">All Transactions</div>
                  </div>
                </div>

                {/* Margins Detail */}
                {kiteAccount.margins && kiteAccount.margins.equity && (
                  <div className="bg-[#1a2332] p-6 rounded-lg border border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-300 mb-4">Margin & Leverage (Equity)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-xs text-gray-400">Net Equity</div>
                        <div className="text-xl font-bold text-white mt-1">
                          {formatCurrency(kiteAccount.margins.equity.net ?? 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Available Cash</div>
                        <div className="text-xl font-bold text-emerald-400 mt-1">
                          {formatCurrency(kiteAccount.margins.equity.available?.cash ?? 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Used Margin</div>
                        <div className="text-xl font-bold text-orange-400 mt-1">
                          {formatCurrency(kiteAccount.margins.equity.utilised?.debits ?? 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Open Positions */}
                {kiteAccount.positions && (kiteAccount.positions.net || kiteAccount.positions.day || Array.isArray(kiteAccount.positions)) && (
                  <div className="bg-[#1a2332] p-6 rounded-lg border border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-300 mb-4">Open Positions</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-600 text-gray-400 text-xs">
                            <th className="px-3 py-2 text-left">Symbol</th>
                            <th className="px-3 py-2 text-right">Qty</th>
                            <th className="px-3 py-2 text-right">Avg Price</th>
                            <th className="px-3 py-2 text-right">LTP</th>
                            <th className="px-3 py-2 text-right">Market Value</th>
                            <th className="px-3 py-2 text-right">P&L</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const rawPos = Array.isArray(kiteAccount.positions)
                              ? kiteAccount.positions
                              : (kiteAccount.positions.net || kiteAccount.positions.day || []);
                            if (rawPos.length === 0) {
                              return <tr><td colSpan="6" className="text-center py-4 text-gray-400">No open positions</td></tr>;
                            }
                            return rawPos.map((p, idx) => {
                              const sym = (p.tradingsymbol || p.trading_symbol || p.symbol || '').toUpperCase() || '—';
                              const qty = Number(p.quantity || p.qty || 0);
                              const avg = Number(p.average_price || p.avg_price || 0);
                              const ltp = Number(marketPrices[sym] ?? p.last_price ?? p.ltp ?? 0);
                              const mktVal = qty * (ltp || avg);
                              const pnl = (ltp - avg) * qty;
                              return (
                                <tr key={sym + idx} className="border-b border-gray-700 text-gray-300">
                                  <td className="px-3 py-2 font-semibold text-white">{sym}</td>
                                  <td className="px-3 py-2 text-right">{formatNumber(qty)}</td>
                                  <td className="px-3 py-2 text-right">{formatCurrency(avg)}</td>
                                  <td className="px-3 py-2 text-right text-white font-semibold">{ltp ? formatCurrency(ltp) : '—'}</td>
                                  <td className="px-3 py-2 text-right">{formatCurrency(mktVal)}</td>
                                  <td className={`px-3 py-2 text-right font-semibold ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Quick Order Form */}
                <div className="bg-[#1a2332] p-6 rounded-lg border border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-300 mb-4">Place New Order</h3>
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                    <div className="md:col-span-2">
                      <label className="text-xs text-gray-400 uppercase tracking-wide">Symbol</label>
                      <div className="mt-2">
                        <SearchBar onSelect={(sym) => setOrderSymbol(sym)} onSearch={() => { }} />
                        <div className="text-xs text-gray-500 mt-2">Selected: <span className="font-mono text-gray-300">{orderSymbol || 'None'}</span></div>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 uppercase tracking-wide">Quantity</label>
                      <input type="number" min="1" value={orderQty} onChange={e => setOrderQty(Number(e.target.value))} className="w-full mt-2 px-3 py-2 bg-[#0f1724] border border-gray-600 rounded text-white text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 uppercase tracking-wide">Type</label>
                      <select value={orderSide} onChange={e => setOrderSide(e.target.value)} className="w-full mt-2 px-3 py-2 bg-[#0f1724] border border-gray-600 rounded text-white text-sm">
                        <option value="BUY">BUY</option>
                        <option value="SELL">SELL</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 uppercase tracking-wide">Exchange</label>
                      <select value={orderExchange} onChange={e => setOrderExchange(e.target.value)} className="w-full mt-2 px-3 py-2 bg-[#0f1724] border border-gray-600 rounded text-white text-sm">
                        <option>NSE</option>
                        <option>BSE</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 uppercase tracking-wide">Product</label>
                      <select value={orderProduct} onChange={e => setOrderProduct(e.target.value)} className="w-full mt-2 px-3 py-2 bg-[#0f1724] border border-gray-600 rounded text-white text-sm">
                        <option value="MIS">MIS</option>
                        <option value="CNC">CNC</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleInitiateOrder} className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm font-semibold transition" disabled={kiteLoading || !kiteAccount}>
                        Place Order
                      </button>
                      <button onClick={() => { setOrderSymbol(''); setOrderQty(1); setOrderSide('BUY'); }} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm transition">
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* === Transactions Section (Two Tabs) === */}
              <div className="mt-8 space-y-4">
                <div className="flex gap-2 border-b border-gray-700">
                  <button
                    onClick={() => setActiveZerodhaTab('successful')}
                    className={`px-4 py-3 text-sm font-semibold border-b-2 transition ${activeZerodhaTab === 'successful' ? 'text-emerald-400 border-emerald-400' : 'text-gray-400 border-transparent hover:text-gray-300'}`}
                  >
                    ✓ Successful ({zerodhaSuccessfulOrders.length})
                  </button>
                  <button
                    onClick={() => setActiveZerodhaTab('failed')}
                    className={`px-4 py-3 text-sm font-semibold border-b-2 transition ${activeZerodhaTab === 'failed' ? 'text-red-400 border-red-400' : 'text-gray-400 border-transparent hover:text-gray-300'}`}
                  >
                    ✗ Failed ({zerodhaFailedOrders.length})
                  </button>
                </div>

                {/* Successful Orders Tab */}
                {activeZerodhaTab === 'successful' && (
                  <div className="bg-[#1a2332] p-6 rounded-lg border border-gray-700">
                    <h3 className="text-sm font-semibold text-emerald-400 mb-4">Successful Transactions (Zerodha Live)</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-600 text-gray-400 text-xs">
                            <th className="px-3 py-2 text-left">Time</th>
                            <th className="px-3 py-2">Symbol</th>
                            <th className="px-3 py-2">Side</th>
                            <th className="px-3 py-2 text-right">Qty</th>
                            <th className="px-3 py-2 text-right">Price</th>
                            <th className="px-3 py-2 text-right">Amount</th>
                            <th className="px-3 py-2 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {zerodhaSuccessfulOrders.length === 0 ? (
                            <tr><td colSpan="7" className="text-center py-6 text-gray-500">No successful orders yet</td></tr>
                          ) : zerodhaSuccessfulOrders.slice(0, 50).map((o, idx) => (
                            <tr key={(o.id || o.order_id || idx) + '-' + idx} className="border-b border-gray-700 text-gray-300">
                              <td className="px-3 py-2 text-xs">{o.ts ? new Date(o.ts).toLocaleString() : (o.order_timestamp ? new Date(o.order_timestamp).toLocaleString() : '—')}</td>
                              <td className="px-3 py-2 font-semibold text-white">{o.symbol || o.tradingsymbol || '—'}</td>
                              <td className={`px-3 py-2 font-semibold ${String(o.side || o.transaction_type || '').toLowerCase().includes('sell') ? 'text-red-400' : 'text-emerald-400'}`}>
                                {o.side || o.transaction_type || '—'}
                              </td>
                              <td className="px-3 py-2 text-right">{formatNumber(o.qty || o.quantity || o.filled_quantity || 0)}</td>
                              <td className="px-3 py-2 text-right">{o.price ? formatCurrency(o.price) : (o.average_price ? formatCurrency(o.average_price) : '—')}</td>
                              <td className="px-3 py-2 text-right">{o.amount ? formatCurrency(o.amount) : '—'}</td>
                              <td className="px-3 py-2 text-right text-xs text-emerald-300">{o.status || 'FILLED'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Failed Orders Tab */}
                {activeZerodhaTab === 'failed' && (
                  <div className="bg-[#1a2332] p-6 rounded-lg border border-gray-700">
                    <h3 className="text-sm font-semibold text-red-400 mb-4">Failed / Rejected Transactions (Zerodha Live)</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-600 text-gray-400 text-xs">
                            <th className="px-3 py-2 text-left">Time</th>
                            <th className="px-3 py-2">Symbol</th>
                            <th className="px-3 py-2">Reason</th>
                            <th className="px-3 py-2 text-right">Qty</th>
                            <th className="px-3 py-2 text-right">Price</th>
                            <th className="px-3 py-2 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {zerodhaFailedOrders.length === 0 ? (
                            <tr><td colSpan="6" className="text-center py-6 text-gray-500">No failed orders</td></tr>
                          ) : zerodhaFailedOrders.slice(0, 50).map((o, idx) => (
                            <tr key={(o.id || o.order_id || idx) + '-' + idx} className="border-b border-gray-700 text-gray-300">
                              <td className="px-3 py-2 text-xs">{o.ts ? new Date(o.ts).toLocaleString() : (o.order_timestamp ? new Date(o.order_timestamp).toLocaleString() : '—')}</td>
                              <td className="px-3 py-2 font-semibold text-white">{o.symbol || o.tradingsymbol || '—'}</td>
                              <td className="px-3 py-2 text-xs text-red-300">{o.error || o.rejection_reason || o.message || 'Unknown error'}</td>
                              <td className="px-3 py-2 text-right">{formatNumber(o.qty || o.quantity || 0)}</td>
                              <td className="px-3 py-2 text-right">{o.price ? formatCurrency(o.price) : '—'}</td>
                              <td className="px-3 py-2 text-right text-xs text-red-300">{o.status || 'REJECTED'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          )
        }

        {/* Confirmation Modal */}
        {
          showConfirm && confirmPayload && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="bg-[#1a2332] border border-gray-600 rounded-xl w-full max-w-md p-6 shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-4">Confirm Order</h3>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Symbol</span>
                    <span className="text-white font-medium">{confirmPayload.tradingsymbol}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Action</span>
                    <span className={`font-bold ${confirmPayload.transaction_type === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>{confirmPayload.transaction_type}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Quantity</span>
                    <span className="text-white font-medium">{confirmPayload.quantity}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Est. Price</span>
                    <span className="text-white font-medium">{formatCurrency(confirmPayload.estPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-gray-700 pt-2 mt-2">
                    <span className="text-gray-400">Est. Total</span>
                    <span className="text-white font-bold">{formatCurrency(confirmPayload.estimatedCost)}</span>
                  </div>
                </div>

                {orderResult && (
                  <div className={`mb-4 p-3 rounded text-sm ${orderResult.ok ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                    {orderResult.msg}
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  <button className="px-4 py-2 bg-gray-700 rounded text-white" onClick={() => { if (!placingOrder) { setShowConfirm(false); setConfirmPayload(null); } }}>Cancel</button>
                  <button className="px-4 py-2 bg-emerald-600 rounded text-white" onClick={handlePlaceOrder} disabled={placingOrder}>{placingOrder ? 'Placing...' : 'Confirm & Place'}</button>
                </div>
              </div>
            </div>
          )
        }

      </div >

      {/* === Paper Trading Transaction History === */}
      < div className="bg-[#111526] p-6 rounded-xl border border-cyan-800" >
        {/* Very Small Mobile */}
        < h3 className="block sm:hidden text-base font-semibold text-white mb-3 whitespace-nowrap" > History</h3 >
        {/* Small Mobile/Tablet */}
        < h3 className="hidden sm:block md:hidden text-lg font-semibold text-white mb-3 whitespace-nowrap" > Trading History</h3 >
        {/* Desktop */}
        < h3 className="hidden md:block text-lg font-semibold text-white mb-3 whitespace-nowrap" > Paper Trading History</h3 >
        <div className="overflow-x-auto max-h-64">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-[#1e293b] text-xs">
                <th className="px-2 py-1">Date</th>
                <th className="px-2 py-1">Type</th>
                <th className="px-2 py-1">Symbol</th>
                <th className="px-2 py-1 text-right">Qty</th>
                <th className="px-2 py-1 text-right">Price</th>
                <th className="px-2 py-1 text-right">Gross Amt</th>
                <th className="px-2 py-1 text-right text-yellow-400">Brokerage</th>
                <th className="px-2 py-1 text-right text-orange-400">Taxes</th>
                <th className="px-2 py-1 text-right text-emerald-400">Net Amount</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center text-gray-500 py-3">
                    No transactions yet.
                  </td>
                </tr>
              ) : (
                orders.map((t, idx) => {
                  // Robust AI check: check boolean, string 'true', symbol, tag, or source
                  const isAI = t.isAIOrder === true || t.isAIOrder === 'true' || t.aiSymbol === '🤖' || t.tag === 'AI_TRADING' || t.source === 'AI';

                  if (idx === 0) console.log(`📋 Order ${idx}: ${t.symbol} ${t.side} - isAI: ${isAI}`);
                  const isBuy = t.side === 'BUY';
                  const gross = Number(t.price) * Number(t.qty);
                  const brokerage = Number(t.brokerage || 0);
                  const taxes = Number(t.totalCharges || 0);
                  const net = Number(t.netAmount || gross);
                  const currencySymbol = t.currency === 'INR' ? '₹' : '$';

                  return (
                    <tr
                      key={t.id}
                      className={`border-b border-[#1e293b] ${isBuy ? 'text-green-400' : 'text-red-400'}`}
                    >
                      <td className="px-2 py-1">{new Date(t.ts).toLocaleString()}</td>
                      <td className="px-2 py-1 font-semibold">
                        {isAI && <span className="mr-1 text-purple-400">🤖</span>}
                        {t.side}
                      </td>
                      <td className="px-2 py-1">
                        {isAI && <span className="mr-1 text-purple-400">🤖</span>}
                        {t.symbol}
                      </td>
                      <td className="px-2 py-1 text-right">{formatQty(t.qty)}</td>
                      <td className="px-2 py-1 text-right">{currencySymbol}{Number(t.price).toFixed(2)}</td>
                      <td className="px-2 py-1 text-right">{currencySymbol}{gross.toFixed(2)}</td>
                      <td className="px-2 py-1 text-right text-yellow-400">{currencySymbol}{brokerage.toFixed(2)}</td>
                      <td className="px-2 py-1 text-right text-orange-400">{currencySymbol}{taxes.toFixed(2)}</td>
                      <td className="px-2 py-1 text-right font-bold text-emerald-400">{currencySymbol}{net.toFixed(2)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div >

      {/* === Action Buttons === */}
      < div className="flex gap-4" >
        <button
          onClick={handleAddFunds}
          className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-500 rounded-xl text-white font-medium hover:opacity-90"
        >
          Add $10,000
        </button>

        <button
          onClick={handleResetAccount}
          className="px-6 py-3 bg-red-500/20 text-red-400 rounded-xl font-medium hover:bg-red-500/30"
        >
          Reset Account
        </button>
      </div >
    </div >
  );
}
