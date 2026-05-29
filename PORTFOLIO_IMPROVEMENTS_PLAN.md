# Portfolio & Trading History Improvements - Requirements

## User Requirements Summary:

### Portfolio Table Changes (Portfolio.jsx):
1. ❌ **Remove "Avg Price" column**
2. ✅ **Add "Buy Price" column** - Show the price at which stock was bought
3. ✅ **Add "Sell Price" column** - Show current/sell price  
4. ✅ **Show Buy/Sell in single line** - Combine buy and sell info
5. ✅ **Show Profit clearly** - Display profit/loss for each stock

### Trading History Changes (PortfolioView.jsx):
1. ❌ **Remove "All Transactions" section**
2. ❌ **Remove "Daily Breakdown" section**
3. ✅ **Add Time Period Filters:**
   - Today (Daily P&L)
   - Weekly (Last 7 days P&L)
   - Monthly (Last 30 days P&L)
   - All Time (Total P&L)
4. ✅ **Show P&L for selected period**

## Implementation Plan:

### File 1: Portfolio.jsx

**Current Columns:**
- Symbol
- Qty
- Avg Price ❌ REMOVE
- LTP
- Prev Close
- Value
- Day's P&L
- Unrealized P&L
- Action

**New Columns:**
- Symbol
- Qty
- Buy Price ✅ NEW (was Avg Price)
- Sell Price ✅ NEW (Current/LTP)
- Profit/Loss ✅ NEW (Unrealized P&L with better display)
- Action

**Changes Needed:**
```javascript
// Old header
<th>Avg Price</th>
<th>LTP</th>
<th>Prev Close</th> // Remove
<th>Value</th> // Remove
<th>Day's P&L</th> // Remove
<th>Unrealized P&L</th>

// New header
<th>Buy Price</th>
<th>Sell Price</th>
<th>Profit/Loss</th>
```

### File 2: PortfolioView.jsx

**Remove These Sections:**
1. Daily Breakdown (lines 549-572)
2. All Transactions table (lines 574-639)

**Add New Section:**
```javascript
// Time Period Filter
<div className="flex gap-2 mb-4">
  <button onClick={() => setPeriod('today')}>Today</button>
  <button onClick={() => setPeriod('weekly')}>Weekly</button>
  <button onClick={() => setPeriod('monthly')}>Monthly</button>
  <button onClick={() => setPeriod('all')}>All Time</button>
</div>

// P&L Display for Selected Period
<div>
  <h4>{period} P&L</h4>
  <div>Total: ₹{calculatePnL(period)}</div>
</div>
```

## Expected Result:

### Portfolio Table:
```
Symbol | Qty | Buy Price | Sell Price | Profit/Loss | Action
TATASTEEL | 117 | ₹169.73 | ₹169.97 | +₹28.08 (+0.14%) | Close
SAIL | 155 | ₹128.80 | ₹129.44 | +₹99.20 (+0.50%) | Close
```

### Trading History:
```
[Today] [Weekly] [Monthly] [All Time]  <- Filter buttons

Today's P&L: +₹1,234.56
Trades: 5
Win Rate: 80%
```

---

**This is a comprehensive redesign. Should I proceed with implementation?**
