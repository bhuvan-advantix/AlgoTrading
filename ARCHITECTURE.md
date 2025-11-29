# 🏗️ Application Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│                   (Netlify / Vercel)                            │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  React + Vite Application                                │  │
│  │  - Paper Trading Interface                               │  │
│  │  - Market Data Display                                   │  │
│  │  - News Analysis                                         │  │
│  │  - Zerodha Integration                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                      │
│                           │ HTTPS Requests                       │
│                           ▼                                      │
└─────────────────────────────────────────────────────────────────┘

                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼

┌──────────────────────────┐      ┌──────────────────────────┐
│   MAIN BACKEND API       │      │  MARKET DATA API         │
│   (Render Service 1)     │      │  (Render Service 2)      │
│                          │      │                          │
│  algotrading-1-v2p7     │      │  algotrading-2sbm       │
│  .onrender.com          │      │  .onrender.com/api      │
│                          │      │                          │
│  Endpoints:              │      │  Endpoints:              │
│  - /api/event-awareness  │      │  - /quote/{symbol}       │
│  - /api/ai/news-analysis │      │  - /search               │
│  - /api/kite/account     │      │  - /chart/{symbol}       │
│  - /api/kite/orders      │      │  - /transactions         │
│  - /api/kite/order       │      │                          │
└──────────────────────────┘      └──────────────────────────┘
        │                                       │
        │                                       │
        ▼                                       ▼

┌──────────────────────────┐      ┌──────────────────────────┐
│  ZERODHA KITE API        │      │  YAHOO FINANCE API       │
│  (External Service)      │      │  (External Service)      │
│                          │      │                          │
│  - Authentication        │      │  - Real-time quotes      │
│  - Order Placement       │      │  - Historical data       │
│  - Account Details       │      │  - Stock search          │
│  - Positions             │      │                          │
└──────────────────────────┘      └──────────────────────────┘
```

## 🔄 Data Flow

### 1. Market Data Flow
```
User → Frontend → Market Data API → Yahoo Finance → Response
                  (Render Service 2)
```

### 2. Trading Flow
```
User → Frontend → Main Backend → Zerodha Kite API → Order Executed
                  (Render Service 1)
```

### 3. News Analysis Flow
```
User → Frontend → Main Backend → Finnhub API → AI Analysis → Response
                  (Render Service 1)
```

## 🌐 Environment Configuration

### Production (Deployed)
```javascript
// Frontend automatically uses:
API_URL = "https://algotrading-1-v2p7.onrender.com"
MARKET_API_URL = "https://algotrading-2sbm.onrender.com/api"
```

### Local Development
```javascript
// Create .env.local with:
VITE_API_URL = "http://localhost:5000"
VITE_MARKET_API_URL = "http://localhost:8081/api"
```

## 📦 Component → API Mapping

| Component | API Used | Backend Service |
|-----------|----------|-----------------|
| EventAwareness | `/api/event-awareness` | Main Backend |
| NewsAnalysisPage | `/api/ai/news-analysis` | Main Backend |
| AccountView (Zerodha) | `/api/kite/*` | Main Backend |
| MiniChart | `/chart/{symbol}` | Market Data API |
| SearchBar | `/search` | Market Data API |
| WatchlistView | `/quote/{symbol}` | Market Data API |
| TradingView | `/quote/{symbol}`, `/search` | Market Data API |
| PortfolioView | `/quote/{symbol}` | Market Data API |
| TransactionService | `/transactions` | Market Data API |

## 🔐 Security Flow

```
Frontend (HTTPS)
    ↓
Render Backend (HTTPS)
    ↓
External APIs (HTTPS)
    - Zerodha Kite API (OAuth)
    - Yahoo Finance API (Public)
    - Finnhub API (API Key)
```

## 🚀 Deployment Flow

```
1. Developer pushes code to GitHub
        ↓
2. Netlify/Vercel detects changes
        ↓
3. Runs: npm run build
        ↓
4. Creates optimized production bundle
        ↓
5. Deploys to CDN
        ↓
6. Site is live with production URLs
```

## 📊 Request Flow Example

### Example: Loading Market Data

```
1. User opens app
   ↓
2. Frontend requests: GET /quote/AAPL
   ↓
3. Request goes to: https://algotrading-2sbm.onrender.com/api/quote/AAPL
   ↓
4. Backend fetches from Yahoo Finance
   ↓
5. Backend returns formatted data
   ↓
6. Frontend displays in UI
```

### Example: Placing Zerodha Order

```
1. User clicks "Buy" button
   ↓
2. Frontend sends: POST /api/kite/order
   ↓
3. Request goes to: https://algotrading-1-v2p7.onrender.com/api/kite/order
   ↓
4. Backend authenticates with Zerodha
   ↓
5. Backend places order via Kite API
   ↓
6. Order confirmation returned
   ↓
7. Frontend updates UI
```

## 🔧 Configuration Files

```
Project Root
├── .env.production          # Production URLs (committed)
├── .env.example            # Template for local dev
├── .env.local              # Local dev URLs (gitignored)
├── vite.config.js          # Vite proxy config
├── src/
│   ├── config.js           # Main config with URLs
│   └── utils/
│       └── constants.js    # API constants
```

## 🌍 URL Resolution Priority

```
1. Environment Variable (VITE_API_URL)
   ↓ (if not set)
2. Hardcoded Fallback (Production Render URL)
   ↓ (if not set)
3. Error (should never happen)
```

Example:
```javascript
const API_URL = import.meta.env.VITE_API_URL || 'https://algotrading-1-v2p7.onrender.com';
```

## 🎯 Key Points

1. **No localhost in production** - All URLs point to Render
2. **Environment variables optional** - Fallbacks are configured
3. **CORS must be configured** - Backends must allow frontend domain
4. **Cold starts expected** - Free tier Render services sleep
5. **HTTPS everywhere** - All production traffic is encrypted

---

This architecture ensures:
- ✅ Separation of concerns
- ✅ Scalability
- ✅ Security
- ✅ Easy deployment
- ✅ Local development support
