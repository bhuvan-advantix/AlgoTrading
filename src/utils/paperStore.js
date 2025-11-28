import { MARKET_API_BASE } from '../config';

// src/utils/paperStore.js
// Lightweight store that persists to localStorage and talks to backend for quotes/charts
const STORAGE_KEY = 'advantix_paper_v3';

export const defaultConfig = {
  startingBalance: 100000,
  currency: 'INR',
  slippagePct: 0.0005, // 0.05%
  commission: 0.0,
  allowFractional: true,
  tickIntervalSec: 5,
};

function read() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; } catch { return null; }
}
function write(obj) { localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); }

export function init() {
  const existing = read();
  if (existing) return existing;
  const base = {
    config: defaultConfig,
    wallet: { cash: defaultConfig.startingBalance },
    positions: {}, // symbol -> { qty, avgPrice }
    orders: [], // list of orders
    watchlist: ['RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'AAPL'],
    equityHistory: [],
  };
  write(base);
  return base;
}

export function getState() { return read() || init(); }
export function saveState(state) { write(state); }

// Helpers: amount <-> qty conversions
export function amountToQty(amount, price) {
  if (!price || price <= 0) return 0;
  return amount / price;
}
export function qtyToAmount(qty, price) { return qty * price; }

// core: place market order (uses quick fill at live price)
export async function placeMarketOrder({ symbol, side, amount, qty }) {
  const st = getState();
  // fetch live price from backend
  const resp = await fetch(`${MARKET_API_BASE}/quote/${encodeURIComponent(symbol)}`);
  const json = await resp.json();
  const marketPrice = json?.price;
  if (!marketPrice) return { success: false, reason: 'price_unavailable' };

  const usedQty = (qty && qty > 0) ? qty : amountToQty(amount, marketPrice);
  if (usedQty <= 0) return { success: false, reason: 'invalid_qty' };
  const cfg = st.config;
  // simulate slippage
  const slippage = marketPrice * (Math.random() * cfg.slippagePct * 2 - cfg.slippagePct);
  const fillPrice = Number((marketPrice + slippage).toFixed(4));
  const totalCost = Number((qtyToAmount(usedQty, fillPrice) + cfg.commission).toFixed(4));

  if (side === 'BUY' && st.wallet.cash + 1e-9 < totalCost) return { success: false, reason: 'insufficient_funds' };
  if (side === 'SELL') {
    const pos = st.positions[symbol] || { qty: 0 };
    if (pos.qty + 1e-9 < usedQty) return { success: false, reason: 'insufficient_shares' };
  }

  // apply wallet & positions
  if (side === 'BUY') st.wallet.cash = Number((st.wallet.cash - totalCost).toFixed(4));
  else st.wallet.cash = Number((st.wallet.cash + qtyToAmount(usedQty, fillPrice) - cfg.commission).toFixed(4));

  // update position
  const pos = st.positions[symbol] || { qty: 0, avgPrice: 0 };
  if (side === 'BUY') {
    const newQty = pos.qty + usedQty;
    const newAvg = newQty === 0 ? 0 : Math.abs((pos.avgPrice * pos.qty + fillPrice * usedQty) / newQty);
    st.positions[symbol] = { qty: Number(newQty.toFixed(8)), avgPrice: Number(newAvg.toFixed(4)) };
  } else {
    const newQty = pos.qty - usedQty;
    if (newQty <= 1e-9) delete st.positions[symbol];
    else st.positions[symbol] = { qty: Number(newQty.toFixed(8)), avgPrice: pos.avgPrice };
  }

  const order = {
    id: 'ord_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    ts: Date.now(),
    date: new Date().toISOString(),
    symbol, side, qty: Number(usedQty.toFixed(8)), price: fillPrice,
    amount: Number(qtyToAmount(usedQty, fillPrice).toFixed(4)), commission: cfg.commission, status: 'FILLED'
  };
  st.orders.unshift(order);
  // equity snapshot
  const equity = await computeEquity(st);
  st.equityHistory = st.equityHistory || [];
  st.equityHistory.unshift({ ts: Date.now(), equity });
  if (st.equityHistory.length > 500) st.equityHistory.pop();

  saveState(st);
  return { success: true, order, state: st };
}

export async function computeEquity(snapshot) {
  const st = snapshot || getState();
  let pv = 0;
  // fetch latest prices for positions in parallel (but limited)
  const syms = Object.keys(st.positions);
  if (syms.length) {
    const q = await fetch(`${MARKET_API_BASE}/quotes?s=${syms.join(',')}`);
    const j = await q.json();
    const quotes = (j && j.quotes) || {};
    syms.forEach(s => {
      const p = (quotes[s] && quotes[s].price) || st.positions[s].avgPrice || 0;
      pv += (st.positions[s].qty * p);
    });
  }
  return Number((st.wallet.cash + pv).toFixed(4));
}

export function exportSession() { return JSON.stringify(getState(), null, 2); }
export function importSession(json) {
  try { const parsed = JSON.parse(json); saveState(parsed); return { success: true } } catch (e) { return { success: false, reason: e.message } }
}
export function resetSession() {
  localStorage.removeItem(STORAGE_KEY);
  return init();
}
