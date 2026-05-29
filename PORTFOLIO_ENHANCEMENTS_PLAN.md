# Portfolio View Enhancement Plan

## Features to Add:

### 1. **Near Stop Loss/Target Alerts**
Show visual warning when current price is close to SL or Target:
- Within 2% of Stop Loss → Show "⚠️ Near SL" in red
- Within 2% of Target → Show "🎯 Near Target" in green

### 2. **Waiting for Entry Status**
Show pending AI orders that haven't executed yet:
- Display in a separate section above the portfolio table
- Show: Symbol, Entry Price, Allocated Amount, Status
- Example: "RELIANCE - Waiting @ ₹2,450 - ₹20,000 allocated"

### 3. **Money Calculation for Pending**
- Show total allocated amount for pending orders
- Show available cash vs allocated cash
- Update summary cards to reflect pending allocations

## Implementation:

### Step 1: Track Pending AI Orders
```javascript
// In loadPositions function
const pendingOrders = [];
if (state && state.aiPendingOrders) {
  pendingOrders = state.aiPendingOrders.filter(o => o.status === 'PENDING');
}
```

### Step 2: Check Near SL/Target
```javascript
// Calculate distance to SL/Target
const distanceToSL = stopLossPrice ? ((currentPrice - stopLossPrice) / stopLossPrice) * 100 : null;
const distanceToTarget = targetPrice ? ((targetPrice - currentPrice) / targetPrice) * 100 : null;

// Show alert if within 2%
const nearStopLoss = distanceToSL && distanceToSL < 2;
const nearTarget = distanceToTarget && distanceToTarget < 2;
```

### Step 3: Display Pending Orders Section
```javascript
{pendingOrders.length > 0 && (
  <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4 mb-4">
    <h4>⏳ Waiting for Entry ({pendingOrders.length})</h4>
    {pendingOrders.map(order => (
      <div key={order.symbol}>
        {order.symbol} - Waiting @ ₹{order.entryPrice} - ₹{order.allocatedAmount} allocated
      </div>
    ))}
  </div>
)}
```

### Step 4: Update Summary Cards
```javascript
const totalAllocated = pendingOrders.reduce((sum, o) => sum + o.allocatedAmount, 0);
const availableCash = wallet.cash - totalAllocated;
```

## Visual Design:

### Near SL Alert:
```
🛑 Stop Loss
₹168.28
-1.2%
⚠️ NEAR SL!  ← Red pulsing badge
```

### Near Target Alert:
```
🎯 Target
₹174.23
+2.3%
🎯 NEAR TARGET!  ← Green pulsing badge
```

### Pending Orders:
```
┌─────────────────────────────────────────┐
│ ⏳ Waiting for Entry (1)                │
│                                          │
│ RELIANCE.NS                              │
│ Entry: ₹2,450 | Allocated: ₹20,000      │
│ Status: Waiting for price to reach      │
└─────────────────────────────────────────┘
```

---
**Status:** Ready to implement
**Complexity:** Medium
**Impact:** High (Better visibility of AI trading status)
