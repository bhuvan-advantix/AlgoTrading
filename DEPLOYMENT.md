# Deployment Guide for Advantix AlgoTrading Platform

## Production URLs
- **Frontend (Netlify)**: https://advantix-algotrading.netlify.app
- **Main Backend (Render)**: https://algotrading-2sbm.onrender.com
- **Market Data Backend (Render)**: https://algotrading-1-v2p7.onrender.com

## Environment Variables Setup

### Frontend (Netlify)
Set these in Netlify Dashboard → Site Settings → Environment Variables:

```
VITE_CLERK_PUBLISHABLE_KEY=<your_clerk_publishable_key>
VITE_API_URL=https://algotrading-2sbm.onrender.com
VITE_MARKET_API_URL=https://algotrading-1-v2p7.onrender.com/api
VITE_GEMINI_API_KEY=<optional_gemini_key>
```

### Main Backend (server/server.js on Render)
Set these in Render Dashboard → Environment:

```
NODE_ENV=production
PORT=5000
MONGODB_URI=<your_mongodb_connection_string>
CLERK_SECRET_KEY=<your_clerk_secret_key>
CLERK_PUBLISHABLE_KEY=<your_clerk_publishable_key>
KITE_API_KEY=<your_zerodha_kite_api_key>
KITE_API_SECRET=<your_zerodha_kite_api_secret>
KITE_REDIRECT_URI=https://advantix-algotrading.netlify.app/redirect
GEMINI_API_KEY=AIzaSyDDmsSvwFfqN36Cz4vvw_uOwOzvYOKnXis
FINNHUB_API_KEY=d3o7cd1r01qmj8304e7gd3o7cd1r01qmj8304e80
TWELVEDATA_API_KEY=<your_twelvedata_api_key>
FRONTEND_URL=https://advantix-algotrading.netlify.app
```

### Market Data Backend (backend/server.js on Render)
Set these in Render Dashboard → Environment:

```
NODE_ENV=production
PORT=8081
FRONTEND_URL=https://advantix-algotrading.netlify.app
```

## Deployment Steps

### 1. Frontend (Netlify)
1. Connect your GitHub repository to Netlify
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Set all environment variables listed above
5. Deploy

### 2. Main Backend (Render - server/server.js)
1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Root directory: `server`
4. Build command: `npm install`
5. Start command: `node server.js`
6. Set all environment variables listed above
7. Deploy

### 3. Market Data Backend (Render - backend/server.js)
1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Root directory: `backend`
4. Build command: `npm install`
5. Start command: `node server.js`
6. Set environment variables listed above
7. Deploy

## Files Updated for Production

### Frontend Files:
1. `src/utils/constants.js` - Uses VITE_API_URL environment variable
2. `src/services/TransactionService.js` - Uses VITE_MARKET_API_URL
3. `src/components/NewsAnalysisPage.jsx` - Uses VITE_API_URL for AI analysis
4. `src/components/EventAwareness.jsx` - Uses VITE_API_URL
5. `vite.config.js` - Proxy configuration with environment variables

### Backend Files:
1. `server/server.js` - CORS configured for production Netlify URL
2. `backend/server.js` - CORS configured for production Netlify URL
3. `server/routes/aiAnalysis.js` - Gemini API key configured

## n8n Webhooks (Already Configured)
- Local AI Stock Advice: https://bhuvan21.app.n8n.cloud/webhook/stock-advice
- Global AI Stock Advice: https://bhuvan21.app.n8n.cloud/webhook/globalstock-advice
- Market Summary: https://bhuvan21.app.n8n.cloud/webhook/b765c25e-1f8c-4aac-b65a-53523229ce8e

## Testing Checklist
After deployment, test these features:

- [ ] User authentication (Clerk login/signup)
- [ ] Zerodha connection and account details display
- [ ] Paper trading functionality
- [ ] Stock search (local and global AI)
- [ ] News analysis with AI summary
- [ ] Global markets summary
- [ ] Market data charts (TradingView)
- [ ] Order placement and management

## Troubleshooting

### CORS Errors
- Ensure frontend URL is added to CORS allowed origins in both backend files
- Check that FRONTEND_URL environment variable is set correctly

### API Connection Errors
- Verify all environment variables are set correctly
- Check that backend services are running on Render
- Ensure MongoDB connection string is valid

### Zerodha Integration Issues
- Verify KITE_API_KEY and KITE_API_SECRET are correct
- Check KITE_REDIRECT_URI matches your Netlify URL
- Ensure user's Kite API keys are saved correctly in database

## Notes
- All localhost references have been replaced with environment variables
- CORS is configured to allow both old and new Netlify URLs
- Backend services use fallback values for local development
- n8n webhooks are cloud-hosted and don't require local n8n instance
