import express from 'express';
import yahooFinance from 'yahoo-finance2';
import cors from 'cors';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 10000;

// CORS configuration for Netlify frontend
app.use(cors({
  origin: 'https://advantix-trading.netlify.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// Fix for ESM import compatibility: Instantiate the class
const YFClass = yahooFinance.default || yahooFinance;
const yf = new YFClass();
// Optional: suppress survey notice
// yf.suppressNotices(['yahooSurvey']);

// Basic health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'Market Data Service', baseUrl: 'https://algotrading-1-v2p7.onrender.com' });
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
      yf.chart(sym, { period1: startDate, interval: '1d' }) // 1 month history, daily candles
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

    res.json({
      ok: true,
      symbol: sym,
      currentPrice: quote.regularMarketPrice,
      dailyChangePct: quote.regularMarketChangePercent,
      currency: quote.currency,
      marketState: quote.marketState,
      historicalPrices: historicalPrices.map(h => h.close), // For simple sparkline if needed
      history: historicalPrices // Full OHLC for charts
    });
  } catch (err) {
    console.error(`Yahoo Finance error for ${symbol}:`, err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Search endpoint for stocks
app.get('/api/search', async (req, res) => {
  const { query } = req.query;
  if (!query) return res.json({ results: [] });

  try {
    console.log(`Searching for: ${query}`);
    const result = await yf.search(query);
    const quotes = result.quotes.filter(q => q.isYahooFinance).map(q => ({
      symbol: q.symbol,
      name: q.shortname || q.longname,
      type: q.quoteType,
      exchange: q.exchange,
      currency: 'USD' // Yahoo search doesn't always return currency
    }));
    res.json({ results: quotes });
  } catch (err) {
    console.error('Yahoo Search error:', err);
    res.json({ results: [] });
  }
});

// Search endpoint alias (for frontend compatibility)
app.get('/api/search-stocks', async (req, res) => {
  const { query } = req.query;
  if (!query) return res.json({ results: [] });

  try {
    console.log(`Searching (alias) for: ${query}`);
    const result = await yf.search(query);
    const quotes = result.quotes.filter(q => q.isYahooFinance).map(q => ({
      symbol: q.symbol,
      name: q.shortname || q.longname,
      type: q.quoteType,
      exchange: q.exchange,
      currency: 'USD'
    }));
    res.json({ results: quotes });
  } catch (err) {
    console.error('Yahoo Search (alias) error:', err);
    res.json({ results: [] });
  }
});

// --- AI Routes (N8N Proxies) ---

// Helper to safely parse N8N response
const safeParseN8N = (data) => {
  if (typeof data === 'object') return data;
  try {
    return JSON.parse(data);
  } catch (e) {
    return { text: String(data) }; // Fallback for plain text
  }
};

app.post('/api/ai/local', async (req, res) => {
  try {
    console.log('Calling Local AI...');
    const response = await axios.post('https://bhuvan21.app.n8n.cloud/webhook/stock-advice', req.body);
    res.json(safeParseN8N(response.data));
  } catch (error) {
    console.error("AI Local Error:", error.message);
    res.json({ error: "Failed to fetch AI response", details: error.message });
  }
});

app.post('/api/ai/global', async (req, res) => {
  try {
    console.log('Calling Global AI...');
    const response = await axios.post('https://bhuvan21.app.n8n.cloud/webhook/globalstock-advice', req.body);
    res.json(safeParseN8N(response.data));
  } catch (error) {
    console.error("AI Global Error:", error.message);
    res.json({ error: "Failed to fetch Global AI response", details: error.message });
  }
});

app.get('/api/ai/summary', async (req, res) => {
  try {
    console.log('Calling AI Summary...');
    const response = await axios.get('https://bhuvan21.app.n8n.cloud/webhook/b765c25e-1f8c-4aac-b65a-53523229ce8e');
    res.json(safeParseN8N(response.data));
  } catch (error) {
    console.error("AI Summary Error:", error.message);
    res.json({ error: "Failed to fetch AI summary", details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Market Data Server running on port ${PORT}`);
});