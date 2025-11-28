// src/components/paper/TradePanel.jsx
import React, { useState, useEffect } from 'react';

export default function TradePanel({ state = {}, quotes = {}, onPlace, selected, setSelected }) {
  // Initialize with safe defaults
  const [symbol, setSymbol] = useState(selected || 'RELIANCE.NS');
  const [amount, setAmount] = useState(1000);
  const [qty, setQty] = useState(0);
  const [side, setSide] = useState('BUY');
  const [orderType, setOrderType] = useState('MARKET');
  const [livePrice, setLivePrice] = useState(0);

  // Safe update when selected changes
  useEffect(() => {
    if (selected) {
      setSymbol(selected);
    }
  }, [selected]);

  // Update price calculation to use Finnhub quote
  const ltp = quotes[symbol]?.price || 0;

  // Add WebSocket price updates
  useEffect(() => {
    if (!symbol) return;
    
    const ws = FinnhubService.connectWebSocket((data) => {
      if (data.type === 'trade' && data.symbol === symbol) {
        setLivePrice(data.data[0].p);
      }
    });

    ws.subscribe(symbol);
    return () => {
      ws.unsubscribe(symbol);
      ws.close();
    };
  }, [symbol]);

  // Amount to quantity conversion
  useEffect(() => {
    if (amount && ltp) {
      setQty(Number((amount / ltp).toFixed(2)));
    }
  }, [amount, symbol, quotes, ltp]);

  // Quantity to amount conversion
  useEffect(() => {
    if (qty && ltp) {
      setAmount(Number((qty * ltp).toFixed(2)));
    }
  }, [qty, ltp]);

  const handlePlace = () => {
    if (!onPlace) return;
    
    onPlace({
      symbol,
      side,
      type: orderType,
      qty: Number(qty),
      price: ltp,
      amount: Number(amount)
    });

    // Reset form
    setQty(0);
    setAmount(1000);
  };

  return (
    <div className="bg-[#111526] rounded-xl p-4 border border-cyan-800">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-cyan-300">Trade</h3>
        <div className="text-sm text-gray-400">
          LTP: <span className="text-cyan-400 font-mono">{ltp ? `₹${ltp.toFixed(2)}` : '—'}</span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Symbol Input */}
        <div>
          <label className="text-sm text-gray-400 mb-1 block">Symbol</label>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="w-full bg-[#0b0e1b] border border-cyan-900 rounded p-2 text-white"
            placeholder="RELIANCE.NS"
          />
        </div>

        {/* Amount/Quantity Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Amount (₹)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full bg-[#0b0e1b] border border-cyan-900 rounded p-2 text-white"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Quantity</label>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              className="w-full bg-[#0b0e1b] border border-cyan-900 rounded p-2 text-white"
            />
          </div>
        </div>

        {/* Order Type */}
        <div>
          <label className="text-sm text-gray-400 mb-1 block">Order Type</label>
          <select
            value={orderType}
            onChange={(e) => setOrderType(e.target.value)}
            className="w-full bg-[#0b0e1b] border border-cyan-900 rounded p-2 text-white"
          >
            <option value="MARKET">Market</option>
            <option value="LIMIT">Limit</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => { setSide('BUY'); handlePlace(); }}
            className="flex-1 bg-gradient-to-r from-green-500 to-cyan-500 text-white rounded-lg py-2 font-medium hover:opacity-90"
          >
            BUY
          </button>
          <button
            onClick={() => { setSide('SELL'); handlePlace(); }}
            className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg py-2 font-medium hover:opacity-90"
          >
            SELL
          </button>
        </div>
      </div>
    </div>
  );
}
