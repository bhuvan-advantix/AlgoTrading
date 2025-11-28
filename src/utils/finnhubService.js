const FINNHUB_KEY = 'd3o7cd1r01qmj8304e7gd3o7cd1r01qmj8304e80';
const BASE_URL = 'https://finnhub.io/api/v1';

export default class MarketDataService {
  static websocket = null;
  static connectionPromise = null;
  static pendingSubscriptions = new Set();

  static async getQuote(symbol) {
    try {
      const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/quote?symbols=${symbol}`);
      const data = await response.json();
      const quote = data?.quoteResponse?.result?.[0];
      
      if (!quote) return null;

      return {
        price: quote.regularMarketPrice,
        change: quote.regularMarketChangePercent,
        high: quote.regularMarketDayHigh,
        low: quote.regularMarketDayLow,
        open: quote.regularMarketOpen,
        prevClose: quote.regularMarketPreviousClose,
        timestamp: quote.regularMarketTime,
        volume: quote.regularMarketVolume
      };
    } catch (error) {
      console.error('Quote fetch error:', error);
      return null;
    }
  }

  static async getBatchQuotes(symbols) {
    try {
      const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/quote?symbols=${symbols.join(',')}`);
      const data = await response.json();
      const quotes = data?.quoteResponse?.result || [];
      
      return quotes.reduce((acc, quote) => {
        acc[quote.symbol] = {
          price: quote.regularMarketPrice,
          change: quote.regularMarketChangePercent,
          timestamp: quote.regularMarketTime
        };
        return acc;
      }, {});
    } catch (error) {
      console.error('Batch quotes error:', error);
      return {};
    }
  }

  static startLiveUpdates(symbols, onUpdate) {
    const updateInterval = setInterval(async () => {
      const quotes = await this.getBatchQuotes(symbols);
      onUpdate(quotes);
    }, 2000); // Update every 2 seconds

    return () => clearInterval(updateInterval);
  }

  static async getHistoricalData(symbol, range = '1d', interval = '5m') {
    try {
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`
      );
      const data = await response.json();
      const result = data?.chart?.result?.[0];

      if (!result) return { timestamps: [], prices: [] };

      return {
        timestamps: result.timestamp,
        prices: result.indicators.quote[0].close,
        volume: result.indicators.quote[0].volume,
        high: result.indicators.quote[0].high,
        low: result.indicators.quote[0].low,
        open: result.indicators.quote[0].open
      };
    } catch (error) {
      console.error('Historical data error:', error);
      return { timestamps: [], prices: [] };
    }
  }

  static connectWebSocket(onMessage) {
    if (this.websocket) {
      return this.websocket;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      const ws = new WebSocket(`wss://ws.finnhub.io?token=${FINNHUB_KEY}`);

      ws.onopen = () => {
        console.log('WebSocket connected');
        // Subscribe to pending symbols
        this.pendingSubscriptions.forEach(symbol => {
          ws.send(JSON.stringify({ type: 'subscribe', symbol }));
        });
        this.pendingSubscriptions.clear();
        resolve(ws);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (e) {
          console.error('WebSocket message error:', e);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };

      ws.onclose = () => {
        console.log('WebSocket closed, reconnecting...');
        this.websocket = null;
        setTimeout(() => this.connectWebSocket(onMessage), 5000);
      };

      this.websocket = {
        subscribe: async (symbol) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'subscribe', symbol }));
          } else {
            this.pendingSubscriptions.add(symbol);
          }
        },
        unsubscribe: (symbol) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'unsubscribe', symbol }));
          }
          this.pendingSubscriptions.delete(symbol);
        },
        close: () => {
          this.pendingSubscriptions.clear();
          ws.close();
        }
      };
    });

    return this.websocket;
  }
}