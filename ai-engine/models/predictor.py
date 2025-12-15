"""
ML Predictor - Make trading predictions
"""

import pandas as pd
import numpy as np
import joblib
import sys
sys.path.append('..')
from config.settings import MODEL_FILE, SCALER_FILE, LABEL_ENCODER_FILE
from utils.helpers import get_logger, generate_prediction_id
from models.feature_engineering import FeatureEngineer
from data.yahoo_connector import YahooFinanceConnector

logger = get_logger(__name__)

class TradingPredictor:
    """Make BUY/SELL/HOLD predictions using trained ML model"""
    
    def __init__(self):
        self.model = None
        self.scaler = None
        self.label_encoder = None
        self.feature_engineer = FeatureEngineer()
        self.yahoo_connector = YahooFinanceConnector()
        self.load_model()
    
    def load_model(self):
        """Load trained model and preprocessors"""
        try:
            self.model = joblib.load(MODEL_FILE)
            self.scaler = joblib.load(SCALER_FILE)
            self.label_encoder = joblib.load(LABEL_ENCODER_FILE)
            logger.info("Model loaded successfully")
            return True
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            logger.warning("Model not found. Please train the model first.")
            return False
    
    def predict(self, symbol):
        """
        Make prediction for a stock
        
        Args:
            symbol: Stock symbol (e.g., 'TCS.NS')
        
        Returns:
            dict with prediction results
        """
        try:
            if self.model is None:
                return {
                    "error": "Model not loaded",
                    "prediction": "HOLD",
                    "confidence": 0
                }
            
            logger.info(f"Making prediction for {symbol}")
            
            # Fetch historical data
            df = self.yahoo_connector.get_historical_data(symbol, period="3mo")
            
            if df is None or df.empty:
                return {
                    "error": "No data available",
                    "prediction": "HOLD",
                    "confidence": 0
                }
            
            # Add features
            df_features = self.feature_engineer.add_all_features(df)
            
            if df_features.empty:
                return {
                    "error": "Feature engineering failed",
                    "prediction": "HOLD",
                    "confidence": 0
                }
            
            # Get latest row
            latest = df_features.iloc[-1]
            
            # Prepare features
            feature_cols = self.feature_engineer.get_feature_columns()
            X = latest[feature_cols].values.reshape(1, -1)
            
            # Handle missing values
            X = pd.DataFrame(X, columns=feature_cols).fillna(0).values
            
            # Scale features
            X_scaled = self.scaler.transform(X)
            
            # Make prediction
            prediction_encoded = self.model.predict(X_scaled)[0]
            prediction = self.label_encoder.inverse_transform([prediction_encoded])[0]
            
            # Get probabilities
            probabilities = self.model.predict_proba(X_scaled)[0]
            
            # Map probabilities to labels
            prob_dict = {}
            for idx, label in enumerate(self.label_encoder.classes_):
                prob_dict[label] = float(probabilities[idx])
            
            # Confidence is the max probability
            confidence = float(max(probabilities)) * 100
            
            # Get contributing factors
            contributing_factors = self.get_contributing_factors(latest, prediction)
            
            result = {
                "prediction_id": generate_prediction_id(symbol),
                "symbol": symbol,
                "prediction": prediction,
                "confidence": round(confidence, 2),
                "probabilities": {
                    "BUY": round(prob_dict.get("BUY", 0) * 100, 2),
                    "SELL": round(prob_dict.get("SELL", 0) * 100, 2),
                    "HOLD": round(prob_dict.get("HOLD", 0) * 100, 2)
                },
                "contributing_factors": contributing_factors,
                "latest_price": float(latest['close']),
                "technical_indicators": self.get_technical_summary(latest)
            }
            
            logger.info(f"Prediction for {symbol}: {prediction} ({confidence:.1f}%)")
            
            return result
            
        except Exception as e:
            logger.error(f"Error making prediction for {symbol}: {e}")
            return {
                "error": str(e),
                "prediction": "HOLD",
                "confidence": 0
            }
    
    def get_contributing_factors(self, latest_data, prediction):
        """
        Identify key factors contributing to the prediction
        
        Args:
            latest_data: Latest row of features
            prediction: Predicted action (BUY/SELL/HOLD)
        
        Returns:
            list of contributing factors
        """
        factors = []
        
        try:
            # RSI analysis
            rsi = latest_data.get('rsi', 50)
            if rsi < 30:
                factors.append(f"RSI oversold ({rsi:.1f})")
            elif rsi > 70:
                factors.append(f"RSI overbought ({rsi:.1f})")
            
            # MACD analysis
            macd = latest_data.get('macd', 0)
            macd_signal = latest_data.get('macd_signal', 0)
            if macd > macd_signal:
                factors.append("MACD bullish crossover")
            elif macd < macd_signal:
                factors.append("MACD bearish crossover")
            
            # Volume analysis
            volume_roc = latest_data.get('volume_roc', 0)
            if volume_roc > 20:
                factors.append(f"Volume surge (+{volume_roc:.0f}%)")
            elif volume_roc < -20:
                factors.append(f"Volume decline ({volume_roc:.0f}%)")
            
            # EMA crossover
            ema_9 = latest_data.get('ema_9', 0)
            ema_21 = latest_data.get('ema_21', 0)
            if ema_9 > ema_21:
                factors.append("EMA9 > EMA21 (golden cross)")
            elif ema_9 < ema_21:
                factors.append("EMA9 < EMA21 (death cross)")
            
            # ADX (trend strength)
            adx = latest_data.get('adx', 0)
            if adx > 25:
                factors.append(f"Strong trend (ADX={adx:.1f})")
            
            # Price vs Bollinger Bands
            close = latest_data.get('close', 0)
            bb_upper = latest_data.get('bb_upper', 0)
            bb_lower = latest_data.get('bb_lower', 0)
            
            if close > bb_upper:
                factors.append("Price above upper Bollinger Band")
            elif close < bb_lower:
                factors.append("Price below lower Bollinger Band")
            
        except Exception as e:
            logger.error(f"Error getting contributing factors: {e}")
        
        return factors[:5]  # Return top 5 factors
    
    def get_technical_summary(self, latest_data):
        """
        Get summary of technical indicators
        
        Returns:
            dict with key indicators
        """
        return {
            "RSI": round(latest_data.get('rsi', 0), 2),
            "MACD": "Bullish crossover" if latest_data.get('macd', 0) > latest_data.get('macd_signal', 0) else "Bearish crossover",
            "EMA_9": round(latest_data.get('ema_9', 0), 2),
            "EMA_21": round(latest_data.get('ema_21', 0), 2),
            "Volume": f"{latest_data.get('volume_roc', 0):+.1f}% vs avg",
            "ATR": round(latest_data.get('atr', 0), 2)
        }
    
    def predict_multiple(self, symbols):
        """
        Make predictions for multiple stocks
        
        Args:
            symbols: List of stock symbols
        
        Returns:
            dict with predictions for each symbol
        """
        results = {}
        
        for symbol in symbols:
            prediction = self.predict(symbol)
            results[symbol] = prediction
        
        return results
    
    def get_top_predictions(self, symbols, min_confidence=65):
        """
        Get top predictions above confidence threshold
        
        Args:
            symbols: List of stock symbols
            min_confidence: Minimum confidence threshold
        
        Returns:
            list of top predictions sorted by confidence
        """
        predictions = []
        
        for symbol in symbols:
            result = self.predict(symbol)
            
            if result.get('confidence', 0) >= min_confidence and result.get('prediction') != 'HOLD':
                predictions.append(result)
        
        # Sort by confidence (descending)
        predictions.sort(key=lambda x: x['confidence'], reverse=True)
        
        return predictions

# Example usage
if __name__ == "__main__":
    predictor = TradingPredictor()
    
    # Single prediction
    result = predictor.predict("TCS.NS")
    print(f"\nPrediction: {result}")
    
    # Multiple predictions
    symbols = ["TCS.NS", "INFY.NS", "RELIANCE.NS"]
    top_predictions = predictor.get_top_predictions(symbols, min_confidence=65)
    
    print(f"\nTop Predictions:")
    for pred in top_predictions:
        print(f"{pred['symbol']}: {pred['prediction']} ({pred['confidence']:.1f}%)")
