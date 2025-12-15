# AI Trading Algorithm - Complete System Design
**Advantix AlgoTrading Platform**  
**Date:** December 13, 2025  
**Author:** Senior Quant Engineer & AI Architect

---

## 1. SYSTEM ARCHITECTURE

### 1.1 Folder Structure
```
ai-engine/                          # NEW Python-only AI module
├── models/                         # ML models
│   ├── predictor.py               # Main prediction engine
│   ├── feature_engineering.py     # Technical indicators
│   └── model_trainer.py           # Training pipeline
├── data/
│   ├── yahoo_connector.py         # Historical data fetcher
│   ├── finnhub_connector.py       # News & sentiment
│   └── data_preprocessor.py       # Clean & normalize data
├── decision/
│   ├── trade_analyzer.py          # Entry/Exit/SL/Target logic
│   ├── risk_manager.py            # Risk:Reward calculator
│   └── trade_classifier.py        # GOOD vs BAD trade marker
├── gemini/
│   ├── context_analyzer.py        # Market context analysis
│   ├── news_analyzer.py           # News impact assessment
│   └── explainer.py               # Trade reasoning generator
├── feedback/
│   ├── feedback_store.py          # Store user decisions
│   └── feedback_learner.py        # Improve from feedback
├── api/
│   └── trading_api.py             # REST API for frontend
├── config/
│   └── settings.py                # Configuration
└── utils/
    └── helpers.py                 # Utility functions
```

### 1.2 Technology Stack
- **Python 3.10+** (mandatory)
- **scikit-learn** (Random Forest, XGBoost)
- **pandas/numpy** (data processing)
- **yfinance** (Yahoo Finance connector)
- **finnhub-python** (News & sentiment)
- **Google Gemini API** (context analysis)
- **FastAPI** (REST API)
- **SQLite/PostgreSQL** (feedback storage)

---

## 2. HOW THE SYSTEM LEARNS

### 2.1 Data Collection (Yahoo Finance)
**Historical Data Fetched:**
- OHLCV (Open, High, Low, Close, Volume) - Last 2 years
- Adjusted Close (for splits/dividends)
- Intraday data (5min, 15min intervals)

**Frequency:**
- Daily: Full historical update
- Intraday: Every 15 minutes during market hours

### 2.2 Feature Engineering
**Raw data is converted into 25+ features:**

**Trend Indicators:**
- EMA 9, 21, 50, 200 (Exponential Moving Averages)
- SMA 20, 50 (Simple Moving Averages)
- MACD (12, 26, 9)
- ADX (Average Directional Index)

**Momentum Indicators:**
- RSI 14 (Relative Strength Index)
- Stochastic Oscillator
- CCI (Commodity Channel Index)

**Volatility Indicators:**
- ATR (Average True Range)
- Bollinger Bands (20, 2)
- Standard Deviation

**Volume Indicators:**
- VWAP (Volume Weighted Average Price)
- OBV (On-Balance Volume)
- Volume Rate of Change

**Price Action:**
- Support/Resistance levels
- Candlestick patterns (Doji, Hammer, Engulfing)
- Price momentum (% change)

**Market Context:**
- Correlation with Nifty50/Sensex
- Sector performance
- Market breadth

### 2.3 Supervised Learning Process

**Step 1: Label Creation**
```
Historical data is labeled based on future price movement:

If price increases ≥2% within 3 days → BUY
If price decreases ≥2% within 3 days → SELL
Otherwise → HOLD
```

**Step 2: Training Dataset**
```
Input (X):  25+ technical indicators at time T
Output (Y): BUY/SELL/HOLD label based on T+3 days

Example:
X = [RSI=45, MACD=0.5, EMA9=150, Volume=2M, ...]
Y = BUY (because price rose 3% in next 3 days)
```

**Step 3: Model Training**
```
Algorithm: Random Forest Classifier (primary)
           XGBoost (secondary for comparison)

Training: 70% of historical data (2023-2024)
Validation: 15% (holdout set)
Testing: 15% (unseen recent data)

Cross-validation: 5-fold time-series split
```

**Step 4: Model Evaluation**
```
Metrics tracked:
- Accuracy: % of correct predictions
- Precision: % of BUY signals that were profitable
- Recall: % of profitable opportunities caught
- F1-Score: Balance of precision & recall
- Sharpe Ratio: Risk-adjusted returns
```

**Step 5: Continuous Learning**
```
Weekly retraining:
- Add new market data
- Include user feedback (approve/decline)
- Retrain model with updated dataset
- A/B test new model vs current model
- Deploy if performance improves
```

---

## 3. AI & ML RESPONSIBILITIES

### 3.1 Machine Learning Engine (Python)

**Primary Function:** Predict BUY/SELL/HOLD

**Input:**
- Real-time stock data (current OHLCV)
- Calculated technical indicators
- Historical patterns

**Output:**
```json
{
  "prediction": "BUY",
  "confidence": 78.5,
  "probabilities": {
    "BUY": 0.785,
    "HOLD": 0.150,
    "SELL": 0.065
  },
  "contributing_factors": [
    "RSI oversold (32)",
    "MACD bullish crossover",
    "Volume surge (+45%)",
    "EMA9 > EMA21 (golden cross)"
  ]
}
```

**Confidence Score Calculation:**
```
Confidence = max(probability) × 100
Example: max(0.785, 0.150, 0.065) = 0.785 → 78.5%
```

### 3.2 Gemini AI (Context & Explanation)

**Primary Function:** Analyze market context & explain trades

**Input:**
- ML prediction + confidence
- Current market conditions
- News headlines (Finnhub)
- Sector trends
- Index movement (Nifty/Sensex)

**Output:**
```json
{
  "market_context": "Bullish market, Nifty up 1.2%",
  "sector_analysis": "IT sector showing strength",
  "news_impact": "Neutral - no major events",
  "trade_reasoning": "Strong technical setup with RSI recovery from oversold. MACD shows bullish momentum. Volume confirms buying interest. Market sentiment positive.",
  "risk_factors": "Resistance at ₹155 may cause pullback",
  "recommendation": "GOOD TRADE - High probability setup"
}
```

**Gemini NEVER:**
- Places trades directly
- Overrides ML predictions
- Makes final decisions

**Gemini ONLY:**
- Provides context
- Explains WHY
- Highlights risks
- Validates ML logic

---

## 4. ALGORITHM DECISION LOGIC

### 4.1 Decision Flow

```
Step 1: ML Prediction
↓
Step 2: Gemini Context Analysis
↓
Step 3: Risk Management Calculation
↓
Step 4: Trade Classification (GOOD/BAD)
↓
Step 5: Generate Trade Plan
↓
Step 6: Send to Frontend (JSON)
```

### 4.2 Entry Price Calculation

**For BUY:**
```
Entry Price = Current LTP (Last Traded Price)
OR
Entry Price = Limit order at support level (conservative)
```

**For SELL:**
```
Entry Price = Current LTP
OR
Entry Price = Limit order at resistance level
```

### 4.3 Stop-Loss Calculation

**Method 1: ATR-based (Dynamic)**
```
Stop-Loss = Entry Price - (2 × ATR)

Example:
Entry = ₹150
ATR = ₹3
Stop-Loss = ₹150 - (2 × ₹3) = ₹144
```

**Method 2: Support-based**
```
Stop-Loss = Recent swing low - ₹0.50 buffer

Example:
Entry = ₹150
Recent low = ₹146
Stop-Loss = ₹146 - ₹0.50 = ₹145.50
```

**Method 3: Percentage-based**
```
Stop-Loss = Entry × (1 - Risk%)

Example:
Entry = ₹150
Risk = 3%
Stop-Loss = ₹150 × 0.97 = ₹145.50
```

### 4.4 Target Calculation

**Risk:Reward Ratio = 1:2 minimum**

```
Risk = Entry - Stop-Loss
Reward = Risk × 2

Target = Entry + Reward

Example:
Entry = ₹150
Stop-Loss = ₹145 (Risk = ₹5)
Reward = ₹5 × 2 = ₹10
Target = ₹150 + ₹10 = ₹160
```

**Multiple Targets (Advanced):**
```
Target 1 (50% position): 1:1.5 ratio
Target 2 (30% position): 1:2 ratio
Target 3 (20% position): 1:3 ratio
```

### 4.5 Position Sizing

```
Risk per trade = 2% of portfolio

Position Size = (Portfolio × Risk%) / (Entry - Stop-Loss)

Example:
Portfolio = ₹1,00,000
Risk = 2% = ₹2,000
Entry = ₹150
Stop-Loss = ₹145
Risk per share = ₹5

Quantity = ₹2,000 / ₹5 = 400 shares
Investment = 400 × ₹150 = ₹60,000
```

---

## 5. GOOD vs BAD TRADE CLASSIFICATION

### 5.1 GOOD TRADE Criteria

**All conditions must be met:**

1. **ML Confidence ≥ 65%**
   - High probability prediction
   - Model is confident

2. **Trend Alignment**
   - Stock trend matches index (Nifty/Sensex)
   - Sector showing strength
   - No divergence

3. **News Sentiment**
   - Positive or neutral news
   - No major negative events
   - No earnings surprises (negative)

4. **Risk:Reward ≥ 1:2**
   - Minimum 2x reward vs risk
   - Clear target achievable

5. **Technical Confirmation**
   - Multiple indicators agree
   - Volume supports move
   - No conflicting signals

6. **Liquidity**
   - Average volume > 100,000 shares/day
   - Tight bid-ask spread

**Scoring System:**
```
Score = (Confidence × 0.4) + 
        (Trend Alignment × 0.2) + 
        (News Sentiment × 0.15) + 
        (Risk:Reward × 0.15) + 
        (Technical Score × 0.10)

GOOD TRADE: Score ≥ 70
```

### 5.2 BAD TRADE Criteria

**Any condition triggers BAD:**

1. **Low Confidence (<65%)**
   - Model uncertain
   - Weak prediction

2. **Conflicting Indicators**
   - RSI says sell, MACD says buy
   - No clear direction

3. **Negative News**
   - Earnings miss
   - Regulatory issues
   - Management changes

4. **Poor Risk:Reward (<1:1.5)**
   - Risk too high for reward
   - Stop-loss too wide

5. **High Volatility Event**
   - RBI policy announcement
   - Budget day
   - Global market crash

6. **Low Liquidity**
   - Volume < 50,000 shares/day
   - Wide bid-ask spread

**Auto-Reject Scenarios:**
```
- Confidence < 50%
- Major negative news in last 24 hours
- Risk:Reward < 1:1
- Stock in ban list (F&O)
```

---

## 6. FRONTEND INTEGRATION

### 6.1 JSON Output Format

```json
{
  "timestamp": "2025-12-13T16:52:21+05:30",
  "stock": {
    "symbol": "TCS.NS",
    "name": "Tata Consultancy Services",
    "ltp": 3850.50,
    "change": "+1.2%"
  },
  "prediction": {
    "action": "BUY",
    "confidence": 78.5,
    "probabilities": {
      "BUY": 0.785,
      "HOLD": 0.150,
      "SELL": 0.065
    }
  },
  "trade_plan": {
    "entry_price": 3850.50,
    "stop_loss": 3795.00,
    "target": 3961.00,
    "risk_amount": 55.50,
    "reward_amount": 110.50,
    "risk_reward_ratio": "1:2.0",
    "quantity": 36,
    "investment": 138618.00
  },
  "classification": {
    "label": "GOOD TRADE",
    "score": 82.5,
    "reasons": [
      "High ML confidence (78.5%)",
      "Nifty bullish (+1.2%)",
      "IT sector strong",
      "Excellent risk:reward (1:2)",
      "Volume surge confirms buying"
    ]
  },
  "gemini_analysis": {
    "market_context": "Market in bullish mode. Nifty trading near all-time high. FII buying continues.",
    "sector_view": "IT sector outperforming. TCS showing relative strength vs peers.",
    "news_impact": "Neutral. No major news. Q3 earnings expected next month.",
    "reasoning": "TCS showing strong technical setup. RSI recovered from oversold zone (32→48). MACD bullish crossover confirmed. Volume 45% above average indicates institutional buying. Support at ₹3795 is strong. Target ₹3961 achievable in 3-5 days.",
    "risk_factors": [
      "Resistance at ₹3900 may slow momentum",
      "Dollar weakness could impact IT stocks",
      "Book profits if Nifty reverses sharply"
    ]
  },
  "technical_indicators": {
    "RSI": 48.2,
    "MACD": "Bullish crossover",
    "EMA_9": 3842,
    "EMA_21": 3815,
    "Volume": "+45% above average",
    "ATR": 27.75
  },
  "metadata": {
    "model_version": "v2.3.1",
    "prediction_id": "pred_20251213_165221_TCS",
    "valid_until": "2025-12-13T17:00:00+05:30"
  }
}
```

### 6.2 UI Display Mapping

**Stock Card:**
```
┌─────────────────────────────────────┐
│ 🟢 GOOD TRADE                       │
│                                     │
│ TCS.NS - Tata Consultancy Services  │
│ ₹3,850.50 (+1.2%)                   │
│                                     │
│ Action: BUY                         │
│ Confidence: 78.5%                   │
│                                     │
│ Entry: ₹3,850.50                    │
│ Stop-Loss: ₹3,795.00                │
│ Target: ₹3,961.00                   │
│ Risk:Reward: 1:2.0                  │
│                                     │
│ Quantity: 36 shares                 │
│ Investment: ₹1,38,618               │
│                                     │
│ 🤖 AI Reasoning:                    │
│ "TCS showing strong technical       │
│  setup. RSI recovered from          │
│  oversold. MACD bullish crossover.  │
│  Volume surge confirms buying..."   │
│                                     │
│ [Approve] [Decline] [Details]       │
└─────────────────────────────────────┘
```

### 6.3 User Actions

**APPROVE Button:**
```
→ Store as positive feedback
→ Execute paper trade (if Paper mode)
→ Show confirmation modal (if Live mode)
→ Update ML training dataset
```

**DECLINE Button:**
```
→ Store as negative feedback
→ Do NOT place trade
→ Ask reason (optional):
  - Low confidence
  - Bad timing
  - Don't like stock
  - Other
→ Update ML training dataset
```

**DETAILS Button:**
```
→ Show full analysis
→ Display all technical indicators
→ Show Gemini full reasoning
→ Chart with entry/SL/target markers
```

---

## 7. LEARNING FEEDBACK LOOP

### 7.1 Feedback Collection

**User Approves Trade:**
```json
{
  "prediction_id": "pred_20251213_165221_TCS",
  "user_action": "APPROVE",
  "timestamp": "2025-12-13T16:55:00+05:30",
  "trade_executed": true,
  "execution_price": 3851.00
}
```

**User Declines Trade:**
```json
{
  "prediction_id": "pred_20251213_165221_TCS",
  "user_action": "DECLINE",
  "timestamp": "2025-12-13T16:55:00+05:30",
  "reason": "Low confidence",
  "trade_executed": false
}
```

**Trade Outcome (After 3 days):**
```json
{
  "prediction_id": "pred_20251213_165221_TCS",
  "outcome": "SUCCESS",
  "entry_price": 3851.00,
  "exit_price": 3965.00,
  "profit_loss": 114.00,
  "profit_percent": 2.96,
  "target_hit": true,
  "stop_loss_hit": false,
  "days_held": 3
}
```

### 7.2 Feedback Processing

**Positive Feedback (Approved + Profitable):**
```
Weight = +2 points
Action: Reinforce similar patterns
Effect: Increase confidence for similar setups
```

**Negative Feedback (Approved + Loss):**
```
Weight = -3 points
Action: Penalize similar patterns
Effect: Decrease confidence for similar setups
```

**User Decline (Good Trade):**
```
Weight = -1 point
Action: Investigate why user declined
Effect: Adjust classification criteria
```

**User Approve (Bad Trade):**
```
Weight = +1 point
Action: Re-evaluate BAD trade criteria
Effect: May reclassify if consistently approved
```

### 7.3 Model Improvement

**Weekly Retraining:**
```
1. Collect all feedback from past week
2. Add new market data (Yahoo Finance)
3. Recalculate features
4. Update labels based on actual outcomes
5. Retrain model with expanded dataset
6. Validate on holdout set
7. A/B test: 80% old model, 20% new model
8. Deploy if accuracy improves ≥2%
```

**Metrics Tracked:**
```
- Prediction accuracy (before vs after)
- Win rate (% profitable trades)
- Average profit per trade
- Sharpe ratio
- Maximum drawdown
- User approval rate
```

**Continuous Improvement:**
```
Month 1: Accuracy 65% → 68%
Month 2: Accuracy 68% → 71%
Month 3: Accuracy 71% → 74%
Target: 75%+ accuracy within 6 months
```

---

## 8. SAFETY & RISK MANAGEMENT

### 8.1 Trading Limits

**Per Trade:**
```
- Max risk: 2% of portfolio
- Max position size: 20% of portfolio
- Min risk:reward: 1:1.5
```

**Daily Limits:**
```
- Max trades: 5 per day
- Max loss: 5% of portfolio
- Stop trading if 3 consecutive losses
```

**Weekly Limits:**
```
- Max trades: 15 per week
- Max loss: 10% of portfolio
```

### 8.2 Circuit Breakers

**Auto-Stop Conditions:**
```
1. Portfolio loss ≥ 5% in single day
   → Stop all trading, alert user

2. 3 consecutive stop-loss hits
   → Pause for 24 hours, review system

3. Market crash (Nifty down ≥3%)
   → Switch to defensive mode, no new trades

4. High volatility (VIX > 25)
   → Reduce position sizes by 50%
```

### 8.3 Paper Trading First

**Mandatory Testing:**
```
1. All new users start with Paper Trading
2. Minimum 20 paper trades required
3. Win rate ≥ 55% to unlock Live Trading
4. Profit factor ≥ 1.5 required
```

**Paper to Live Transition:**
```
User must demonstrate:
- Understanding of system
- Discipline (following SL/Target)
- Consistent profitability
- Risk management
```

---

## 9. PRODUCTION DEPLOYMENT

### 9.1 System Requirements

**Server:**
```
- CPU: 4 cores minimum
- RAM: 8GB minimum
- Storage: 50GB SSD
- OS: Ubuntu 22.04 LTS
```

**Python Environment:**
```
- Python 3.10+
- Virtual environment (venv)
- Requirements.txt with pinned versions
```

### 9.2 API Deployment

**FastAPI Server:**
```
Endpoints:
POST /api/predict          → Get stock prediction
POST /api/analyze          → Get Gemini analysis
POST /api/feedback         → Submit user feedback
GET  /api/suggestions      → Get top stock picks
GET  /api/model/status     → Check model health
```

**Response Time:**
```
- Prediction: <2 seconds
- Analysis: <3 seconds
- Feedback: <500ms
```

### 9.3 Monitoring

**Health Checks:**
```
- API uptime: 99.5%+
- Model accuracy: Track daily
- Prediction latency: <2s
- Error rate: <1%
```

**Alerts:**
```
- Model accuracy drops ≥5%
- API downtime >5 minutes
- Unusual prediction patterns
- High error rate
```

---

## 10. INDIAN MARKET SPECIFICS

### 10.1 Market Hours

```
Pre-market: 09:00 - 09:15
Regular: 09:15 - 15:30
Post-market: 15:40 - 16:00

AI predictions:
- Generated at 09:00 (pre-market)
- Updated at 12:00 (mid-day)
- Final update at 15:00 (before close)
```

### 10.2 Stock Universe

**Nifty 50:**
```
- Primary focus
- High liquidity
- Reliable data
```

**Nifty 100:**
```
- Secondary focus
- Good liquidity
- Diversification
```

**Filters:**
```
- Min market cap: ₹1,000 crore
- Min avg volume: 100,000 shares/day
- No penny stocks
- No illiquid stocks
```

### 10.3 Regulatory Compliance

**SEBI Guidelines:**
```
- No insider trading
- No market manipulation
- Proper risk disclosure
- User consent required
```

**Disclaimers:**
```
"AI predictions are for educational purposes.
 Past performance does not guarantee future results.
 Trading involves risk of loss.
 Consult financial advisor before trading."
```

---

## 11. EXPLAINABILITY

### 11.1 Why Explainability Matters

```
Users must understand:
- WHY the AI suggested a trade
- WHAT factors influenced the decision
- WHAT risks are involved
- HOW confident the system is
```

### 11.2 Explanation Components

**Technical Explanation:**
```
"RSI at 32 indicates oversold condition.
 MACD bullish crossover suggests upward momentum.
 Volume 45% above average confirms buying interest.
 EMA9 crossed above EMA21 (golden cross)."
```

**Fundamental Context:**
```
"TCS is a blue-chip IT stock.
 Strong fundamentals with consistent earnings.
 No major debt concerns.
 Dividend yield: 1.5%."
```

**Market Context:**
```
"Nifty up 1.2%, bullish market sentiment.
 IT sector outperforming other sectors.
 FII buying continues for 5th consecutive day."
```

**Risk Disclosure:**
```
"Resistance at ₹3900 may slow momentum.
 Dollar weakness could impact IT stocks.
 Book profits if Nifty reverses sharply."
```

### 11.3 Feature Importance

**Show top 5 contributing factors:**
```
1. MACD Crossover (25% weight)
2. Volume Surge (20% weight)
3. RSI Recovery (18% weight)
4. Trend Alignment (15% weight)
5. News Sentiment (12% weight)
```

---

## 12. FINAL SUMMARY

### 12.1 System Capabilities

✅ **Learns from historical data** (Yahoo Finance)  
✅ **Predicts BUY/SELL/HOLD** with confidence  
✅ **Calculates Entry/SL/Target** automatically  
✅ **Classifies GOOD vs BAD trades**  
✅ **Provides AI reasoning** (Gemini)  
✅ **Improves from user feedback**  
✅ **Safe for Paper Trading first**  
✅ **Production-ready for Indian markets**  
✅ **Fully explainable** (no black-box)  

### 12.2 User Journey

```
1. User opens AI Trading tab
2. System shows top 3-5 stock suggestions
3. Each suggestion shows:
   - GOOD/BAD trade label
   - Confidence score
   - Entry/SL/Target
   - AI reasoning
4. User clicks APPROVE or DECLINE
5. If APPROVE → Paper trade executed
6. If DECLINE → Feedback stored
7. System learns from outcome
8. Accuracy improves over time
```

### 12.3 Success Metrics

**Target Performance:**
```
- Prediction accuracy: 75%+
- Win rate: 60%+
- Average R:R: 1:2
- Sharpe ratio: >1.5
- Max drawdown: <15%
- User approval rate: 70%+
```

---

## END OF DESIGN DOCUMENT

**Next Steps:**
1. Review and approve this design
2. Set up Python environment
3. Implement data connectors
4. Build ML pipeline
5. Integrate Gemini API
6. Create REST API
7. Connect to frontend
8. Test with paper trading
9. Deploy to production

**Questions? Ready to proceed with implementation?**
