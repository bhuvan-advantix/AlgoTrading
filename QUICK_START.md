# 🚀 Quick Start Guide - Intraday AI Trading System

## ⚡ 30-Second Setup

### 1. Set Gemini API Key
**File**: `src/services/geminiAIService.js` (Line 2)
```javascript
const GEMINI_API_KEY = 'YOUR_API_KEY_HERE';
```
Get key: https://makersuite.google.com/app/apikey

### 2. Start the App
```bash
npm run dev
```

### 3. Open AI Trading
1. Go to Paper Trading
2. Click "⚡ AI Trading" button

---

## 📝 Usage (5 Steps)

### Step 1: Configure (30 seconds)
```
Total Capital: ₹100,000
Basket Loss %: 2
Basket Profit %: 5
Risk-Reward: 2.5
Stop Loss %: 1
Capital Cap %: 30
```

### Step 2: Get Recommendations (10 seconds)
Click "🤖 Get AI Recommendations"

### Step 3: Review (1 minute)
- Check scores (0-100)
- Enable/disable stocks
- View allocation

### Step 4: Verify (30 seconds)
- Check basket summary
- Verify validation ✅
- Review capital usage

### Step 5: Execute (5 seconds)
Click "🚀 Execute All Trades"

**Total Time: ~2 minutes**

---

## 🎯 Key Features

### MAX 5 Stocks
- Intraday trading focus
- Enforced limit
- No exceptions

### 100-Point Scoring
- Global news (20)
- US/Asia trend (20)
- Stock news (20)
- Technical (20)
- Fundamentals (20)

### Proportional Allocation
- NOT equal distribution
- Based on signal strength
- Mathematically correct
- No over-allocation

### To-Do List UI
- Enable/disable toggles
- Score breakdown
- Allocation details
- Basket summary

---

## 💰 Example

### Input
```
Capital: ₹100,000
Loss: 2%
Profit: 5%
```

### Output
```
5 stocks recommended
Capital used: ~₹75,000
Max loss: ≤₹2,000
Target profit: ≥₹5,000
```

---

## ✅ Validation

### Green ✅
- Basket loss valid
- Capital valid

### Yellow ⚠️
- Basket profit below target
- Can still execute

### Red ❌
- Over-allocation
- Cannot execute

---

## 🔧 Troubleshooting

### No recommendations?
- Check Gemini API key
- Verify internet connection
- Try again

### Allocation failed?
- Check config values
- Ensure capital > 0
- Verify stock prices

### Trades not executing?
- Check paper trading mode
- Verify quantities
- Check console for errors

---

## 📊 Files

### Core
- `src/utils/stockAllocation.js` - Algorithm
- `src/services/geminiAIService.js` - AI
- `src/services/enhancedMarketDataService.js` - Data
- `src/components/paper/SimpleAITrading.jsx` - UI

### Docs
- `MASTER_PROMPT.md` - Specification
- `COMPLETE_IMPLEMENTATION.md` - Full details
- `QUICK_START.md` - This file

---

## 🎉 That's It!

**You're ready to use the AI trading system!**

Questions? Check `COMPLETE_IMPLEMENTATION.md` for full details.

---

**Happy Trading!** 🚀📈
