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

function applyFillToPosition(st, symbol, side, qty, price, stopLoss, takeProfit) {
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
      avgPrice: Number(newAvg.toFixed(4)),
      stopLoss: stopLoss || pos.stopLoss, // Update if provided, else keep existing
      takeProfit: takeProfit || pos.takeProfit
    };
  }

  write(st);
}

// --- Zerodha Tax Calculation Helper (Client-Side) ---
function calculateZerodhaCharges(type, quantity, price, product = 'CNC') {
  const turnover = price * quantity;
  let brokerage = 0;
  let stt = 0;
  let exchangeCharges = 0;
  let gst = 0;
  let sebiCharges = 0;
  let stampDuty = 0;
  let dpCharges = 0;

  // Normalize inputs
  const isIntraday = (product || '').toUpperCase() === 'MIS';
  const isSell = type === 'SELL';
  const isBuy = type === 'BUY';

  // 1. Exchange Transaction Charges (NSE Equity) - ~0.00345%
  exchangeCharges = turnover * 0.0000345;

  // 2. SEBI Charges - ₹10 / crore (0.0001%)
  sebiCharges = turnover * 0.000001;

  if (isIntraday) {
    // Intraday Equity
    // Brokerage: 0.03% or ₹20 whichever is lower
    brokerage = Math.min(turnover * 0.0003, 20);

    // STT: 0.025% on SELL only
    if (isSell) {
      stt = turnover * 0.00025;
    }

    // Stamp Duty: 0.003% on BUY only
    if (isBuy) {
      stampDuty = turnover * 0.00003;
    }
  } else {
    // Delivery Equity
    // Brokerage: ₹0
    brokerage = 0;

    // STT: 0.1% on BUY and SELL
    stt = turnover * 0.001;

    // Stamp Duty: 0.015% on BUY only
    if (isBuy) {
      stampDuty = turnover * 0.00015;
    }

    // DP Charges: ~₹15.93 on SELL only (₹13.5 + 18% GST)
    if (isSell) {
      dpCharges = 15.93;
    }
  }

  // GST: 18% on (Brokerage + Exchange Charges + SEBI Charges)
  // Note: DP charges are inclusive of GST usually, or added separately. 
  // Standard practice: GST is calc on service charges. 
  // DP charge of 15.93 is usually 13.5 + GST. So we don't add GST on top of 15.93 again if we treat it as final.
  // However, for the formula "GST (18% on brokerage + exchange)", we follow that.
  gst = (brokerage + exchangeCharges + sebiCharges) * 0.18;

  const totalCharges = brokerage + stt + exchangeCharges + gst + sebiCharges + stampDuty + dpCharges;

  // Net Amount
  // BUY: Cost = Turnover + Charges
  // SELL: Realized = Turnover - Charges
  let netAmount = 0;
  if (isBuy) {
    netAmount = turnover + totalCharges;
  } else {
    netAmount = turnover - totalCharges;
  }

  return {
    brokerage,
    stt,
    exchangeCharges,
    gst,
    sebiCharges,
    stampDuty,
    dpCharges,
    totalCharges,
    netAmount
  };
}

export function placeMarketOrder({ symbol, side, amount, qty, stopLoss, takeProfit }) {
  let st = read() || initStore();
  const s = symbol.toUpperCase();
  const price = st.prices[s]?.price;

  if (!price) return { success: false, reason: 'Live price unavailable' };

  const cfg = st.config;
  const usedQty = qty && qty > 0 ? qty : amountToQty(amount, price);

  // Detect currency from symbol
  const currency = (s.endsWith('.NS') || s.endsWith('.BO')) ? 'INR' : 'USD';

  // Slippage simulation
  const slippage = price * (Math.random() * cfg.slippagePct * 2 - cfg.slippagePct);
  const fillPrice = Number((price + slippage).toFixed(2)); // Round price to 2 decimals for realism

  // Calculate Taxes - Default to CNC (Delivery) for paper trading unless specified
  // In a real app, we'd pass product type. Here we assume Delivery for simplicity or add a toggle.
  // Let's assume Delivery (CNC) as it's the most common for investors.
  const taxes = calculateZerodhaCharges(side, usedQty, fillPrice, 'CNC');

  // Check Funds
  if (side === 'BUY' && st.wallet.cash < taxes.netAmount) {
    return { success: false, reason: 'Insufficient funds' };
  }

  // Check Holdings for Sell
  if (side === 'SELL') {
    const pos = st.positions[s] || { qty: 0 };
    if ((pos.qty || 0) < usedQty) {
      return { success: false, reason: 'Not enough shares' };
    }
  }

  // Update Wallet
  if (side === 'BUY') {
    st.wallet.cash -= taxes.netAmount;
  } else {
    st.wallet.cash += taxes.netAmount;
  }

  applyFillToPosition(st, s, side, usedQty, fillPrice, stopLoss, takeProfit);

  st = read();

  const order = {
    id: 'o_' + Date.now(),
    ts: Date.now(),
    symbol: s,
    side,
    qty: Number(usedQty), // Store as number
    price: fillPrice,
    amount: Number((usedQty * fillPrice).toFixed(2)), // Gross Amount
    commission: 0, // Deprecated in favor of detailed taxes
    status: 'FILLED',
    currency: currency, // Add currency field
    stopLoss: stopLoss || null,
    takeProfit: takeProfit || null,
    // Add Tax Fields
    brokerage: taxes.brokerage,
    stt: taxes.stt,
    exchangeCharges: taxes.exchangeCharges,
    gst: taxes.gst,
    sebiCharges: taxes.sebiCharges,
    stampDuty: taxes.stampDuty,
    dpCharges: taxes.dpCharges,
    totalCharges: taxes.totalCharges,
    netAmount: taxes.netAmount
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

/* ---------------------------------------
   Protective Orders (SL/TP) Monitor
---------------------------------------- */
export function checkProtectiveOrders(symbol, currentPrice) {
  const st = read();
  if (!st || !st.positions) return;

  const s = symbol.toUpperCase();
  const pos = st.positions[s];

  if (!pos || pos.qty <= 0) return;

  // Check Stop Loss
  if (pos.stopLoss && currentPrice <= pos.stopLoss) {
    console.log(`🛑 Stop Loss Triggered for ${s} @ ${currentPrice} (SL: ${pos.stopLoss})`);
    placeMarketOrder({
      symbol: s,
      side: 'SELL',
      qty: pos.qty, // Sell entire position
      amount: 0
    });
    // Clear SL/TP after triggering
    const newSt = read();
    if (newSt.positions[s]) {
      delete newSt.positions[s].stopLoss;
      delete newSt.positions[s].takeProfit;
      write(newSt);
    }
    window.dispatchEvent(new CustomEvent('paper-order-confirmed', {
      detail: { symbol: s, side: 'SELL', type: 'STOP_LOSS', price: currentPrice }
    }));
  }

  // Check Take Profit
  if (pos.takeProfit && currentPrice >= pos.takeProfit) {
    console.log(`✅ Take Profit Triggered for ${s} @ ${currentPrice} (TP: ${pos.takeProfit})`);
    placeMarketOrder({
      symbol: s,
      side: 'SELL',
      qty: pos.qty, // Sell entire position
      amount: 0
    });
    // Clear SL/TP after triggering
    const newSt = read();
    if (newSt.positions[s]) {
      delete newSt.positions[s].stopLoss;
      delete newSt.positions[s].takeProfit;
      write(newSt);
    }
    window.dispatchEvent(new CustomEvent('paper-order-confirmed', {
      detail: { symbol: s, side: 'SELL', type: 'TAKE_PROFIT', price: currentPrice }
    }));
  }
}
