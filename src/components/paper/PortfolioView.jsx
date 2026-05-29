import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { readState } from '../../utils/paperTradingStore';
import MarketDataService from '../../services/marketDataService';
import TradingHistoryPanel from './TradingHistoryPanel';
import { tradeMonitorService } from '../../services/tradeMonitorService';

export default function PortfolioView() {
  const [positions, setPositions] = useState([]);
  const [prices, setPrices] = useState({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [tradeHistory, setTradeHistory] = useState({});
  const [activeTab, setActiveTab] = useState('manual'); // 'manual', 'live'
  const [showAIOnly, setShowAIOnly] = useState(false);
  const [allOrders, setAllOrders] = useState([]);
  const [pendingTrades, setPendingTrades] = useState([]);

  // Load positions and trade history from local store
  useEffect(() => {
    const loadPositions = () => {
      const state = readState();

      // First, process orders to identify AI symbols and calculate charges
      const aiSymbols = new Set();
      const history = {};

      if (state && state.orders) {
        setAllOrders(state.orders);

        state.orders.forEach(order => {
          // Track AI symbols
          if (order.isAIOrder) {
            aiSymbols.add(order.symbol);
          }

          if (!history[order.symbol]) {
            history[order.symbol] = {
              buys: [],
              sells: [],
              totalBrokerage: 0,
              totalTaxes: 0,
              hasAIOrder: false
            };
          }

          if (order.isAIOrder) {
            history[order.symbol].hasAIOrder = true;
          }

          const brokerage = order.charges?.brokerage || 0;
          const totalCharges = order.totalCharges || 0;
          const taxes = totalCharges - brokerage;

          if (order.side === 'BUY') {
            history[order.symbol].buys.push({
              price: order.price,
              qty: order.qty,
              ts: order.ts,
              brokerage,
              taxes,
              isAIOrder: order.isAIOrder || false
            });
          } else {
            history[order.symbol].sells.push({
              price: order.price,
              qty: order.qty,
              ts: order.ts,
              brokerage,
              taxes,
              isAIOrder: order.isAIOrder || false
            });
          }

          history[order.symbol].totalBrokerage += brokerage;
          history[order.symbol].totalTaxes += taxes;
        });
        setTradeHistory(history);
      }

      // Now load positions with correct AI flags and SL/TP from order history
      if (state && state.positions) {
        const posArray = Object.entries(state.positions).map(([symbol, pos]) => ({
          symbol,
          quantity: pos.qty,
          avgPrice: pos.avgPrice,
          stopLoss: pos.stopLoss,
          takeProfit: pos.takeProfit,
          isAIOrder: aiSymbols.has(symbol) // Check if symbol has any AI orders
        }));
        setPositions(posArray);
      } else {
        setPositions([]);
      }
    };

    loadPositions();

    // Listen for trade updates to reload positions
    const handleUpdate = () => {
      loadPositions();
      setRefreshKey(prev => prev + 1);
    };
    window.addEventListener('paper-trade-update', handleUpdate);
    return () => window.removeEventListener('paper-trade-update', handleUpdate);
  }, []);

  // Load pending trades from trade monitor service
  useEffect(() => {
    const loadPendingTrades = () => {
      const status = tradeMonitorService.getStatus();
      const waiting = status.monitors.filter(m => m.status === 'WAITING_ENTRY');
      setPendingTrades(waiting);
    };

    loadPendingTrades();
    const interval = setInterval(loadPendingTrades, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [refreshKey]);

  // Fetch live prices for all positions
  useEffect(() => {
    if (positions.length === 0) return;

    const fetchPrices = async () => {
      const newPrices = {};

      await Promise.all(positions.map(async (p) => {
        try {
          const quote = await MarketDataService.getQuote(p.symbol);
          if (quote && quote.price) {
            newPrices[p.symbol] = {
              price: quote.price,
              prevClose: quote.previousClose || (quote.price / (1 + (quote.changePercent / 100))),
              changePercent: quote.changePercent || 0
            };
          }
        } catch (error) {
          console.error(`Error fetching price for ${p.symbol}:`, error);
        }
      }));

      setPrices(newPrices);
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [positions.map(p => p.symbol).join(','), refreshKey]);

  // Helper to get currency symbol
  const getCurrencySymbol = (sym) => {
    return (sym.endsWith('.NS') || sym.endsWith('.BO')) ? '₹' : '$';
  };

  // Calculate buy and sell prices from trade history
  const getTradeStats = (symbol) => {
    const history = tradeHistory[symbol];
    if (!history) return {
      avgBuyPrice: null,
      avgSellPrice: null,
      buyPrices: [],
      totalBrokerage: 0,
      totalTaxes: 0
    };

    let avgBuyPrice = null;
    let avgSellPrice = null;
    const buyPrices = [];

    if (history.buys.length > 0) {
      const totalBuyValue = history.buys.reduce((sum, b) => sum + (b.price * b.qty), 0);
      const totalBuyQty = history.buys.reduce((sum, b) => sum + b.qty, 0);
      avgBuyPrice = totalBuyQty > 0 ? totalBuyValue / totalBuyQty : null;

      // Get individual buy prices
      history.buys.forEach(b => {
        buyPrices.push({
          price: b.price,
          qty: b.qty,
          ts: b.ts,
          isAIOrder: b.isAIOrder
        });
      });
    }

    if (history.sells.length > 0) {
      const totalSellValue = history.sells.reduce((sum, s) => sum + (s.price * s.qty), 0);
      const totalSellQty = history.sells.reduce((sum, s) => sum + s.qty, 0);
      avgSellPrice = totalSellQty > 0 ? totalSellValue / totalSellQty : null;
    }

    return {
      avgBuyPrice,
      avgSellPrice,
      buyPrices,
      totalBrokerage: history.totalBrokerage || 0,
      totalTaxes: history.totalTaxes || 0
    };
  };

  // Filter positions based on active tab and AI toggle
  const getFilteredPositions = () => {
    let filtered = positions;

    // First filter by tab
    if (activeTab === 'manual') filtered = positions;
    if (activeTab === 'live') filtered = []; // Live trading positions (from Zerodha)

    // Then apply AI toggle
    if (showAIOnly) {
      filtered = filtered.filter(p => p.isAIOrder);
    }

    return filtered;
  };

  const filteredPositions = getFilteredPositions();

  // Calculate totals
  const totals = filteredPositions.reduce((acc, pos) => {
    const priceData = prices[pos.symbol];
    const currentPrice = priceData ? priceData.price : pos.avgPrice;
    const prevClose = priceData ? priceData.prevClose : currentPrice;
    const stats = getTradeStats(pos.symbol);

    const invested = pos.quantity * pos.avgPrice;
    const currentVal = pos.quantity * currentPrice;
    const pnl = currentVal - invested;
    const dailyPnl = (currentPrice - prevClose) * pos.quantity;

    acc.invested += invested;
    acc.current += currentVal;
    acc.pnl += pnl;
    acc.dailyPnl += dailyPnl;
    acc.brokerage += stats.totalBrokerage;
    acc.taxes += stats.totalTaxes;
    return acc;
  }, { invested: 0, current: 0, pnl: 0, dailyPnl: 0, brokerage: 0, taxes: 0 });

  const netPnl = totals.pnl - totals.brokerage - totals.taxes;

  return (
    <div className="space-y-4">
      {/* Portfolio Summary */}
      <div className="bg-gradient-to-br from-[#111526] to-[#1a1f3a] p-5 rounded-xl border border-purple-500/30 shadow-xl">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-xl">💼</span> Portfolio Summary
          </h3>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-500 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-all shadow-lg hover:shadow-xl"
          >
            📊 My Trading History
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2 md:gap-3">
          <div className="bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/50">
            <div className="text-xs text-gray-400 mb-0.5">💰 Invested</div>
            <div className="text-base font-bold text-cyan-400">
              ₹{totals.invested.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Money you put in</div>
          </div>
          <div className="bg-yellow-900/20 p-2.5 rounded-lg border border-yellow-500/50">
            <div className="text-xs text-yellow-400 mb-0.5">⏳ Waiting Amount</div>
            <div className="text-base font-bold text-yellow-300">
              ₹{pendingTrades.reduce((sum, t) => sum + (t.entry * t.quantity), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Pending entry ({pendingTrades.length})</div>
          </div>
          <div className="bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/50">
            <div className="text-xs text-gray-400 mb-0.5">📈 Current Value</div>
            <div className="text-base font-bold text-purple-400">
              ₹{totals.current.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Live market value</div>
          </div>
          <div className="bg-yellow-900/20 p-2.5 rounded-lg border border-yellow-500/50">
            <div className="text-xs text-yellow-400 mb-0.5">💵 Brokerage</div>
            <div className="text-base font-bold text-yellow-300">
              ₹{totals.brokerage.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Broker fees</div>
          </div>
          <div className="bg-orange-900/20 p-2.5 rounded-lg border border-orange-500/50">
            <div className="text-xs text-orange-400 mb-0.5">📋 Taxes</div>
            <div className="text-base font-bold text-orange-300">
              ₹{totals.taxes.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">GST + STT</div>
          </div>
          <div className={`p-2.5 rounded-lg border ${netPnl >= 0 ? 'bg-green-900/20 border-green-500/50' : 'bg-red-900/20 border-red-500/50'}`}>
            <div className="text-xs text-gray-400 mb-0.5">💹 Net P&L</div>
            <div className={netPnl >= 0 ? 'text-base font-bold text-green-400' : 'text-base font-bold text-red-400'}>
              {netPnl >= 0 ? '+' : ''}₹{netPnl.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">After All Charges</div>
          </div>
          <div className={`p-2.5 rounded-lg border ${totals.dailyPnl >= 0 ? 'bg-emerald-900/20 border-emerald-500/50' : 'bg-orange-900/20 border-orange-500/50'}`}>
            <div className="text-xs text-gray-400 mb-0.5">📊 Day's P&L</div>
            <div className={totals.dailyPnl >= 0 ? 'text-base font-bold text-emerald-400' : 'text-base font-bold text-orange-400'}>
              {totals.dailyPnl >= 0 ? '+' : ''}₹{totals.dailyPnl.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Today's change</div>
          </div>
        </div>
      </div>

      {/* Trading History Panel */}
      <AnimatePresence>
        {showHistory && <TradingHistoryPanel />}
      </AnimatePresence>

      {/* Waiting to Enter Trades */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 p-4 rounded-xl border border-yellow-500/30 shadow-xl"
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">⏳</span>
          <h3 className="text-lg font-bold text-yellow-300">Waiting to Enter ({pendingTrades.length} stocks)</h3>
          <span className="text-xs text-gray-400 ml-auto">Monitoring for entry price...</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="text-left p-2 text-xs font-semibold text-yellow-300">Stock</th>
                <th className="text-right p-2 text-xs font-semibold text-yellow-300">Entry Price</th>
                <th className="text-right p-2 text-xs font-semibold text-yellow-300">Current Price</th>
                <th className="text-right p-2 text-xs font-semibold text-yellow-300">Difference</th>
                <th className="text-right p-2 text-xs font-semibold text-yellow-300">Quantity</th>
                <th className="text-right p-2 text-xs font-semibold text-yellow-300">Stop Loss</th>
                <th className="text-right p-2 text-xs font-semibold text-yellow-300">Target</th>
                <th className="text-center p-2 text-xs font-semibold text-yellow-300">Status</th>
              </tr>
            </thead>
            <tbody>
              {pendingTrades.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-gray-400">
                    <div className="text-4xl mb-2">💤</div>
                    <div>No pending trades</div>
                    <div className="text-xs mt-1">Use AI Trading to get recommendations</div>
                  </td>
                </tr>
              ) : (
                pendingTrades.map((trade, idx) => {
                  const diff = trade.currentPrice - trade.entry;
                  const diffPercent = trade.entry > 0 ? ((diff / trade.entry) * 100) : 0;
                  const isNearEntry = Math.abs(diffPercent) < 1; // Within 1%

                  return (
                    <tr key={idx} className="border-t border-yellow-500/20 hover:bg-yellow-900/10">
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🤖</span>
                          <div>
                            <div className="font-bold text-white text-sm">{trade.symbol.replace('.NS', '')}</div>
                            <div className="text-xs text-gray-400">{trade.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-right p-2">
                        <div className="text-cyan-400 font-semibold">₹{trade.entry.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">Target entry</div>
                      </td>
                      <td className="text-right p-2">
                        <div className="text-white font-semibold">
                          {trade.currentPrice > 0 ? `₹${trade.currentPrice.toFixed(2)}` : '—'}
                        </div>
                        {trade.lastCheck && (
                          <div className="text-xs text-gray-500">
                            {new Date(trade.lastCheck).toLocaleTimeString()}
                          </div>
                        )}
                      </td>
                      <td className="text-right p-2">
                        {trade.currentPrice > 0 ? (
                          <div className={`font-semibold ${diff >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {diff >= 0 ? '+' : ''}₹{diff.toFixed(2)}
                            <div className="text-xs">({diffPercent >= 0 ? '+' : ''}{diffPercent.toFixed(1)}%)</div>
                          </div>
                        ) : (
                          <div className="text-gray-500">—</div>
                        )}
                      </td>
                      <td className="text-right p-2">
                        <div className="text-white font-semibold">{trade.quantity}</div>
                      </td>
                      <td className="text-right p-2">
                        <div className="text-red-300 font-semibold">₹{trade.stop.toFixed(2)}</div>
                      </td>
                      <td className="text-right p-2">
                        <div className="text-green-300 font-semibold">₹{trade.target.toFixed(2)}</div>
                      </td>
                      <td className="text-center p-2">
                        {isNearEntry ? (
                          <span className="px-2 py-1 bg-green-600/20 text-green-400 rounded-full text-xs font-semibold animate-pulse">
                            🎯 Near Entry
                          </span>
                        ) : diff < 0 ? (
                          <span className="px-2 py-1 bg-yellow-600/20 text-yellow-400 rounded-full text-xs font-semibold">
                            ⏳ Waiting
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-orange-600/20 text-orange-400 rounded-full text-xs font-semibold">
                            ⬆️ Above Entry
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-xs text-gray-400 flex items-center gap-2">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
          <span>AI will automatically buy when price reaches entry level</span>
        </div>
      </motion.div>


      {/* Trading Type Tabs */}
      <div className="bg-gradient-to-br from-[#111526] to-[#1a1f3a] rounded-xl border border-purple-500/30 overflow-hidden shadow-xl">
        <div className="flex items-center justify-between border-b border-purple-500/20 bg-slate-800/50">
          <div className="flex">
            <button
              onClick={() => setActiveTab('manual')}
              className={`px-4 py-2.5 text-sm font-semibold transition-all ${activeTab === 'manual'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-slate-700/50'
                }`}
            >
              📊 Manual/Paper Trading ({positions.length})
            </button>
            <button
              onClick={() => setActiveTab('live')}
              className={`px-4 py-2.5 text-sm font-semibold transition-all ${activeTab === 'live'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-slate-700/50'
                }`}
            >
              🔴 Live Trading (0)
            </button>
          </div>

          {/* Show AI Only Toggle */}
          <div className="flex items-center gap-2 px-4">
            <span className="text-xs text-gray-400">👁️ Show AI Only</span>
            <button
              onClick={() => setShowAIOnly(!showAIOnly)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showAIOnly ? 'bg-purple-600' : 'bg-gray-600'
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showAIOnly ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
          </div>
        </div>

        {/* Positions Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/70">
              <tr>
                <th className="text-left p-3 text-xs font-semibold text-purple-300">Symbol</th>
                <th className="text-right p-3 text-xs font-semibold text-purple-300">Qty</th>
                <th className="text-right p-3 text-xs font-semibold text-purple-300">Buy Price</th>
                <th className="text-right p-3 text-xs font-semibold text-purple-300">Current Price</th>
                {showAIOnly && (
                  <>
                    <th className="text-right p-3 text-xs font-semibold text-purple-300">Stop Loss</th>
                    <th className="text-right p-3 text-xs font-semibold text-purple-300">Target</th>
                  </>
                )}
                <th className="text-right p-3 text-xs font-semibold text-purple-300">Brokerage</th>
                <th className="text-right p-3 text-xs font-semibold text-purple-300">Taxes</th>
                <th className="text-right p-3 text-xs font-semibold text-purple-300">Invested</th>
                <th className="text-right p-3 text-xs font-semibold text-purple-300">Market Value</th>
                <th className="text-right p-3 text-xs font-semibold text-purple-300">Daily P&L</th>
              </tr>
            </thead>
            <tbody>
              {filteredPositions.length === 0 ? (
                <tr>
                  <td colSpan={showAIOnly ? "12" : "10"} className="text-center py-12 text-gray-400">
                    <div className="text-4xl mb-2">
                      {activeTab === 'live' ? '🔴' : showAIOnly ? '🤖' : '📭'}
                    </div>
                    <div>No {showAIOnly ? 'AI' : ''} positions</div>
                    <div className="text-xs mt-1">
                      {activeTab === 'live' && 'Connect Zerodha to see live positions'}
                      {activeTab === 'manual' && !showAIOnly && 'Start trading to see your portfolio here'}
                      {showAIOnly && 'Use AI Trading to get automated recommendations'}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPositions.map(pos => {
                  const currency = getCurrencySymbol(pos.symbol);
                  const priceData = prices[pos.symbol];
                  const currentPrice = priceData ? priceData.price : null;
                  const prevClose = priceData ? priceData.prevClose : null;
                  const changePercent = priceData ? priceData.changePercent : 0;

                  const { avgBuyPrice, avgSellPrice, buyPrices, totalBrokerage, totalTaxes } = getTradeStats(pos.symbol);
                  const buyPrice = avgBuyPrice || pos.avgPrice;

                  const invested = pos.quantity * buyPrice;
                  const marketValue = currentPrice ? (pos.quantity * currentPrice) : null;
                  const unrealizedPnl = marketValue ? (marketValue - invested) : null;
                  const netPnl = unrealizedPnl ? (unrealizedPnl - totalBrokerage - totalTaxes) : null;
                  const pnlPct = invested === 0 ? 0 : (netPnl / invested) * 100;

                  const dailyPnl = (currentPrice && prevClose)
                    ? (currentPrice - prevClose) * pos.quantity
                    : null;
                  const dailyPnlPct = prevClose ? ((currentPrice - prevClose) / prevClose) * 100 : 0;

                  // Use absolute Stop Loss and Target prices from store (NOT percentages!)
                  const stopLossPrice = pos.stopLoss || null;
                  const targetPrice = pos.takeProfit || null;

                  // Check if near SL or Target (within ₹1)
                  const nearStopLoss = stopLossPrice && currentPrice && (currentPrice <= (stopLossPrice + 1));
                  const nearTarget = targetPrice && currentPrice && (currentPrice >= (targetPrice - 1));

                  return (
                    <motion.tr
                      key={pos.symbol}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border-t border-slate-700/50 hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          {pos.isAIOrder && <span className="text-base">🤖</span>}
                          <div>
                            <div className="font-bold text-white text-sm">{pos.symbol.replace('.NS', '')}</div>
                            <div className="text-xs text-gray-400">{pos.symbol}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-right p-2">
                        <div className="text-white font-semibold text-sm">{Number(pos.quantity).toFixed(0)}</div>
                      </td>
                      <td className="text-right p-2">
                        <div className="text-cyan-400 font-semibold text-sm">
                          {currency}{buyPrice.toFixed(2)}
                          {pos.isAIOrder && <span className="ml-1 text-xs">🤖</span>}
                        </div>
                        <div className="text-xs text-gray-500">Average</div>
                      </td>
                      <td className="text-right p-2">
                        {currentPrice ? (
                          <>
                            <div className="text-white font-bold text-sm">{currency}{currentPrice.toFixed(2)}</div>
                            <div className={`text-xs ${changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {changePercent >= 0 ? '▲' : '▼'} {Math.abs(changePercent).toFixed(2)}%
                            </div>
                          </>
                        ) : (
                          <div className="text-gray-500">—</div>
                        )}
                      </td>
                      {showAIOnly && (
                        <>
                          <td className="text-right p-2">
                            {stopLossPrice ? (
                              <div className="flex items-center justify-end gap-1">
                                {nearStopLoss && (
                                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50"></span>
                                )}
                                <div className={nearStopLoss ? 'animate-pulse' : ''}>
                                  <div className={`font-bold text-sm ${nearStopLoss ? 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.6)]' : 'text-red-300'}`}>
                                    {currency}{stopLossPrice.toFixed(2)}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {buyPrice > 0 ? `-${(((buyPrice - stopLossPrice) / buyPrice) * 100).toFixed(1)}%` : ''}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-gray-500 text-xs">—</div>
                            )}
                          </td>
                          <td className="text-right p-2">
                            {targetPrice ? (
                              <div className="flex items-center justify-end gap-1">
                                {nearTarget && (
                                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></span>
                                )}
                                <div className={nearTarget ? 'animate-pulse' : ''}>
                                  <div className={`font-bold text-sm ${nearTarget ? 'text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.6)]' : 'text-green-300'}`}>
                                    {currency}{targetPrice.toFixed(2)}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {buyPrice > 0 ? `+${(((targetPrice - buyPrice) / buyPrice) * 100).toFixed(1)}%` : ''}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-gray-500 text-xs">—</div>
                            )}
                          </td>
                        </>
                      )}
                      <td className="text-right p-3">
                        <div className="text-yellow-400 font-semibold">{currency}{totalBrokerage.toFixed(2)}</div>
                      </td>
                      <td className="text-right p-3">
                        <div className="text-orange-400 font-semibold">{currency}{totalTaxes.toFixed(2)}</div>
                      </td>
                      <td className="text-right p-3">
                        <div className="text-white font-semibold">{currency}{invested.toFixed(2)}</div>
                      </td>
                      <td className="text-right p-3">
                        {marketValue ? (
                          <div className="text-purple-400 font-semibold">{currency}{marketValue.toFixed(2)}</div>
                        ) : (
                          <div className="text-gray-500">—</div>
                        )}
                      </td>
                      <td className="text-right p-3">
                        {dailyPnl !== null ? (
                          <div className={`font-bold ${dailyPnl >= 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
                            {dailyPnl >= 0 ? '+' : ''}{currency}{dailyPnl.toFixed(2)}
                            <div className="text-xs">({dailyPnlPct >= 0 ? '+' : ''}{dailyPnlPct.toFixed(2)}%)</div>
                          </div>
                        ) : (
                          <div className="text-gray-500">—</div>
                        )}
                      </td>

                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Data Indicator */}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span>Live data • Updates every 5 seconds</span>
      </div>
    </div>
  );
}
