import express from 'express';
import yahooFinance from 'yahoo-finance2';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8081;

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://advantix-trading.netlify.app',
  'https://advantix-algotrading.netlify.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for market data service
    }
  },
  credentials: true
}));
app.use(express.json());

// Fix for ESM import compatibility: Instantiate the class
const YFClass = yahooFinance.default || yahooFinance;
const yf = new YFClass();

// Basic health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'Market Data Service' });
});

// Real live data endpoint using Yahoo Finance
// Returns current quote + historical data for charts
app.get('/api/quote/:symbol', async (req, res) => {
  const { symbol } = req.params;
  try {
    const sym = symbol.toUpperCase();
    console.log(`Fetching quote/history for: ${sym}`);

    // Calculate start date for 1 month history
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);

    // Fetch quote and historical data in parallel
    const [quote, history] = await Promise.all([
      yf.quote(sym),
      yf.chart(sym, { period1: startDate, interval: '1d' })
    ]);

    if (!quote) {
      return res.status(404).json({ ok: false, error: 'Symbol not found' });
    }

    // Map Yahoo history to our format
    const historicalPrices = (history?.quotes || []).map(q => ({
      date: q.date,
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close,
      volume: q.volume,
      adjclose: q.adjclose
    }));

    // If history is empty, provide at least the current quote as a point
    if (historicalPrices.length === 0 && quote.regularMarketPrice) {
      historicalPrices.push({
        date: new Date(),
        close: quote.regularMarketPrice,
        open: quote.regularMarketOpen,
        high: quote.regularMarketDayHigh,
        low: quote.regularMarketDayLow,
        volume: quote.regularMarketVolume
      });
    }

    // Detect currency - Yahoo sometimes returns wrong currency for Indian stocks
    const isIndian = sym.endsWith('.NS') || sym.endsWith('.BO');
    const currency = isIndian ? 'INR' : (quote.currency || 'USD');
    console.log(`Quote for ${sym}: currency=${currency}`);

    res.json({
      ok: true,
      symbol: sym,
      currentPrice: quote.regularMarketPrice,
      dailyChangePct: quote.regularMarketChangePercent,
      currency: currency,
      marketState: quote.marketState,
      historicalPrices: historicalPrices.map(h => h.close),
      history: historicalPrices
    });
  } catch (err) {
    console.error(`Yahoo Finance error for ${symbol}:`, err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Search endpoint - Returns ALL stocks and ETFs from Yahoo Finance with live data
app.get('/api/search', async (req, res) => {
  const { query } = req.query;
  if (!query) return res.json({ results: [] });

  try {
    console.log(`Searching for: ${query}`);

    const result = await yf.search(query);

    // Include EQUITY and ETF types - Yahoo Finance returns ALL matching results worldwide
    const quotes = result.quotes
      .filter(q => q.isYahooFinance && (q.quoteType === 'EQUITY' || q.quoteType === 'ETF'))
      .map(q => {
        // Detect currency based on symbol suffix
        const symbol = q.symbol || '';
        const isIndian = symbol.endsWith('.NS') || symbol.endsWith('.BO');
        const currency = isIndian ? 'INR' : (q.currency || 'USD');

        return {
          symbol: q.symbol,
          name: q.shortname || q.longname,
          type: q.quoteType, // Shows 'ETF' or 'EQUITY'
          exchange: q.exchange,
          currency: currency
        };
      });

    console.log(`Found ${quotes.length} results (${quotes.filter(q => q.type === 'ETF').length} ETFs)`);
    res.json({ results: quotes });
  } catch (err) {
    console.error('Yahoo Search error:', err);
    res.json({ results: [] });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Market Data Server running on port ${PORT}`);
});