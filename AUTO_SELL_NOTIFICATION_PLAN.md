# Auto-Sell Notification System

## What to Add:

### 1. **Listen for Auto-Sell Events**
The `paperTradingStore.js` already fires events when SL/Target hits:
```javascript
window.dispatchEvent(new CustomEvent('paper-order-confirmed', {
  detail: { symbol, side: 'SELL', type: 'STOP_LOSS', price }
}));
```

### 2. **Show Toast Notification**
When auto-sell happens, show a notification:

```
┌────────────────────────────────────┐
│ 🛑 Stop Loss Hit!                  │
│ TATASTEEL sold @ ₹168.28           │
│ Reason: Stop Loss (-1.2%)          │
│ View in Trading History →          │
└────────────────────────────────────┘
```

### 3. **Add to Portfolio View**
```javascript
useEffect(() => {
  const handleAutoSell = (event) => {
    const { symbol, type, price } = event.detail;
    
    // Show notification
    showNotification({
      title: type === 'STOP_LOSS' ? '🛑 Stop Loss Hit!' : '🎯 Target Hit!',
      message: `${symbol} sold @ ₹${price}`,
      type: type === 'STOP_LOSS' ? 'warning' : 'success'
    });
  };
  
  window.addEventListener('paper-order-confirmed', handleAutoSell);
  return () => window.removeEventListener('paper-order-confirmed', handleAutoSell);
}, []);
```

### 4. **Notification Component**
Simple toast that appears for 5 seconds:
- Red for Stop Loss
- Green for Target
- Shows symbol, price, and reason
- Auto-dismisses after 5 seconds
- Click to view in history

---
**Status:** Ready to implement
**Impact:** Users will know immediately when auto-sell happens
