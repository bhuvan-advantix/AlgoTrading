import React, { useEffect, useRef, memo } from 'react';

function TradingViewWidget({ symbol = 'NASDAQ:AAPL', interval = 'D', autosize = true, theme = 'dark' }) {
  const container = useRef(null);

  useEffect(() => {
    const el = container.current;
    if (!el) return;

    // Clear existing contents to allow symbol updates
    el.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;

    // Build widget config
    const config = {
      allow_symbol_change: true,
      calendar: false,
      details: false,
      hide_side_toolbar: true,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_volume: false,
      hotlist: false,
      interval,
      locale: 'en',
      save_image: true,
      style: '1',
      symbol,
      theme,
      timezone: 'exchange',
      backgroundColor: '#0F0F0F',
      gridColor: 'rgba(242, 242, 242, 0.06)',
      watchlist: [],
      withdateranges: false,
      compareSymbols: [],
      studies: [],
      autosize,
    };

    script.innerHTML = JSON.stringify(config);
    el.appendChild(script);

    return () => {
      // Cleanup specific to this effect
      if (el) el.innerHTML = '';
    };
  }, [symbol, interval, autosize, theme]);

  return (
    <div className="tradingview-widget-container h-full w-full" ref={container}>
      <div className="tradingview-widget-container__widget" style={{ height: '100%', width: '100%' }} />
      <div className="tradingview-widget-copyright text-xs text-gray-400">
        <a href={`https://www.tradingview.com/symbols/${symbol.replace(':', '-').replace('/', '-')}/`} rel="noopener noreferrer" target="_blank" className="text-teal-400">{symbol} chart</a>
        <span className="ml-1"> by TradingView</span>
      </div>
    </div>
  );
}

export default memo(TradingViewWidget);
