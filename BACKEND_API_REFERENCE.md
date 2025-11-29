# 🔗 Backend API Reference

## Production URLs (Render)

### Main Backend API
```
https://algotrading-1-v2p7.onrender.com
```

**Endpoints:**
- `/api/event-awareness` - Market event awareness data
- `/api/ai/news-analysis` - AI-powered news analysis
- `/api/kite/account` - Zerodha account details
- `/api/kite/orders` - Zerodha order history
- `/api/kite/order` - Place new order (POST)

### Market Data API (Zerodha)
```
https://algotrading-2sbm.onrender.com/api
```

**Endpoints:**
- `/quote/{symbol}` - Get real-time quote
- `/search?query={query}` - Search stocks
- `/chart/{symbol}?range=5d&interval=15m` - Chart data
- `/transactions/{userId}` - User transactions
- `/transactions` - Add transaction (POST)

## Local Development URLs

### Main Backend
```
http://localhost:5000
```

### Market Data Backend
```
http://localhost:8081/api
```

## Environment Variables

### Production (.env.production)
```bash
VITE_API_URL=https://algotrading-1-v2p7.onrender.com
VITE_MARKET_API_URL=https://algotrading-2sbm.onrender.com/api
VITE_API_BASE=/api
VITE_MARKET_API_BASE=/market-api
```

### Local Development (.env.local)
```bash
VITE_API_URL=http://localhost:5000
VITE_MARKET_API_URL=http://localhost:8081/api
VITE_API_BASE=/api
VITE_MARKET_API_BASE=/market-api
```

## Quick Test Commands

### Test Main Backend
```bash
curl https://algotrading-1-v2p7.onrender.com/api/event-awareness
```

### Test Market Data Backend
```bash
curl https://algotrading-2sbm.onrender.com/api/quote/AAPL
```

## CORS Configuration

Both backends should allow:
- `https://your-netlify-site.netlify.app`
- `https://your-vercel-site.vercel.app`
- `http://localhost:5173` (for local dev)

## Status Monitoring

Check if backends are running:
1. Visit Render dashboard: https://dashboard.render.com
2. Check service status for both:
   - `algotrading-1-v2p7` (Main Backend)
   - `algotrading-2sbm` (Market Data)

## Rate Limits

### Render Free Tier
- 750 hours/month per service
- Services sleep after 15 minutes of inactivity
- Cold start: 30-60 seconds on first request

### Yahoo Finance API
- Rate limited (exact limits vary)
- Consider caching on backend

## Troubleshooting

### Backend Not Responding
1. Check Render service status
2. Wait 30-60 seconds for cold start
3. Check Render logs for errors

### CORS Errors
1. Update backend CORS configuration
2. Add your frontend domain to allowed origins
3. Redeploy backend

### API Errors
1. Check browser console for error messages
2. Check Render logs for backend errors
3. Verify API keys are configured on backend

## Support

- **Render Docs**: https://render.com/docs
- **Vite Docs**: https://vitejs.dev
- **Zerodha API**: https://kite.trade/docs/connect/v3/
