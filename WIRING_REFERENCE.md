# 🎯 QUICK REFERENCE: WHAT'S WIRED WHERE

## App Navigation Flow
```
App.jsx (Line 1022)
├── case 'paper':
└── return <TradingView />
```

## Component Hierarchy
```
TradingView (Your Professional Design)
├── Header (Export, Reset buttons)
├── Major Markets Bar (NIFTY, SENSEX, etc.)
└── Main Grid Layout
    ├── LEFT SIDE (2/3 width)
    │   ├── SearchBar Component
    │   │   └── API: GET /api/search?query=...
    │   │   └── onSelect callback → setSymbol()
    │   │
    │   └── ChartSection Component
    │       ├── Props: symbol, quote
    │       ├── API: MarketDataService.getHistoricalData()
    │       └── Updates every 30s
    │
    └── RIGHT SIDE (1/3 width)
        ├── OrderForm Component
        │   ├── Props: symbol, quote
        │   ├── Uses: placeMarketOrder() from paperTradingStore
        │   ├── Uses: subscribePrice() for live prices
        │   └── Emits: 'paper-trade-update' event
        │
        └── PortfolioSummary Component
            ├── Uses: readState() from paperTradingStore
            ├── Uses: subscribePrice() for live prices
            ├── Listens: 'paper-trade-update' event
            └── Displays: Cash, Positions, P&L
```

## State Management Chain
```
paperTradingStore.js
├── readState()
│   └── Returns current wallet & positions
├── subscribePrice(symbol, callback)
│   └── Returns unsubscribe function
├── placeMarketOrder(symbol, side, amount, quantity)
│   ├── Updates state
│   ├── Records transaction
│   └── Fires 'paper-trade-update' event
└── resetSession()
    └── Clears everything
```

## API Endpoints
```
Backend: http://localhost:5000

GET /api/search?query=RELIANCE
├── Returns: { ok: true, results: [{symbol, name, exchange}, ...] }
└── Used by: SearchBar component

GET /api/market/quotes?symbols=...
├── Returns: Current price data
└── Used by: MarketDataService → ChartSection

MarketDataService
├── getQuote(symbol)
├── getHistoricalData(symbol, timeframe)
└── Used by: TradingView for quote updates
```

## Event System
```
Window Events
├── 'paper-trade-update'
│   ├── Fired by: placeMarketOrder()
│   └── Listened by: PortfolioSummary, TradingView
└── (Used for real-time synchronization)
```

## Props Flow
```
TradingView
├── state: symbol (e.g., "RELIANCE.NS")
│   ├── → ChartSection (symbol prop)
│   ├── → OrderForm (symbol prop)
│   └── → PortfolioSummary (no prop needed, reads from store)
│
├── state: quote (from MarketDataService)
│   ├── → ChartSection (quote prop)
│   └── → OrderForm (quote prop)
│
└── Callbacks
    └── SearchBar.onSelect
        └── → setSymbol() in TradingView
```

## Data Persistence
```
localStorage ('advantix_paper_trading_state')
├── wallet
│   ├── cash (₹ amount)
│   └── startingBalance (₹100,000)
├── positions
│   └── { symbol: { qty, entryPrice, totalCost }, ... }
├── orders (transaction history)
└── config
    └── startingBalance
```

## Component State Variables
```
TradingView
├── symbol: 'AAPL' (initial)
├── quote: { price, change, ... }
├── indicesData: [market chips data]
└── now: Date (for clock)

SearchBar
├── query: ''
├── results: []
├── loading: false
└── error: null

ChartSection
├── chartData: []
├── timeframe: '1D'
├── chartType: 'line'
├── loading: false
└── error: null

OrderForm
├── amount: ''
├── quantity: ''
├── orderType: 'amount'
├── loading: false
├── livePrice: null
└── toast: null

PortfolioSummary
├── state: { wallet, positions, ... }
└── positionPrices: { symbol: price, ... }
```

## Key Functions
```
OrderForm
├── placeMarketOrder(symbol, 'BUY'/'SELL', amount, quantity)
├── subscribePrice(symbol) → unsubscribe function
└── handleSubmit('buy'/'sell')

PortfolioSummary
├── readState() → returns state object
├── subscribePrice(symbol) → unsubscribe function
└── calculateTotalEquity()

TradingView
├── handleSelect(symbol) → updates symbol & quote
└── (rest delegated to child components)

SearchBar
├── handleSelect(symbol) → calls onSelect callback
└── API calls to /api/search
```

## File Locations
```
src/
├── App.jsx                    [Line 1022: routes paper → TradingView]
├── components/paper/
│   ├── TradingView.jsx        [Main interface - YOUR DESIGN]
│   ├── SearchBar.jsx          [Stock search]
│   ├── ChartSection.jsx       [Charts & data]
│   ├── OrderForm.jsx          [Trade execution]
│   └── PortfolioSummary.jsx   [Portfolio display]
├── utils/
│   └── paperTradingStore.js   [State management]
└── services/
    └── marketDataService.js   [Historical data]

server/
└── server.js                  [Port 5000]
    ├── /api/search            [Stock search]
    ├── /api/market/quotes     [Live quotes]
    └── [other endpoints]
```

## Import Dependencies
```
TradingView imports:
├── React, useState, useEffect
├── motion from framer-motion
├── SearchBar, ChartSection, OrderForm, PortfolioSummary
└── MarketDataService

OrderForm imports:
├── React, useState, useEffect
└── { placeMarketOrder, subscribePrice } from paperTradingStore

PortfolioSummary imports:
├── React, useState, useEffect
└── { readState, subscribePrice } from paperTradingStore

ChartSection imports:
├── React components from recharts
└── MarketDataService

SearchBar imports:
├── React, useState, useEffect, useRef
├── motion, AnimatePresence from framer-motion
└── MagnifyingGlassIcon from @heroicons/react
```

## Error Handling
```
SearchBar
├── API failure → error message displayed
└── Click outside → closes dropdown

ChartSection
├── Failed load → "Failed to load chart data"
└── Missing symbol → shows loading state

OrderForm
├── No symbol/amount → "Please enter an amount"
├── Order fail → toast error notification
└── Order success → toast success notification

PortfolioSummary
├── Missing state → loading spinner
└── No positions → empty list
```

## Responsive Behavior
```
Desktop (lg+)
├── Grid: 3 cols (SearchBar+Chart on left, Order+Portfolio on right)
└── Full header visible

Tablet (md)
├── Grid: 2 cols with wrapping
└── Compact header

Mobile (sm)
├── Stack vertically
├── Full width components
└── Hamburger menu in App.jsx
```

## Live Updates Mechanism
```
Price Update Cycle
├── Every 1s: paperTradingStore simulates new price
├── Every 1s: subscribePrice callbacks fire
├── Every 1s: OrderForm updates livePrice display
├── Every 30s: ChartSection updates chart data
└── On order: 'paper-trade-update' event fires
    └── PortfolioSummary reloads state
    └── TradingView refreshes if needed
```

## Testing Order
```
1. Verify server running on port 5000
2. Search for "RELIANCE" → should show results
3. Click "RELIANCE.NS" → chart updates
4. Look at chart → should show candlesticks
5. Check OrderForm → should show live price
6. Enter amount → quantity auto-calculates
7. Click BUY → toast appears
8. Check PortfolioSummary → new position appears
9. Watch P&L → updates with price changes
10. Click SELL → position closes
```

---

**STATUS: ✅ FULLY WIRED & OPERATIONAL**

All components are properly connected. No new files created beyond what was necessary for functionality. Your original design is preserved and integrated throughout.
