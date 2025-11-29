// routes/aiAnalysis.js
/* server-side Express router for AI analysis + n8n proxy
   Exports an Express Router. Drop into your Express app:
   import aiAnalysisRouter from './routes/aiAnalysis.js'
   app.use('/api/ai', aiAnalysisRouter)
*/
import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const router = express.Router();
console.log('[aiAnalysis] Router initialized');

// Initialize Gemini (guard if key missing)
const GEMINI_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDDmsSvwFfqN36Cz4vvw_uOwOzvYOKnXis';
let genAI = null;
if (GEMINI_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_KEY);
} else {
  console.warn('[aiAnalysis] GEMINI_API_KEY not provided — Gemini endpoints will fail if used.');
}

// Helper to format market data for Gemini (safe fallback)
const formatMarketContext = (news = [], marketData = []) => {
  const md = (marketData || []).map(item => `- ${item.symbol || ''}: ${item.price ?? '-'} (${item.change ?? '-'})`).join('\n');
  const nw = (news || []).map(item => `- ${item.title || ''}\n  Summary: ${item.summary || ''}\n  Source: ${item.source || ''}\n  Date: ${item.date || ''}`).join('\n\n');
  return `
Current Market Context:
${md || '- none -'}

Recent News:
${nw || '- none -'}
`;
};

// Simple safe text -> JSON extractor for responses that embed fenced JSON
const stripFencedJson = (s) => {
  if (!s || typeof s !== 'string') return null;
  let t = s.trim();
  // If contains triple backticks with json, strip them
  t = t.replace(/```json\s*/i, '').replace(/```/g, '').trim();
  return t;
};

// PARSERS
function tryParseJSONMaybeString(input) {
  if (input == null) return null;
  if (typeof input === 'object') return input;
  if (typeof input !== 'string') return input;
  const stripped = stripFencedJson(input);
  try {
    return JSON.parse(stripped);
  } catch {
    // return original string if not JSON
    return input;
  }
}

// ========== GENERIC GEMINI CALL (safe wrapper) ==========
async function generateFromGemini(prompt, modelName = 'gemini-pro') {
  if (!genAI) throw new Error('Gemini not initialized (missing GEMINI_API_KEY).');
  const model = genAI.getGenerativeModel({ model: modelName });
  const result = await model.generateContent(prompt);
  // result.response may be SDK object with text() method or .text
  let text = '';
  if (result?.response?.text) {
    // some SDKs return a function to get text
    text = await result.response.text();
  } else if (typeof result?.response === 'string') {
    text = result.response;
  } else if (result?.text) {
    text = result.text;
  } else {
    text = JSON.stringify(result);
  }
  return text;
}

// ========== ROUTES ==========

// POST /api/ai/analyze
router.post('/analyze', async (req, res) => {
  try {
    const { news = [], symbol = 'UNKNOWN', marketData = [] } = req.body || {};

    const prompt = `
You are an expert institutional financial analyst and trading advisor. Use ONLY the data provided below.
Do NOT hallucinate.

Symbol: ${symbol}

${formatMarketContext(news, marketData)}

Produce a concise, structured analysis with:
1) Overall Sentiment: Bullish / Bearish / Neutral
2) Top 3 factors (bullet list)
3) Trade recommendation (entry/target/stop if appropriate)
4) Short risk summary (bullets)
Return as plain text. If no action, say "no action".
`;

    const text = await generateFromGemini(prompt);
    // try to extract JSON inside response if present
    const parsed = tryParseJSONMaybeString(text);

    res.json({
      source: 'gemini',
      symbol,
      raw: text,
      parsed,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('AI Analysis error:', error);
    res.status(500).json({ error: 'AI Analysis failed', details: error.message });
  }
});

// POST /api/ai/news-analysis (Structured JSON for NewsAnalysisPage)
router.post('/news-analysis', async (req, res) => {
  try {
    console.log('[news-analysis] Request received');
    const { news = [] } = req.body;

    if (!genAI) {
      console.error('[news-analysis] Gemini not initialized');
      throw new Error('Gemini not initialized');
    }

    // Limit to top 15 items to fit context
    const analysisData = news.slice(0, 15);
    console.log(`[news-analysis] Analyzing ${analysisData.length} news items`);

    if (analysisData.length === 0) {
      return res.json({
        marketSentiment: "No Data",
        keyFactors: [],
        recommendation: "No news available for analysis.",
        confidenceScore: 0
      });
    }

    const newsContext = analysisData.map(item =>
      `[${new Date((item.timestamp || Date.now() / 1000) * 1000).toLocaleTimeString()}] ${item.headline}: ${item.summary}`
    ).join('\n\n');

    const prompt = `You are a world-class Quantitative Financial Analyst. Analyze the following latest market news and provide a structured analysis in JSON format.

NEWS CONTEXT:
${newsContext}

Provide your analysis in the following JSON format:
{
  "marketSentiment": "Bullish, Bearish, or Neutral",
  "keyFactors": ["factor 1", "factor 2", "factor 3"],
  "recommendation": "Professional recommendation based on the news",
  "confidenceScore": 0.75
}

Focus on real economic drivers and market impact. Be professional and use formal financial language.`;

    console.log('[news-analysis] Processing analysis request');

    // If Gemini isn't initialized, perform a lightweight heuristic analysis
    if (!genAI) {
      console.warn('[news-analysis] Gemini not available, using local heuristic fallback');

      // Build a small corpus from headlines+summary
      const corpus = analysisData.map(it => `${it.headline} ${it.summary}`).join(' ').toLowerCase();
      const stopWords = new Set(['the','and','a','to','of','in','for','on','with','by','is','are','from','at','as','that','this','it','be','has','have']);
      const words = corpus.split(/[^a-zA-Z0-9]+/).filter(w => w && !stopWords.has(w) && w.length > 2);
      const freq = {};
      for (const w of words) freq[w] = (freq[w] || 0) + 1;
      const sorted = Object.entries(freq).sort((a,b) => b[1]-a[1]).slice(0, 8);
      const keyFactors = sorted.slice(0,3).map(s => s[0].replace(/_/g,' '));

      // simple sentiment lexicon (small, conservative)
      const positive = ['rise','gains','up','beat','upgrade','positive','good','surge','gain','increase'];
      const negative = ['fall','down','drop','miss','downgrade','negative','loss','decline','slump','weak'];
      let pos = 0, neg = 0;
      for (const p of positive) if (corpus.includes(p)) pos++;
      for (const n of negative) if (corpus.includes(n)) neg++;
      let marketSentiment = 'Neutral';
      if (pos > neg) marketSentiment = 'Bullish';
      else if (neg > pos) marketSentiment = 'Bearish';

      const confidenceScore = Math.min(0.95, Math.max(0.2, Math.abs(pos - neg) / Math.max(1, pos + neg)));
      const recommendation = marketSentiment === 'Bullish' ? 'Consider BUY on strength; validate with price action.' : marketSentiment === 'Bearish' ? 'Consider SELL/HEDGE on weakness; validate with risk management.' : 'No clear directional signal; stay neutral.';

      return res.json({ marketSentiment, keyFactors, recommendation, confidenceScore });
    }

    // If Gemini is available, use the safe wrapper to get text and then parse JSON
    try {
      const text = await generateFromGemini(prompt, 'gemini-pro');
      const cleaned = stripFencedJson(text);
      const parsed = tryParseJSONMaybeString(cleaned);
      if (parsed && typeof parsed === 'object' && parsed.marketSentiment) {
        return res.json(parsed);
      }

      // If parsed is not structured as expected, attempt to parse JSON directly from cleaned text
      try {
        const json = JSON.parse(cleaned);
        return res.json(json);
      } catch (err) {
        // fallback structured response
        return res.json({
          marketSentiment: 'Neutral',
          keyFactors: ['AI returned unstructured text'],
          recommendation: cleaned.substring(0, 500),
          confidenceScore: 0.5
        });
      }
    } catch (err) {
      console.error('[news-analysis] Gemini error fallback:', err.message || err);
      return res.status(500).json({
        marketSentiment: "Analysis Error",
        keyFactors: ["External AI failure"],
        recommendation: `Backend Error: ${err.message || 'AI provider error'}`,
        confidenceScore: 0,
        details: err.message || String(err)
      });
    }

  } catch (error) {
    console.error('[news-analysis] Error:', error.message);
    console.error('[news-analysis] Stack:', error.stack);
    res.status(500).json({
      marketSentiment: "Analysis Error",
      keyFactors: ["Server Processing Failure"],
      recommendation: `Backend Error: ${error.message}. Please check if Gemini API is accessible.`,
      confidenceScore: 0,
      details: error.message
    });
  }
});

// GET /api/ai/news?symbol=...
router.get('/news', async (req, res) => {
  try {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ error: 'Missing symbol query' });

    if (!process.env.FINNHUB_API_KEY) {
      return res.status(500).json({ error: 'FINNHUB_API_KEY not configured' });
    }

    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const to = new Date().toISOString().split('T')[0];

    const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${from}&to=${to}&token=${process.env.FINNHUB_API_KEY}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`News provider returned ${r.status}`);

    const newsData = await r.json();
    const formatted = (newsData || [])
      .filter(i => i.headline || i.summary)
      .slice(0, 12)
      .map(i => ({
        title: i.headline || i.summary || '',
        summary: i.summary || '',
        source: i.source || '',
        date: i.datetime ? new Date(i.datetime * 1000).toLocaleDateString() : ''
      }));

    res.json(formatted);
  } catch (error) {
    console.error('News fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch news', details: error.message });
  }
});

// GET /api/ai/stock-advice?symbol=XXX  (LOCAL)
router.get('/stock-advice', async (req, res) => {
  try {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ error: 'Symbol required' });

    // Build a compact prompt tailored for local/fundamental analysis
    const clean = String(symbol).toUpperCase().replace('.NS', '').replace('.BO', '');
    const prompt = `
You are an institutional analyst focused on Indian equities. Using only the information provided (do not invent facts), produce a structured LOCAL analysis for ${clean}.
Sections:
- Company overview (1-2 lines)
- Fundamentals (revenue, margins, leverage) — if not present, say 'data not provided' succinctly
- Valuation: short statement (use provided numbers only)
- Bull and Bear cases (1-2 bullets each)
- Price target (12-month) — only if data present, otherwise '-'
- Recommendation: BUY / HOLD / SELL with conviction (High/Medium/Low)
Return as plain text or JSON.
`;

    const text = await generateFromGemini(prompt);
    const parsed = tryParseJSONMaybeString(text);
    res.json({ symbol: clean, analysis_type: 'local', raw: text, parsed, generated_at: new Date().toISOString() });
  } catch (err) {
    console.error('Stock advice error:', err);
    res.status(500).json({ error: 'Failed to generate local advice', details: err.message });
  }
});

// GET /api/ai/global-stock-advice?symbol=XXX  (GLOBAL)
router.get('/global-stock-advice', async (req, res) => {
  try {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ error: 'Symbol required' });

    const clean = String(symbol).toUpperCase().replace('.NS', '').replace('.BO', '');
    const prompt = `
You are a global macro strategist. Provide a GLOBAL perspective for ${clean}:
- Macro context (2 lines)
- Industry outlook (2 lines)
- Global catalysts/risks (bulleted)
- Global recommendation: OVERWEIGHT / NEUTRAL / UNDERWEIGHT (with conviction)
Return plain text or JSON.
`;
    const text = await generateFromGemini(prompt);
    const parsed = tryParseJSONMaybeString(text);
    res.json({ symbol: clean, analysis_type: 'global', raw: text, parsed, generated_at: new Date().toISOString() });
  } catch (err) {
    console.error('Global advice error:', err);
    res.status(500).json({ error: 'Failed to generate global advice', details: err.message });
  }
});

export default router;
