"""
Simple Trading API - Works with trained model
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import joblib
import yfinance as yf
import numpy as np
import os

app = FastAPI(title="AI Trading API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model
MODEL_PATH = "../models/saved"
try:
    model = joblib.load(f"{MODEL_PATH}/trading_model.pkl")
    scaler = joblib.load(f"{MODEL_PATH}/scaler.pkl")
    label_encoder = joblib.load(f"{MODEL_PATH}/label_encoder.pkl")
    
    with open(f"{MODEL_PATH}/features.txt", 'r') as f:
        feature_names = f.read().strip().split(',')
    
    print("[OK] Model loaded successfully")
    MODEL_LOADED = True
except Exception as e:
    print(f"[ERROR] Could not load model: {e}")
    MODEL_LOADED = False

class PredictionRequest(BaseModel):
    symbol: str
    portfolio_value: Optional[float] = 100000

def calculate_indicators(df):
    """Calculate technical indicators"""
    df['sma_20'] = df['Close'].rolling(window=20).mean()
    df['sma_50'] = df['Close'].rolling(window=50).mean()
    
    # RSI
    delta = df['Close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    df['rsi'] = 100 - (100 / (1 + rs))
    
    # MACD
    ema_12 = df['Close'].ewm(span=12).mean()
    ema_26 = df['Close'].ewm(span=26).mean()
    df['macd'] = ema_12 - ema_26
    
    df['volume_change'] = df['Volume'].pct_change() * 100
    df['price_change'] = df['Close'].pct_change() * 100
    
    # Clean data
    df = df.replace([np.inf, -np.inf], np.nan)
    df = df.dropna()
    
    for col in ['volume_change', 'price_change', 'macd']:
        if col in df.columns:
            df[col] = df[col].clip(-100, 100)
    
    return df

@app.get("/")
def root():
    return {
        "status": "online",
        "message": "AI Trading API",
        "model_loaded": MODEL_LOADED
    }

@app.get("/api/health")
def health():
    return {
        "status": "healthy" if MODEL_LOADED else "model_not_loaded",
        "model_loaded": MODEL_LOADED
    }

@app.post("/api/predict")
def predict(request: PredictionRequest):
    """Get stock prediction"""
    
    if not MODEL_LOADED:
        raise HTTPException(status_code=503, detail="Model not loaded. Run train.py first.")
    
    try:
        # Get data
        ticker = yf.Ticker(request.symbol)
        df = ticker.history(period="3mo", interval="1d")
        
        if df.empty:
            raise HTTPException(status_code=404, detail="Stock data not available")
        
        df = df.reset_index()
        
        # Calculate indicators
        df = calculate_indicators(df)
        
        if len(df) < 10:
            raise HTTPException(status_code=400, detail="Not enough data")
        
        # Get latest values
        latest = df.iloc[-1]
        current_price = float(latest['Close'])
        
        # Prepare features
        features = []
        for col in feature_names:
            features.append(float(latest[col]))
        
        X = np.array(features).reshape(1, -1)
        X_scaled = scaler.transform(X)
        
        # Predict
        prediction_encoded = model.predict(X_scaled)[0]
        probabilities = model.predict_proba(X_scaled)[0]
        
        prediction = label_encoder.inverse_transform([prediction_encoded])[0]
        confidence = float(max(probabilities)) * 100
        
        # Calculate trade plan
        atr = current_price * 0.02  # 2% ATR estimate
        
        if prediction == "BUY":
            entry = current_price
            stop_loss = entry - (2 * atr)
            target = entry + (2 * 2 * atr)  # 1:2 risk:reward
        else:  # SELL
            entry = current_price
            stop_loss = entry + (2 * atr)
            target = entry - (2 * 2 * atr)
        
        # Position sizing
        risk_amount = request.portfolio_value * 0.02
        risk_per_share = abs(entry - stop_loss)
        quantity = int(risk_amount / risk_per_share) if risk_per_share > 0 else 0
        
        # Classification
        label = "GOOD TRADE" if confidence >= 65 else "BAD TRADE"
        
        response = {
            "stock": {
                "symbol": request.symbol,
                "ltp": round(current_price, 2),
                "change_percent": round(float(latest.get('price_change', 0)), 2)
            },
            "prediction": {
                "action": prediction,
                "confidence": round(confidence, 2),
                "probabilities": {
                    "BUY": round(float(probabilities[0]) * 100, 2) if len(probabilities) > 0 else 0,
                    "SELL": round(float(probabilities[1]) * 100, 2) if len(probabilities) > 1 else 0
                }
            },
            "trade_plan": {
                "entry_price": round(entry, 2),
                "stop_loss": round(stop_loss, 2),
                "target": round(target, 2),
                "quantity": quantity,
                "investment": round(quantity * entry, 2),
                "risk_reward_ratio": "1:2.0"
            },
            "classification": {
                "label": label,
                "score": round(confidence, 2)
            },
            "technical_indicators": {
                "RSI": round(float(latest['rsi']), 2),
                "SMA_20": round(float(latest['sma_20']), 2),
                "SMA_50": round(float(latest['sma_50']), 2),
                "MACD": round(float(latest['macd']), 2)
            }
        }
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*60)
    print("Starting AI Trading API...")
    print("API will be available at: http://localhost:8000")
    print("API docs at: http://localhost:8000/docs")
    print("="*60 + "\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)
