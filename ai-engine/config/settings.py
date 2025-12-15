"""
AI Trading Engine - Configuration Settings
"""

import os
from pathlib import Path

# Base Directory
BASE_DIR = Path(__file__).resolve().parent.parent

# API Keys (Load from environment variables)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY", "")

# Data Settings
HISTORICAL_YEARS = 2  # Years of historical data to fetch
UPDATE_INTERVAL = 900  # 15 minutes in seconds
MARKET_OPEN = "09:15"
MARKET_CLOSE = "15:30"

# Stock Universe
STOCK_UNIVERSE = "NIFTY50"  # Options: NIFTY50, NIFTY100, CUSTOM
MIN_MARKET_CAP = 1000  # Crores
MIN_AVG_VOLUME = 100000  # Shares per day

# Technical Indicators
INDICATORS = {
    "EMA": [9, 21, 50, 200],
    "SMA": [20, 50],
    "RSI": 14,
    "MACD": (12, 26, 9),
    "BOLLINGER": (20, 2),
    "ATR": 14,
    "STOCHASTIC": (14, 3, 3),
}

# Machine Learning
ML_MODEL = "RandomForest"  # Options: RandomForest, XGBoost, Ensemble
TRAIN_TEST_SPLIT = (0.70, 0.15, 0.15)  # Train, Validation, Test
CROSS_VALIDATION_FOLDS = 5
MIN_CONFIDENCE_THRESHOLD = 65.0  # Minimum confidence for GOOD trade
RETRAIN_FREQUENCY = "weekly"  # Options: daily, weekly, monthly

# Labeling Strategy
LABEL_THRESHOLD = 2.0  # % price change for BUY/SELL label
LABEL_HORIZON = 3  # Days to look ahead for labeling

# Risk Management
RISK_PER_TRADE = 0.02  # 2% of portfolio
MAX_POSITION_SIZE = 0.20  # 20% of portfolio
MIN_RISK_REWARD = 1.5  # Minimum 1:1.5 ratio
TARGET_RISK_REWARD = 2.0  # Target 1:2 ratio
STOP_LOSS_METHOD = "ATR"  # Options: ATR, SUPPORT, PERCENTAGE
STOP_LOSS_ATR_MULTIPLIER = 2.0
STOP_LOSS_PERCENTAGE = 0.03  # 3%

# Trading Limits
MAX_TRADES_PER_DAY = 5
MAX_TRADES_PER_WEEK = 15
MAX_DAILY_LOSS = 0.05  # 5% of portfolio
MAX_WEEKLY_LOSS = 0.10  # 10% of portfolio
CONSECUTIVE_LOSS_LIMIT = 3

# Good vs Bad Trade Scoring
GOOD_TRADE_SCORE_THRESHOLD = 70.0
SCORING_WEIGHTS = {
    "confidence": 0.40,
    "trend_alignment": 0.20,
    "news_sentiment": 0.15,
    "risk_reward": 0.15,
    "technical_score": 0.10,
}

# Gemini AI
GEMINI_MODEL = "gemini-2.0-flash-exp"
GEMINI_TEMPERATURE = 0.3
GEMINI_MAX_TOKENS = 1000

# News Analysis
NEWS_LOOKBACK_HOURS = 24
NEWS_SENTIMENT_THRESHOLD = 0.3  # -1 to 1 scale

# Database
DB_PATH = BASE_DIR / "data" / "trading.db"
FEEDBACK_TABLE = "user_feedback"
PREDICTIONS_TABLE = "predictions"
TRADES_TABLE = "trades"

# API Settings
API_HOST = "0.0.0.0"
API_PORT = 8000
API_RELOAD = True  # Development only

# Logging
LOG_LEVEL = "INFO"
LOG_FILE = BASE_DIR / "logs" / "ai_engine.log"

# Market Context
INDEX_SYMBOLS = ["^NSEI", "^BSESN"]  # Nifty 50, Sensex
SECTOR_INDICES = {
    "IT": "^CNXIT",
    "BANK": "^NSEBANK",
    "AUTO": "^CNXAUTO",
    "PHARMA": "^CNXPHARMA",
    "FMCG": "^CNXFMCG",
}

# Prediction Settings
PREDICTION_VALIDITY_MINUTES = 30
PREDICTION_UPDATE_TIMES = ["09:00", "12:00", "15:00"]

# Paper Trading
PAPER_INITIAL_CAPITAL = 100000  # ₹1,00,000
PAPER_MIN_TRADES = 20
PAPER_MIN_WIN_RATE = 0.55  # 55%
PAPER_MIN_PROFIT_FACTOR = 1.5

# Feature Engineering
FEATURE_COLUMNS = [
    # Price features
    "close", "open", "high", "low", "volume",
    # Moving averages
    "ema_9", "ema_21", "ema_50", "ema_200",
    "sma_20", "sma_50",
    # Momentum
    "rsi", "macd", "macd_signal", "macd_hist",
    "stoch_k", "stoch_d",
    # Volatility
    "atr", "bb_upper", "bb_middle", "bb_lower", "bb_width",
    # Volume
    "vwap", "obv", "volume_roc",
    # Price action
    "price_change", "price_change_pct",
    "high_low_range", "close_open_diff",
    # Market context
    "nifty_change", "sector_change",
    "correlation_nifty",
]

# Model Paths
MODEL_DIR = BASE_DIR / "models" / "saved"
MODEL_FILE = MODEL_DIR / "trading_model.pkl"
SCALER_FILE = MODEL_DIR / "scaler.pkl"
LABEL_ENCODER_FILE = MODEL_DIR / "label_encoder.pkl"

# Create directories if they don't exist
os.makedirs(BASE_DIR / "data", exist_ok=True)
os.makedirs(BASE_DIR / "logs", exist_ok=True)
os.makedirs(MODEL_DIR, exist_ok=True)
