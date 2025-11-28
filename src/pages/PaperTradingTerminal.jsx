import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { readState, resetSession } from '../utils/paperTradingStore';
import ChartSection from '../components/paper/ChartSection';
import OrderForm from '../components/paper/OrderForm';
import Portfolio from '../components/paper/Portfolio';
import PortfolioSummary from '../components/paper/PortfolioSummary';
import TradeHistory from '../components/paper/TradeHistory';
import SearchBar from '../components/paper/SearchBar';

export default function PaperTradingTerminal() {
  const [activeTab, setActiveTab] = useState('trading');
  const [selectedSymbol, setSelectedSymbol] = useState('RELIANCE.NS');
  const [state, setState] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load state and subscribe to updates
  useEffect(() => {
    const loadState = () => setState(readState());
    loadState();

    const handleUpdate = () => {
      loadState();
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener('paper-trade-update', handleUpdate);
    return () => window.removeEventListener('paper-trade-update', handleUpdate);
  }, []);

  const handleResetSession = () => {
    if (window.confirm('Are you sure you want to reset the trading session? All trades and positions will be cleared.')) {
      resetSession();
      setState(readState());
      setRefreshKey(prev => prev + 1);
    }
  };

  const handleExportData = () => {
    const state = readState();
    const dataStr = JSON.stringify(state, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trading-session-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!state) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-slate-700 border-t-cyan-500 rounded-full mx-auto mb-4"></div>
          <p className="text-slate-400">Loading Paper Trading Terminal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 text-white p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              {/* Very Small Mobile: Ultra-short title */}
              <h1 className="block sm:hidden text-2xl font-bold bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent mb-2 whitespace-nowrap">
                Trading
              </h1>
              {/* Small Mobile/Tablet: Medium title */}
              <h1 className="hidden sm:block md:hidden text-3xl font-bold bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent mb-2 whitespace-nowrap">
                Paper Trading
              </h1>
              {/* Desktop: Full title */}
              <h1 className="hidden md:block text-3xl lg:text-4xl font-bold bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent mb-2 whitespace-nowrap">
                Paper Trading Terminal
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">Practice trading with live market data • Real-time price updates</p>
            </div>

            <div className="flex gap-2 flex-wrap w-full sm:w-auto">
              <button
                onClick={handleExportData}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-slate-800/60 border border-slate-700/30 rounded-lg hover:bg-slate-700/60 text-xs sm:text-sm font-medium transition-all whitespace-nowrap"
              >
                📥 Export
              </button>
              <button
                onClick={handleResetSession}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg hover:from-purple-700 hover:to-cyan-700 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap"
              >
                🔄 Reset
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6 bg-slate-900/40 border border-slate-800/30 rounded-xl p-1">
          <div className="flex gap-1 flex-wrap">
            {[
              { id: 'trading', label: '📊 Trading' },
              { id: 'portfolio', label: '💼 Portfolio' },
              { id: 'history', label: '📜 History' },
              { id: 'account', label: '👤 Account' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                    ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-lg'
                    : 'text-slate-300 hover:text-white'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeTab}-${refreshKey}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'trading' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-br from-slate-900/60 to-slate-800/40 border border-slate-700/30 rounded-xl p-4 shadow-xl"
                  >
                    <ChartSection symbol={selectedSymbol} />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="bg-gradient-to-br from-slate-900/60 to-slate-800/40 border border-slate-700/30 rounded-xl p-4 shadow-xl"
                  >
                    <label className="block text-sm font-semibold text-slate-300 mb-3">Select Stock to Trade</label>
                    <SearchBar
                      onSelect={(symbol) => {
                        setSelectedSymbol(symbol);
                        setRefreshKey(prev => prev + 1);
                      }}
                    />
                  </motion.div>
                </div>

                <div className="space-y-4">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-br from-slate-900/60 to-slate-800/40 border border-slate-700/30 rounded-xl p-4 shadow-xl"
                  >
                    <OrderForm symbol={selectedSymbol} key={refreshKey} />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gradient-to-br from-slate-900/60 to-slate-800/40 border border-slate-700/30 rounded-xl p-4 shadow-xl"
                  >
                    <PortfolioSummary key={refreshKey} />
                  </motion.div>
                </div>
              </div>
            )}

            {activeTab === 'portfolio' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-slate-900/60 to-slate-800/40 border border-slate-700/30 rounded-xl p-4 shadow-xl"
              >
                <Portfolio key={refreshKey} />
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-slate-900/60 to-slate-800/40 border border-slate-700/30 rounded-xl p-4 shadow-xl"
              >
                <TradeHistory key={refreshKey} />
              </motion.div>
            )}

            {activeTab === 'account' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/40 border border-slate-700/30 rounded-xl p-4 shadow-xl">
                  <PortfolioSummary key={refreshKey} />
                </div>
                <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/40 border border-slate-700/30 rounded-xl p-4 shadow-xl">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Session Info</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between border-b border-slate-700/30 pb-2">
                        <span className="text-slate-400">Session Started</span>
                        <span className="text-white font-semibold">{new Date().toLocaleDateString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-700/30 pb-2">
                        <span className="text-slate-400">Total Trades</span>
                        <span className="text-white font-semibold">{state.orders?.length || 0}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-700/30 pb-2">
                        <span className="text-slate-400">Open Positions</span>
                        <span className="text-white font-semibold">{Object.keys(state.positions || {}).length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Commission</span>
                        <span className="text-white font-semibold">₹{state.config?.commission || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-500">
          <p>Paper Trading Terminal • Simulated prices with {state.config?.tickIntervalSec}s updates • No real money involved</p>
        </div>
      </div>
    </div>
  );
}
