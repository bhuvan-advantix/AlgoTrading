# 🎯 HOW TO RUN - 2 SIMPLE STEPS

## ✅ STEP 1: Train Model (DONE!)

```bash
cd ai-engine\models
python train.py
```

**Status:** ✅ COMPLETE
- Model trained with 68% accuracy
- Saved to `models/saved/`

---

## 🚀 STEP 2: Start API

```bash
cd ..\api
python trading_api.py
```

**API will run at:** `http://localhost:8000`

---

## 🧪 STEP 3: Test It

**Open browser:** `http://localhost:8000/docs`

**Or use PowerShell:**
```powershell
$body = '{"symbol":"TCS.NS","portfolio_value":100000}' 
Invoke-RestMethod -Uri "http://localhost:8000/api/predict" -Method POST -Body $body -ContentType "application/json"
```

---

## 📋 What You Get

```json
{
  "prediction": {
    "action": "BUY",
    "confidence": 78.5
  },
  "trade_plan": {
    "entry_price": 3850.50,
    "stop_loss": 3795.00,
    "target": 3961.00,
    "quantity": 36
  },
  "classification": {
    "label": "GOOD TRADE"
  }
}
```

---

## 🔧 If API Fails

The API needs some packages. Install:
```bash
pip install fastapi uvicorn google-generativeai finnhub-python python-dotenv
```

---

## ✅ DONE!

1. ✅ Model trained
2. ⏭️ Start API: `cd ..\api` then `python trading_api.py`
3. ⏭️ Test: Open `http://localhost:8000/docs`
