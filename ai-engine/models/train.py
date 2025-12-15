"""
Simple Model Trainer - Quick Training Script
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import accuracy_score
import joblib
import yfinance as yf
import warnings
warnings.filterwarnings('ignore')

print("=" * 60)
print("AI TRADING MODEL TRAINER")
print("=" * 60)

# Step 1: Download data
print("\n[1/5] Downloading TCS stock data...")
ticker = yf.Ticker("TCS.NS")
df = ticker.history(period="2y", interval="1d")

if df.empty:
    print("ERROR: Could not download data. Check internet connection.")
    exit(1)

# Reset index to remove timezone issues
df = df.reset_index()

print(f"[OK] Downloaded {len(df)} days of data")

# Step 2: Calculate simple indicators
print("\n[2/5] Calculating technical indicators...")

# Simple Moving Averages
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

# Volume change
df['volume_change'] = df['Volume'].pct_change() * 100

# Price change
df['price_change'] = df['Close'].pct_change() * 100

# Drop NaN and replace inf
df = df.replace([np.inf, -np.inf], np.nan)
df = df.dropna()

# Clip extreme values
for col in ['volume_change', 'price_change', 'macd']:
    if col in df.columns:
        df[col] = df[col].clip(-100, 100)

print(f"[OK] Calculated 7 indicators")

# Step 3: Create labels
print("\n[3/5] Creating BUY/SELL labels...")

# Future return (3 days ahead)
df['future_return'] = df['Close'].pct_change(periods=3).shift(-3) * 100

# Label: BUY if price goes up >2%, SELL if down >2%
def create_label(future_return):
    if pd.isna(future_return):
        return None
    elif future_return >= 2.0:
        return 'BUY'
    elif future_return <= -2.0:
        return 'SELL'
    else:
        return None

df['label'] = df['future_return'].apply(create_label)
df = df[df['label'].notna()].copy()

print(f"[OK] Created {len(df)} labeled samples")
print(f"  BUY: {(df['label'] == 'BUY').sum()}")
print(f"  SELL: {(df['label'] == 'SELL').sum()}")

if len(df) < 50:
    print("ERROR: Not enough data to train. Need at least 50 samples.")
    exit(1)

# Step 4: Train model
print("\n[4/5] Training Random Forest model...")

# Features
feature_cols = ['sma_20', 'sma_50', 'rsi', 'macd', 'volume_change', 'price_change', 'Close']
X = df[feature_cols].values
y = df['label'].values

# Split (70% train, 30% test)
split_idx = int(len(X) * 0.7)
X_train, X_test = X[:split_idx], X[split_idx:]
y_train, y_test = y[:split_idx], y[split_idx:]

# Encode labels
label_encoder = LabelEncoder()
y_train_encoded = label_encoder.fit_transform(y_train)
y_test_encoded = label_encoder.transform(y_test)

# Scale features
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Train
model = RandomForestClassifier(
    n_estimators=50,
    max_depth=8,
    random_state=42,
    n_jobs=-1
)

model.fit(X_train_scaled, y_train_encoded)

# Test
predictions = model.predict(X_test_scaled)
accuracy = accuracy_score(y_test_encoded, predictions)

print(f"[OK] Model trained successfully")
print(f"  Accuracy: {accuracy:.1%}")

# Step 5: Save model
print("\n[5/5] Saving model...")

import os
os.makedirs('saved', exist_ok=True)

joblib.dump(model, 'saved/trading_model.pkl')
joblib.dump(scaler, 'saved/scaler.pkl')
joblib.dump(label_encoder, 'saved/label_encoder.pkl')

# Save feature names
with open('saved/features.txt', 'w') as f:
    f.write(','.join(feature_cols))

print(f"[OK] Model saved to models/saved/")

print("\n" + "=" * 60)
print("[DONE] TRAINING COMPLETE!")
print("=" * 60)
print("\nNext step: Start the API")
print("  cd ../api")
print("  python trading_api.py")
print("=" * 60)
