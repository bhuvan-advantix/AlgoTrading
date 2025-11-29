# Deployment Guide - AlgoTrading Frontend

## ✅ Configuration Complete

All backend URLs have been updated to point to your Render deployments:
- **Main API**: `https://algotrading-1-v2p7.onrender.com`
- **Market Data API**: `https://algotrading-2sbm.onrender.com/api`

## 🚀 Deploy to Netlify

### Option 1: Drag & Drop (Easiest)
1. Build the project (already done ✅):
   ```bash
   npm run build
   ```
2. Go to [Netlify Drop](https://app.netlify.com/drop)
3. Drag the `dist` folder to deploy
4. Done! Your site will be live

### Option 2: Netlify CLI
1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```
2. Login to Netlify:
   ```bash
   netlify login
   ```
3. Deploy:
   ```bash
   netlify deploy --prod --dir=dist
   ```

### Option 3: Git Integration (Recommended for continuous deployment)
1. Push your code to GitHub
2. Go to [Netlify](https://app.netlify.com)
3. Click "Add new site" → "Import an existing project"
4. Connect your GitHub repository
5. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
6. Click "Deploy site"

## 🚀 Deploy to Vercel

### Option 1: Vercel CLI
1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```
2. Deploy:
   ```bash
   vercel --prod
   ```

### Option 2: Git Integration
1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Click "Add New Project"
4. Import your GitHub repository
5. Vercel will auto-detect Vite settings
6. Click "Deploy"

## 🔧 Environment Variables (Optional)

If you want to override the default URLs, set these in your deployment platform:

### Netlify
1. Go to Site settings → Environment variables
2. Add:
   - `VITE_API_URL` = `https://algotrading-1-v2p7.onrender.com`
   - `VITE_MARKET_API_URL` = `https://algotrading-2sbm.onrender.com/api`

### Vercel
1. Go to Project Settings → Environment Variables
2. Add the same variables as above

**Note**: These are optional since the fallback URLs are already configured in the code.

## 🧪 Testing After Deployment

1. Open your deployed site
2. Open browser DevTools (F12) → Console
3. Check for any CORS or network errors
4. Test these features:
   - ✅ Market data loading (indices, quotes)
   - ✅ News feed loading
   - ✅ Event awareness data
   - ✅ Paper trading functionality
   - ✅ Zerodha integration (if connected)

## 🔍 Troubleshooting

### CORS Errors
If you see CORS errors in the console:
1. Check that both Render backends have CORS enabled
2. Ensure they allow requests from your frontend domain
3. Update backend CORS configuration to include your Netlify/Vercel URL

### Backend Not Responding
If APIs are not responding:
1. **Check Render backend status**: Both backends should be "Running"
2. **Cold start delay**: Free tier Render services sleep after inactivity
   - First request may take 30-60 seconds
   - Subsequent requests will be fast
3. **Test backend directly**: 
   - Visit `https://algotrading-1-v2p7.onrender.com/api/health` (if health endpoint exists)
   - Visit `https://algotrading-2sbm.onrender.com/api/quote/AAPL`

### API Rate Limits
- Render free tier has bandwidth limits
- Yahoo Finance API has rate limits
- Consider upgrading Render plan for production use

## 📊 Monitoring

After deployment, monitor:
1. **Frontend**: Check Netlify/Vercel analytics
2. **Backend**: Check Render logs for errors
3. **API Usage**: Monitor API call frequency
4. **Performance**: Check page load times

## 🔄 Continuous Deployment

Once set up with Git integration:
1. Make changes to your code
2. Commit and push to GitHub
3. Netlify/Vercel automatically rebuilds and deploys
4. Changes live in 1-2 minutes

## 📝 Important Notes

- **Build time**: ~8-10 seconds
- **Deploy time**: ~1-2 minutes
- **Free tier limits**: 
  - Netlify: 100GB bandwidth/month
  - Vercel: 100GB bandwidth/month
  - Render: 750 hours/month (per service)

## ✅ Deployment Checklist

- [x] Backend URLs configured
- [x] Production build successful
- [ ] Deploy to Netlify or Vercel
- [ ] Test all API endpoints
- [ ] Verify CORS configuration
- [ ] Check browser console for errors
- [ ] Test paper trading features
- [ ] Test Zerodha integration
- [ ] Monitor backend logs
- [ ] Set up custom domain (optional)

## 🎉 You're Ready!

Your application is now configured and ready to deploy. Choose your preferred platform and follow the steps above.
