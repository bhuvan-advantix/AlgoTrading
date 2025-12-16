/**
 * Enhanced Market Data Service
 * Fetches 1-month OHLCV data from Yahoo Finance for intraday trading analysis
 */

import { MARKET_API_URL } from '../config.js';

class EnhancedMarketDataService {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
        this.baseURL = MARKET_API_URL; // Use production URL
    }

    /**
     * Get 1-month OHLCV data for a stock
     * @param {string} symbol - Stock symbol (e.g., 'RELIANCE.NS')
     * @returns {Promise<Object>} OHLCV data with technical indicators
     */
    async getMonthlyOHLCV(symbol) {
        const cacheKey = `ohlcv_${symbol}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await fetch(`${this.baseURL}/market/ohlcv/${symbol}?period=1mo`);
            if (!response.ok) {
                throw new Error(`Failed to fetch OHLCV for ${symbol}`);
            }

            const data = await response.json();

            // Calculate technical indicators
            const enhanced = this.calculateTechnicalIndicators(data);

            this.setCache(cacheKey, enhanced);
            return enhanced;
        } catch (error) {
            console.error(`Error fetching OHLCV for ${symbol}:`, error);
            return this.getDefaultOHLCV();
        }
    }

    /**
     * Calculate technical indicators from OHLCV data
     */
    calculateTechnicalIndicators(data) {
        if (!data || !data.prices || data.prices.length === 0) {
            return this.getDefaultOHLCV();
        }

        const prices = data.prices;
        const closes = prices.map(p => p.close);
        const highs = prices.map(p => p.high);
        const lows = prices.map(p => p.low);
        const volumes = prices.map(p => p.volume);

        // Current price
        const currentPrice = closes[closes.length - 1];
        const previousClose = closes[closes.length - 2] || currentPrice;

        // Price change
        const priceChange = currentPrice - previousClose;
        const priceChangePercent = (priceChange / previousClose) * 100;

        // Volatility (standard deviation of returns)
        const returns = [];
        for (let i = 1; i < closes.length; i++) {
            returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
        }
        const volatility = this.standardDeviation(returns) * 100;

        // Momentum (rate of change over 10 days)
        const momentum = closes.length >= 10 ?
            ((currentPrice - closes[closes.length - 10]) / closes[closes.length - 10]) * 100 : 0;

        // 52-week high/low (approximate from 1-month data)
        const high52w = Math.max(...highs);
        const low52w = Math.min(...lows);
        const position52w = (currentPrice - low52w) / (high52w - low52w);

        // Average volume
        const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
        const currentVolume = volumes[volumes.length - 1];
        const volumeRatio = currentVolume / avgVolume;

        // Moving averages
        const sma5 = this.simpleMovingAverage(closes, 5);
        const sma10 = this.simpleMovingAverage(closes, 10);
        const sma20 = this.simpleMovingAverage(closes, 20);

        // Trend
        const trend = currentPrice > sma5 && sma5 > sma10 && sma10 > sma20 ? 'bullish' :
            currentPrice < sma5 && sma5 < sma10 && sma10 < sma20 ? 'bearish' : 'neutral';

        return {
            symbol: data.symbol,
            currentPrice,
            previousClose,
            priceChange,
            priceChangePercent,
            volatility,
            momentum,
            high52w,
            low52w,
            position52w,
            avgVolume,
            currentVolume,
            volumeRatio,
            sma5,
            sma10,
            sma20,
            trend,
            prices: prices.slice(-30), // Last 30 data points
            technicalScore: this.calculateTechnicalScore({
                momentum,
                volatility,
                position52w,
                volumeRatio,
                trend
            })
        };
    }

    /**
     * Calculate technical momentum score (0 to 1)
     */
    calculateTechnicalScore(indicators) {
        let score = 0;

        // Momentum (0.3 weight)
        if (indicators.momentum > 5) score += 0.3;
        else if (indicators.momentum > 2) score += 0.2;
        else if (indicators.momentum > 0) score += 0.1;

        // Volatility (0.2 weight) - prefer moderate volatility
        if (indicators.volatility >= 1 && indicators.volatility <= 3) score += 0.2;
        else if (indicators.volatility < 1 || indicators.volatility > 5) score += 0.05;

        // 52-week position (0.2 weight)
        if (indicators.position52w >= 0.3 && indicators.position52w <= 0.7) score += 0.2;
        else if (indicators.position52w < 0.3) score += 0.15; // Near lows

        // Volume (0.15 weight)
        if (indicators.volumeRatio > 1.2) score += 0.15;
        else if (indicators.volumeRatio > 1) score += 0.1;

        // Trend (0.15 weight)
        if (indicators.trend === 'bullish') score += 0.15;
        else if (indicators.trend === 'neutral') score += 0.075;

        return Math.min(1, Math.max(0, score));
    }

    /**
     * Get US market close data (for global sentiment)
     */
    async getUSMarketData() {
        const cacheKey = 'us_market';
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            // Fetch S&P 500, Nasdaq, Dow Jones
            const symbols = ['^GSPC', '^IXIC', '^DJI'];
            const data = await Promise.all(
                symbols.map(symbol => this.getQuickQuote(symbol))
            );

            const avgChange = data.reduce((sum, d) => sum + (d.changePercent || 0), 0) / data.length;

            const sentiment = avgChange > 1 ? 1 : avgChange > 0 ? 0.5 : avgChange > -1 ? -0.5 : -1;

            const result = {
                sp500: data[0],
                nasdaq: data[1],
                dow: data[2],
                avgChange,
                sentiment,
                timestamp: Date.now()
            };

            this.setCache(cacheKey, result);
            return result;
        } catch (error) {
            console.error('Error fetching US market data:', error);
            return {
                sentiment: 0,
                avgChange: 0,
                timestamp: Date.now()
            };
        }
    }

    /**
     * Get quick quote for a symbol
     */
    async getQuickQuote(symbol) {
        try {
            const response = await fetch(`${this.baseURL}/quote/${symbol}`);
            if (!response.ok) throw new Error('Quote fetch failed');
            const data = await response.json();

            // Map backend response to expected format
            return {
                price: data.currentPrice || 0,
                changePercent: data.dailyChangePct || 0,
                currency: data.currency || 'INR',
                symbol: data.symbol || symbol
            };
        } catch (error) {
            console.error(`Error fetching quote for ${symbol}:`, error);
            return { price: 0, changePercent: 0 };
        }
    }

    /**
     * Calculate simple moving average
     */
    simpleMovingAverage(data, period) {
        if (data.length < period) return data[data.length - 1] || 0;

        const slice = data.slice(-period);
        return slice.reduce((sum, val) => sum + val, 0) / period;
    }

    /**
     * Calculate standard deviation
     */
    standardDeviation(values) {
        if (values.length === 0) return 0;

        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        const squareDiffs = values.map(val => Math.pow(val - avg, 2));
        const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / values.length;

        return Math.sqrt(avgSquareDiff);
    }

    /**
     * Cache management
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;

        if (Date.now() - cached.timestamp > this.cacheExpiry) {
            this.cache.delete(key);
            return null;
        }

        return cached.data;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    clearCache() {
        this.cache.clear();
    }

    /**
     * Default OHLCV data
     */
    getDefaultOHLCV() {
        return {
            currentPrice: 0,
            previousClose: 0,
            priceChange: 0,
            priceChangePercent: 0,
            volatility: 0,
            momentum: 0,
            high52w: 0,
            low52w: 0,
            position52w: 0.5,
            avgVolume: 0,
            currentVolume: 0,
            volumeRatio: 1,
            sma5: 0,
            sma10: 0,
            sma20: 0,
            trend: 'neutral',
            prices: [],
            technicalScore: 0.5
        };
    }
}

export default new EnhancedMarketDataService();
