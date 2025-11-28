import express from 'express';
import cors from 'cors';
import yahooFinance from 'yahoo-finance2';

const app = express();
app.use(cors());
app.use(express.json());

// Simple health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Quote for single symbol
app.get('/api/quote/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol;
    const quote = await yahooFinance.quote(symbol);
    res.json({
      ok: true,
      price: quote?.regularMarketPrice || null,
      change: quote?.regularMarketChangePercent || null,
      raw: quote
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Bulk quotes (comma separated symbols)
app.get('/api/quotes', async (req, res) => {
  try {
    const symbols = (req.query.s || '').split(',').filter(Boolean);
    const quotes = {};

    await Promise.all(symbols.map(async symbol => {
      try {
        const quote = await yahooFinance.quote(symbol);
        quotes[symbol] = {
          price: quote?.regularMarketPrice || null,
          change: quote?.regularMarketChangePercent || null
        };
      } catch (e) {
        quotes[symbol] = { price: null, error: e.message };
      }
    }));

    res.json({ ok: true, quotes });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Historical chart data
app.get('/api/chart/:symbol', async (req, res) => {
  try {
    const { range = '1d', interval = '5m' } = req.query;
    const symbol = req.params.symbol;
    const data = await yahooFinance.chart(symbol, { range, interval });
    res.json({ ok: true, result: data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
  console.log(`Advantix paper trading proxy running on port ${PORT}`);
  console.log(`Test the API: /api/quote/RELIANCE.NS (Port ${PORT})`);
});