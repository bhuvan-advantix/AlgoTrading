// src/pages/PaperTrading.jsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import WalletCard from '../components/paper/WalletCard';
import TradePanel from '../components/paper/TradePanel';
import PositionsTable from '../components/paper/PositionsTable';
import TradeHistory from '../components/paper/TradeHistory';
import PerformanceSummary from '../components/paper/PerformanceSummary';
import { initStore, readState, subscribePrice, resetSession, exportState } from '../utils/paperTradingStore';

const tabs = [
  { id: 'trade', label: 'Trading Terminal' },
  { id: 'watchlist', label: 'Watchlist' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'orders', label: 'Orders' },
  { id: 'account', label: 'Account' }
];

export default function PaperTrading() {
  // ensure store init once
  useEffect(() => { initStore(); }, []);

  const [stateSnapshot, setStateSnapshot] = useState(readState());
  const [selectedSymbol, setSelectedSymbol] = useState(stateSnapshot.watchlist?.[0] || 'RELIANCE.NS');
  const [activeTab, setActiveTab] = useState('trade');

  useEffect(() => {
    // subscribe to all watchlist prices to cause re-render when they tick
    const subs = (stateSnapshot.watchlist || []).map(sym => {
      return subscribePrice(sym, () => setStateSnapshot(readState()));
    });
    // also subscribe to selected symbol to keep chart/price live
    const unsubSel = subscribePrice(selectedSymbol, () => setStateSnapshot(readState()));
    return () => {
      subs.forEach(u => u && u());
      unsubSel && unsubSel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateSnapshot.watchlist, selectedSymbol]);

  function refresh() {
    setStateSnapshot(readState());
  }

  async function handleReset() {
    resetSession();
    refresh();
  }

  function handleExport() {
    const txt = exportState();
    const blob = new Blob([txt], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'adv_paper_export.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-[#0b0e1b] text-white p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 sm:mb-6 gap-3 sm:gap-4">
          <div className="w-full md:w-auto">
            {/* Mobile: Shorter title */}
            <h1 className="block md:hidden text-lg font-bold bg-gradient-to-r from-teal-400 to-purple-500 bg-clip-text text-transparent leading-tight">
              Paper Trading
            </h1>
            {/* Desktop: Full title */}
            <h1 className="hidden md:block text-2xl lg:text-3xl font-bold bg-gradient-to-r from-teal-400 to-purple-500 bg-clip-text text-transparent leading-tight">
              Paper Trading Terminal
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">Practice trading with simulated data</p>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={handleExport}
              className="flex-1 md:flex-none px-3 sm:px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium whitespace-nowrap"
            >
              Export Data
            </button>
            <button
              onClick={handleReset}
              className="flex-1 md:flex-none px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-600 to-teal-500 rounded-lg hover:opacity-90 transition-opacity text-xs sm:text-sm font-medium whitespace-nowrap"
            >
              Reset Session
            </button>
          </div>
        </div>

        {/* Tabs - Scrollable on mobile */}
        <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 md:mx-0 md:px-0 md:pb-0 mb-4 scrollbar-hide">
          <div className="flex gap-1 bg-gray-800/50 p-1 rounded-lg min-w-max">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                    ? 'bg-gradient-to-r from-purple-600 to-teal-500 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'trade' && <TradePanel state={stateSnapshot} refresh={refresh} selectedSymbol={selectedSymbol} setSelectedSymbol={setSelectedSymbol} />}
          {activeTab === 'watchlist' && <div>Watchlist Content</div>}
          {activeTab === 'portfolio' && <div>Portfolio Content</div>}
          {activeTab === 'orders' && <div>Orders Content</div>}
          {activeTab === 'account' && <div>Account Content</div>}
        </motion.div>
      </div>
    </div>
  );
}
