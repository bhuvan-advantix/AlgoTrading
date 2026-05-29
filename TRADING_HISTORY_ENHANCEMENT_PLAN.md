# Trading History Enhancement - Implementation Plan

## Current Issues:
- Only shows individual orders (BUY/SELL separately)
- No matched trades (buy-sell pairs)
- No per-trade P&L calculation
- No loss identification
- Limited filtering
- No performance insights

## New System Architecture:

### 1. Trade Matching Logic
```javascript
// Match BUY and SELL orders to create closed trades
function matchTrades(orders) {
  const positions = {};
  const closedTrades = [];
  
  orders.forEach(order => {
    if (order.side === 'BUY') {
      // Add to position
      if (!positions[order.symbol]) {
        positions[order.symbol] = [];
      }
      positions[order.symbol].push(order);
    } else {
      // Match with BUY orders (FIFO)
      const buyOrders = positions[order.symbol] || [];
      let remainingQty = order.quantity;
      
      while (remainingQty > 0 && buyOrders.length > 0) {
        const buyOrder = buyOrders[0];
        const matchQty = Math.min(remainingQty, buyOrder.quantity);
        
        closedTrades.push({
          symbol: order.symbol,
          buyOrder,
          sellOrder: order,
          quantity: matchQty,
          buyPrice: buyOrder.price,
          sellPrice: order.price,
          buyValue: matchQty * buyOrder.price,
          sellValue: matchQty * order.price,
          buyCharges: calculateCharges(buyOrder, matchQty),
          sellCharges: calculateCharges(order, matchQty),
          profit: calculateProfit(...),
          profitPercent: ...,
          isAI: buyOrder.isAIOrder || order.isAIOrder
        });
        
        buyOrder.quantity -= matchQty;
        remainingQty -= matchQty;
        
        if (buyOrder.quantity === 0) {
          buyOrders.shift();
        }
      }
    }
  });
  
  return closedTrades;
}
```

### 2. Charge Breakdown
```javascript
function calculateCharges(order, qty) {
  const amount = order.price * qty;
  return {
    brokerage: order.brokerage || 0,
    stt: amount * 0.00025, // 0.025%
    exchangeCharges: amount * 0.0000325, // 0.00325%
    gst: (brokerage + exchangeCharges) * 0.18,
    stampDuty: amount * 0.00003, // 0.003%
    sebiCharges: amount * 0.000001,
    total: ...
  };
}
```

### 3. Performance Metrics
```javascript
{
  totalTrades: closedTrades.length,
  profitableTrades: closedTrades.filter(t => t.profit > 0).length,
  lossTrades: closedTrades.filter(t => t.profit < 0).length,
  winRate: (profitableTrades / totalTrades) * 100,
  totalProfit: sum of all profits,
  totalLoss: sum of all losses,
  netPnL: totalProfit + totalLoss,
  biggestWin: max profit trade,
  biggestLoss: min profit trade,
  worstStock: stock with most losses
}
```

### 4. Filters
- Date range (custom, today, week, month)
- Stock symbol
- Profit only / Loss only
- Manual / AI trades
- Paper / Live trades
- Sort by: Date, P&L, Stock

### 5. Loss Identification
```javascript
const lossAnalysis = {
  byStock: {
    'ASHOKLEY': {
      totalLoss: -₹500,
      lossCount: 3,
      trades: [...]
    }
  },
  worstPerformer: 'ASHOKLEY',
  consecutiveLosses: [...]
}
```

## Implementation Steps:
1. Create trade matching algorithm
2. Add comprehensive charge calculation
3. Build performance metrics
4. Add advanced filters
5. Create loss analysis
6. Design clean table UI
7. Add export functionality

---
**Status:** Ready to implement
**Estimated Lines:** ~500 lines
**Impact:** Complete trading insights
