# 🚀 SIMPLE SETUP - 3 STEPS ONLY

## ✅ Step 1: Already Done
- ✅ Virtual environment created
- ✅ All packages installed
- ✅ Gemini API key configured

---

## 📊 Step 2: Train the Model (5 minutes)

Open terminal in: `ai-engine\models`

```bash
python model_trainer.py
```

**What happens:**
- Downloads TCS stock data (2 years)
- Calculates 30+ indicators
- Trains AI model
- Saves to `models/saved/`

**Expected output:**
```
Fetching historical data for TCS.NS
Feature engineering complete
Training Random Forest model...
Validation Accuracy: 68%
Model saved successfully
```

---

## 🚀 Step 3: Start the API (1 minute)

Open terminal in: `ai-engine\api`

```bash
python trading_api.py
```

**API runs at:** `http://localhost:8000`

**Test it:** Open browser → `http://localhost:8000/docs`

---

## 🎯 Step 4: Test Prediction

**Option A: Use Browser**
1. Go to `http://localhost:8000/docs`
2. Click on `POST /api/predict`
3. Click "Try it out"
4. Enter:
```json
{
  "symbol": "TCS.NS",
  "portfolio_value": 100000
}
```
5. Click "Execute"

**Option B: Use PowerShell**
```powershell
$body = @{
    symbol = "TCS.NS"
    portfolio_value = 100000
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/predict" -Method POST -Body $body -ContentType "application/json"
```

---

## 📋 Quick Commands

```bash
# Activate virtual environment
cd ai-engine
venv\Scripts\activate

# Train model
cd models
python model_trainer.py

# Start API
cd ..\api
python trading_api.py
```

---

## ✅ What You Get

**Response will have:**
- ✅ BUY/SELL/HOLD prediction
- ✅ Confidence % (0-100)
- ✅ Entry price, Stop-loss, Target
- ✅ GOOD TRADE or BAD TRADE label
- ✅ AI reasoning (why this trade)
- ✅ Risk factors
- ✅ Position size (how many shares)

---

## 🔧 If Something Fails

**Model training fails?**
```bash
pip install yfinance ta scikit-learn
```

**API fails?**
```bash
pip install fastapi uvicorn google-generativeai
```

**Import errors?**
```bash
cd ai-engine
pip install -r requirements.txt
```

---

## 🎉 That's It!

**3 simple steps:**
1. ✅ Setup (done)
2. Train model → `python model_trainer.py`
3. Start API → `python trading_api.py`

**Then use the API in your React app!**
