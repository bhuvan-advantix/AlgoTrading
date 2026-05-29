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

function getBasePrice(symbol) {
  const s = symbol.toUpperCase();
  if (s.includes('TCS')) return 2435.00;
  if (s === '^NSEI') return 22400.00;
  if (s === '^BSESN') return 74000.00;
  if (s === '^GSPC') return 5100.00;
  if (s === '^DJI') return 39000.00;
  if (s === '^IXIC') return 16000.00;
  if (s === '^N225') return 38000.00;
  if (s === '^FTSE') return 7900.00;
  if (s === 'EURUSD=X') return 1.08;
  if (s === 'AAPL') return 175.00;
  return 150.00;
}

function isMarketOpenFor(symbol, now = new Date()) {
  const sym = symbol.toUpperCase();
  let timeZone = 'UTC';
  if (sym.endsWith('.NS') || sym.endsWith('.BO') || sym === '^NSEI' || sym === '^BSESN') timeZone = 'Asia/Kolkata';
  else if (sym === '^GSPC' || sym === '^DJI' || sym === '^IXIC' || sym === 'AAPL') timeZone = 'America/New_York';
  else if (sym === '^N225') timeZone = 'Asia/Tokyo';
  else if (sym === '^FTSE') timeZone = 'Europe/London';

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false, hour: '2-digit', minute: '2-digit', weekday: 'short'
  }).formatToParts(now);

  const hour = Number(parts.find(p => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find(p => p.type === 'minute')?.value ?? 0);
  const weekday = parts.find(p => p.type === 'weekday')?.value ?? 'Sun';
  
  if (weekday === 'Sat' || weekday === 'Sun') return false;
  const minutes = hour * 60 + minute;
  
  if (timeZone === 'Asia/Kolkata') return minutes >= (9 * 60 + 15) && minutes <= (15 * 60 + 30);
  if (timeZone === 'America/New_York') return minutes >= (9 * 60 + 30) && minutes < (16 * 60);
  if (timeZone === 'Asia/Tokyo') return (minutes >= 9 * 60 && minutes < 11 * 60 + 30) || (minutes >= 12 * 60 + 30 && minutes < 15 * 60);
  if (timeZone === 'Europe/London') return minutes >= 8 * 60 && minutes < (16 * 60 + 30);
  return true; // Forex always open on weekdays
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

    // If rate limited or crumb failed, return cached data if available
    if (err.message.includes('429') || err.message.includes('Too Many Requests') || err.message.includes('crumb')) {
      const staleCache = quoteCache.get(symbol.toUpperCase());
      if (staleCache) {
        console.log(`⚠️ Rate limited, returning stale cache for ${symbol}`);
        return res.json(staleCache.data);
      }
      
      console.log(`⚠️ Rate limited and no cache, returning fallback mock for ${symbol}`);
      
      const history = [];
      let lastPrice = getBasePrice(symbol);
      const now = new Date();
      const isOpen = isMarketOpenFor(symbol, now);
      const charSum = symbol.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
      
      for (let i = 30; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const rand = Math.sin(charSum + i) / 2; // deterministic -0.5 to 0.5
        lastPrice = lastPrice + rand * (lastPrice * 0.02); 
        history.push({
          date: d.toISOString(),
          open: lastPrice - Math.abs(rand) * (lastPrice * 0.01),
          high: lastPrice + Math.abs(rand) * (lastPrice * 0.015),
          low: lastPrice - Math.abs(rand) * (lastPrice * 0.015),
          close: lastPrice,
          volume: Math.floor(Math.abs(rand * 2000000)) + 100000
        });
      }

      // If market is open, add one more slight fluctuation for live effect
      if (isOpen) {
        const liveRand = (Math.random() - 0.5) * 2;
        lastPrice = lastPrice + liveRand * (lastPrice * 0.002);
        history[history.length - 1].close = lastPrice;
      }

      return res.json({
        ok: true,
        symbol: symbol.toUpperCase(),
        currentPrice: lastPrice,
        dailyChangePct: isOpen ? (Math.random() - 0.5) * 2 : 0.0,
        currency: symbol.toUpperCase().endsWith('.NS') || symbol.toUpperCase().endsWith('.BO') ? 'INR' : 'USD',
        marketState: isOpen ? 'REGULAR' : 'CLOSED',
        historicalPrices: history.map(h => h.close),
        history: history,
        isMock: true
      });
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
    if (err.message.includes('429') || err.message.includes('Too Many Requests') || err.message.includes('crumb')) {
      const prices = [];
      let lastPrice = getBasePrice(symbol);
      const now = new Date();
      const charSum = symbol.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
      const numDays = period === '1mo' ? 30 : period === '3mo' ? 90 : 365;
      
      for (let i = numDays; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const rand = Math.sin(charSum + i) / 2;
        lastPrice = lastPrice + rand * (lastPrice * 0.02);
        prices.push({
          date: d.toISOString(),
          open: lastPrice - Math.abs(rand) * (lastPrice * 0.005),
          high: lastPrice + Math.abs(rand) * (lastPrice * 0.01),
          low: lastPrice - Math.abs(rand) * (lastPrice * 0.01),
          close: lastPrice,
          volume: Math.floor(Math.abs(rand * 200000)) + 10000
        });
      }
      return res.json({
        ok: true,
        symbol: symbol.toUpperCase(),
        prices: prices,
        isMock: true
      });
    }
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
    if (err.message.includes('429') || err.message.includes('Too Many Requests') || err.message.includes('crumb')) {
      let base = getBasePrice(symbol);
      const isOpen = isMarketOpenFor(symbol, new Date());
      const charSum = symbol.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
      
      for (let i = 30; i >= 0; i--) {
        const rand = Math.sin(charSum + i) / 2;
        base = base + rand * (base * 0.02);
      }

      return res.json({
        ok: true,
        symbol: symbol.toUpperCase(),
        price: isOpen ? base + ((Math.random() - 0.5) * base * 0.005) : base,
        changePercent: isOpen ? (Math.random() - 0.5) * 2 : 0,
        previousClose: base,
        currency: symbol.toUpperCase().endsWith('.NS') || symbol.toUpperCase().endsWith('.BO') ? 'INR' : 'USD',
        isMock: true
      });
    }
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
    // Dynamic mock fallback for search when rate limited
    const upperQuery = query.toUpperCase();
    res.json({
      results: [
        {
          symbol: `${upperQuery}.NS`,
          name: `${query} Limited (India)`,
          type: 'EQUITY',
          exchange: 'NSE',
          currency: 'INR'
        },
        {
          symbol: `${upperQuery}`,
          name: `${query} Corp (US)`,
          type: 'EQUITY',
          exchange: 'NASDAQ',
          currency: 'USD'
        }
      ],
      isMock: true
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Market Data Server running on port ${PORT}`);
});
