# AI Trading Engine

Complete AI-powered trading system for Advantix AlgoTrading platform.

## 🚀 Features

- **Machine Learning Predictions**: Random Forest classifier for BUY/SELL/HOLD signals
- **Technical Analysis**: 30+ indicators (RSI, MACD, EMA, Bollinger Bands, ATR, VWAP, etc.)
- **Gemini AI Integration**: Market context analysis and trade reasoning
- **News Sentiment**: Finnhub integration for news analysis
- **Risk Management**: Position sizing, stop-loss, target calculation
- **Trade Classification**: Automatic GOOD/BAD trade marking
- **Feedback Loop**: Learn from user decisions and trade outcomes
- **REST API**: FastAPI endpoints for frontend integration

## 📁 Project Structure

```
ai-engine/
├── models/                    # ML models
│   ├── predictor.py          # Main prediction engine
│   ├── feature_engineering.py # Technical indicators
│   └── model_trainer.py      # Training pipeline
├── data/                      # Data connectors
│   ├── yahoo_connector.py    # Yahoo Finance
│   └── finnhub_connector.py  # News & sentiment
├── decision/                  # Trading logic
│   ├── trade_analyzer.py     # Entry/SL/Target
│   ├── trade_classifier.py   # GOOD/BAD classification
│   └── risk_manager.py       # Risk limits
├── gemini/                    # Gemini AI
│   └── context_analyzer.py   # Market analysis
├── feedback/                  # Learning system
│   └── feedback_store.py     # Store feedback
├── api/                       # REST API
│   └── trading_api.py        # FastAPI server
├── config/                    # Configuration
│   └── settings.py           # Settings
└── utils/                     # Utilities
    └── helpers.py            # Helper functions
```

## 🛠️ Installation

### 1. Create Virtual Environment

```bash
cd ai-engine
python -m venv venv
```

### 2. Activate Virtual Environment

**Windows:**
```bash
venv\Scripts\activate
```

**Linux/Mac:**
```bash
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Set Environment Variables

Create `.env` file:

```env
GEMINI_API_KEY=your_gemini_api_key_here
FINNHUB_API_KEY=your_finnhub_api_key_here
```

## 📊 Training the Model

Before making predictions, train the ML model:

```bash
cd models
python model_trainer.py
```

This will:
- Fetch 2 years of historical data
- Generate technical indicators
- Create BUY/SELL labels
- Train Random Forest model
- Save model to `models/saved/`

## 🚀 Running the API

Start the FastAPI server:

```bash
cd api
python trading_api.py
```

API will be available at: `http://localhost:8000`

API Documentation: `http://localhost:8000/docs`

## 📡 API Endpoints

### 1. Get Prediction

```http
POST /api/predict
Content-Type: application/json

{
  "symbol": "TCS.NS",
  "portfolio_value": 100000
}
```

**Response:**
```json
{
  "stock": {
    "symbol": "TCS.NS",
    "ltp": 3850.50,
    "change_percent": 1.2
  },
  "prediction": {
    "action": "BUY",
    "confidence": 78.5
  },
  "trade_plan": {
    "entry_price": 3850.50,
    "stop_loss": 3795.00,
    "target": 3961.00,
    "quantity": 36,
    "investment": 138618.00
  },
  "classification": {
    "label": "GOOD TRADE",
    "score": 82.5,
    "reasons": [...]
  },
  "gemini_analysis": {
    "reasoning": "...",
    "risk_factors": [...]
  }
}
```

### 2. Submit Feedback

```http
POST /api/feedback

{
  "prediction_id": "pred_20251213_170000_TCS",
  "user_action": "APPROVE",
  "trade_executed": true
}
```

### 3. Get Stock Suggestions

```http
GET /api/suggestions?min_confidence=65&limit=5
```

### 4. Get Statistics

```http
GET /api/stats
```

## 🧪 Testing Individual Components

### Test Yahoo Finance Connector

```bash
cd data
python yahoo_connector.py
```

### Test Feature Engineering

```bash
cd models
python feature_engineering.py
```

### Test Predictor

```bash
cd models
python predictor.py
```

## 🔧 Configuration

Edit `config/settings.py` to customize:

- **Technical Indicators**: EMA periods, RSI settings, etc.
- **Risk Management**: Risk per trade, position limits
- **Trading Limits**: Max trades per day/week
- **ML Parameters**: Train/test split, cross-validation
- **Good/Bad Trade Scoring**: Confidence thresholds, weights

## 📈 How It Works

### 1. Data Collection
- Fetches historical OHLCV from Yahoo Finance
- Gets news from Finnhub

### 2. Feature Engineering
- Calculates 30+ technical indicators
- Normalizes data

### 3. ML Prediction
- Random Forest predicts BUY/SELL/HOLD
- Provides confidence score (0-100%)

### 4. Trade Analysis
- Calculates entry price (current LTP)
- Stop-loss (ATR-based: Entry - 2×ATR)
- Target (Risk:Reward 1:2)
- Position size (2% portfolio risk)

### 5. Classification
- Scores based on:
  - ML confidence (40%)
  - Trend alignment (20%)
  - News sentiment (15%)
  - Risk:reward (15%)
  - Technical agreement (10%)
- Marks as GOOD (≥70) or BAD (<70)

### 6. Gemini Analysis
- Provides market context
- Explains trade reasoning
- Identifies risk factors

### 7. Feedback Loop
- Stores user decisions (APPROVE/DECLINE)
- Tracks trade outcomes
- Retrains model weekly

## 🛡️ Safety Features

- **Position Limits**: Max 20% of portfolio per trade
- **Daily Limits**: Max 5 trades per day
- **Loss Limits**: Stop at 5% daily loss
- **Circuit Breaker**: Pause after 3 consecutive losses
- **Risk:Reward**: Minimum 1:1.5 ratio enforced

## 📊 Performance Metrics

Track system performance:
- Prediction accuracy
- Win rate
- Average profit %
- Sharpe ratio
- Maximum drawdown

## 🔄 Continuous Improvement

The system learns from:
1. **User Feedback**: APPROVE/DECLINE decisions
2. **Trade Outcomes**: Actual profit/loss
3. **Weekly Retraining**: Updated with new data

## 🌐 Frontend Integration

Connect your React frontend to the API:

```javascript
// Get prediction
const response = await fetch('http://localhost:8000/api/predict', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    symbol: 'TCS.NS',
    portfolio_value: 100000
  })
});

const prediction = await response.json();
```

## 📝 Environment Variables

Required:
- `GEMINI_API_KEY`: Google Gemini API key
- `FINNHUB_API_KEY`: Finnhub API key

Optional:
- `API_HOST`: API host (default: 0.0.0.0)
- `API_PORT`: API port (default: 8000)

## 🐛 Troubleshooting

### Model not found
```bash
cd models
python model_trainer.py
```

### API key errors
Check `.env` file has correct keys

### Import errors
```bash
pip install -r requirements.txt
```

## 📚 Documentation

- Design Document: `../AI_TRADING_ALGORITHM_DESIGN.md`
- API Docs: `http://localhost:8000/docs` (when running)

## 🤝 Support

For issues or questions, check the logs in `logs/ai_engine.log`

## 📄 License

Proprietary - Advantix AlgoTrading Platform

---

**Built with ❤️ for Indian Stock Markets**
