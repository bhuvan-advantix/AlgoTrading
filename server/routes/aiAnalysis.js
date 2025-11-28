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
    const { news = [] } = req.body;
    if (!genAI) throw new Error('Gemini not initialized');

    // Limit to top 15 items to fit context
    const analysisData = news.slice(0, 15);
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

    const systemPrompt = `You are a world-class Quantitative Financial Analyst. Analyze the following latest market news and provide a structured, professional, and actionable analysis. Focus on real economic drivers and market impact. The response must be professional and use formal financial language.`;

    const userQuery = `Analyze the following news items and provide the output strictly in the requested JSON schema. The analysis must be based ONLY on the provided text, focusing on the overall sentiment, key drivers, and a professional recommendation.\n\nNEWS CONTEXT:\n${newsContext}`;

    const schema = {
      type: "OBJECT",
      properties: {
        marketSentiment: { type: "STRING", description: "Bullish, Bearish, or Neutral" },
        keyFactors: { type: "ARRAY", items: { type: "STRING" } },
        recommendation: { type: "STRING" },
        confidenceScore: { type: "NUMBER" }
      },
      required: ["marketSentiment", "keyFactors", "recommendation", "confidenceScore"]
    };

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash", // Use a stable model
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    const result = await model.generateContent([systemPrompt, userQuery]);
    const text = result.response.text();
    const json = JSON.parse(text);

    res.json(json);

  } catch (error) {
    console.error('News Analysis Error:', error);
    res.status(500).json({
      marketSentiment: "Analysis Error",
      keyFactors: ["Server Processing Failure"],
      recommendation: "The AI model encountered a processing error on the server.",
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

// ===== N8N PROXY ENDPOINTS (FOR LOCAL n8n WORKFLOWS) =====

// Robust parser for n8n outputs: handles arrays with .output containing fenced JSON
function parseN8nResponseBody(data) {
  try {
    if (!data) return null;
    // n8n often returns [{ output: "```json\n{...}\n```"}]
    if (Array.isArray(data) && data.length > 0) {
      // try to locate first item that looks like output
      for (const item of data) {
        if (item && typeof item === 'object' && item.output) {
          const stripped = stripFencedJson(item.output);
          try {
            return JSON.parse(stripped);
          } catch {
            return item.output;
          }
        }
      }
      // fallback: return whole array
      return data;
    }
    // if object, return as-is
    if (typeof data === 'object') return data;
    // if string, try to parse JSON content
    const stripped = stripFencedJson(String(data));
    try {
      return JSON.parse(stripped);
    } catch {
      return String(data);
    }
  } catch (e) {
    return data;
  }
}

// GET /api/ai/n8n-stock-advice?symbol=...
router.get('/n8n-stock-advice', async (req, res) => {
  try {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ error: 'Symbol required' });

    const n8nUrl = `http://localhost:5678/webhook/stock-advice?symbol=${encodeURIComponent(symbol)}`;
    console.log('[N8N Proxy] forwarding to', n8nUrl);
    const r = await fetch(n8nUrl);
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      return res.status(r.status).json({ error: `n8n returned ${r.status}`, details: t || r.statusText });
    }
    const data = await r.json();
    const parsed = parseN8nResponseBody(data);
    res.json({ symbol: symbol.toUpperCase(), source: 'n8n', content: parsed, raw: data, generated_at: new Date().toISOString() });
  } catch (err) {
    console.error('[N8N Proxy] error', err);
    res.status(502).json({ error: 'n8n proxy failed', details: err.message });
  }
});

// GET /api/ai/n8n-global-advice?symbol=...
router.get('/n8n-global-advice', async (req, res) => {
  try {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ error: 'Symbol required' });

    const n8nUrl = `http://localhost:5678/webhook/globalstock-advice?symbol=${encodeURIComponent(symbol)}`;
    console.log('[N8N Proxy] forwarding to', n8nUrl);
    const r = await fetch(n8nUrl);
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      // If n8n failed with a 500 that indicates the workflow couldn't be started,
      // provide a graceful fallback: attempt to run a local Gemini global analysis (if available).
      console.error('[N8N Proxy] n8n error response:', r.status, t || r.statusText);
      if (r.status === 500 && genAI) {
        try {
          console.log('[N8N Proxy] Attempting Gemini fallback for global analysis');
          const clean = String(symbol).toUpperCase().replace('.NS', '').replace('.BO', '');
          const prompt = `\nYou are a global macro strategist. Provide a GLOBAL perspective for ${clean}:\n- Macro context (2 lines)\n- Industry outlook (2 lines)\n- Global catalysts/risks (bulleted)\n- Global recommendation: OVERWEIGHT / NEUTRAL / UNDERWEIGHT (with conviction)\nReturn plain text or JSON.\n`;
          const text = await generateFromGemini(prompt);
          const parsed = tryParseJSONMaybeString(text);
          return res.json({ symbol: clean, source: 'fallback-gemini', raw: text, parsed, generated_at: new Date().toISOString() });
        } catch (fallbackErr) {
          console.error('[N8N Proxy] Gemini fallback failed:', fallbackErr);
          return res.status(502).json({ error: 'n8n returned 500 and Gemini fallback failed', details: String(fallbackErr) });
        }
      }
      return res.status(r.status).json({ error: `n8n returned ${r.status}`, details: t || r.statusText });
    }
    const data = await r.json();
    const parsed = parseN8nResponseBody(data);
    res.json({ symbol: symbol.toUpperCase(), source: 'n8n', content: parsed, raw: data, generated_at: new Date().toISOString() });
  } catch (err) {
    console.error('[N8N Proxy] error', err);
    res.status(502).json({ error: 'n8n proxy failed', details: err.message });
  }
});

export default router;
