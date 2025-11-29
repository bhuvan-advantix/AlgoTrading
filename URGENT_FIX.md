# URGENT: Production Deployment Checklist

## ✅ Code Fixes Applied (Just Pushed to GitHub)
- ✅ Fixed all hardcoded localhost URLs in frontend
- ✅ Updated 5 critical files:
  - `src/services/marketDataService.js`
  - `src/components/paper/WatchlistView.jsx`
  - `src/components/paper/TradingView.jsx`
  - `src/components/paper/MiniChart.jsx`
  - `backend/server.js` (CORS)

## 🚨 CRITICAL: Set These Environment Variables in Netlify NOW

Go to Netlify Dashboard → Your Site → Site Settings → Environment Variables

Add these 3 variables:

```
VITE_CLERK_PUBLISHABLE_KEY = pk_test_your_actual_clerk_key_here
VITE_API_URL = https://algotrading-2sbm.onrender.com
VITE_MARKET_API_URL = https://algotrading-1-v2p7.onrender.com/api    
```

## 📋 After Setting Environment Variables:

1. **Trigger Netlify Redeploy**:
   - Go to Netlify Dashboard → Deploys
   - Click "Trigger deploy" → "Clear cache and deploy site"
   - Wait for deployment to complete

2. **Verify Render Services are Running**:
   - Check https://algotrading-2sbm.onrender.com (should show API status)
   - Check https://algotrading-1-v2p7.onrender.com (should show market data service)

3. **Test Your Site**:
   - Visit https://advantix-algotrading.netlify.app
   - Check if market data loads (Major Markets section)
   - Try paper trading features
   - Test Zerodha connection

## 🔍 What Was Wrong:
The frontend was trying to connect to `localhost:8081` and `localhost:5000` even in production, which doesn't exist on Netlify. Now it will use the Render URLs from environment variables.

## ⚡ Quick Test:
After redeploying, open browser console (F12) on your Netlify site and check:
- No "Failed to fetch" errors to localhost
- API calls should go to algotrading-2sbm.onrender.com and algotrading-1-v2p7.onrender.com

## 🆘 If Still Not Working:
1. Check Netlify deploy logs for environment variable issues
2. Check Render logs for CORS errors
3. Verify both Render services are awake (free tier sleeps after inactivity)
