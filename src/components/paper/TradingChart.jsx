import React, { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';

// Lightweight Trading Chart wrapper
export default function TradingChart({ data = [], type = 'line', quote }) {
  const ref = useRef();
  const chartRef = useRef();

  useEffect(() => {
    if (!ref.current) return;

    // clear previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(ref.current, {
      width: ref.current.clientWidth,
      height: 420,
      layout: {
        background: { type: 'solid', color: '#07122b' },
        textColor: '#cfe8ff',
        fontSize: 12
      },
      grid: {
        vertLines: { color: 'rgba(120,130,140,0.06)' },
        horzLines: { color: 'rgba(120,130,140,0.06)' }
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.25 }
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: true
      }
    });

    chartRef.current = chart;

    // Prepare series
    let candlestickSeries, lineSeries, volumeSeries;

    // Prepare mapped data: lightweight-charts expects time in {time: <string 'YYYY-MM-DD' or number (unix)>}
    const ohlc = data.map(d => ({
      time: Math.floor(new Date(d.time).getTime() / 1000),
      open: d.open ?? d.price,
      high: d.high ?? d.price,
      low: d.low ?? d.price,
      close: d.close ?? d.price
    }));

    const vols = data.map(d => ({ time: Math.floor(new Date(d.time).getTime() / 1000), value: d.volume || 0 }));

    if (type === 'candle') {
      candlestickSeries = chart.addCandlestickSeries({
        upColor: '#00c853',
        downColor: '#ff3d00',
        wickUpColor: '#00e5ff',
        wickDownColor: '#ff7043',
        borderVisible: true,
        wickVisible: true
      });
      candlestickSeries.setData(ohlc);
    }

    if (type === 'line') {
      lineSeries = chart.addLineSeries({ color: '#00e5ff', lineWidth: 2 });
      const lineData = ohlc.map(p => ({ time: p.time, value: p.close }));
      lineSeries.setData(lineData);
    }

    // volume pane
    volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      scaleMargins: { top: 0.85, bottom: 0 },
      color: '#7c4dff',
      priceScaleId: ''
    });
    volumeSeries.setData(vols);

    // show current price as price line
    if (quote && quote.price) {
      chart.addLineSeries({ color: '#00e5ff', lineWidth: 1 }).setData([{ time: Math.floor(Date.now() / 1000), value: quote.price }]);
    }

    const handleResize = () => {
      if (ref.current && chartRef.current) {
        chartRef.current.applyOptions({ width: ref.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [data, type, quote]);

  return (
    <div ref={ref} style={{ width: '100%', height: 420 }} />
  );
}
