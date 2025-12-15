# AI Trading System - Complete Code Generation Prompt

## System Requirements

Create an advanced AI-powered stock trading recommendation system with the following specifications:

---

## 1. CORE FUNCTIONALITY

### Component Name: `SimpleAITrading.jsx`

### Purpose
Build a React component that provides intelligent stock recommendations based on:
- Live market data from Yahoo Finance
- News sentiment analysis from Finnhub API
- Fundamental analysis (PE ratio, market cap, volatility)
- Technical indicators (price momentum, 52-week position)
- Smart budget allocation

### Key Features Required
1. **Single-page modal interface** - no multi-step wizards
2. **Live price updates** - refresh every 5 seconds
3. **AI scoring system** - 0-100 point scale
4. **Smart budget allocation** - never exceed user's input amount
5. **Editable trade parameters** - quantity, entry, stop loss, target
6. **Approve/Decline workflow** - with alternative suggestions
7. **News integration** - display news count and sentiment
8. **Paper & Live trading modes** - toggle between practice and real

---

## 2. AI SCORING ALGORITHM

Implement a multi-factor scoring system (0-100 points):

```javascript
function calculateAIScore(stock, news, fundamentals) {
  let score = 50; // Base score
  
  // 1. News Sentiment (30 points)
  const sentimentScore = analyzeSentiment(news);
  score += sentimentScore * 30; // -30 to +30
  
  // 2. Price Momentum (20 points)
  if (stock.changePercent > 2) score += 20;
  else if (stock.changePercent > 0) score += 10;
  else if (stock.changePercent > -2) score += 5;
  
  // 3. Volatility - Beta (10 points)
  const beta = fundamentals.beta || 1;
  if (beta >= 0.8 && beta <= 1.2) score += 10; // Moderate
  else if (beta >= 0.5 && beta <= 1.5) score += 5; // Acceptable
  
  // 4. 52-Week Position (10 points)
  if (fundamentals.week52High && fundamentals.week52Low) {
    const position = (stock.price - fundamentals.week52Low) / 
                     (fundamentals.week52High - fundamentals.week52Low);
    if (position >= 0.3 && position <= 0.7) score += 10; // Mid-range
    else if (position < 0.3) score += 15; // Near lows (opportunity)
  }
  
  return Math.min(100, Math.max(0, score));
}
```

### Sentiment Analysis
```javascript
function analyzeSentiment(newsArticles) {
  const positiveWords = ['profit', 'growth', 'gain', 'surge', 'rally', 
                         'bullish', 'upgrade', 'beat', 'strong', 'positive'];
  const negativeWords = ['loss', 'decline', 'fall', 'crash', 'bearish', 
                         'downgrade', 'miss', 'weak', 'negative', 'concern'];
  
  let score = 0;
  newsArticles.forEach(article => {
    const text = (article.headline + ' ' + article.summary).toLowerCase();
    positiveWords.forEach(word => {
      if (text.includes(word)) score += 1;
    });
    negativeWords.forEach(word => {
      if (text.includes(word)) score -= 1;
    });
  });
  
  // Normalize to -1 to +1
  const maxScore = newsArticles.length * 3;
  return maxScore > 0 ? Math.max(-1, Math.min(1, score / maxScore)) : 0;
}
```

---

## 3. BUDGET ALLOCATION ALGORITHM

**Critical Requirement**: If user enters ₹100, total investment must be ≤ ₹100

```javascript
function allocateBudget(totalAmount, allStocks) {
  // Calculate target number of stocks (5-10 based on budget)
  const targetStockCount = Math.min(10, Math.max(5, Math.floor(totalAmount / 1000)));
  
  // Calculate max price per stock
  const maxPricePerStock = totalAmount / targetStockCount;
  
  // Filter stocks within budget
  const affordableStocks = allStocks.filter(stock => 
    stock.price <= maxPricePerStock && 
    stock.price <= totalAmount
  );
  
  // Sort by AI score
  affordableStocks.sort((a, b) => b.aiScore - a.aiScore);
  
  // Select top stocks
  const selectedStocks = [];
  for (const stock of affordableStocks) {
    if (selectedStocks.length >= targetStockCount) break;
    
    const allocatedAmount = totalAmount / targetStockCount;
    const quantity = Math.max(1, Math.floor(allocatedAmount / stock.price));
    const actualInvestment = quantity * stock.price;
    
    if (actualInvestment <= totalAmount) {
      selectedStocks.push({
        ...stock,
        quantity,
        investment: actualInvestment
      });
    }
  }
  
  return selectedStocks;
}
```

---

## 4. LIVE PRICE UPDATE SYSTEM

```javascript
function startLivePriceUpdates(recommendations) {
  const interval = setInterval(async () => {
    const updated = await Promise.all(
      recommendations.map(async (rec) => {
        const quote = await MarketDataService.getQuote(rec.symbol);
        
        // Update current price
        rec.currentPrice = quote.price;
        rec.change = quote.changePercent;
        
        // Recalculate entry/exit prices
        rec.entryPrice = quote.price;
        
        // Maintain percentage-based stop loss/target
        const stopLossPercent = ((rec.stopLoss / rec.entryPrice) - 1) * 100;
        const targetPercent = ((rec.target / rec.entryPrice) - 1) * 100;
        
        rec.stopLoss = quote.price * (1 + stopLossPercent / 100);
        rec.target = quote.price * (1 + targetPercent / 100);
        
        return rec;
      })
    );
    
    setRecommendations(updated);
  }, 5000); // Every 5 seconds
  
  return interval;
}
```

---

## 5. API INTEGRATION

### Finnhub API Service
```javascript
class FinnhubService {
  constructor() {
    this.baseUrl = 'https://finnhub.io/api/v1';
    this.apiKey = 'YOUR_API_KEY';
  }
  
  async getCompanyNews(symbol, from, to) {
    const cleanSymbol = symbol.replace('.NS', '').replace('.BO', '');
    const response = await fetch(
      `${this.baseUrl}/company-news?symbol=${cleanSymbol}&from=${from}&to=${to}&token=${this.apiKey}`
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }
  
  async getFundamentalMetrics(symbol) {
    // Return PE ratio, market cap, 52-week high/low, beta
    // Handle errors gracefully
  }
}
```

### Yahoo Finance Integration
```javascript
// Use existing MarketDataService
const quote = await MarketDataService.getQuote('RELIANCE.NS');
// Returns: { price, changePercent, previousClose }
```

---

## 6. STOCK POOL

Use these 30 NSE stocks:
```javascript
const stockPool = [
  'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
  'BHARTIARTL.NS', 'AXISBANK.NS', 'TATAMOTORS.NS', 'WIPRO.NS', 'SBIN.NS',
  'LT.NS', 'MARUTI.NS', 'SUNPHARMA.NS', 'TITAN.NS', 'KOTAKBANK.NS',
  'ASIANPAINT.NS', 'ITC.NS', 'POWERGRID.NS', 'NTPC.NS', 'COALINDIA.NS',
  'HINDUNILVR.NS', 'BAJFINANCE.NS', 'HCLTECH.NS', 'ULTRACEMCO.NS', 
  'NESTLEIND.NS', 'ONGC.NS', 'TECHM.NS', 'ADANIPORTS.NS', 
  'JSWSTEEL.NS', 'HINDALCO.NS'
];
```

---

## 7. USER INTERFACE REQUIREMENTS

### Modal Structure
```jsx
<Modal show={show} onClose={onClose}>
  <Header>
    <Title>🤖 AI Trading - Fundamental Analysis</Title>
    <Subtitle>News-driven AI with live price updates</Subtitle>
    <StatusBadges>
      <Badge>{mode === 'paper' ? '📝 Paper' : '🔴 Live'}</Badge>
      <Badge>{analysisStatus}</Badge>
    </StatusBadges>
  </Header>
  
  <Content>
    <AmountInput>
      <Input placeholder="Enter amount (e.g., 100000)" />
      <Button>🚀 AI Analysis</Button>
    </AmountInput>
    
    <Recommendations>
      {recommendations.map(stock => (
        <StockCard key={stock.symbol}>
          <Header>
            <Name>{stock.name}</Name>
            <AIBadge>AI: {stock.aiScore}/100</AIBadge>
            <NewsBadge>📰 {stock.newsCount} news</NewsBadge>
          </Header>
          
          <Price>
            <Amount>₹{stock.currentPrice}</Amount>
            <Change positive={stock.change >= 0}>
              {stock.change >= 0 ? '▲' : '▼'} {Math.abs(stock.change)}%
            </Change>
            <LiveIndicator>🔴 Live</LiveIndicator>
          </Price>
          
          <EditableFields>
            <Field label="Quantity" value={qty} editable />
            <Field label="Entry" value={entry} editable />
            <Field label="Stop Loss" value={sl} editable />
            <Field label="Target" value={target} editable />
          </EditableFields>
          
          <Investment>
            Investment: ₹{qty * entry}
          </Investment>
          
          <Actions>
            <Button primary>✅ Execute Trade</Button>
            <Button secondary>❌ Decline</Button>
          </Actions>
        </StockCard>
      ))}
    </Recommendations>
  </Content>
</Modal>
```

### Styling Requirements
- **Dark theme**: Slate/navy background
- **Purple/indigo gradients**: For primary actions
- **Glassmorphism effects**: Subtle transparency
- **Animated pulse**: On live price indicators
- **Green/red colors**: For positive/negative changes
- **Rounded corners**: 12-24px border radius
- **Shadows**: Soft glows on cards and buttons

---

## 8. STATE MANAGEMENT

```javascript
const [amount, setAmount] = useState('');
const [recommendations, setRecommendations] = useState([]);
const [isLoading, setIsLoading] = useState(false);
const [editableStocks, setEditableStocks] = useState({});
const [declinedSymbols, setDeclinedSymbols] = useState([]);
const [analysisStatus, setAnalysisStatus] = useState('');
const priceUpdateInterval = useRef(null);
```

---

## 9. WORKFLOW IMPLEMENTATION

```javascript
async function generateRecommendations() {
  setIsLoading(true);
  
  // Step 1: Fetch market news
  setAnalysisStatus('🔍 Fetching market news...');
  const marketNews = await FinnhubService.getMarketNews();
  
  // Step 2: Analyze stocks
  setAnalysisStatus('📊 Analyzing news sentiment...');
  const stockAnalysis = await Promise.all(
    stockPool.map(async (symbol) => {
      const quote = await MarketDataService.getQuote(symbol);
      const news = await FinnhubService.getCompanyNews(symbol, from, to);
      const fundamentals = await FinnhubService.getFundamentalMetrics(symbol);
      
      const aiScore = calculateAIScore(quote, news, fundamentals);
      const sentimentScore = analyzeSentiment(news);
      
      return {
        symbol,
        price: quote.price,
        change: quote.changePercent,
        aiScore,
        sentimentScore,
        newsCount: news.length,
        fundamentals
      };
    })
  );
  
  // Step 3: Select stocks within budget
  setAnalysisStatus('🎯 Selecting best stocks for your budget...');
  const selected = allocateBudget(amount, stockAnalysis);
  
  // Step 4: Calculate trade details
  const recommendations = selected.map(stock => ({
    ...stock,
    entryPrice: stock.price,
    stopLoss: stock.price * 0.98, // 2% stop loss
    target: stock.price * 1.05,   // 5% target
    reason: generateReason(stock)
  }));
  
  setRecommendations(recommendations);
  setAnalysisStatus('✅ Analysis complete!');
  
  // Step 5: Start live updates
  startLivePriceUpdates(recommendations);
  
  setIsLoading(false);
}
```

---

## 10. TRADE EXECUTION

```javascript
function handleApprove(stock) {
  const editable = editableStocks[stock.symbol];
  
  if (mode === 'paper') {
    const result = placeMarketOrder({
      symbol: stock.symbol,
      side: 'BUY',
      qty: editable.quantity,
      amount: 0,
      stopLoss: editable.stopLoss,
      takeProfit: editable.target,
      isAIOrder: true,
      executionPrice: editable.entryPrice
    });
    
    if (result.success) {
      alert(`✅ Trade executed: BUY ${editable.quantity} ${stock.name}`);
      setRecommendations(prev => prev.filter(r => r.symbol !== stock.symbol));
      window.dispatchEvent(new CustomEvent('paper-trade-update'));
    } else {
      alert(`❌ Trade failed: ${result.reason}`);
    }
  } else {
    // Live trading via Zerodha API
    alert('Live trading integration pending');
  }
}
```

---

## 11. ERROR HANDLING

```javascript
// Finnhub API Errors
try {
  const data = await fetch(url);
  if (!data.ok) return [];
  const json = await data.json();
  if (json.error) return [];
  return Array.isArray(json) ? json : [];
} catch (error) {
  console.error('API error:', error);
  return [];
}

// Array Validation
function analyzeNewsSentiment(news) {
  if (!news || !Array.isArray(news) || news.length === 0) {
    return 0;
  }
  // Process...
}

// Price Update Cleanup
useEffect(() => {
  return () => {
    if (priceUpdateInterval.current) {
      clearInterval(priceUpdateInterval.current);
    }
  };
}, []);
```

---

## 12. TESTING REQUIREMENTS

### Test Case 1: Small Budget
```
Input: ₹100
Expected: 4-5 stocks, each ≤ ₹20, total ≤ ₹100
Verify: Sum of all investments ≤ 100
```

### Test Case 2: Medium Budget
```
Input: ₹50,000
Expected: 7 stocks, total ~₹45,000
Verify: Each stock price ≤ ₹7,142
```

### Test Case 3: Large Budget
```
Input: ₹1,00,000
Expected: 10 stocks, total ~₹95,000
Verify: Diversification across sectors
```

### Test Case 4: Live Updates
```
1. Generate recommendations
2. Wait 5 seconds
3. Verify prices updated
4. Verify entry/exit adjusted
5. Verify animation plays
```

### Test Case 5: Approve/Decline
```
1. Click "Decline" → Verify alternative suggested
2. Click "Approve" → Verify trade executed
3. Verify portfolio updated
4. Verify stock removed from list
```

---

## 13. DEPENDENCIES

```javascript
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MarketDataService from '../../services/marketDataService';
import FinnhubService from '../../services/finnhubService';
import { placeMarketOrder } from '../../utils/paperTradingStore';
```

---

## 14. PERFORMANCE REQUIREMENTS

1. **Initial load**: < 3 seconds
2. **AI analysis**: 5-10 seconds for 30 stocks
3. **Price updates**: Every 5 seconds
4. **Smooth animations**: 60 FPS
5. **Memory usage**: < 50MB
6. **API calls**: Batch where possible

---

## 15. ACCESSIBILITY

- Keyboard navigation support
- Screen reader friendly
- High contrast mode
- Focus indicators
- ARIA labels
- Semantic HTML

---

## 16. EXAMPLE OUTPUT

```javascript
// For ₹100,000 input
{
  recommendations: [
    {
      symbol: 'RELIANCE.NS',
      name: 'RELIANCE',
      currentPrice: 2456.75,
      quantity: 8,
      entryPrice: 2456.75,
      stopLoss: 2407.82,
      target: 2579.59,
      investment: 19654.00,
      change: 1.25,
      aiScore: 87,
      sentimentScore: 0.45,
      newsCount: 12,
      reason: 'Positive sentiment • Strong momentum'
    },
    // ... 7-9 more stocks
  ],
  totalInvestment: 94328.00, // Must be ≤ 100000
  stockCount: 8
}
```

---

## 17. CRITICAL REQUIREMENTS

✅ **MUST HAVE:**
1. Budget constraint enforcement (total ≤ input)
2. Live price updates (every 5 seconds)
3. AI scoring (0-100 scale)
4. News integration (Finnhub API)
5. Editable trade parameters
6. Approve/decline workflow
7. Error handling (graceful fallbacks)
8. Clean, modern UI

❌ **MUST NOT:**
1. Exceed user's budget
2. Use dummy/hardcoded data
3. Have multi-step wizards
4. Show complicated explanations
5. Freeze during API calls
6. Crash on API errors

---

## 18. DELIVERABLES

1. **SimpleAITrading.jsx** - Main component
2. **finnhubService.js** - API integration
3. **Documentation** - Usage guide
4. **Tests** - Unit and integration tests

---

## 19. SUCCESS CRITERIA

- User enters ₹100 → Gets stocks totaling ≤ ₹100 ✅
- Prices update live every 5 seconds ✅
- AI scores based on news + fundamentals ✅
- Entry/exit prices adjust dynamically ✅
- No dummy data used ✅
- Clean, intuitive interface ✅
- Fast performance (< 10s analysis) ✅
- Error-free operation ✅

---

**Use this prompt to generate or modify the AI trading system code.**
