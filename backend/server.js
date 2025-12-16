import express from 'express';
import YahooFinance from 'yahoo-finance2';
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

// Initialize YahooFinance v3 (as per migration guide)
const yahooFinance = new YahooFinance();

// Cache for quote data to reduce API calls
const quoteCache = new Map();
const CACHE_DURATION = 10000; // 10 seconds cache

// Rate limiting - max 1 request per 500ms per symbol
const requestQueue = new Map();
const REQUEST_DELAY = 500; // 500ms between requests for same symbol

// Helper function to get cached data or fetch new
async function getCachedQuote(symbol) {
  const now = Date.now();
  const cached = quoteCache.get(symbol);

  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    console.log(`✅ Cache hit for ${symbol}`);
    return cached.data;
  }

  // Check rate limit
  const lastRequest = requestQueue.get(symbol);
  if (lastRequest && (now - lastRequest) < REQUEST_DELAY) {
    const waitTime = REQUEST_DELAY - (now - lastRequest);
    console.log(`⏳ Rate limiting ${symbol}, waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  requestQueue.set(symbol, Date.now());
  return null; // Need to fetch
}

// Basic health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'Market Data Service', cache: quoteCache.size });
});

// Real live data endpoint using Yahoo Finance
// Returns current quote + historical data for charts
app.get('/api/quote/:symbol', async (req, res) => {
  const { symbol } = req.params;
  try {
    const sym = symbol.toUpperCase();

    // Check cache first
    const cached = await getCachedQuote(sym);
    if (cached) {
      return res.json(cached);
    }

    console.log(`🔄 Fetching fresh data for: ${sym}`);

    // Calculate start date for 1 month history
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);

    // Fetch quote and historical data in parallel
    const [quote, history] = await Promise.all([
      yahooFinance.quote(sym),
      yahooFinance.chart(sym, { period1: startDate, interval: '1d' })
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

    const responseData = {
      ok: true,
      symbol: sym,
      currentPrice: quote.regularMarketPrice,
      dailyChangePct: quote.regularMarketChangePercent,
      currency: currency,
      marketState: quote.marketState,
      historicalPrices: historicalPrices.map(h => h.close),
      history: historicalPrices
    };

    // Cache the response
    quoteCache.set(sym, {
      data: responseData,
      timestamp: Date.now()
    });

    console.log(`✅ Cached ${sym}, total cache size: ${quoteCache.size}`);

    res.json(responseData);
  } catch (err) {
    console.error(`Yahoo Finance error for ${symbol}:`, err.message);

    // If rate limited, return cached data if available (even if expired)
    if (err.message.includes('429') || err.message.includes('Too Many Requests')) {
      const staleCache = quoteCache.get(symbol.toUpperCase());
      if (staleCache) {
        console.log(`⚠️ Rate limited, returning stale cache for ${symbol}`);
        return res.json(staleCache.data);
      }
    }

    res.status(500).json({ ok: false, error: err.message });
  }
});

// OHLCV endpoint for enhanced market data service
app.get('/api/market/ohlcv/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const { period = '1mo' } = req.query;

  try {
    const sym = symbol.toUpperCase();
    console.log(`Fetching OHLCV for: ${sym}, period: ${period}`);

    // Calculate start date based on period
    const startDate = new Date();
    if (period === '1mo') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (period === '3mo') {
      startDate.setMonth(startDate.getMonth() - 3);
    } else if (period === '1y') {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    const history = await yahooFinance.chart(sym, {
      period1: startDate,
      interval: '1d'
    });

    if (!history || !history.quotes || history.quotes.length === 0) {
      return res.status(404).json({ ok: false, error: 'No data found' });
    }

    const prices = history.quotes.map(q => ({
      date: q.date,
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close,
      volume: q.volume
    }));

    res.json({
      ok: true,
      symbol: sym,
      prices: prices
    });
  } catch (err) {
    console.error(`OHLCV error for ${symbol}:`, err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Market quote endpoint (simplified)
app.get('/api/market/quote/:symbol', async (req, res) => {
  const { symbol } = req.params;

  try {
    const sym = symbol.toUpperCase();
    const quote = await yahooFinance.quote(sym);

    if (!quote) {
      return res.status(404).json({ ok: false, error: 'Symbol not found' });
    }

    res.json({
      ok: true,
      symbol: sym,
      price: quote.regularMarketPrice,
      changePercent: quote.regularMarketChangePercent,
      previousClose: quote.regularMarketPreviousClose,
      currency: quote.currency
    });
  } catch (err) {
    console.error(`Quote error for ${symbol}:`, err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Search endpoint - Returns ALL stocks and ETFs from Yahoo Finance with live data
app.get('/api/search', async (req, res) => {
  const { query } = req.query;
  if (!query) return res.json({ results: [] });

  try {
    console.log(`Searching for: ${query}`);

    const result = await yahooFinance.search(query);

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
