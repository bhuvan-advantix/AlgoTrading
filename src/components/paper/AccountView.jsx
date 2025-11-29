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
  const [activeZerodhaTab, setActiveZerodhaTab] = useState('dashboard'); // 'dashboard' | 'successful' | 'failed'

  // Debounce timer for order fetching to prevent rate limiting
  const _orderFetchTimerRef = React.useRef(null);
  const _lastOrderFetchRef = React.useRef(0);

  // Subscribe to live prices for all positions
  useEffect(() => {
    const unsubscribers = [];
    positions.forEach(pos => {
      const unsub = subscribePrice(pos.symbol, (price) => {
        setPrices(prev => ({ ...prev, [pos.symbol]: price }));
      });
      unsubscribers.push(unsub);
    });
    return () => unsubscribers.forEach(u => u && u());
  }, [positions]);

  // Calculate invested value using live prices
  const investedValue = positions.reduce((sum, pos) => {
    const livePrice = prices[pos.symbol] || pos.avgPrice || 0;
    return sum + (pos.qty * livePrice);
  }, 0);

  // Calculate today's P&L: (current market value) - (cost basis)
  const costBasis = positions.reduce((sum, pos) => {
    return sum + (pos.qty * pos.avgPrice);
  }, 0);

  const todaysPnL = investedValue - costBasis;
  const totalValue = balance + investedValue;
  const pnlPercent = totalValue === 0 ? 0 : ((todaysPnL / totalValue) * 100).toFixed(2);

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

  // Fetch Zerodha/Kite account details if user has connected (kiteUserId in context or localStorage)
  useEffect(() => {
    const kiteUserId = ctxKiteUserId || (() => {
      try { return localStorage.getItem('kiteUserId'); } catch { return null; }
    })();

    if (!kiteUserId) return;

    const fetchKiteAccount = async () => {
      setKiteLoading(true);
      setKiteError(null);
      try {
        const resp = await fetch(`${API_URL}/api/kite/account`, {
          headers: { 'x-user-id': kiteUserId }
        });

        // If server returned non-JSON (HTML error page), read text and show friendly error
        const contentType = resp.headers.get('content-type') || '';
        if (!resp.ok) {
          const txt = await resp.text();
          const short = txt.length > 200 ? txt.slice(0, 200) + '...' : txt;
          setKiteError(`Server returned ${resp.status}: ${short}`);
          setKiteAccount(null);
          return;
        }

        if (!contentType.includes('application/json')) {
          const txt = await resp.text();
          setKiteError(`Unexpected server response (not JSON). ${txt.slice(0, 200)}`);
          setKiteAccount(null);
          return;
        }

        const data = await resp.json();
        if (data && data.success) {
          setKiteAccount(data.data || {});
          // capture orders if the endpoint returned them
          if (Array.isArray(data.data.orders)) {
            setKiteOrders(data.data.orders || []);
            setKiteLastUpdated(Date.now());
          }
        } else {
          setKiteError(data?.error || 'Failed to fetch Kite account');
          setKiteAccount(null);
        }
      } catch (err) {
        console.error('Kite account fetch error', err);
        setKiteError(err.message || String(err));
        setKiteAccount(null);
      } finally {
        setKiteLoading(false);
      }
    };

    fetchKiteAccount();
  }, [ctxKiteUserId]);

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
      const base = MARKET_API_BASE || 'https://algotrading-2sbm.onrender.com/api';
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
    try {
      const res = await fetch(`${API_URL}/api/kite/order`, {
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
        setOrderResult({ ok: true, msg: 'Order placed successfully! Updating live data...' });
        // Refresh kite account and orders immediately
        try {
          const acct = await fetch(`${API_URL}/api/kite/account`, { headers: { 'x-user-id': confirmPayload.kiteUserId } });
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
        const errorMsg = j.error || j.message || 'Order placement failed';
        setOrderResult({ ok: false, msg: `Order failed: ${errorMsg}` });
      }
    } catch (err) {
      setOrderResult({ ok: false, msg: err.message || String(err) });
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

  const _inflowOutflow = useMemo(() => {
    let inTotal = 0; let outTotal = 0;
    combinedOrders.forEach(o => {
      const amt = Number(o.amount ?? o.traded_value ?? (o.qty && o.price ? o.qty * o.price : 0)) || 0;
      // buys are outflows, sells inflows
      const side = String(o.side || o.transaction_type || o.transaction || '').toLowerCase() || String(o.order_type || '').toLowerCase();
      if (/sell/i.test(side)) inTotal += amt; else outTotal += amt;
    });
    return { inTotal, outTotal };
  }, [combinedOrders]);

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
    { name: 'Invested', value: investedValue },
  ];
  const profitData = [
    { name: 'Unrealized', value: todaysPnL },
    { name: 'Cash', value: balance },
  ];
  const COLORS = ['#00bcd4', '#1e88e5', '#00e676', '#ff5252'];

  // --- Transaction Helper ---
  // Transactions now come from the store (orders)

  // --- Add Funds ---
  const handleAddFunds = () => {
    // Note: Add funds functionality would require store modification
    // For now, disabled
    console.log('Add funds not yet supported');
  };

  // --- Reset Account ---
  const handleResetAccount = () => {
    if (confirm('Reset account and clear all data?')) {
      resetSession();
      window.location.reload();
    }
  };

  // --- UI ---
  return (
    <div className="space-y-6">
      {/* === Account Summary === */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Available Balance" value={balance} color="#00bcd4" prefix="$" />
        <Card title="Trader Value" value={investedValue} color="#1e88e5" prefix="$" />
        <Card
          title="Today's P&L"
          value={todaysPnL}
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

      {/* === ZERODHA LIVE ACCOUNT SECTION (COMPLETELY SEPARATE) === */}
      <div className="bg-gradient-to-br from-[#0a0f1f] to-[#0f1527] p-8 rounded-2xl border border-blue-500/30 shadow-2xl">
        {/* Header with Live Badge */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500 flex items-center justify-center">
              <span className="text-blue-400 font-bold">Z</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Zerodha Account</h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-green-400">Live · Connected</span>
                {kiteLastUpdated && <span className="text-xs text-gray-500">Updated {new Date(kiteLastUpdated).toLocaleTimeString()}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-400">Auto-refresh</label>
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="w-4 h-4 cursor-pointer" />
            <select value={refreshIntervalMs} onChange={(e) => setRefreshIntervalMs(Number(e.target.value))} className="bg-[#1a2332] text-xs text-gray-300 p-2 rounded border border-gray-600">
              <option value={5000}>5s</option>
              <option value={10000}>10s</option>
              <option value={15000}>15s</option>
              <option value={30000}>30s</option>
            </select>
          </div>
        </div>

        {kiteLoading ? (
          <div className="text-center py-8">
            <div className="inline-block text-gray-400">Loading Zerodha account details...</div>
          </div>
        ) : kiteError ? (
          <div className="bg-red-900/20 border border-red-600 p-6 rounded-lg">
            <div className="text-red-300 font-semibold mb-2">Connection Error</div>
            <div className="text-red-200 text-sm mb-3">{kiteError}</div>
            <div className="text-xs text-gray-400">Ensure the backend at <span className="font-mono text-gray-300">{API_URL}</span> is running.</div>
          </div>
        ) : !kiteAccount ? (
          <div className="bg-blue-900/20 border border-blue-600 p-6 rounded-lg text-center">
            <div className="text-blue-300 font-semibold">Zerodha Not Connected</div>
            <div className="text-blue-200 text-sm mt-2">Complete session setup to enable live trading</div>
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

              {/* Profile Info */}
              {kiteAccount.profile && (
                <div className="bg-[#1a2332] p-6 rounded-lg border border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-300 mb-4">Account Info</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-gray-400">Account Holder</div>
                      <div className="text-lg font-semibold text-white mt-1">
                        {kiteAccount.profile.user_name || kiteAccount.profile.user_shortname || '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">User ID</div>
                      <div className="text-lg font-mono text-gray-300 mt-1">{kiteAccount.profile.user_id || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Email</div>
                      <div className="text-lg font-semibold text-white mt-1">
                        {kiteAccount.profile.email || '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Broker</div>
                      <div className="text-lg font-semibold text-white mt-1">
                        {kiteAccount.profile.broker || 'Zerodha'}
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
        )}
      </div>

      {/* === PAPER TRADING SECTION (COMPLETELY SEPARATE) === */}
      <div className="bg-gradient-to-br from-[#0f1527] to-[#0a0f1f] p-8 rounded-2xl border border-cyan-500/30 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-cyan-600/20 border border-cyan-500 flex items-center justify-center">
            <span className="text-cyan-400 font-bold">P</span>
          </div>
          <div>
            {/* Very Small Mobile */}
            <h2 className="block sm:hidden text-lg font-bold text-white whitespace-nowrap">Trading</h2>
            {/* Small Mobile/Tablet */}
            <h2 className="hidden sm:block md:hidden text-xl font-bold text-white whitespace-nowrap">Paper Trading</h2>
            {/* Desktop */}
            <h2 className="hidden md:block text-2xl font-bold text-white whitespace-nowrap">Paper Trading Account</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 bg-cyan-500 rounded-full" />
              <span className="text-xs text-cyan-400">Demo · Paper</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card title="Available Balance" value={balance} color="#00bcd4" prefix="$" />
          <Card title="Trader Value" value={investedValue} color="#1e88e5" prefix="$" />
          <Card
            title="Today's P&L"
            value={todaysPnL}
            color={todaysPnL >= 0 ? '#00e676' : '#ff5252'}
            prefix={todaysPnL >= 0 ? '+$' : '-$'}
            suffix={` (${pnlPercent}%)`}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <ChartCard title="Portfolio Value Over Time">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={portfolioHistory}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="time" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#0b1526', border: '1px solid #00bcd4', color: '#fff' }} formatter={(v) => [`$${v.toFixed(2)}`, 'Value']} />
                <Line type="monotone" dataKey="value" stroke="#00bcd4" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Cash vs Invested">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                  {pieData.map((_, i) => (<Cell key={i} fill={COLORS[i]} />))}
                </Pie>
                <Tooltip formatter={(v) => `$${v.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Profit Breakdown">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={profitData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip formatter={(v) => `$${v.toFixed(2)}`} />
                <Bar dataKey="value" barSize={40}>
                  {profitData.map((_, i) => (<Cell key={i} fill={COLORS[i + 2]} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      {/* --- Confirm Order Modal --- */}
      {showConfirm && confirmPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => { if (!placingOrder) { setShowConfirm(false); setConfirmPayload(null); } }} />
          <div className="relative bg-[#071022] p-6 rounded shadow-lg w-full max-w-md border border-cyan-800">
            <h4 className="text-white font-semibold mb-2">Confirm Market Order</h4>
            <div className="text-sm text-gray-300 mb-3">{confirmPayload.tradingsymbol} — {confirmPayload.transaction_type} {confirmPayload.quantity} @ {confirmPayload.estPrice ? formatCurrency(confirmPayload.estPrice) : 'Market'}</div>
            <div className="flex justify-between items-center mb-4">
              <div className="text-xs text-gray-400">Estimated Cost</div>
              <div className="text-white font-semibold">{formatCurrency(confirmPayload.estimatedCost)}</div>
            </div>
            {orderResult && (
              <div className={`p-3 rounded mb-3 ${orderResult.ok ? 'bg-emerald-900/30 border border-emerald-700' : 'bg-red-900/20 border border-red-700'}`}>
                <div className="text-sm text-white">{orderResult.msg}</div>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button className="px-4 py-2 bg-gray-700 rounded text-white" onClick={() => { if (!placingOrder) { setShowConfirm(false); setConfirmPayload(null); } }}>Cancel</button>
              <button className="px-4 py-2 bg-emerald-600 rounded text-white" onClick={handlePlaceOrder} disabled={placingOrder}>{placingOrder ? 'Placing...' : 'Confirm & Place'}</button>
            </div>
          </div>
        </div>
      )}

      {/* === Paper Trading Transaction History === */}
      <div className="bg-[#111526] p-6 rounded-xl border border-cyan-800">
        {/* Very Small Mobile */}
        <h3 className="block sm:hidden text-base font-semibold text-white mb-3 whitespace-nowrap">History</h3>
        {/* Small Mobile/Tablet */}
        <h3 className="hidden sm:block md:hidden text-lg font-semibold text-white mb-3 whitespace-nowrap">Trading History</h3>
        {/* Desktop */}
        <h3 className="hidden md:block text-lg font-semibold text-white mb-3 whitespace-nowrap">Paper Trading History</h3>
        <div className="overflow-x-auto max-h-64">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-[#1e293b] text-xs">
                <th className="px-2 py-1">Date</th>
                <th className="px-2 py-1">Type</th>
                <th className="px-2 py-1">Symbol</th>
                <th className="px-2 py-1 text-right">Qty</th>
                <th className="px-2 py-1 text-right">Price</th>
                <th className="px-2 py-1 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-gray-500 py-3">
                    No transactions yet.
                  </td>
                </tr>
              ) : (
                orders.map((t) => (
                  <tr
                    key={t.id}
                    className={`border-b border-[#1e293b] ${t.side === 'BUY'
                      ? 'text-green-400'
                      : t.side === 'SELL'
                        ? 'text-red-400'
                        : 'text-cyan-300'
                      }`}
                  >
                    <td className="px-2 py-1">{new Date(t.ts).toLocaleString()}</td>
                    <td className="px-2 py-1 font-semibold">{t.side}</td>
                    <td className="px-2 py-1">{t.symbol}</td>
                    <td className="px-2 py-1 text-right">{Number(t.qty).toFixed(8)}</td>
                    <td className="px-2 py-1 text-right">
                      ₹{Number(t.price).toFixed(2)}
                    </td>
                    <td className="px-2 py-1 text-right">
                      {t.side === 'BUY' ? '-' : '+'}₹
                      {Number(t.amount).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* === Action Buttons === */}
      <div className="flex gap-4">
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
      </div>
    </div>
  );
}

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

