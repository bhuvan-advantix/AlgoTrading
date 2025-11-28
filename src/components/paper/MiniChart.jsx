// src/components/paper/MiniChart.jsx
import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

import { MARKET_API_BASE } from '../../config';

export default function MiniChart({ symbol }) {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        // Update API URL to include port 8081
        const r = await fetch(`${MARKET_API_BASE}/chart/${encodeURIComponent(symbol)}?range=5d&interval=15m`);
        if (!r.ok) throw new Error('Failed to fetch chart data');

        const j = await r.json();
        if (!j.ok || !j.result?.[0]) throw new Error('Invalid chart data');

        const series = (j.result[0].timestamp || []).map((ts, idx) => {
          const candle = j.result[0].indicators?.quote?.[0];
          const close = candle?.close?.[idx];
          return { t: new Date(ts * 1000).toLocaleTimeString(), v: close || null };
        }).filter(d => d.v != null);

        if (mounted) {
          setData(series.slice(-120));
          setError(null);
        }
      } catch (e) {
        console.error('Chart error:', e);
        if (mounted) {
          setError(e.message);
          setData([]);
        }
      }
    }

    if (symbol) {
      load();
      const t = setInterval(load, 15 * 60 * 1000); // refresh 15m
      return () => {
        mounted = false;
        clearInterval(t);
      };
    }
  }, [symbol]);

  if (error) return (
    <div className="w-96 h-48 text-red-400 flex items-center justify-center">
      Error: {error}
    </div>
  );

  if (!data.length) return (
    <div className="w-96 h-48 text-slate-400 flex items-center justify-center">
      Loading chart...
    </div>
  );

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data}>
        <Line
          dataKey="v"
          stroke="#00f5d4"
          dot={false}
          strokeWidth={2}
          isAnimationActive={true}
        />
        <XAxis dataKey="t" hide />
        <Tooltip
          contentStyle={{
            background: '#1a1a2e',
            border: '1px solid #00f5d4',
            borderRadius: '4px'
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
