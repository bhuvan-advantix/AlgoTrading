# 🚀 Quick Start Guide - AI Trading Engine

## Step 1: Setup Environment

```bash
cd ai-engine
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

## Step 2: Configure API Keys

Create `.env` file (copy from `.env.example`):

```env
GEMINI_API_KEY=your_actual_gemini_key
FINNHUB_API_KEY=your_actual_finnhub_key
```

**Get API Keys:**
- Gemini: https://makersuite.google.com/app/apikey
- Finnhub: https://finnhub.io/register

## Step 3: Train the Model

```bash
cd models
python model_trainer.py
```

This will:
- Download 2 years of TCS stock data
- Generate 30+ technical indicators
- Train Random Forest model
- Save to `models/saved/`

**Expected output:**
```
Fetching historical data for TCS.NS
Feature engineering complete. Rows: 500 → 480
Training Random Forest model...
Validation Accuracy: 68.5%
Test Accuracy: 65.2%
Model saved successfully
```

## Step 4: Test Prediction

```bash
cd models
python predictor.py
```

**Expected output:**
```
Prediction for TCS.NS: BUY (78.5%)
```

## Step 5: Start API Server

```bash
cd api
python trading_api.py
```

**API will run at:** `http://localhost:8000`

**Test in browser:** `http://localhost:8000/docs`

## Step 6: Test API

Open new terminal:

```bash
curl -X POST http://localhost:8000/api/predict \
  -H "Content-Type: application/json" \
  -d "{\"symbol\":\"TCS.NS\",\"portfolio_value\":100000}"
```

**Or use Postman/Thunder Client**

## Step 7: Integrate with Frontend

In your React app:

```javascript
const getPrediction = async (symbol) => {
  const response = await fetch('http://localhost:8000/api/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      symbol: symbol,
      portfolio_value: 100000
    })
  });
  
  const data = await response.json();
  return data;
};

// Usage
const prediction = await getPrediction('TCS.NS');
console.log(prediction.classification.label); // "GOOD TRADE" or "BAD TRADE"
```

## 📊 Expected Response Format

```json
{
  "stock": {
    "symbol": "TCS.NS",
    "ltp": 3850.50,
    "change_percent": 1.2
  },
  "prediction": {
    "action": "BUY",
    "confidence": 78.5,
    "probabilities": {
      "BUY": 78.5,
      "SELL": 10.0,
      "HOLD": 11.5
    }
  },
  "trade_plan": {
    "entry_price": 3850.50,
    "stop_loss": 3795.00,
    "target": 3961.00,
    "risk_reward_ratio": "1:2.0",
    "quantity": 36,
    "investment": 138618.00
  },
  "classification": {
    "label": "GOOD TRADE",
    "score": 82.5,
    "reasons": [
      "High ML confidence (78.5%)",
      "Trend aligned with market",
      "Excellent risk:reward (1:2.0)"
    ]
  },
  "gemini_analysis": {
    "market_context": "Market in bullish mode...",
    "reasoning": "TCS showing strong technical setup...",
    "risk_factors": [
      "Resistance at ₹3900 may slow momentum"
    ]
  }
}
```

## 🎯 Next Steps

1. **Train on More Stocks**: Modify `model_trainer.py` to train on multiple stocks
2. **Customize Settings**: Edit `config/settings.py`
3. **Add More Features**: Enhance `feature_engineering.py`
4. **Improve Classification**: Tune `trade_classifier.py` weights
5. **Deploy**: Use Docker or cloud hosting

## 🐛 Common Issues

### "Model not found"
```bash
cd models
python model_trainer.py
```

### "API key not configured"
Check `.env` file exists and has valid keys

### "Import errors"
```bash
pip install -r requirements.txt
```

### "No data available"
- Check internet connection
- Verify stock symbol format (e.g., `TCS.NS` for NSE)

## 📚 Documentation

- Full Design: `../AI_TRADING_ALGORITHM_DESIGN.md`
- Detailed README: `README.md`
- API Docs: `http://localhost:8000/docs`

---

**You're all set! 🎉**

The AI Trading Engine is ready to provide intelligent stock predictions with full explainability.
