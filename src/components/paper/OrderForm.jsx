import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { subscribePrice, placeMarketOrder, readState } from '../../utils/paperTradingStore';
import AITradingModal from './AITradingModal';
import MarketDataService from '../../services/marketDataService';

export default function OrderForm({ symbol, quote }) {
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('');
  const [orderType, setOrderType] = useState('amount');
  const [tradingMode, setTradingMode] = useState('paper'); // 'paper' or 'live'
  const [loading, setLoading] = useState(false);
  const [livePrice, setLivePrice] = useState(quote?.price || null);
  const [toast, setToast] = useState(null);
  const [pendingOrder, setPendingOrder] = useState(null);

  // AI Trading State - with Persistence
  const getSavedSession = () => {
    try {
      const saved = localStorage.getItem('aiTradingSession');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  };
  const savedSession = getSavedSession();

  const [showAITradingModal, setShowAITradingModal] = useState(false);
  const [aiTradingActive, setAiTradingActive] = useState(savedSession?.isActive || false);
  const [aiTradingStage, setAiTradingStage] = useState(savedSession?.stage || 'idle');
  const [aiTradingLogs, setAiTradingLogs] = useState(savedSession?.logs || []);
  const [aiSessionOrders, setAiSessionOrders] = useState(savedSession?.orders || []); // Track session-specific buys
  const [aiConfig, setAiConfig] = useState(savedSession?.config || {
    useAISuggestions: true,
    selectedStocks: [],
    riskLevel: 'medium',
    strategy: 'intraday',
    executionMode: 'paper',
    maxTradesPerDay: 5,
    totalBudget: 100000,
    perTradeType: 'fixed',
    perTradeAmount: 20000,
    perTradePercent: 20,
    orderType: 'market',
    stopLoss: 2,
    stopLossType: 'percentage',
    takeProfit: 5,
    takeProfitType: 'percentage',
    useTrailingStop: false,
    trailingStopPercent: 1,
    maxDailyLoss: 10,
    maxDailyProfit: 20,
    priceMin: '',
    priceMax: '',
    volumeFilter: 'any',
    volatilityFilter: 'any',
    marketTrend: 'any',
    segment: [],
    entryTimeFrom: '',
    entryTimeTo: '',
    exitMethod: 'either',
    exitTime: ''
  });

  // Persist AI Session
  useEffect(() => {
    if (aiTradingActive) {
      localStorage.setItem('aiTradingSession', JSON.stringify({
        isActive: aiTradingActive,
        stage: aiTradingStage,
        config: aiConfig,
        logs: aiTradingLogs,
        orders: aiSessionOrders
      }));
    } else {
      localStorage.removeItem('aiTradingSession');
    }
  }, [aiTradingActive, aiTradingStage, aiConfig, aiTradingLogs, aiSessionOrders]);

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
         AI Trading Logic
  --------------------------- */
  /* ---------------------------
       Execute AI Buy Orders
  --------------------------- */
  const executeAIBuyOrders = useCallback(async () => {
    setAiTradingStage('active');
    setAiTradingLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), message: '🚀 Executing Buy Orders...' }]);

    // Define Universe of stocks to scan
    const stockUniverse = [
      'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
      'BHARTIARTL.NS', 'WIPRO.NS', 'AXISBANK.NS', 'ADANIENT.NS',
      'SUNPHARMA.NS', 'TITAN.NS', 'MARUTI.NS'
    ];

    // Determine stocks to trade
    let stocksToTrade = [];
    if (aiConfig.selectedStocks && aiConfig.selectedStocks.length > 0) {
      stocksToTrade = aiConfig.selectedStocks;
    } else if (aiConfig.useAISuggestions) {
      stocksToTrade = stockUniverse;
    }

    setAiTradingLogs(prev => [...prev, {
      time: new Date().toLocaleTimeString(),
      message: `📡 Fetching live market data for ${stocksToTrade.length} stocks...`
    }]);

    // Fetch Live Data
    const stockData = {};
    for (const sym of stocksToTrade) {
      const s = sym.endsWith('.NS') ? sym : `${sym}.NS`;
      try {
        const quote = await MarketDataService.getQuote(s);
        if (quote && quote.price) {
          stockData[s] = {
            price: quote.price,
            volume: 10000000, // Default high volume to pass filters
            volatility: 'medium',
            trend: quote.changePercent >= 0 ? 'bullish' : 'bearish'
          };
        }
      } catch (e) {
        console.error(`Failed to fetch data for ${s}`, e);
      }
    }

    console.log('📊 AI Trading - Stock Data:', Object.keys(stockData).length, stockData);
    setAiTradingLogs(prev => [...prev, {
      time: new Date().toLocaleTimeString(),
      message: `📊 Fetched data for ${Object.keys(stockData).length} stocks.`
    }]);

    // Check Wallet Balance
    const st = readState();
    console.log('💰 AI Trading - Wallet State:', st);

    if (!st || !st.wallet) {
      setAiTradingLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        message: `❌ Error: Wallet data not found. Please reset paper trading.`
      }]);
      setAiTradingActive(false);
      return;
    }

    const currentBalance = st.wallet.cash || 0;

    // Auto-adjust budget to available balance if not enough funds
    let requestedBudget = Number(aiConfig.totalBudget) || 100000;
    if (requestedBudget > currentBalance) {
      requestedBudget = currentBalance * 0.9; // Use 90% of available balance
      console.log(`⚠️ Budget auto-adjusted to ₹${requestedBudget.toFixed(2)} (90% of available ₹${currentBalance.toFixed(2)})`);
    }

    // Cap budget at available balance (leaving a small buffer)
    const effectiveBudget = Math.min(requestedBudget, currentBalance * 0.95);

    setAiTradingLogs(prev => [...prev, {
      time: new Date().toLocaleTimeString(),
      message: `💰 Wallet: ₹${currentBalance.toFixed(2)} | Budget: ₹${effectiveBudget.toFixed(2)}`
    }]);

    if (effectiveBudget < 1000) {
      setAiTradingLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        message: `❌ Insufficient funds to start AI trading.`
      }]);
      showToast('❌ Insufficient funds', 'error');
      setAiTradingActive(false);
      return;
    }

    // Apply Filters
    const filteredStocks = stocksToTrade.filter(sym => {
      const s = sym.endsWith('.NS') ? sym : `${sym}.NS`;
      const data = stockData[s];

      if (!data) return true; // Keep if no data (fallback)

      // Price filter
      if (aiConfig.priceMin && data.price < Number(aiConfig.priceMin)) return false;
      if (aiConfig.priceMax && data.price > Number(aiConfig.priceMax)) return false;

      // Volume filter
      if (aiConfig.volumeFilter !== 'any') {
        if (aiConfig.volumeFilter === 'high' && data.volume < 10000000) return false;
        if (aiConfig.volumeFilter === 'low' && data.volume > 5000000) return false;
      }

      // Volatility filter
      if (aiConfig.volatilityFilter !== 'any') {
        if (aiConfig.volatilityFilter !== data.volatility) return false;
      }

      // Market Trend filter
      if (aiConfig.marketTrend !== 'any') {
        if (aiConfig.marketTrend !== data.trend) return false;
      }

      return true;
    });

    console.log('🔍 AI Trading - Filtered Stocks:', filteredStocks);
    setAiTradingLogs(prev => [...prev, {
      time: new Date().toLocaleTimeString(),
      message: `🤖 After filters: ${filteredStocks.length} stocks qualify`
    }]);

    if (filteredStocks.length === 0) {
      setAiTradingLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        message: `⚠️ No stocks matched your criteria (Time/Price/Volume).`
      }]);
      setAiTradingActive(false);
      return;
    }

    // Limit to max trades
    const finalStocks = filteredStocks.slice(0, Number(aiConfig.maxTradesPerDay) || 5);
    const perTradeAmount = effectiveBudget / finalStocks.length;

    // Execute Trades
    for (let i = 0; i < finalStocks.length; i++) {
      const rawSymbol = finalStocks[i];
      const stockSymbol = rawSymbol.endsWith('.NS') ? rawSymbol : `${rawSymbol}.NS`;

      setAiTradingLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        message: `🤖 Processing AI order ${i + 1}/${finalStocks.length} for ${stockSymbol}...`
      }]);

      // Simulate delay
      await new Promise(r => setTimeout(r, 1500));

      try {
        if (aiConfig.executionMode === 'paper') {
          const stockInfo = stockData[stockSymbol] || { price: 1000, trend: 'neutral' };
          const currentPrice = stockInfo.price;
          const qty = Math.floor(perTradeAmount / currentPrice);

          if (qty <= 0) {
            setAiTradingLogs(prev => [...prev, {
              time: new Date().toLocaleTimeString(),
              message: `⚠️ Skipped ${stockSymbol}: Insufficient budget for 1 share`
            }]);
            continue;
          }

          let side = 'BUY';
          if (aiConfig.strategy === 'intraday') {
            const st = readState();
            const currentQty = st.positions?.[stockSymbol]?.qty || 0;

            if (stockInfo.trend === 'bearish' && currentQty >= qty) {
              side = 'SELL';
            } else if (stockInfo.trend === 'neutral' && i % 2 === 1 && currentQty >= qty) {
              side = 'SELL';
            }
          }

          console.log(`🤖 AI Order Debug - Symbol: ${stockSymbol}, Side: ${side}, isAIOrder: true`);

          const result = placeMarketOrder({
            symbol: stockSymbol,
            side: side,
            amount: perTradeAmount,
            qty: qty,
            stopLoss: aiConfig.stopLoss ? Number(aiConfig.stopLoss) : null,
            takeProfit: aiConfig.takeProfit ? Number(aiConfig.takeProfit) : null,
            isAIOrder: true,
            executionPrice: currentPrice
          });

          if (result?.success) {
            if (side === 'BUY') {
              setAiSessionOrders(prev => {
                const existing = prev.find(o => o.symbol === stockSymbol);
                if (existing) {
                  return prev.map(o => o.symbol === stockSymbol ? { ...o, qty: o.qty + qty } : o);
                } else {
                  return [...prev, { symbol: stockSymbol, qty: qty }];
                }
              });
            }

            setAiTradingLogs(prev => [...prev, {
              time: new Date().toLocaleTimeString(),
              message: `✅ 🤖 AI ${side} ${stockSymbol.replace('.NS', '')}: ${qty} shares @ ₹${currentPrice.toFixed(2)}`
            }]);

            const aiOrder = {
              ...result.order,
              source: 'AI',
              tag: 'AI_TRADING',
              isAIOrder: true,
              aiSymbol: '🤖'
            };

            window.dispatchEvent(new CustomEvent('paper-trade-update', {
              detail: { order: aiOrder }
            }));
            window.dispatchEvent(new CustomEvent('paper-order-confirmed', { detail: aiOrder }));

            showToast(`✅ 🤖 AI Order ${i + 1}/${finalStocks.length}: ${side} ${stockSymbol.replace('.NS', '')} - ${qty} shares @ ₹${currentPrice.toFixed(2)}`, 'success', 3000);
            console.log(`✅ 🤖 AI Paper order placed:`, result.order);
          } else {
            const reason = result?.reason || 'Unknown error';
            setAiTradingLogs(prev => [...prev, {
              time: new Date().toLocaleTimeString(),
              message: `❌ Failed: ${stockSymbol} - ${reason}`
            }]);
            showToast(`❌ AI Order Failed: ${stockSymbol} - ${reason}`, 'error');
            console.error(`❌ AI order failed for ${stockSymbol}: ${reason}`, result);
          }
        } else {
          setAiTradingLogs(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message: `⚠️ Live AI Trading not fully enabled in this demo for safety.`
          }]);
        }
      } catch (err) {
        setAiTradingLogs(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          message: `❌ Error: ${err.message}`
        }]);
      }
    }

    if (!aiConfig.exitTime) {
      setAiTradingActive(false);
      setAiTradingStage('idle');
      setAiTradingLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), message: '🏁 AI Trading Session Completed' }]);
    } else {
      setAiTradingLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), message: `⏳ Waiting for Auto-Exit at ${aiConfig.exitTime}...` }]);
    }
  }, [aiConfig]);

  /* ---------------------------
       Start AI Trading (Scheduler)
  --------------------------- */
  const handleStartAITrading = async () => {
    setShowAITradingModal(false);
    setAiTradingActive(true);

    // Check Schedule
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (aiConfig.entryTimeFrom && currentTime < aiConfig.entryTimeFrom) {
      setAiTradingStage('waiting_entry');
      setAiTradingLogs([{
        time: new Date().toLocaleTimeString(),
        message: `⏳ Scheduled: Waiting for Entry at ${aiConfig.entryTimeFrom}...`
      }]);
      showToast(`⏳ AI Scheduled: Waiting for ${aiConfig.entryTimeFrom}`, 'info');
    } else {
      setAiTradingStage('active');
      setAiTradingLogs([{ time: new Date().toLocaleTimeString(), message: '🤖 AI Trading Started...' }]);
      showToast('🤖 AI Trading Started', 'success');
      executeAIBuyOrders();
    }
  };



  /* ---------------------------
       AI Auto-Exit Logic
  --------------------------- */
  const handleAIAutoExit = useCallback(async () => {
    const st = readState();
    const positions = st.positions || {};
    let closedCount = 0;

    setAiTradingLogs(prev => [...prev, {
      time: new Date().toLocaleTimeString(),
      message: `⏰ Auto-Exit Triggered: Closing session positions...`
    }]);

    // Use aiSessionOrders to determine what to sell
    for (const order of aiSessionOrders) {
      const symbol = order.symbol;
      const targetQty = order.qty;
      const currentPos = positions[symbol];

      if (currentPos && currentPos.qty > 0) {
        // Sell the lesser of what we bought or what we have
        const sellQty = Math.min(targetQty, currentPos.qty);

        if (sellQty <= 0) continue;

        // Fetch fresh price
        let executionPrice = st.prices?.[symbol]?.price;
        try {
          const quote = await MarketDataService.getQuote(symbol);
          if (quote?.price) executionPrice = quote.price;
        } catch (e) {
          console.warn(`Failed to fetch fresh price for ${symbol}, using cached.`);
        }

        if (!executionPrice) {
          setAiTradingLogs(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message: `❌ Could not sell ${symbol}: No price data`
          }]);
          continue;
        }

        // Close position by selling
        const result = placeMarketOrder({
          symbol,
          side: 'SELL',
          qty: sellQty,
          isAIOrder: true,
          executionPrice: executionPrice
        });

        if (result.success) {
          closedCount++;
          setAiTradingLogs(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message: `✅ Auto-Sold ${symbol}: ${sellQty} shares @ ₹${executionPrice.toFixed(2)}`
          }]);

          window.dispatchEvent(new CustomEvent('paper-trade-update', {
            detail: { order: result.order }
          }));
        } else {
          setAiTradingLogs(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message: `❌ Failed to sell ${symbol}: ${result.reason}`
          }]);
        }
      } else {
        setAiTradingLogs(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          message: `ℹ️ Skipped ${symbol}: No longer holding position`
        }]);
      }
    }

    if (closedCount > 0) {
      showToast(`🛑 AI Auto-Exit: Closed ${closedCount} session positions`, 'info');
    } else {
      setAiTradingLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        message: `ℹ️ No session positions to close.`
      }]);
    }

    setAiTradingActive(false);
    setAiSessionOrders([]); // Clear session orders
    setAiTradingLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), message: '🏁 AI Trading Session Completed' }]);
  }, [aiSessionOrders]);

  /* ---------------------------
       AI Scheduler (Entry & Exit)
  --------------------------- */
  useEffect(() => {
    if (!aiTradingActive) return;

    console.log(`⏰ AI Timer Running. Stage: ${aiTradingStage}. Target Entry: ${aiConfig.entryTimeFrom}, Exit: ${aiConfig.exitTime}`);

    const checkTime = () => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // Check Entry
      if (aiTradingStage === 'waiting_entry' && aiConfig.entryTimeFrom) {
        if (currentTime >= aiConfig.entryTimeFrom) {
          console.log(`🚀 Entry Time Reached (${currentTime})! Executing Buy Orders...`);
          executeAIBuyOrders();
        }
      }

      // Check Exit
      if (aiTradingStage === 'active' && aiConfig.exitTime) {
        if (currentTime >= aiConfig.exitTime) {
          console.log(`⏰ Exit Time Reached (${currentTime})! Executing Sell Orders...`);
          handleAIAutoExit();
        }
      }
    };

    const intervalId = setInterval(checkTime, 1000); // Check every 1 second
    return () => clearInterval(intervalId);
  }, [aiTradingActive, aiTradingStage, aiConfig.entryTimeFrom, aiConfig.exitTime, handleAIAutoExit, executeAIBuyOrders]);

  /* ---------------------------
       AI Position Monitor (SL/TP)
  --------------------------- */
  useEffect(() => {
    if (!aiTradingActive) return;

    const monitorPositions = async () => {
      const st = readState();
      const positions = st.positions || {};

      for (const [symbol, pos] of Object.entries(positions)) {
        if (pos.qty <= 0) continue;

        // Skip if no SL/TP set
        if (!pos.stopLoss && !pos.takeProfit) continue;

        try {
          const quote = await MarketDataService.getQuote(symbol);
          const currentPrice = quote?.price;

          if (!currentPrice) continue;

          const buyPrice = pos.avgPrice;
          let shouldSell = false;
          let reason = '';

          // Check Stop Loss (Assuming Percentage)
          if (pos.stopLoss) {
            const slPrice = buyPrice * (1 - Number(pos.stopLoss) / 100);
            if (currentPrice <= slPrice) {
              shouldSell = true;
              reason = `Stop Loss Hit (${pos.stopLoss}%)`;
            }
          }

          // Check Take Profit (Assuming Percentage)
          if (!shouldSell && pos.takeProfit) {
            const tpPrice = buyPrice * (1 + Number(pos.takeProfit) / 100);
            if (currentPrice >= tpPrice) {
              shouldSell = true;
              reason = `Take Profit Hit (${pos.takeProfit}%)`;
            }
          }

          if (shouldSell) {
            console.log(`⚡ AI Monitor: Selling ${symbol} - ${reason}`);
            const result = placeMarketOrder({
              symbol,
              side: 'SELL',
              qty: pos.qty,
              isAIOrder: true,
              executionPrice: currentPrice
            });

            if (result.success) {
              setAiTradingLogs(prev => [...prev, {
                time: new Date().toLocaleTimeString(),
                message: `⚡ ${reason}: Sold ${symbol} @ ₹${currentPrice.toFixed(2)}`
              }]);

              window.dispatchEvent(new CustomEvent('paper-trade-update', {
                detail: { order: result.order }
              }));

              showToast(`⚡ ${reason}: Sold ${symbol}`, 'warning');
            }
          }
        } catch (err) {
          console.error(`Error monitoring ${symbol}:`, err);
        }
      }
    };

    const intervalId = setInterval(monitorPositions, 3000); // Check every 3 seconds
    return () => clearInterval(intervalId);
  }, [aiTradingActive]);

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
        const kiteUserId = localStorage.getItem('kiteUserId');
        if (!kiteUserId) {
          showToast('⚠️ Please connect your Zerodha account first', 'error', 4000);
          setLoading(false);
          return;
        }

        const kiteSymbol = symbol.split('.')[0];
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
              product: 'CNC'
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
            setAmount('');
            setQuantity('');
            window.dispatchEvent(new CustomEvent('zerodha-order-placed', { detail: result }));
          } else {
            let errorMsg = result.error || result.message || 'Order rejected';
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
              errorMsg = `❌ ${errorMsg}`;
            }
            showToast(errorMsg, 'error', 7000);
            window.dispatchEvent(new CustomEvent('zerodha-order-failed', {
              detail: { symbol: kiteSymbol, side, quantity, error: errorMsg }
            }));
          }
        } catch (fetchError) {
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
          setAmount('');
          setQuantity('');
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
  const calculations = useMemo(() => {
    const qty = Number(quantity || 0);
    const price = Number(livePrice || 0);
    const grossValue = qty * price;
    const currency = getCurrency();
    const curSymbol = getCurrencySymbol();

    if (!qty || !price) {
      return {
        totalValue: '0.00',
        qty: 0,
        grossValue: 0,
        charges: [],
        totalCharges: 0,
        netAmount: 0,
        currency
      };
    }

    let charges = [];
    let totalCharges = 0;

    if (currency === 'INR') {
      const brokerage = Math.min(20, grossValue * 0.0003);
      const stt = grossValue * 0.001;
      const transactionCharges = grossValue * 0.0000325;
      const gst = (brokerage + transactionCharges) * 0.18;
      const sebi = grossValue * 0.000001;
      const stampDuty = grossValue * 0.00015;

      charges = [
        { label: 'Brokerage', value: brokerage },
        { label: 'STT (0.1%)', value: stt },
        { label: 'Transaction Charges', value: transactionCharges },
        { label: 'GST (18%)', value: gst },
        { label: 'SEBI Charges', value: sebi },
        { label: 'Stamp Duty', value: stampDuty }
      ];
      totalCharges = brokerage + stt + transactionCharges + gst + sebi + stampDuty;
    } else {
      // USD Charges (Simulated)
      const commission = 0; // Zero commission usually
      const secFee = grossValue * 0.0000229; // Sell side only usually, but showing for simulation
      const taf = Math.min(7.27, qty * 0.000145); // Trading Activity Fee

      charges = [
        { label: 'Commission', value: commission },
        { label: 'SEC Fee', value: secFee },
        { label: 'TAF (Trading Activity Fee)', value: taf }
      ];
      totalCharges = commission + secFee + taf;
    }

    const netAmount = grossValue + totalCharges;

    return {
      totalValue: grossValue.toFixed(2),
      qty,
      grossValue,
      charges,
      totalCharges,
      netAmount,
      currency
    };
  }, [quantity, livePrice, getCurrency, getCurrencySymbol]);

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
      <div className="flex bg-slate-800/50 p-1 rounded-lg mb-4">
        <button
          onClick={() => setTradingMode('paper')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${tradingMode === 'paper'
            ? 'bg-blue-600 text-white shadow-lg'
            : 'text-slate-400 hover:text-white'
            }`}
        >
          📝 Paper
        </button>
        <button
          onClick={() => setTradingMode('live')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${tradingMode === 'live'
            ? 'bg-green-600 text-white shadow-lg'
            : 'text-slate-400 hover:text-white'
            }`}
        >
          ⚡ Live
        </button>
        <button
          onClick={() => setShowAITradingModal(true)}
          className="flex-1 py-1.5 text-xs font-medium rounded-md transition-all ml-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg hover:from-purple-700 hover:to-indigo-700"
        >
          🤖 AI Trading
        </button>
      </div>

      {/* Status Banner */}
      {
        tradingMode === 'live' && (
          <div className="mb-4 px-3 py-2 bg-green-900/20 border border-green-500/30 rounded-lg flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-green-400 font-medium">Connected to Zerodha Kite</span>
          </div>
        )
      }

      {/* Order Type Selector */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setOrderType('amount')}
          className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all ${orderType === 'amount'
            ? 'bg-slate-700 border-slate-500 text-white'
            : 'border-slate-700 text-slate-400 hover:border-slate-600'
            }`}
        >
          By Amount (₹)
        </button>
        <button
          onClick={() => setOrderType('quantity')}
          className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all ${orderType === 'quantity'
            ? 'bg-slate-700 border-slate-500 text-white'
            : 'border-slate-700 text-slate-400 hover:border-slate-600'
            }`}
        >
          By Quantity
        </button>
      </div>

      {/* Input Fields */}
      <div className="space-y-4 mb-6">
        {orderType === 'amount' ? (
          <div>
            <label className="block text-xs text-slate-400 mb-1">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                {getCurrencySymbol()}
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="Enter amount"
                className="w-full pl-8 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            {quantity && (
              <div className="text-right mt-1 text-xs text-slate-400">
                ≈ {quantity} shares
              </div>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-xs text-slate-400 mb-1">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              placeholder="Enter quantity"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {amount && (
              <div className="text-right mt-1 text-xs text-slate-400">
                ≈ {formatCurrencySymbol(symbol, amount)}
              </div>
            )}
          </div>
        )}

        {/* Order Summary */}
        <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 space-y-2">
          <div className="flex items-center gap-1 text-xs text-slate-400 mb-2">
            <span>📊</span>
            <span>Simulated Charges:</span>
          </div>

          {calculations.charges.map((charge, index) => (
            <div key={index} className="flex justify-between text-xs">
              <span className="text-slate-400">{charge.label}</span>
              <span className="text-slate-300">
                {formatCurrencySymbol(symbol, charge.value)}
              </span>
            </div>
          ))}

          <div className="border-t border-slate-700/50 pt-2 flex justify-between text-sm font-medium">
            <span className="text-green-400">Net Amount</span>
            <span className="text-green-400 font-bold">
              {formatCurrencySymbol(symbol, calculations.netAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setPendingOrder({ side: 'BUY' })}
          disabled={loading || !livePrice}
          className="py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-900/20"
        >
          {loading ? 'Processing...' : 'BUY'}
        </button>
        <button
          onClick={() => setPendingOrder({ side: 'SELL' })}
          disabled={loading || !livePrice}
          className="py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-900/20"
        >
          {loading ? 'Processing...' : 'SELL'}
        </button>
      </div>

      {/* Toast Notification */}
      {
        toast && (
          <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-fade-in z-50 ${toast.type === 'error' ? 'bg-red-500 text-white' :
            toast.type === 'success' ? 'bg-green-500 text-white' :
              'bg-blue-500 text-white'
            }`}>
            {toast.message}
          </div>
        )
      }

      {/* Confirmation Modal */}
      {
        pendingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full max-w-sm shadow-2xl transform transition-all scale-100">
              <h3 className="text-xl font-bold text-white mb-4">Confirm Order</h3>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Symbol</span>
                  <span className="text-white font-medium">{symbol}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Type</span>
                  <span className={`font-bold ${pendingOrder.side === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                    {pendingOrder.side}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Quantity</span>
                  <span className="text-white">{quantity}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Price</span>
                  <span className="text-white">{formatCurrencySymbol(symbol, livePrice)}</span>
                </div>
                <div className="border-t border-slate-700 pt-2 flex justify-between text-base font-bold">
                  <span className="text-slate-300">Total</span>
                  <span className="text-white">
                    {formatCurrencySymbol(symbol, calculations.netAmount)}
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setPendingOrder(null)}
                  className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleSubmit(pendingOrder.side);
                    setPendingOrder(null);
                  }}
                  className={`flex-1 py-2 font-bold text-white rounded-lg transition-colors ${pendingOrder.side === 'BUY'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                    }`}
                >
                  Confirm {pendingOrder.side}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* AI Status Banner */}
      {
        aiTradingActive && (
          <div className="fixed bottom-4 right-4 z-50 p-4 bg-slate-900/90 border border-purple-500/50 rounded-lg shadow-xl backdrop-blur-md flex items-center gap-4 animate-pulse">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🤖</span>
              <div>
                <div className="text-purple-200 font-bold text-sm">
                  {aiTradingStage === 'waiting_entry' ? 'AI Scheduled' : 'AI Trading Active'}
                </div>
                <div className="text-purple-300 text-xs">
                  {aiTradingStage === 'waiting_entry'
                    ? <span>Starting at <span className="font-bold text-white text-base">{aiConfig.entryTimeFrom}</span></span>
                    : (aiConfig.exitTime ? <span>Auto-Exit at <span className="font-bold text-white text-base">{aiConfig.exitTime}</span></span> : 'Monitoring...')
                  }
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* AI Trading Modal */}
      <AITradingModal
        show={showAITradingModal}
        onClose={() => setShowAITradingModal(false)}
        config={aiConfig}
        setConfig={setAiConfig}
        onStart={handleStartAITrading}
        isActive={aiTradingActive}
        logs={aiTradingLogs}
      />
    </div >
  );
}
