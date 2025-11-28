// src/utils/paperTradingStore.js
const STORAGE_KEY = 'adv_paper_v2';

export const defaultConfig = {
  startingBalance: 100000,
  currency: 'INR',
  slippagePct: 0.0005,
  commission: 0.0,
  allowFractional: true
};

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function write(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function initStore() {
  const existing = read();
  if (existing) return existing;

  const state = {
    config: defaultConfig,
    wallet: { cash: defaultConfig.startingBalance },
    positions: {},
    orders: [],
    watchlist: ['RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'AAPL'],
    prices: {}, // ONLY Yahoo/real data will fill this
    equityHistory: []
  };

  write(state);
  return state;
}

/* ---------------------------------------
   REAL-LIVE PRICE STORAGE ONLY
---------------------------------------- */

export function setPrice(symbol, price) {
  const s = (symbol || '').toUpperCase();
  const st = read() || initStore();

  st.prices = st.prices || {};
  st.prices[s] = { price: Number(price), ts: Date.now() };

  write(st);
  updateEquityHistory();
}

export function getPrice(symbol) {
  const s = (symbol || '').toUpperCase();
  const st = read() || initStore();
  return st.prices[s]?.price || null;
}

/* ---------------------------------------
   NO subscribePrice — REMOVE SIMULATION
---------------------------------------- */

export function subscribePrice() {
  console.warn("subscribePrice() removed — using real Yahoo prices only.");
  return () => { };
}

/* ---------------------------------------
   POSITION & ORDER LOGIC (UNCHANGED)
---------------------------------------- */

export function amountToQty(amount, price) {
  if (!price || price <= 0) return 0;
  return amount / price;
}

export function qtyToAmount(qty, price) {
  return qty * price;
}

function applyFillToPosition(st, symbol, side, qty, price) {
  if (!st.positions) st.positions = {};
  const pos = st.positions[symbol] || { qty: 0, avgPrice: 0 };
  const signed = side === 'BUY' ? qty : -qty;
  const newQty = pos.qty + signed;

  let newAvg = pos.avgPrice;

  if (side === 'BUY') {
    const totalValue = pos.avgPrice * pos.qty + price * qty;
    newAvg = newQty === 0 ? 0 : Math.abs(totalValue / newQty);
  } else if (side === 'SELL') {
    if (newQty === 0) newAvg = 0;
  }

  if (Math.abs(newQty) < 1e-9) {
    delete st.positions[symbol];
  } else {
    st.positions[symbol] = {
      qty: Number(newQty.toFixed(8)),
      avgPrice: Number(newAvg.toFixed(4))
    };
  }

  write(st);
}

export function placeMarketOrder({ symbol, side, amount, qty }) {
  let st = read() || initStore();
  const s = symbol.toUpperCase();
  const price = st.prices[s]?.price;

  if (!price) return { success: false, reason: 'Live price unavailable' };

  const cfg = st.config;
  const usedQty = qty && qty > 0 ? qty : amountToQty(amount, price);

  const slippage = price * (Math.random() * cfg.slippagePct * 2 - cfg.slippagePct);
  const fillPrice = Number((price + slippage).toFixed(4));

  const totalValue = qtyToAmount(usedQty, fillPrice) + cfg.commission;

  if (side === 'BUY' && st.wallet.cash < totalValue) {
    return { success: false, reason: 'Insufficient funds' };
  }

  if (side === 'SELL') {
    const pos = st.positions[s] || { qty: 0 };
    if ((pos.qty || 0) < usedQty) {
      return { success: false, reason: 'Not enough shares' };
    }
  }

  if (side === 'BUY') {
    st.wallet.cash -= totalValue;
  } else {
    st.wallet.cash += qtyToAmount(usedQty, fillPrice) - cfg.commission;
  }

  applyFillToPosition(st, s, side, usedQty, fillPrice);

  st = read();

  const order = {
    id: 'o_' + Date.now(),
    ts: Date.now(),
    symbol: s,
    side,
    qty: Number(usedQty.toFixed(8)),
    price: fillPrice,
    amount: Number(qtyToAmount(usedQty, fillPrice).toFixed(4)),
    commission: cfg.commission,
    status: 'FILLED'
  };

  st.orders.unshift(order);
  write(st);
  updateEquityHistory();

  return { success: true, order };
}

/* ---------------------------------------
   Equity History
---------------------------------------- */

function calculateTotalEquity(st) {
  const cash = st.wallet.cash || 0;
  let value = 0;

  for (const [sym, pos] of Object.entries(st.positions)) {
    const p = st.prices[sym]?.price;
    if (p) value += pos.qty * p;
  }

  return Number((cash + value).toFixed(4));
}

function updateEquityHistory() {
  const st = read() || initStore();
  const equity = calculateTotalEquity(st);

  st.equityHistory.push({ ts: Date.now(), equity });
  if (st.equityHistory.length > 500) st.equityHistory.shift();

  write(st);
}

/* ---------------------------------------
   Export / Import / Reset
---------------------------------------- */

export function exportState() {
  return JSON.stringify(read() || initStore(), null, 2);
}

export function importState(jsonStr) {
  try {
    write(JSON.parse(jsonStr));
    return { success: true };
  } catch (e) {
    return { success: false, reason: e.message };
  }
}

export function resetSession() {
  const cfg = defaultConfig;

  const st = {
    config: cfg,
    wallet: { cash: cfg.startingBalance },
    positions: {},
    orders: [],
    watchlist: ['RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'AAPL'],
    prices: {}, // Yahoo will refill
    equityHistory: []
  };

  write(st);
  return st;
}

export function readState() {
  return read() || initStore();
}
