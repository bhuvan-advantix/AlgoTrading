# Fixes Applied - Zerodha Order Placement & Rate Limiting

## Issues Fixed

### 1. ❌ "The instrument you are placing an order for has either expired or does not exist"

**Root Cause:** 
Zerodha/Kite API requires symbols to include the exchange suffix. For NSE (National Stock Exchange), symbols must be formatted as `SYMBOL.NS` (e.g., `RELIANCE.NS` instead of just `RELIANCE`).

**Fix Applied:**
- Updated `handleInitiateOrder()` to automatically append `.NS` suffix to NSE symbols
- Check if symbol already contains a dot (for symbols that already have exchange suffix)
- Pass the corrected symbol to the order placement API

**Code Change:**
```javascript
// Auto-append .NS for NSE symbols if not already present
const symbol = orderSymbol.includes('.') ? orderSymbol : `${orderSymbol}.NS`;
```

**Result:** ✅ Order placement should now work correctly with Zerodha API

---

### 2. ❌ "Too many requests" Network Exception

**Root Cause:** 
Frontend was fetching orders too frequently in the auto-refresh loop:
- Auto-refresh interval was 15 seconds (too aggressive)
- `fetchKiteOrders()` was being called both:
  - Every 30s in the interval
  - On mount
  - After placing an order
  
This caused multiple simultaneous requests hitting Zerodha/Kite API rate limits (typically 10 requests per second).

**Fixes Applied:**

1. **Debounced Order Fetching:**
   - Added 5-second minimum interval between order fetch calls
   - Skip fetch if called again within 5 seconds
   - Prevents redundant API requests

   ```javascript
   // Debounce: skip if we fetched orders less than 5 seconds ago
   const now = Date.now();
   if (now - _lastOrderFetchRef.current < 5000) return;
   _lastOrderFetchRef.current = now;
   ```

2. **Increased Auto-Refresh Interval:**
   - Changed default from 15 seconds → 30 seconds
   - Reduces overall API pressure

   ```javascript
   const [refreshIntervalMs, setRefreshIntervalMs] = useState(30000); // 30s instead of 15s
   ```

3. **Simplified Refresh Logic:**
   - Removed `fetchKiteOrders()` from the auto-refresh interval
   - Orders are now fetched ONLY:
     - On component mount (initial load)
     - After placing a new order (to show immediate confirmation)
   - Account data still refreshes every 30s

**Result:** ✅ API rate limiting errors should be eliminated

---

## Testing

To verify the fixes:

1. **Test Order Placement:**
   - Search for a symbol (e.g., "RELIANCE")
   - Place an order with default NSE exchange
   - Should show "Order placed successfully!" instead of instrument error

2. **Test Rate Limiting:**
   - Check browser console (F12 → Console tab)
   - Should NOT see "Too many requests" errors
   - Orders should load without NetworkException errors

3. **Check Auto-Refresh:**
   - Leave dashboard open for 2+ minutes
   - Account balance/margins should update smoothly
   - No excessive API calls in Network tab (F12 → Network)

---

## Configuration Options

If you need different refresh intervals, you can change them in the OrderForm/Account view:

- **Auto-refresh toggle:** Enable/disable in the settings
- **Refresh interval:** Dropdown to select 10s / 30s / 60s / 5min

Recommended: **30 seconds or higher** for Zerodha API stability.

---

## Notes

- Zerodha API enforces strict rate limits (~10 req/sec)
- For NSE: Use `SYMBOL.NS` format
- For BSE: Use `SYMBOL.BO` format
- For NFO (derivatives): Consult Zerodha docs for correct format

If you get an "invalid symbol" error, check:
1. Symbol exists on Zerodha (valid NSE/BSE/NFO instrument)
2. Correct exchange suffix is used (.NS, .BO, etc.)
3. Symbol is uppercase
