/**
 * ============================================================================
 * AI-POWERED STOCK TRADING SIGNAL GENERATOR
 * ============================================================================
 * 
 * This service integrates with Mistral AI to provide intelligent stock
 * recommendations for intraday trading on the NSE (National Stock Exchange).
 * 
 * Key Features:
 * - Budget-aware stock recommendations
 * - 100-point scoring system across 5 key factors
 * - Maximum 5 stocks per recommendation (intraday trading requirement)
 * - Real-time market sentiment analysis
 * - Individual stock analysis with buy/sell/hold recommendations
 * 
 * @author Your Name
 * @version 1.0.0
 * ============================================================================
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const MISTRAL_API_KEY = 'BJLKkmEWSQxZp7OzUoACIyxxWGWbnP6x';
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
const MISTRAL_MODEL = 'mistral-large-latest';
const MAX_STOCKS_LIMIT = 5; // Intraday trading requirement

// ============================================================================
// AI SERVICE CLASS
// ============================================================================

class GeminiAIService {
    constructor() {
        this.apiKey = MISTRAL_API_KEY;
        this.baseUrl = MISTRAL_API_URL;
        this.model = MISTRAL_MODEL;
    }

    // ========================================================================
    // STOCK RECOMMENDATIONS
    // ========================================================================

    /**
     * Get AI-powered stock recommendations based on market conditions and budget
     * 
     * @param {number} budget - User's investment budget in INR
     * @param {string} marketCondition - Current market sentiment (bullish/bearish/neutral)
     * @returns {Promise<Array>} Array of max 5 stock recommendations with scores
     * 
     * @example
     * const recommendations = await aiService.getStockRecommendations(50000, 'bullish');
     */
    async getStockRecommendations(budget, marketCondition = 'neutral') {
        try {
            const prompt = this.buildRecommendationPrompt(budget, marketCondition, MAX_STOCKS_LIMIT);

            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [{
                        role: 'user',
                        content: prompt
                    }],
                    temperature: 0.7,
                    max_tokens: 2048
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Mistral AI API Error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('✓ Mistral AI response received');

            const recommendations = this.parseAIResponse(data);

            // Enforce stock limit
            const limitedRecs = recommendations.slice(0, MAX_STOCKS_LIMIT);

            if (limitedRecs.length === 0) {
                throw new Error('No valid recommendations received from AI');
            }

            console.log(`✓ Returning ${limitedRecs.length} AI recommendations`);
            return limitedRecs;

        } catch (error) {
            console.error('✗ Error getting AI recommendations:', error.message);
            throw error;
        }
    }

    // ========================================================================
    // PROMPT ENGINEERING
    // ========================================================================

    /**
     * Build a comprehensive prompt for AI stock recommendations
     * 
     * @param {number} budget - User's total capital
     * @param {string} marketCondition - Market sentiment
     * @param {number} count - Number of stocks to recommend
     * @returns {string} Formatted prompt for AI
     */
    buildRecommendationPrompt(budget, marketCondition, count) {
        const maxPricePerStock = Math.floor(budget * 0.3); // 30% capital cap per stock

        return `You are an AI signal generator for INTRADAY STOCK TRADING (2-3 hour holds).

Your ONLY job: IDENTIFY and SCORE exactly ${count} NSE stocks.
You do NOT allocate capital, set stops, or execute trades.

=====================
CRITICAL BUDGET CONSTRAINT
=====================

**USER'S TOTAL CAPITAL: ₹${budget.toLocaleString('en-IN')}**
**MAX PRICE PER STOCK: ₹${maxPricePerStock.toLocaleString('en-IN')}** (30% capital cap)

YOU MUST ONLY SUGGEST STOCKS WITH CURRENT PRICE ≤ ₹${maxPricePerStock.toLocaleString('en-IN')}

If capital is small (< ₹10,000), prioritize:
- Mid-cap stocks (₹100-500 range)
- Small-cap stocks (₹50-200 range)
- High liquidity stocks that are affordable

DO NOT suggest expensive large-caps like Reliance (₹1,500+) if budget is small!

=====================
STRICT CONSTRAINTS
=====================

1. Stock Exchange: NSE ONLY
2. Symbols MUST end with .NS
3. Return EXACTLY ${count} stocks (NO MORE, NO LESS)
4. Time horizon: INTRADAY (2–3 hours)
5. Only liquid F&O or large-cap/mid-cap stocks
6. NO penny stocks, NO illiquid stocks
7. Sector diversification (max 2 from same sector)
8. Return ONLY JSON, NO markdown, NO explanations
9. **CRITICAL**: Stock price MUST be ≤ ₹${maxPricePerStock.toLocaleString('en-IN')}

=====================
100-POINT SCORING MODEL
=====================

Score each stock on 5 factors (20 points each):

**1. GLOBAL NEWS & MACRO SENTIMENT (0-20)**
Evaluate global risk appetite and its impact on Indian markets:

- 0-5:   Risk-off, sharp global sell-off, India underperforming
- 6-10:  Mildly negative, mixed global cues
- 11-15: Mild risk-on, supportive macro, Asia green
- 16-20: Strong risk-on, global indices & commodities trending up

**2. US CLOSE & ASIA OPEN TREND (0-20)**
Analyze overnight global market performance:

- 0-5:   US majors down sharply, Asia deep red, India gap-down expected
- 6-10:  US mixed, Asia flat to slightly down, India flat/weak
- 11-15: US mildly green, Asia modestly positive
- 16-20: US strong close, Asian indices extending gains, VIX low

**3. STOCK-SPECIFIC NEWS SENTIMENT (0-20)**
Last 1 month company-specific news:

- 0-5:   Fresh negative news (downgrades, poor results, litigation)
- 6-10:  No major news, neutral mentions
- 11-15: One-off positive items (small order wins, decent results)
- 16-20: Strong flow (upgrades, large orders, big earnings beat, sector tailwinds)

**4. TECHNICAL MOMENTUM & VOLATILITY (0-20)**
Intraday price action and volume:

- 0-5:   Price within ±0.5% of previous close, low volume
- 6-10:  0.5-2% move with average volume
- 11-15: 2-4% move AND 2-5× average volume
- 16-20: >4% move AND >5× average volume with clean trend (no wild wicks)

**5. FUNDAMENTALS (0-20)**
PE ratio, market cap, 52-week position:

- 0-5:   Penny/illiquid; extreme valuations; near 52-week low without turnaround
- 6-10:  Small/micro caps with patchy earnings; erratic price history
- 11-15: Reasonably valued mid/small caps, mid-range of 52-week band
- 16-20: Large/mid caps, stable earnings, PE at/below sector avg, upper half of 52-week range

**TOTAL SCORE = SUM OF ALL 5 (0-100)**

=====================
FILTERING RULES
=====================

- Minimum total score: 60/100
- Minimum technical score: 15/20 (strong intraday momentum required)
- Minimum fundamentals: 12/20 (avoid lottery-type moves)
- High liquidity: ₹20-50 crore+ intraday value traded
- Tight bid-ask spreads
- **CRITICAL**: Stock price ≤ ₹${maxPricePerStock.toLocaleString('en-IN')}

=====================
STOCK SELECTION STRATEGY
=====================

For budget ₹${budget.toLocaleString('en-IN')}:

If budget < ₹1,000:
- Suggest stocks in ₹50-200 range
- Focus on small/mid caps
- Examples: SAIL, NMDC, BHEL, NBCC, etc.

If budget ₹1,000-10,000:
- Suggest stocks in ₹100-500 range
- Mix of mid-caps
- Examples: Tata Power, Ashok Leyland, etc.

If budget > ₹10,000:
- Can suggest stocks up to ₹${maxPricePerStock.toLocaleString('en-IN')}
- Mix of large/mid caps

=====================
OUTPUT FORMAT
=====================

Return ONLY this exact JSON structure:

{
  "recommendations": [
    {
      "symbol": "TATASTEEL.NS",
      "name": "Tata Steel",
      "sector": "Metals",
      "bias": "bullish",
      "scoreBreakdown": {
        "globalNews": 18,
        "usAsiaTrend": 16,
        "stockNews": 17,
        "technical": 19,
        "fundamentals": 18
      },
      "totalScore": 88,
      "signalStrength": 0.88
    }
  ]
}

=====================
VALIDATION RULES
=====================

- EXACTLY ${count} stocks in array
- totalScore = sum of scoreBreakdown values
- signalStrength = totalScore / 100
- bias: "bullish", "bearish", or "neutral"
- Use REAL NSE stocks only
- NO hardcoded prices
- NO extra fields
- **CRITICAL**: All stocks MUST be affordable (≤ ₹${maxPricePerStock.toLocaleString('en-IN')})

REMEMBER: You generate SIGNALS only. You do NOT trade.
CRITICAL: Suggest AFFORDABLE stocks based on user's capital!`;
    }

    // ========================================================================
    // RESPONSE PARSING
    // ========================================================================

    /**
     * Parse AI response and extract stock recommendations
     * 
     * @param {Object} data - Raw API response from Mistral AI
     * @returns {Array} Parsed and validated stock recommendations
     */
    parseAIResponse(data) {
        try {
            if (!data.choices || data.choices.length === 0) {
                throw new Error('No choices in AI response');
            }

            const message = data.choices[0].message;
            if (!message || !message.content) {
                throw new Error('No message content in AI response');
            }

            // Clean response text
            let text = message.content;
            text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

            // Parse JSON
            const parsed = JSON.parse(text);

            if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
                throw new Error('Invalid recommendations format');
            }

            // Validate and normalize each recommendation
            return parsed.recommendations.map(rec => this.validateRecommendation(rec));

        } catch (error) {
            console.error('✗ Error parsing AI response:', error.message);
            throw new Error(`Failed to parse AI response: ${error.message}`);
        }
    }

    /**
     * Validate and normalize a single stock recommendation
     * 
     * @param {Object} rec - Raw recommendation object
     * @returns {Object} Validated and normalized recommendation
     */
    validateRecommendation(rec) {
        // Validate score breakdown
        const breakdown = rec.scoreBreakdown || {
            globalNews: 10,
            usAsiaTrend: 10,
            stockNews: 10,
            technical: 10,
            fundamentals: 10
        };

        // Calculate total score
        const totalScore = rec.totalScore || (
            breakdown.globalNews +
            breakdown.usAsiaTrend +
            breakdown.stockNews +
            breakdown.technical +
            breakdown.fundamentals
        );

        return {
            symbol: rec.symbol,
            name: rec.name || rec.symbol.replace('.NS', ''),
            sector: rec.sector || 'Unknown',
            bias: rec.bias || 'neutral',
            signalStrength: rec.signalStrength || (totalScore / 100),
            scoreBreakdown: breakdown,
            totalScore: totalScore,
            confidence: totalScore // Legacy compatibility
        };
    }

    // ========================================================================
    // MARKET SENTIMENT ANALYSIS
    // ========================================================================

    /**
     * Analyze current market sentiment using AI
     * 
     * @returns {Promise<Object>} Market sentiment analysis
     * 
     * @example
     * const sentiment = await aiService.analyzeMarketSentiment();
     * // { sentiment: 'bullish', analysis: '...', confidence: 75 }
     */
    async analyzeMarketSentiment() {
        try {
            const prompt = `Analyze the current Indian stock market sentiment based on recent trends, news, and economic indicators.

Provide a brief analysis (2-3 sentences) and classify the market as:
- "bullish" (positive, upward trend)
- "bearish" (negative, downward trend)
- "neutral" (mixed signals, sideways)

OUTPUT FORMAT (JSON only):
{
  "sentiment": "bullish",
  "analysis": "Brief market analysis here",
  "confidence": 75
}

Return ONLY valid JSON.`;

            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [{
                        role: 'user',
                        content: prompt
                    }],
                    temperature: 0.5,
                    max_tokens: 512
                })
            });

            if (!response.ok) {
                throw new Error('Market sentiment analysis failed');
            }

            const data = await response.json();
            const message = data.choices[0].message;
            let text = message.content;
            text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

            const parsed = JSON.parse(text);
            return {
                sentiment: parsed.sentiment || 'neutral',
                analysis: parsed.analysis || 'Market analysis unavailable',
                confidence: parsed.confidence || 50
            };

        } catch (error) {
            console.error('✗ Error analyzing market sentiment:', error.message);
            return {
                sentiment: 'neutral',
                analysis: 'Market analysis unavailable',
                confidence: 50
            };
        }
    }

    // ========================================================================
    // INDIVIDUAL STOCK ANALYSIS
    // ========================================================================

    /**
     * Get AI-powered analysis for a specific stock
     * 
     * @param {string} symbol - Stock symbol (e.g., 'RELIANCE.NS')
     * @param {number} currentPrice - Current stock price
     * @param {Array} news - Array of recent news items
     * @returns {Promise<Object>} Stock analysis with recommendation
     * 
     * @example
     * const analysis = await aiService.analyzeStock('TCS.NS', 3500, newsArray);
     */
    async analyzeStock(symbol, currentPrice, news = []) {
        try {
            const newsText = news.slice(0, 5).map(n => n.headline).join('. ');

            const prompt = `Analyze ${symbol} stock trading at ₹${currentPrice}.

Recent news: ${newsText || 'No recent news available'}

Provide:
1. Buy/Hold/Sell recommendation
2. Confidence score (0-100)
3. Brief reason (1 sentence)
4. Suggested stop loss percentage
5. Suggested target percentage

OUTPUT FORMAT (JSON only):
{
  "recommendation": "BUY",
  "confidence": 85,
  "reason": "Strong fundamentals and positive momentum",
  "stopLossPercent": 2,
  "targetPercent": 5
}

Return ONLY valid JSON.`;

            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [{
                        role: 'user',
                        content: prompt
                    }],
                    temperature: 0.6,
                    max_tokens: 256
                })
            });

            if (!response.ok) {
                throw new Error('Stock analysis failed');
            }

            const data = await response.json();
            const message = data.choices[0].message;
            let text = message.content;
            text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

            return JSON.parse(text);

        } catch (error) {
            console.error('✗ Error analyzing stock:', error.message);
            return {
                recommendation: 'HOLD',
                confidence: 50,
                reason: 'Analysis unavailable',
                stopLossPercent: 2,
                targetPercent: 5
            };
        }
    }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export default new GeminiAIService();
