# SimpleAITrading.jsx - Component Prompt & Documentation

## Component Overview

**File**: `src/components/paper/SimpleAITrading.jsx`

**Purpose**: Advanced AI-powered stock recommendation system with fundamental analysis, news sentiment, live price updates, and smart budget allocation.

## Component Architecture

```javascript
SimpleAITrading({
  show: boolean,        // Modal visibility
  onClose: function,    // Close handler
  mode: 'paper'|'live'  // Trading mode
})
```

## Key Features

### 1. **AI-Driven Stock Selection**
- Multi-factor scoring system (0-100 points)
- News sentiment analysis via Finnhub API
- Technical analysis (price momentum, volatility)
- Fundamental metrics (PE ratio, market cap, 52-week position)

### 2. **Live Price Updates**
- Auto-updates every 5 seconds
- Real-time price changes with visual indicators
- Dynamic entry/exit price adjustments
- Animated pulse effects on live data

### 3. **Smart Budget Allocation**
- Ensures total investment ≤ user's budget
- Calculates optimal quantity per stock
- Suggests 5-10 stocks based on budget size
- Prevents over-allocation

### 4. **News Integration**
- Fetches last 7 days of company news
- Sentiment scoring (positive/negative keywords)
- News count badges
- Activity-based confidence scoring

### 5. **Editable Trade Parameters**
- Quantity (number of shares)
- Entry price (buy price)
- Stop loss (exit if price drops)
- Target (exit if price reaches)

## AI Scoring Algorithm

```javascript
Base Score: 50 points

+ News Sentiment: -30 to +30 points
  - Positive sentiment (+0.5 to +1.0) = +15 to +30
  - Neutral (0) = 0
  - Negative (-0.5 to -1.0) = -15 to -30

+ Price Momentum: 0 to +20 points
  - Change > 2% = +20
  - Change > 0% = +10
  - Change > -2% = +5

+ Volatility (Beta): 0 to +10 points
  - Beta 0.8-1.2 (moderate) = +10
  - Beta 0.5-1.5 (acceptable) = +5

+ 52-Week Position: 0 to +15 points
  - Mid-range (30-70%) = +10
  - Near lows (<30%) = +15 (opportunity)
  - Near highs (>70%) = +5

Final Score: Min(100, Max(0, Total))
```

## Budget Allocation Logic

```javascript
// Input: totalAmount (e.g., ₹100,000)

// Calculate target stock count
targetStockCount = Min(10, Max(5, Floor(totalAmount / 1000)))

// Calculate max price per stock
maxPricePerStock = totalAmount / targetStockCount

// Selection criteria
for each stock in sortedByAIScore:
  if stock.price <= maxPricePerStock AND 
     stock.price <= totalAmount AND
     selectedStocks.length < targetStockCount:
    
    allocatedAmount = totalAmount / targetStockCount
    quantity = Max(1, Floor(allocatedAmount / stock.price))
    actualInvestment = quantity * stock.price
    
    if actualInvestment <= totalAmount:
      add to selectedStocks
```

## Live Price Update System

```javascript
// Updates every 5 seconds
setInterval(async () => {
  for each recommendation:
    newQuote = await MarketDataService.getQuote(symbol)
    
    // Update display
    rec.currentPrice = newQuote.price
    rec.change = newQuote.changePercent
    
    // Recalculate entry/exit
    editable.entryPrice = newQuote.price
    
    // Maintain percentage-based stop loss/target
    stopLossPercent = (oldStopLoss / oldEntry - 1) * 100
    targetPercent = (oldTarget / oldEntry - 1) * 100
    
    editable.stopLoss = newQuote.price * (1 + stopLossPercent/100)
    editable.target = newQuote.price * (1 + targetPercent/100)
}, 5000)
```

## API Integration

### Finnhub API
```javascript
// Market News
GET /news?category=general&token={API_KEY}

// Company News
GET /company-news?symbol={SYMBOL}&from={DATE}&to={DATE}&token={API_KEY}

// Fundamental Metrics
GET /stock/metric?symbol={SYMBOL}&metric=all&token={API_KEY}
```

### Yahoo Finance (via MarketDataService)
```javascript
// Live Quote
MarketDataService.getQuote(symbol)
// Returns: { price, changePercent, previousClose }
```

## State Management

```javascript
const [amount, setAmount] = useState('')
const [recommendations, setRecommendations] = useState([])
const [isLoading, setIsLoading] = useState(false)
const [editableStocks, setEditableStocks] = useState({})
const [declinedSymbols, setDeclinedSymbols] = useState([])
const [analysisStatus, setAnalysisStatus] = useState('')
const priceUpdateInterval = useRef(null)
```

## Stock Pool (30 NSE Stocks)

```javascript
const stockPool = [
  'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
  'BHARTIARTL.NS', 'AXISBANK.NS', 'TATAMOTORS.NS', 'WIPRO.NS', 'SBIN.NS',
  'LT.NS', 'MARUTI.NS', 'SUNPHARMA.NS', 'TITAN.NS', 'KOTAKBANK.NS',
  'ASIANPAINT.NS', 'ITC.NS', 'POWERGRID.NS', 'NTPC.NS', 'COALINDIA.NS',
  'HINDUNILVR.NS', 'BAJFINANCE.NS', 'HCLTECH.NS', 'ULTRACEMCO.NS', 
  'NESTLEIND.NS', 'ONGC.NS', 'TECHM.NS', 'ADANIPORTS.NS', 
  'JSWSTEEL.NS', 'HINDALCO.NS'
]
```

## User Workflow

```
1. User enters investment amount
   ↓
2. Clicks "🚀 AI Analysis"
   ↓
3. Status: "🔍 Fetching market news..."
   ↓
4. Status: "📊 Analyzing news sentiment..."
   ↓
5. Status: "💹 Fetching live stock prices..."
   - Fetch quotes for all 30 stocks
   - Get company news (last 7 days)
   - Calculate sentiment scores
   - Get fundamental metrics
   - Calculate AI scores
   ↓
6. Status: "🎯 Selecting best stocks for your budget..."
   - Sort by AI score
   - Filter by budget constraints
   - Select 5-10 stocks
   - Calculate quantities
   ↓
7. Status: "✅ Analysis complete!"
   ↓
8. Display recommendations with:
   - AI score badge
   - News count badge
   - Live price (updates every 5s)
   - Editable fields
   ↓
9. User reviews and edits
   ↓
10. User approves/declines
    ↓
11. Trade execution
```

## Recommendation Card Structure

```javascript
{
  symbol: 'RELIANCE.NS',
  name: 'RELIANCE',
  currentPrice: 2456.75,        // Live, updates every 5s
  quantity: 8,                   // Editable
  entryPrice: 2456.75,          // Editable, auto-updates
  stopLoss: 2407.82,            // Editable, auto-adjusts
  target: 2579.59,              // Editable, auto-adjusts
  investment: 19654.00,         // Calculated
  change: 1.25,                 // Live percentage
  aiScore: 87,                  // 0-100
  sentimentScore: 0.45,         // -1 to +1
  newsCount: 12,                // Number of articles
  reason: 'Positive sentiment • Strong momentum'
}
```

## Trade Execution

```javascript
// Paper Trading
const result = placeMarketOrder({
  symbol: stock.symbol,
  side: 'BUY',
  qty: editable.quantity,
  amount: 0,
  stopLoss: editable.stopLoss,
  takeProfit: editable.target,
  isAIOrder: true,
  executionPrice: editable.entryPrice
})

if (result.success) {
  // Remove from recommendations
  // Trigger portfolio update event
  window.dispatchEvent(new CustomEvent('paper-trade-update'))
}
```

## Error Handling

```javascript
// Finnhub API Errors
- 401 Unauthorized → Returns empty array, continues with technical analysis
- Network errors → Graceful fallback
- Invalid data → Array validation before processing

// Price Fetch Errors
- Quote unavailable → Skip stock
- Invalid price → Filter out null stocks

// Budget Constraints
- No stocks within budget → Relax constraints
- Insufficient funds → Show error message
```

## UI Components

### Header
```jsx
<h2>🤖 AI Trading - Fundamental Analysis</h2>
<p>News-driven AI with live price updates</p>
<div>📝 Paper Trading | ✅ Analysis complete!</div>
```

### Amount Input
```jsx
<input 
  type="number"
  placeholder="Enter amount (e.g., 100000)"
  value={amount}
  onChange={(e) => setAmount(e.target.value)}
/>
<button onClick={generateRecommendations}>
  {isLoading ? '🔄 Analyzing...' : '🚀 AI Analysis'}
</button>
```

### Stock Card
```jsx
<div className="stock-card">
  <h4>{stock.name}</h4>
  <span className="ai-badge">AI: {stock.aiScore}/100</span>
  <span className="news-badge">📰 {stock.newsCount} news</span>
  
  <div className="price">
    ₹{stock.currentPrice} 
    <span className={change >= 0 ? 'green' : 'red'}>
      {change >= 0 ? '▲' : '▼'} {Math.abs(change)}%
    </span>
  </div>
  
  <div className="editable-fields">
    <input label="Quantity" value={qty} />
    <input label="Entry" value={entry} />
    <input label="Stop Loss" value={sl} />
    <input label="Target" value={target} />
  </div>
  
  <div className="investment">
    Investment: ₹{qty * entry}
  </div>
  
  <button onClick={handleApprove}>✅ Execute Trade</button>
  <button onClick={handleDecline}>❌ Decline</button>
</div>
```

## Performance Optimizations

1. **Parallel API Calls**: Uses `Promise.all()` for concurrent stock analysis
2. **Memoization**: Stores editable stocks to prevent re-renders
3. **Cleanup**: Clears intervals on unmount
4. **Debouncing**: 5-second intervals for price updates
5. **Lazy Loading**: Only fetches data when modal opens

## Styling Classes

```css
.fixed.inset-0.z-50                    /* Modal overlay */
.bg-gradient-to-br.from-slate-900      /* Card background */
.border.border-purple-500/20           /* Borders */
.animate-pulse                         /* Live price indicator */
.text-green-400                        /* Positive change */
.text-red-400                          /* Negative change */
.bg-gradient-to-r.from-purple-600      /* Primary buttons */
```

## Dependencies

```javascript
import { motion, AnimatePresence } from 'framer-motion'
import MarketDataService from '../../services/marketDataService'
import FinnhubService from '../../services/finnhubService'
import { placeMarketOrder } from '../../utils/paperTradingStore'
```

## Example Usage

```jsx
import SimpleAITrading from './SimpleAITrading'

function TradingView() {
  const [showAI, setShowAI] = useState(false)
  
  return (
    <>
      <button onClick={() => setShowAI(true)}>
        ⚡ AI Trading
      </button>
      
      <SimpleAITrading
        show={showAI}
        onClose={() => setShowAI(false)}
        mode="paper"
      />
    </>
  )
}
```

## Testing Scenarios

### Test 1: Small Budget
```
Input: ₹100
Expected: 4-5 stocks, each ≤ ₹20, total ≤ ₹100
```

### Test 2: Medium Budget
```
Input: ₹50,000
Expected: 7 stocks, total ~₹45,000
```

### Test 3: Large Budget
```
Input: ₹1,00,000
Expected: 10 stocks, total ~₹95,000
```

### Test 4: Live Price Updates
```
1. Generate recommendations
2. Wait 5 seconds
3. Verify prices update
4. Verify entry/exit adjust
```

### Test 5: Approve/Decline
```
1. Click "Decline" on stock
2. Verify alternative suggested
3. Click "Approve" on stock
4. Verify trade executed
5. Verify portfolio updated
```

## Troubleshooting

### Issue: No recommendations shown
**Cause**: API errors or all stocks filtered out
**Fix**: Check console for errors, verify budget amount

### Issue: Prices not updating
**Cause**: Interval not started or API failures
**Fix**: Check `priceUpdateInterval.current` is set

### Issue: Finnhub 401 errors
**Cause**: Invalid/expired API key
**Fix**: System continues with technical analysis only

### Issue: Budget exceeded
**Cause**: Calculation error in allocation
**Fix**: Verify `maxPricePerStock` logic

## Future Enhancements

- [ ] Machine learning-based sentiment analysis
- [ ] Backtesting capabilities
- [ ] Portfolio optimization algorithms
- [ ] Risk scoring and diversification
- [ ] Technical indicators (RSI, MACD, etc.)
- [ ] Chart integration with TradingView
- [ ] Real-time WebSocket price feeds
- [ ] Multi-timeframe analysis
- [ ] Sector-based filtering
- [ ] Custom AI scoring weights

## Version History

- **v1.0**: Initial implementation with basic stock selection
- **v2.0**: Added Finnhub API integration
- **v3.0**: Implemented live price updates
- **v4.0**: Added smart budget allocation
- **v5.0**: Enhanced error handling and fallback modes

---

**Last Updated**: December 12, 2025
**Maintainer**: AI Trading System Team
**Status**: Production Ready ✅
