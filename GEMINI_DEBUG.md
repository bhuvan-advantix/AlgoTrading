# 🔧 GEMINI SERVICE - DEBUGGING & FIX

## Changes Applied

### 1. Updated Prompt with Detailed Scoring ✅
**File**: `src/services/geminiAIService.js`

Added your exact scoring guidelines:

**Global News (0-20)**:
- 0-5: Risk-off, sharp sell-off
- 6-10: Mildly negative
- 11-15: Mild risk-on
- 16-20: Strong risk-on

**US Close & Asia Open (0-20)**:
- 0-5: US down sharply, Asia red
- 6-10: US mixed, Asia flat
- 11-15: US mildly green
- 16-20: US strong, Asia extending gains

**Stock News (0-20)**:
- 0-5: Negative news
- 6-10: Neutral
- 11-15: Positive items
- 16-20: Strong flow (upgrades, earnings beat)

**Technical (0-20)**:
- 0-5: ±0.5% move, low volume
- 6-10: 0.5-2% move, average volume
- 11-15: 2-4% move, 2-5× volume
- 16-20: >4% move, >5× volume, clean trend

**Fundamentals (0-20)**:
- 0-5: Penny stocks, extreme valuations
- 6-10: Small caps, patchy earnings
- 11-15: Mid caps, mid-range 52W
- 16-20: Large caps, stable, upper 52W range

**Filtering**:
- Min total score: 60/100
- Min technical: 15/20
- Min fundamentals: 12/20
- High liquidity: ₹20-50 crore+ traded

### 2. Added Detailed Error Logging ✅

Now logs:
- API response status
- Error messages
- Parsed recommendations
- Whether using fallback

### 3. API Key Issue ⚠️

**Current API Key**: `AIzaSyBSxF7v9z3LnVJxQKxZy8mYqH5KqXqXqXq`

This is a **placeholder/invalid key**! That's why it's falling back.

## How to Fix

### Option 1: Get Real Gemini API Key (Recommended)

1. Go to: https://makersuite.google.com/app/apikey
2. Create API key
3. Update line 2 in `src/services/geminiAIService.js`:
   ```javascript
   const GEMINI_API_KEY = 'YOUR_REAL_API_KEY_HERE';
   ```

### Option 2: Test with Fallback Stocks

The fallback stocks are:
- RELIANCE.NS
- TCS.NS
- HDFCBANK.NS
- INFY.NS
- ICICIBANK.NS

These are valid NSE stocks with proper scores.

## Testing

### After Refresh, Check Console (F12)

You'll see one of:

**If API Key Invalid**:
```
Gemini API error: 400 {...}
Using fallback recommendations due to API error
```

**If API Key Valid**:
```
Gemini API response received: {...}
Parsed recommendations: [...]
Returning Gemini recommendations: [...]
```

## Quantity Issue - STILL NOT FIXED

The quantity=0 issue is **NOT related to Gemini**.

**Problem**: Capital too small for expensive stocks

**Your Config**:
- Capital: ₹1,000
- Capital Cap: 30% = ₹300 max per stock
- Reliance price: ₹1,556

**Math**: Can't afford even 1 share (₹1,556 > ₹300)

**Solution**: Use ₹50,000 capital

```
Total Capital: 50000
Basket Loss %: 2
Basket Profit %: 5
Risk-Reward: 2.5
Stop Loss %: 1
Capital Cap %: 30
```

With ₹50,000:
- Capital cap = ₹15,000 per stock
- Can buy 1-10 shares of most stocks
- **Will work!** ✅

## Summary

### What's Fixed ✅
1. Prompt updated with detailed scoring
2. Error logging added
3. Parser cleaned up

### What's NOT Fixed ⚠️
1. **Gemini API Key** - Need real key
2. **Quantity = 0** - Need more capital (₹50,000)

### Action Required

1. **Get Gemini API Key** (or use fallback stocks)
2. **Refresh browser** (F5)
3. **Set capital to ₹50,000**
4. Click "Get AI Recommendations"
5. Check console for errors
6. **Should work!** ✅

## Files Modified

1. ✅ `src/services/geminiAIService.js` - Prompt + logging
2. ✅ `src/utils/stockAllocation.js` - Min quantity fix (already done)

---

**Next Step**: Get a real Gemini API key OR test with ₹50,000 capital using fallback stocks!
