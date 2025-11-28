// src/pages/PaperTerminal.jsx
import React, { useEffect, useState } from 'react';
import { init, getState, placeMarketOrder, computeEquity, exportSession, importSession, resetSession } from '../utils/paperStore';
import WatchlistPanel from '../components/paper/WatchlistPanel';
import TradePanel from '../components/paper/TradePanel';
import PortfolioPanel from '../components/paper/PortfolioPanel';
import OrdersPanel from '../components/paper/OrdersPanel';
import AccountPanel from '../components/paper/AccountPanel';
import MiniChart from '../components/paper/MiniChart';
import { motion } from 'framer-motion';

export default function PaperTerminal() {
  useEffect(() => { init(); setState(getState()); /* eslint-disable-next-line */ }, []);
  const [state, setState] = useState(getState());
  const [selected, setSelected] = useState(state.watchlist?.[0] || 'RELIANCE.NS');
  const [quotes, setQuotes] = useState({});

  // poll quotes for watchlist every 5s
  useEffect(() => {
    let mounted = true;
    async function tick() {
      const syms = state.watchlist || [];
      if (!syms.length) return;
      try {
        const r = await fetch(`https://algotrading-2sbm.onrender.com/api/quotes?s=${syms.join(',')}`);
        const j = await r.json();
        if (!mounted) return;
        setQuotes(j.quotes || {});
      } catch (e) {
        console.error(e);
      }
    }
    tick();
    const t = setInterval(tick, (state.config?.tickIntervalSec || 5) * 1000);
    return () => { mounted = false; clearInterval(t); };
  }, [state.watchlist, state.config]);

  // refresh state helper
  function refresh() { setState(getState()); }

  async function onPlaceOrder(order) {
    const res = await placeMarketOrder(order);
    if (!res.success) alert('Order failed: ' + res.reason);
    else { refresh(); }
  }

  function doExport() {
    const txt = exportSession();
    const blob = new Blob([txt], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'advantix_paper_session.json'; a.click(); URL.revokeObjectURL(url);
  }

  async function handleImport(file) {
    const txt = await file.text();
    const r = importSession(txt);
    if (!r.success) alert('Import failed: ' + r.reason); else { refresh(); }
  }

  async function handleReset() {
    if (!confirm('Reset paper trading session?')) return;
    resetSession();
    setState(getState());
  }

  return (
    <div className="p-6 min-h-screen bg-[#0b0e1b] text-slate-200">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-4xl font-extrabold">Paper Trading Terminal</h1>
          <p className="text-slate-400 mt-1">Simulated environment — practice without risk</p>
        </div>
        <div className="flex gap-3">
          <button onClick={doExport} className="px-4 py-2 rounded-2xl border border-slate-700">Export</button>
          <label className="px-4 py-2 rounded-2xl bg-gradient-to-r from-pink-500 to-violet-500 cursor-pointer">
            Import
            <input type="file" accept="application/json" className="hidden" onChange={e => handleImport(e.target.files[0])} />
          </label>
          <button onClick={handleReset} className="px-4 py-2 rounded-2xl bg-gradient-to-r from-teal-400 to-cyan-400">Reset Session</button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-4 space-y-6">
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0f1724] p-4 rounded-2xl border border-slate-800">
            <TradePanel state={state} quotes={quotes} onPlace={onPlaceOrder} selected={selected} setSelected={setSelected} />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0f1724] p-4 rounded-2xl border border-slate-800">
            <WatchlistPanel watchlist={state.watchlist} quotes={quotes} onSelect={setSelected} refresh={() => setState(getState())} />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0f1724] p-4 rounded-2xl border border-slate-800">
            <AccountPanel state={state} refresh={() => setState(getState())} />
          </motion.div>
        </div>

        <div className="col-span-8 space-y-6">
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0f1724] p-4 rounded-2xl border border-slate-800">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-bold text-2xl">{selected}</h2>
                <p className="text-slate-400">Live price: ₹{(quotes[selected] && quotes[selected].price) ? quotes[selected].price.toFixed(2) : '—'}</p>
              </div>
              <div style={{ width: 420, height: 180 }}>
                <MiniChart symbol={selected} />
              </div>
            </div>
          </motion.div>

          <PortfolioPanel state={state} quotes={quotes} refresh={() => setState(getState())} />

          <OrdersPanel orders={state.orders} />
        </div>
      </div>
    </div>
  );
}
