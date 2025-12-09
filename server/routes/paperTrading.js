import express from 'express';
import yahooFinance from 'yahoo-finance2';

const router = express.Router();

// POST /api/paper-trading/portfolio
// Calculates P&L for a list of positions using live market data
router.post('/portfolio', async (req, res) => {
    try {
        const { positions } = req.body; // Expecting array of { symbol, quantity, avgPrice }

        if (!positions || !Array.isArray(positions)) {
            return res.status(400).json({ error: 'Invalid positions data. Expected array.' });
        }

        if (positions.length === 0) {
            return res.json([]);
        }

        // Extract symbols for batch fetching
        // Yahoo Finance expects symbols like 'AAPL', 'RELIANCE.NS'
        const symbols = positions.map(p => p.symbol).filter(Boolean);

        // Fetch quotes in batch
        let quotes = [];
        try {
            // Suppress notices
            yahooFinance.suppressNotices(['yahooSurvey']);

            // Fetch quotes
            // If only 1 symbol, it might return object instead of array, so we normalize
            const result = await yahooFinance.quote(symbols);
            quotes = Array.isArray(result) ? result : [result];
        } catch (e) {
            console.error('Yahoo Finance batch fetch error:', e);
            // If batch fails, we might return partial data or empty prices
            // We continue to return the structure but with null prices
        }

        // Create lookup map
        const quoteMap = {};
        quotes.forEach(q => {
            if (q && q.symbol) {
                quoteMap[q.symbol] = q;
            }
        });

        const results = positions.map(pos => {
            const sym = pos.symbol;
            const quote = quoteMap[sym];

            const quantity = Number(pos.quantity) || 0;
            const avgPrice = Number(pos.avgPrice) || 0;

            let currentPrice = null;
            let prevClose = null;

            if (quote) {
                // Try multiple fields for current price
                currentPrice = quote.regularMarketPrice || quote.price || quote.currentPrice;

                // Try multiple fields for previous close
                prevClose = quote.regularMarketPreviousClose || quote.previousClose || quote.chartPreviousClose;

                // If prevClose is still null, estimate it from current price and change
                if (prevClose === null && currentPrice !== null && quote.regularMarketChangePercent !== undefined) {
                    const changePercent = quote.regularMarketChangePercent / 100;
                    prevClose = currentPrice / (1 + changePercent);
                }
            }

            // Calculations
            let marketValue = 0;
            let unrealizedPnl = 0;
            let dailyPnl = 0; // Default to 0 instead of null

            if (currentPrice !== null && currentPrice > 0) {
                marketValue = currentPrice * quantity;

                // Unrealized P&L = (Current Price - Average Buy Price) × Quantity
                unrealizedPnl = (currentPrice - avgPrice) * quantity;

                // Daily P&L = (Current Price - Previous Close) × Quantity
                if (prevClose !== null && prevClose > 0) {
                    dailyPnl = (currentPrice - prevClose) * quantity;
                } else {
                    // If no previous close, daily P&L is 0 (no change from yesterday)
                    dailyPnl = 0;
                }
            }

            // Log for debugging
            console.log(`[Portfolio] ${sym}: Current=${currentPrice}, PrevClose=${prevClose}, Qty=${quantity}, DailyPnL=${dailyPnl}, UnrealizedPnL=${unrealizedPnl}`);

            return {
                symbol: sym,
                quantity,
                avg_price: avgPrice,
                prev_close: prevClose,
                current_price: currentPrice,
                market_value: marketValue,
                unrealized_pnl: unrealizedPnl,
                daily_pnl: dailyPnl
            };
        });

        res.json(results);

    } catch (err) {
        console.error('Portfolio P&L calculation error:', err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
