import React, { useState, useEffect, useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import MarketDataService from '../../services/marketDataService';

export default function ChartSection({ symbol, quote }) {
  const [chartData, setChartData] = useState([]);
  const [timeframe, setTimeframe] = useState('1D');
  const [chartType, setChartType] = useState('line');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!symbol) return;

      setLoading(true);
      setError(null);

      try {
        const data = await MarketDataService.getHistoricalData(symbol, timeframe);
        setChartData(data);
      } catch (err) {
        console.error('Chart data error:', err);
        setError('Failed to load chart data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [symbol, timeframe]);

  // Compute simple statistics
  const stats = useMemo(() => {
    if (!chartData || !chartData.length) return null;

    const closes = chartData
      .map(d => (d.close != null ? d.close : (d.price != null ? d.price : null)))
      .filter(v => v != null);

    if (!closes.length) return null;

    const volumes = chartData.map(d => d.volume || 0);
    const first = closes[0];
    const last = closes[closes.length - 1];
    const periodReturn = first ? ((last - first) / first) * 100 : 0;

    const returns = [];
    for (let i = 1; i < closes.length; i++) {
      const prev = closes[i - 1];
      const cur = closes[i];
      if (prev && prev !== 0) returns.push((cur - prev) / prev);
    }

    const avgReturn = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const variance = returns.length ? returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length : 0;
    const stddev = Math.sqrt(variance);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const totalVolume = volumes.reduce((a, b) => a + b, 0);

    return {
      first, last, periodReturn, avgReturn, stddev, min, max, totalVolume, count: closes.length,
    };
  }, [chartData]);

  const formatNum = (n) => (n == null ? '—' : (typeof n === 'number' ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : n));
  const formatPct = (n) => (n == null ? '—' : `${(n * 100).toFixed(2)}%`);

  const renderChart = () => {
    if (!chartData.length) return null;

    return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#243055" />

          {chartType === 'line' && (
            <Line type="monotone" dataKey="price" stroke="#00bcd4" dot={false} strokeWidth={2} />
          )}

          {chartType === 'candle' && (
            <Bar dataKey="close" fill="#8884d8" barSize={6} />
          )}

          {chartType === 'bar' && (
            <>
              <Bar dataKey="volume" fill="#3f51b5" opacity={0.5} yAxisId="volume" />
              <Line type="monotone" dataKey="price" stroke="#00bcd4" dot={false} yAxisId="price" />
            </>
          )}

          <XAxis
            dataKey="time"
            tickFormatter={(time) => {
              const date = new Date(time);
              return timeframe === '1D'
                ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : date.toLocaleDateString();
            }}
            stroke="#b0bec5"
          />

          <YAxis
            domain={['auto', 'auto']}
            tickFormatter={(value) => `$${value.toFixed(2)}`}
            stroke="#b0bec5"
            orientation="right"
          />

          {chartType === 'bar' && (
            <YAxis yAxisId="volume" orientation="left" tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} stroke="#b0bec5" />
          )}

          <Tooltip
            contentStyle={{ backgroundColor: '#1a237e', border: '1px solid #00bcd4', borderRadius: '4px', padding: '8px' }}
            formatter={(value, name) => {
              if (name === 'volume') return [`${(value / 1000000).toFixed(1)}M`, 'Volume'];
              return [`$${Number(value).toFixed(2)}`, name.charAt(0).toUpperCase() + name.slice(1)];
            }}
            labelFormatter={(time) => new Date(time).toLocaleString()}
          />

          {quote?.price && (
            <ReferenceLine y={quote.price} stroke="#00bcd4" strokeDasharray="3 3" />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="bg-[#0a1929] rounded-xl p-4 border border-[#1e88e5]">
      {/* Responsive Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <div>
          <h3 className="text-xl font-bold text-white">{symbol}</h3>
          <p className="text-sm text-cyan-400">
            {quote?.price ? `${quote.currency === 'INR' ? '₹' : '$'}${quote.price.toFixed(2)}` : '—'}
            {quote?.change != null && (
              <span className={quote.change >= 0 ? 'text-green-400' : 'text-red-400'}>
                {' '}({quote.change.toFixed(2)}%)
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Chart Type Segmented Control - Grid on mobile for touch targets */}
          <div className="grid grid-cols-3 sm:flex bg-[#071431] rounded-lg p-1 gap-1 w-full sm:w-auto">
            {['line', 'candle', 'bar'].map(type => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                className={`px-3 py-2 sm:py-1.5 rounded-md text-xs font-medium transition-all flex justify-center items-center ${chartType === type
                  ? 'bg-[#1e88e5] text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a237e]/50'
                  }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          {/* Timeframe Segmented Control - Grid on mobile */}
          <div className="grid grid-cols-3 sm:flex bg-[#071431] rounded-lg p-1 gap-1 w-full sm:w-auto">
            {['1D', '1W', '1M'].map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-2 sm:py-1.5 rounded-md text-xs font-medium transition-all flex justify-center items-center ${timeframe === tf
                  ? 'bg-[#1e88e5] text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a237e]/50'
                  }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-[400px]">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin h-8 w-8 border-4 border-[#1e88e5] rounded-full border-t-transparent"></div>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-full text-red-500">
            {error}
          </div>
        )}
        {!loading && !error && chartData.length > 0 && renderChart()}
      </div>

      {/* Historical data and statistics below the chart */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-[#07122b] border border-[#1e293b] rounded-lg p-3 text-sm">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-white font-semibold">Recent Historical Data</h4>
            <p className="text-xs text-gray-400">Showing last 10 rows</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left table-auto">
              <thead>
                <tr className="text-xs text-gray-400">
                  <th className="px-2 py-1">Time</th>
                  <th className="px-2 py-1">O</th>
                  <th className="px-2 py-1">H</th>
                  <th className="px-2 py-1">L</th>
                  <th className="px-2 py-1">C</th>
                  <th className="px-2 py-1">Vol</th>
                </tr>
              </thead>
              <tbody>
                {chartData.slice(-10).reverse().map((d, i) => (
                  <tr key={`hist-${i}`} className="even:bg-[#071431]">
                    <td className="px-2 py-1 text-xs text-gray-300">{d.time ? new Date(d.time).toLocaleString() : '—'}</td>
                    <td className="px-2 py-1 text-xs text-gray-300">{formatNum(d.open)}</td>
                    <td className="px-2 py-1 text-xs text-gray-300">{formatNum(d.high)}</td>
                    <td className="px-2 py-1 text-xs text-gray-300">{formatNum(d.low)}</td>
                    <td className={`px-2 py-1 text-xs ${d.close >= d.open ? 'text-green-400' : 'text-red-400'}`}>{formatNum(d.close ?? d.price)}</td>
                    <td className="px-2 py-1 text-xs text-gray-300">{d.volume ? d.volume.toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-[#07122b] border border-[#1e293b] rounded-lg p-4">
          <h4 className="text-white font-semibold mb-2">Statistics</h4>
          {!stats && <p className="text-sm text-gray-400">No stats available</p>}
          {stats && (
            <div className="text-sm text-gray-300 space-y-2">
              <div className="flex justify-between"><span className="text-gray-400">Period</span><span>{stats.count} points</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Start / End</span><span>${formatNum(stats.first)} → ${formatNum(stats.last)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Period return</span><span className={stats.periodReturn >= 0 ? 'text-green-400' : 'text-red-400'}>{stats.periodReturn.toFixed(2)}%</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Avg return</span><span>{formatPct(stats.avgReturn)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Volatility (σ)</span><span>{(stats.stddev * 100).toFixed(2)}%</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Low / High</span><span>${formatNum(stats.min)} / ${formatNum(stats.max)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Total volume</span><span>{stats.totalVolume ? stats.totalVolume.toLocaleString() : '—'}</span></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}