import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { subscribePrice, placeMarketOrder } from '../../utils/paperTradingStore';

export default function OrderForm({ symbol, quote }) {
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('');
  const [orderType, setOrderType] = useState('amount');
  const [tradingMode, setTradingMode] = useState('paper'); // 'paper' or 'live'
  const [loading, setLoading] = useState(false);
  const [livePrice, setLivePrice] = useState(quote?.price || null);
  const [toast, setToast] = useState(null);
  const [pendingOrder, setPendingOrder] = useState(null);

  /* ---------------------------
       Currency Formatter
  --------------------------- */
  const getCurrency = useCallback(() => {
    const cur = quote?.currency || (symbol?.toUpperCase().endsWith('.NS') || symbol?.toUpperCase().endsWith('.BO') ? 'INR' : 'USD');
    return cur;
  }, [quote, symbol]);

  const getCurrencySymbol = useCallback(() => {
    const cur = getCurrency();
    return cur === 'INR' ? '₹' : '$';
  }, [getCurrency]);

  const getCurrencyName = useCallback(() => {
    const cur = getCurrency();
    return cur === 'INR' ? 'Indian Rupee (INR)' : 'US Dollar (USD)';
  }, [getCurrency]);

  const formatCurrencySymbol = useCallback((sym, price) => {
    const cur = getCurrency();
    if (cur === 'INR') return `₹${Number(price || 0).toFixed(2)}`;
    return `$${Number(price || 0).toFixed(2)}`;
  }, [getCurrency]);

  /* ---------------------------
        Live Price Subscribe
  --------------------------- */
  useEffect(() => {
    if (!symbol) return;
    const unsubscribe = subscribePrice(symbol, (price) => setLivePrice(price));
    return unsubscribe;
  }, [symbol]);

  /* ---------------------------
        Sync Price from Quote
  --------------------------- */
  useEffect(() => {
    if (quote?.price) setLivePrice(quote.price);
  }, [quote?.price]);

  /* ---------------------------
        Calculation Logic
  --------------------------- */
  // Only sync when user manually changes input, not when price updates
  const handleAmountChange = (value) => {
    setAmount(value);
    if (livePrice && value) {
      const qty = Number(value) / Number(livePrice);
      setQuantity(qty.toFixed(8));
    } else if (!value) {
      setQuantity('');
    }
  };

  const handleQuantityChange = (value) => {
    setQuantity(value);
    if (livePrice && value) {
      const amt = Number(value) * Number(livePrice);
      setAmount(amt.toFixed(2));
    } else if (!value) {
      setAmount('');
    }
  };

  /* ---------------------------
        Toast
  --------------------------- */
  const showToast = (message, type = 'info', duration = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  };

  /* ---------------------------
         Submit Order
  --------------------------- */
  const handleSubmit = async (side, stopLoss, takeProfit) => {
    if (!symbol) return showToast('No symbol selected', 'error');

    if (orderType === 'amount' && (!amount || Number(amount) <= 0))
      return showToast('Enter a valid amount', 'error');

    if (orderType === 'quantity' && (!quantity || Number(quantity) <= 0))
      return showToast('Enter a valid quantity', 'error');

    setLoading(true);

    try {
      if (tradingMode === 'live') {
        // LIVE TRADING - Place order via Zerodha API
        const kiteUserId = localStorage.getItem('kiteUserId');
        if (!kiteUserId) {
          showToast('⚠️ Please connect your Zerodha account first', 'error', 4000);
          setLoading(false);
          return;
        }

        // Remove .NS/.BO suffix for Zerodha
        const kiteSymbol = symbol.split('.')[0];

        // Determine the correct backend URL
        const backendUrl = window.location.hostname === 'localhost'
          ? 'http://localhost:5000'
          : 'https://algotrading-2sbm.onrender.com';

        try {
          const response = await fetch(`${backendUrl}/api/kite/order`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': kiteUserId
            },
            body: JSON.stringify({
              exchange: symbol.toUpperCase().includes('.NS') ? 'NSE' : 'BSE',
              tradingsymbol: kiteSymbol,
              transaction_type: side.toUpperCase(),
              quantity: Number(quantity || 0),
              order_type: 'MARKET',
              product: 'CNC' // Delivery
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `Server error: ${response.status}`);
          }

          const result = await response.json();

          if (result.success) {
            showToast(
              `✅ Order Placed Successfully!\n${side} ${quantity} ${kiteSymbol} @ Market Price`,
              'success',
              5000
            );

            // Clear inputs
            setAmount('');
            setQuantity('');

            // Dispatch event to refresh Zerodha account
            window.dispatchEvent(new CustomEvent('zerodha-order-placed', { detail: result }));
          } else {
            // Order was rejected by Zerodha - parse error for user-friendly message
            let errorMsg = result.error || result.message || 'Order rejected';

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
            } else {
              // Keep original message if it's already clear
              errorMsg = `❌ ${errorMsg}`;
            }

            showToast(errorMsg, 'error', 7000);

            // Dispatch failed order event
            window.dispatchEvent(new CustomEvent('zerodha-order-failed', {
              detail: { symbol: kiteSymbol, side, quantity, error: errorMsg }
            }));
          }
        } catch (fetchError) {
          // Network or server error
          let errorMsg = fetchError.message;

          if (errorMsg.includes('fetch') || errorMsg.includes('Failed to fetch')) {
            errorMsg = '🌐 Cannot connect to server. Please check your internet connection.';
          } else if (errorMsg.includes('timeout')) {
            errorMsg = '⏱️ Request timed out. Please try again.';
          } else if (errorMsg.includes('Server error')) {
            errorMsg = '🔧 Server error. Please try again in a moment.';
          }

          showToast(errorMsg, 'error', 6000);
        }
      } else {
        // PAPER TRADING - Use existing paper trading system
        const result = placeMarketOrder({
          symbol: symbol.toUpperCase(),
          side: side.toUpperCase(),
          amount: Number(amount || 0),
          qty: Number(quantity || 0),
          stopLoss: stopLoss ? Number(stopLoss) : null,
          takeProfit: takeProfit ? Number(takeProfit) : null
        });

        if (result?.success) {
          const order = result.order;

          showToast(
            `📝 Paper Order: ${order.side} ${order.qty.toFixed(4)} shares @ ${formatCurrencySymbol(symbol, order.price)}`,
            'success'
          );

          // clear inputs
          setAmount('');
          setQuantity('');

          // dispatch global update
          window.dispatchEvent(new CustomEvent('paper-trade-update', { detail: { order } }));
          window.dispatchEvent(new CustomEvent('paper-order-confirmed', { detail: order }));
        } else {
          showToast(result?.reason || 'Order failed', 'error');
        }
      }
    } catch (err) {
      showToast('Order failed: ' + err.message, 'error');
    }

    setLoading(false);
  };

  /* ---------------------------
         UI Rendering & Calculations
  --------------------------- */
  // Use useMemo to prevent flickering - only recalculate when inputs change
  const calculations = useMemo(() => {
    const qty = Number(quantity || 0);
    const price = Number(livePrice || 0);
    const grossValue = qty * price;

    if (!qty || !price) {
      return {
        totalValue: '0.00',
        qty: 0,
        grossValue: 0,
        brokerage: 0,
        stt: 0,
        transactionCharges: 0,
        gst: 0,
        sebi: 0,
        stampDuty: 0,
        totalCharges: 0,
        netAmount: 0
      };
    }

    // Calculate all charges (same for both paper and live)
    const brokerage = Math.min(20, grossValue * 0.0003); // ₹20 or 0.03%
    const stt = grossValue * 0.001; // 0.1% for delivery
    const transactionCharges = grossValue * 0.0000325; // 0.00325%
    const gst = (brokerage + transactionCharges) * 0.18; // 18% GST
    const sebi = grossValue * 0.000001; // ₹10 per crore
    const stampDuty = grossValue * 0.00015; // 0.015%
    const totalCharges = brokerage + stt + transactionCharges + gst + sebi + stampDuty;
    const netAmount = grossValue + totalCharges;

    return {
      totalValue: grossValue.toFixed(2),
      qty,
      grossValue,
      brokerage,
      stt,
      transactionCharges,
      gst,
      sebi,
      stampDuty,
      totalCharges,
      netAmount
    };
  }, [quantity, livePrice]);

  return (
    <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/40 p-4 rounded-xl border border-slate-700/30">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Place Order</h3>
        <div className="text-xs text-slate-400">
          Live: {formatCurrencySymbol(symbol, livePrice) || '—'}
        </div>
      </div>

      {/* Trading Mode Toggle */}
      <div className="mb-4 p-3 bg-gradient-to-r from-slate-800/50 to-slate-700/30 rounded-lg border border-slate-600/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-300">Trading Mode</span>
          <div className="flex gap-2">
            <button
              onClick={() => setTradingMode('paper')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${tradingMode === 'paper'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/50'
                : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50'
                }`}
            >
              📝 Paper Trading
            </button>
            <button
              onClick={() => setTradingMode('live')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${tradingMode === 'live'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/50'
                : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50'
                }`}
            >
              🔴 Live Trading
            </button>
          </div>
        </div>
        <div className="text-xs text-slate-400">
          {tradingMode === 'paper'
            ? '💡 Simulated trading with virtual money'
            : '⚠️ Real orders will be placed on your Zerodha account'}
        </div>
      </div>

      {/* Currency Info */}
      <div className="mb-4 px-3 py-2 bg-blue-900/20 border border-blue-700/30 rounded-lg">
        <div className="text-xs text-blue-300 font-medium">
          Currency: {getCurrencyName()}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`mb-3 px-3 py-2 rounded-lg text-sm font-medium ${toast.type === 'success'
            ? 'bg-emerald-600/30 text-emerald-200 border border-emerald-600/50'
            : toast.type === 'error'
              ? 'bg-rose-600/30 text-rose-200 border border-rose-600/50'
              : 'bg-blue-600/30 text-blue-200 border border-blue-600/50'
            }`}
        >
          {toast.message}
        </div>
      )}

      {/* Order Type Selector */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setOrderType('amount')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${orderType === 'amount'
            ? 'bg-cyan-600/60 text-cyan-100'
            : 'bg-slate-700/40 text-slate-300 hover:bg-slate-600/40'
            }`}
        >
          Amount
        </button>

        <button
          onClick={() => setOrderType('quantity')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${orderType === 'quantity'
            ? 'bg-cyan-600/60 text-cyan-100'
            : 'bg-slate-700/40 text-slate-300 hover:bg-slate-600/40'
            }`}
        >
          Quantity
        </button>
      </div>

      {/* Amount Input */}
      {orderType === 'amount' ? (
        <div className="mb-4">
          <label className="text-xs text-slate-400 block mb-1">Amount ({getCurrencySymbol()})</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="Enter amount"
            className="w-full px-3 py-2 bg-slate-900/50 text-white rounded-lg border border-slate-700/50 focus:border-cyan-600/50"
          />
        </div>
      ) : (
        <div className="mb-4">
          <label className="text-xs text-slate-400 block mb-1">Quantity</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => handleQuantityChange(e.target.value)}
            placeholder="Enter quantity"
            className="w-full px-3 py-2 bg-slate-900/50 text-white rounded-lg border border-slate-700/50 focus:border-cyan-600/50"
          />
        </div>
      )}

      {/* Summary */}
      <div className="px-3 py-2 bg-slate-800/40 rounded-lg text-xs text-slate-300 mb-4">
        <div className="flex justify-between">
          <span>Qty</span>
          <span className="font-medium">
            {quantity ? (Number(quantity) % 1 === 0 ? Number(quantity) : Number(quantity).toFixed(4)) : '0'}
          </span>
        </div>

        <div className="flex justify-between mt-1">
          <span>Price per share</span>
          <span className="font-medium">{formatCurrencySymbol(symbol, livePrice)}</span>
        </div>

        <div className="flex justify-between mt-1 pt-1 border-t border-slate-700">
          <span>Gross Total</span>
          <span className="font-medium">{getCurrencySymbol()}{calculations.totalValue}</span>
        </div>

        {/* Show detailed breakdown for BOTH paper and live trading */}
        {quantity && livePrice && calculations.grossValue > 0 && (
          <>
            <div className="mt-2 pt-2 border-t border-slate-600">
              <div className="text-xs text-slate-400 mb-1 font-semibold">
                {tradingMode === 'live' ? '💰 Charges Breakdown:' : '📊 Simulated Charges:'}
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Brokerage</span>
                <span>{getCurrencySymbol()}{calculations.brokerage.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>STT (0.1%)</span>
                <span>{getCurrencySymbol()}{calculations.stt.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Transaction Charges</span>
                <span>{getCurrencySymbol()}{calculations.transactionCharges.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>GST (18%)</span>
                <span>{getCurrencySymbol()}{calculations.gst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>SEBI Charges</span>
                <span>{getCurrencySymbol()}{calculations.sebi.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Stamp Duty</span>
                <span>{getCurrencySymbol()}{calculations.stampDuty.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mt-2 pt-2 border-t border-slate-600 font-semibold text-emerald-400">
                <span>Net Amount</span>
                <span>{getCurrencySymbol()}{calculations.netAmount.toFixed(2)}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            if (!symbol) return showToast('No symbol selected', 'error');
            if (orderType === 'amount' && (!amount || Number(amount) <= 0)) return showToast('Enter a valid amount', 'error');
            if (orderType === 'quantity' && (!quantity || Number(quantity) <= 0)) return showToast('Enter a valid quantity', 'error');
            setPendingOrder({ side: 'BUY' });
          }}
          className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-lg hover:opacity-90"
          disabled={loading || !symbol || (!amount && !quantity)}
        >
          {loading ? 'Processing…' : 'Buy'}
        </button>

        <button
          onClick={() => {
            if (!symbol) return showToast('No symbol selected', 'error');
            if (orderType === 'amount' && (!amount || Number(amount) <= 0)) return showToast('Enter a valid amount', 'error');
            if (orderType === 'quantity' && (!quantity || Number(quantity) <= 0)) return showToast('Enter a valid quantity', 'error');
            setPendingOrder({ side: 'SELL' });
          }}
          className="flex-1 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 text-white font-semibold rounded-lg hover:opacity-90"
          disabled={loading || !symbol || (!amount && !quantity)}
        >
          {loading ? 'Processing…' : 'Sell'}
        </button>
      </div>

      {/* Confirmation Modal with SL/TP */}
      {pendingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md p-6 shadow-2xl transform transition-all">
            <h3 className="text-xl font-bold text-white mb-4">
              Confirm {pendingOrder.side} Order
            </h3>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Symbol</span>
                <span className="text-white font-medium">{symbol}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Currency</span>
                <span className="text-white font-medium">{getCurrencyName()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Quantity</span>
                <span className="text-white font-medium">{quantity}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Price</span>
                <span className="text-white font-medium">{formatCurrencySymbol(symbol, livePrice)}</span>
              </div>
              <div className="flex justify-between text-sm border-b border-slate-700 pb-2">
                <span className="text-slate-400">Total Value</span>
                <span className="text-white font-bold">{getCurrencySymbol()}{calculations.totalValue}</span>
              </div>

              {/* SL / TP Inputs */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Stop Loss ({getCurrencySymbol()})</label>
                  <input
                    type="number"
                    placeholder="Optional"
                    className="w-full px-3 py-2 bg-slate-800 text-white rounded-lg border border-slate-600 focus:border-rose-500 text-sm"
                    onChange={(e) => setPendingOrder(p => ({ ...p, stopLoss: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Take Profit ({getCurrencySymbol()})</label>
                  <input
                    type="number"
                    placeholder="Optional"
                    className="w-full px-3 py-2 bg-slate-800 text-white rounded-lg border border-slate-600 focus:border-emerald-500 text-sm"
                    onChange={(e) => setPendingOrder(p => ({ ...p, takeProfit: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPendingOrder(null)}
                className="flex-1 py-2.5 bg-slate-700 text-white font-medium rounded-lg hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleSubmit(pendingOrder.side, pendingOrder.stopLoss, pendingOrder.takeProfit);
                  setPendingOrder(null);
                }}
                className={`flex-1 py-2.5 font-bold rounded-lg text-white ${pendingOrder.side === 'BUY'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-rose-600 hover:bg-rose-500'
                  }`}
              >
                Confirm {pendingOrder.side}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
