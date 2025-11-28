class MarketDataService {
  static API_BASE = import.meta.env.VITE_MARKET_API_URL || 'http://localhost:8081/api';

  /* -----------------------------------------
     1) GET HISTORICAL DATA (from backend only)
  ----------------------------------------- */
  static async getHistoricalData(symbol, interval = '1D') {
    try {
      // Use the new quote endpoint which returns history
      const response = await fetch(`${this.API_BASE}/quote/${symbol}`);
      const data = await response.json();

      if (!data.ok) throw new Error(data.error || 'Failed to fetch historical data');

      // Use full OHLC history if available (from Yahoo)
      if (data.history && Array.isArray(data.history)) {
        return data.history.map(item => ({
          time: new Date(item.date).getTime(),
          price: item.close,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume
        }));
      }

      // Fallback to simple close price array (mock or legacy)
      const baseTime = Date.now() - (30 * 60000);
      return (data.historicalPrices || []).map((price, i) => ({
        time: baseTime + (i * 60000),
        price: price,
        open: price,
        high: price * 1.001,
        low: price * 0.999,
        close: price,
        volume: Math.floor(Math.random() * 5000)
      }));
    } catch (error) {
      console.error('Historical data error:', error);
      return [];
    }
  }

  /* -----------------------------------------
     2) GET STATS
  ----------------------------------------- */
  static async getChartStats(symbol, interval = '1D') {
    return null; // Not implemented in mock
  }

  /* -----------------------------------------
     3) REAL LIVE QUOTE
  ----------------------------------------- */
  static async getQuote(symbol) {
    try {
      const response = await fetch(`${this.API_BASE}/quote/${symbol}`);
      const data = await response.json();
      if (data.ok) {
        return {
          price: data.currentPrice,
          changePercent: parseFloat(data.dailyChangePct),
          symbol: data.symbol
        };
      }
      return null;
    } catch (error) {
      console.error('Quote error:', error);
      return null;
    }
  }

  /* -----------------------------------------
     4) REAL LIVE UPDATES (NO SIMULATOR)
     Updates every 5 sec — change if needed
  ----------------------------------------- */
  static startLiveUpdates(symbol, onUpdate) {
    console.log(`🔵 Starting REAL live updates: ${symbol}`);

    // Initial data load
    this.getQuote(symbol).then(quote => {
      if (quote) onUpdate(quote);
    });

    // Poll every 5 sec (safe for UI)
    const intervalId = setInterval(async () => {
      const quote = await this.getQuote(symbol);
      if (quote) onUpdate(quote);
    }, 5000);

    // Cleanup function
    return () => {
      console.log(`🔴 Stopping live updates: ${symbol}`);
      clearInterval(intervalId);
    };
  }

  /* -----------------------------------------
     Formatting
  ----------------------------------------- */
  static formatPrice(value) {
    if (!value && value !== 0) return '--';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  }

  static formatChange(value) {
    if (!value && value !== 0) return '--';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }

  static formatVolume(value) {
    if (!value && value !== 0) return '--';
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  }
}

export default MarketDataService;
