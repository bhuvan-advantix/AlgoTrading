// Quick test to verify paper trading store works
// Run with: node test-store.js

// Mock localStorage for Node.js
global.localStorage = {
  data: {},
  getItem(key) { return this.data[key] || null; },
  setItem(key, value) { this.data[key] = value; },
  removeItem(key) { delete this.data[key]; },
  clear() { this.data = {}; }
};

// Import store functions
const STORAGE_KEY = 'adv_paper_v2';

function read() {
  try {
    const raw = global.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function write(state) {
  global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function initStore() {
  const existing = read();
  if (existing) return existing;

  const state = {
    config: { startingBalance: 100000, currency: 'INR', slippagePct: 0.0005, commission: 0.0, allowFractional: true, tickIntervalSec: 2 },
    wallet: { cash: 100000 },
    positions: {},
    orders: [],
    watchlist: ['RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'AAPL'],
    prices: {},
    equityHistory: []
  };
  write(state);
  return state;
}

function ensureSymbol(symbol) {
  const s = symbol.toUpperCase();
  const st = read() || initStore();
  if (!st.prices[s]) {
    const base = s.endsWith('.NS') ? (Math.random() * 3000 + 100) : (Math.random() * 200 + 50);
    st.prices[s] = { price: Number((base * (1 + (Math.random()-0.5)/20)).toFixed(2)), ts: Date.now() };
    write(st);
  }
  return s;
}

function amountToQty(amount, price) {
  if (!price || price <= 0) return 0;
  return amount / price;
}

function qtyToAmount(qty, price) {
  return qty * price;
}

function applyFillToPosition(st, symbol, side, qty, price) {
  // Takes the state object instead of reading it fresh
  const pos = st.positions[symbol] || { qty: 0, avgPrice: 0 };
  const signed = side === 'BUY' ? qty : -qty;
  const newQty = pos.qty + signed;
  let newAvg = pos.avgPrice;
  if (side === 'BUY') {
    const totalValue = pos.avgPrice * pos.qty + price * qty;
    newAvg = newQty === 0 ? 0 : Math.abs(totalValue / newQty);
  }
  if (Math.abs(newQty) < 1e-9) {
    delete st.positions[symbol];
  } else {
    st.positions[symbol] = { qty: Number(newQty.toFixed(8)), avgPrice: Number(newAvg.toFixed(4)) };
  }
  write(st);
}

function placeMarketOrder({ symbol, side, amount, qty }) {
  let st = read() || initStore();
  const s = ensureSymbol(symbol);
  st = read(); // Re-read after ensureSymbol writes
  const price = st.prices[s].price;
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
    if ((pos.qty || 0) + 1e-9 < usedQty) {
      return { success: false, reason: 'Not enough shares to sell' };
    }
  }
  
  if (side === 'BUY') st.wallet.cash = Number((st.wallet.cash - totalValue).toFixed(4));
  else st.wallet.cash = Number((st.wallet.cash + qtyToAmount(usedQty, fillPrice) - cfg.commission).toFixed(4));

  // apply position - pass the state object so it doesn't read stale data
  applyFillToPosition(st, s, side, usedQty, fillPrice);
  
  // Re-read after position update (applyFillToPosition calls write)
  st = read();

  const order = {
    id: 'o_' + Date.now() + '_' + Math.random().toString(36).slice(2,8),
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
  return { success: true, order };
}

// Test
console.log('=== Paper Trading Store Test ===\n');

// Initialize
const st1 = initStore();
console.log('1. Initial state:', {
  cash: st1.wallet.cash,
  positions: st1.positions,
  orders: st1.orders.length
});

// Place a BUY order
console.log('\n2. Placing BUY order for TCS.NS with amount ₹10,000...');
const result = placeMarketOrder({ symbol: 'TCS.NS', side: 'BUY', amount: 10000 });
console.log('   Result:', {
  success: result.success,
  reason: result.reason,
  order: result.order ? {
    symbol: result.order.symbol,
    side: result.order.side,
    qty: result.order.qty,
    price: result.order.price,
    amount: result.order.amount
  } : null
});

// Read state after order
const st2 = read();
console.log('\n3. State after order:');
console.log('   Cash:', st2.wallet.cash);
console.log('   Positions:', st2.positions);
console.log('   Orders:', st2.orders.map(o => ({ symbol: o.symbol, side: o.side, qty: o.qty, price: o.price })));

console.log('\n✓ Test complete!');
