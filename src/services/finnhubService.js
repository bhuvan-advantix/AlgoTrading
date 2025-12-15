// Finnhub API Service for News and Fundamental Analysis
const FINNHUB_API_KEY = 'ctdjgupr01qr7asu6u9gctdjgupr01qr7asu6ua0'; // Free tier API key

class FinnhubService {
    constructor() {
        this.baseUrl = 'https://finnhub.io/api/v1';
    }

    // Get market news
    async getMarketNews(category = 'general') {
        try {
            const response = await fetch(
                `${this.baseUrl}/news?category=${category}&token=${FINNHUB_API_KEY}`
            );
            const data = await response.json();
            return data || [];
        } catch (error) {
            console.error('Error fetching market news:', error);
            return [];
        }
    }

    // Get company news
    async getCompanyNews(symbol, from, to) {
        try {
            const cleanSymbol = symbol.replace('.NS', '').replace('.BO', '');
            const response = await fetch(
                `${this.baseUrl}/company-news?symbol=${cleanSymbol}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`
            );

            if (!response.ok) {
                console.warn(`Finnhub API returned ${response.status} for ${cleanSymbol}`);
                return [];
            }

            const data = await response.json();

            // Check if data is an error object or not an array
            if (data && data.error) {
                console.warn('Finnhub API error:', data.error);
                return [];
            }

            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Error fetching company news:', error);
            return [];
        }
    }

    // Get news sentiment
    async getNewsSentiment(symbol) {
        try {
            const cleanSymbol = symbol.replace('.NS', '').replace('.BO', '');
            const response = await fetch(
                `${this.baseUrl}/news-sentiment?symbol=${cleanSymbol}&token=${FINNHUB_API_KEY}`
            );
            const data = await response.json();
            return data || { sentiment: 0, score: 0 };
        } catch (error) {
            console.error('Error fetching news sentiment:', error);
            return { sentiment: 0, score: 0 };
        }
    }

    // Analyze news sentiment (simple scoring)
    analyzeNewsSentiment(news) {
        // Validate input is an array
        if (!news || !Array.isArray(news) || news.length === 0) {
            return 0;
        }

        const positiveWords = ['profit', 'growth', 'gain', 'surge', 'rally', 'bullish', 'upgrade', 'beat', 'strong', 'positive'];
        const negativeWords = ['loss', 'decline', 'fall', 'crash', 'bearish', 'downgrade', 'miss', 'weak', 'negative', 'concern'];

        let score = 0;
        news.forEach(article => {
            // Validate article has required fields
            if (!article || !article.headline) return;

            const text = ((article.headline || '') + ' ' + (article.summary || '')).toLowerCase();

            positiveWords.forEach(word => {
                if (text.includes(word)) score += 1;
            });

            negativeWords.forEach(word => {
                if (text.includes(word)) score -= 1;
            });
        });

        // Normalize score to -1 to 1 range
        const maxScore = news.length * 3;
        return maxScore > 0 ? Math.max(-1, Math.min(1, score / maxScore)) : 0;
    }

    // Get fundamental metrics (basic implementation)
    async getFundamentalMetrics(symbol) {
        try {
            const cleanSymbol = symbol.replace('.NS', '').replace('.BO', '');

            // Get basic financials
            const response = await fetch(
                `${this.baseUrl}/stock/metric?symbol=${cleanSymbol}&metric=all&token=${FINNHUB_API_KEY}`
            );
            const data = await response.json();

            return {
                peRatio: data?.metric?.peNormalizedAnnual || 0,
                marketCap: data?.metric?.marketCapitalization || 0,
                week52High: data?.metric?.['52WeekHigh'] || 0,
                week52Low: data?.metric?.['52WeekLow'] || 0,
                beta: data?.metric?.beta || 1
            };
        } catch (error) {
            console.error('Error fetching fundamental metrics:', error);
            return {
                peRatio: 0,
                marketCap: 0,
                week52High: 0,
                week52Low: 0,
                beta: 1
            };
        }
    }
}

export default new FinnhubService();
