"""
Feature Engineering - Technical Indicators
Converts raw OHLCV data into ML features
"""

import pandas as pd
import numpy as np
from ta.trend import EMAIndicator, SMAIndicator, MACD, ADXIndicator
from ta.momentum import RSIIndicator, StochasticOscillator
from ta.volatility import BollingerBands, AverageTrueRange
from ta.volume import VolumeWeightedAveragePrice, OnBalanceVolumeIndicator
import sys
sys.path.append('..')
from config.settings import INDICATORS
from utils.helpers import get_logger

logger = get_logger(__name__)

class FeatureEngineer:
    """Generate technical indicators and features for ML"""
    
    def __init__(self):
        self.indicators_config = INDICATORS
    
    def add_moving_averages(self, df):
        """Add EMA and SMA indicators"""
        try:
            # Exponential Moving Averages
            for period in self.indicators_config["EMA"]:
                ema = EMAIndicator(close=df['close'], window=period)
                df[f'ema_{period}'] = ema.ema_indicator()
            
            # Simple Moving Averages
            for period in self.indicators_config["SMA"]:
                sma = SMAIndicator(close=df['close'], window=period)
                df[f'sma_{period}'] = sma.sma_indicator()
            
            logger.info("Added moving averages")
            return df
            
        except Exception as e:
            logger.error(f"Error adding moving averages: {e}")
            return df
    
    def add_momentum_indicators(self, df):
        """Add RSI, MACD, Stochastic"""
        try:
            # RSI
            rsi_period = self.indicators_config["RSI"]
            rsi = RSIIndicator(close=df['close'], window=rsi_period)
            df['rsi'] = rsi.rsi()
            
            # MACD
            macd_fast, macd_slow, macd_signal = self.indicators_config["MACD"]
            macd = MACD(
                close=df['close'],
                window_fast=macd_fast,
                window_slow=macd_slow,
                window_sign=macd_signal
            )
            df['macd'] = macd.macd()
            df['macd_signal'] = macd.macd_signal()
            df['macd_hist'] = macd.macd_diff()
            
            # Stochastic Oscillator
            stoch_k, stoch_d, stoch_smooth = self.indicators_config["STOCHASTIC"]
            stoch = StochasticOscillator(
                high=df['high'],
                low=df['low'],
                close=df['close'],
                window=stoch_k,
                smooth_window=stoch_smooth
            )
            df['stoch_k'] = stoch.stoch()
            df['stoch_d'] = stoch.stoch_signal()
            
            logger.info("Added momentum indicators")
            return df
            
        except Exception as e:
            logger.error(f"Error adding momentum indicators: {e}")
            return df
    
    def add_volatility_indicators(self, df):
        """Add Bollinger Bands, ATR"""
        try:
            # Bollinger Bands
            bb_period, bb_std = self.indicators_config["BOLLINGER"]
            bb = BollingerBands(
                close=df['close'],
                window=bb_period,
                window_dev=bb_std
            )
            df['bb_upper'] = bb.bollinger_hband()
            df['bb_middle'] = bb.bollinger_mavg()
            df['bb_lower'] = bb.bollinger_lband()
            df['bb_width'] = bb.bollinger_wband()
            
            # Average True Range
            atr_period = self.indicators_config["ATR"]
            atr = AverageTrueRange(
                high=df['high'],
                low=df['low'],
                close=df['close'],
                window=atr_period
            )
            df['atr'] = atr.average_true_range()
            
            logger.info("Added volatility indicators")
            return df
            
        except Exception as e:
            logger.error(f"Error adding volatility indicators: {e}")
            return df
    
    def add_volume_indicators(self, df):
        """Add VWAP, OBV, Volume ROC"""
        try:
            # VWAP
            vwap = VolumeWeightedAveragePrice(
                high=df['high'],
                low=df['low'],
                close=df['close'],
                volume=df['volume']
            )
            df['vwap'] = vwap.volume_weighted_average_price()
            
            # On-Balance Volume
            obv = OnBalanceVolumeIndicator(
                close=df['close'],
                volume=df['volume']
            )
            df['obv'] = obv.on_balance_volume()
            
            # Volume Rate of Change
            df['volume_roc'] = df['volume'].pct_change(periods=1) * 100
            
            logger.info("Added volume indicators")
            return df
            
        except Exception as e:
            logger.error(f"Error adding volume indicators: {e}")
            return df
    
    def add_price_action_features(self, df):
        """Add price action features"""
        try:
            # Price changes
            df['price_change'] = df['close'].diff()
            df['price_change_pct'] = df['close'].pct_change() * 100
            
            # High-Low range
            df['high_low_range'] = df['high'] - df['low']
            df['close_open_diff'] = df['close'] - df['open']
            
            # Candlestick patterns (simplified)
            df['body_size'] = abs(df['close'] - df['open'])
            df['upper_shadow'] = df['high'] - df[['close', 'open']].max(axis=1)
            df['lower_shadow'] = df[['close', 'open']].min(axis=1) - df['low']
            
            # Support/Resistance (rolling min/max)
            df['support_20'] = df['low'].rolling(window=20).min()
            df['resistance_20'] = df['high'].rolling(window=20).max()
            
            logger.info("Added price action features")
            return df
            
        except Exception as e:
            logger.error(f"Error adding price action features: {e}")
            return df
    
    def add_trend_features(self, df):
        """Add trend-related features"""
        try:
            # ADX (Average Directional Index)
            adx = ADXIndicator(
                high=df['high'],
                low=df['low'],
                close=df['close'],
                window=14
            )
            df['adx'] = adx.adx()
            df['adx_pos'] = adx.adx_pos()
            df['adx_neg'] = adx.adx_neg()
            
            # EMA crossovers
            df['ema_9_21_cross'] = (df['ema_9'] > df['ema_21']).astype(int)
            df['ema_21_50_cross'] = (df['ema_21'] > df['ema_50']).astype(int)
            
            # Price vs MA position
            df['price_vs_ema9'] = ((df['close'] - df['ema_9']) / df['ema_9']) * 100
            df['price_vs_sma20'] = ((df['close'] - df['sma_20']) / df['sma_20']) * 100
            
            logger.info("Added trend features")
            return df
            
        except Exception as e:
            logger.error(f"Error adding trend features: {e}")
            return df
    
    def add_all_features(self, df):
        """
        Add all technical indicators and features
        
        Args:
            df: DataFrame with OHLCV data
        
        Returns:
            DataFrame with all features
        """
        logger.info("Starting feature engineering...")
        
        # Ensure required columns exist
        required_cols = ['open', 'high', 'low', 'close', 'volume']
        if not all(col in df.columns for col in required_cols):
            logger.error(f"Missing required columns. Found: {df.columns.tolist()}")
            return df
        
        # Add all indicators
        df = self.add_moving_averages(df)
        df = self.add_momentum_indicators(df)
        df = self.add_volatility_indicators(df)
        df = self.add_volume_indicators(df)
        df = self.add_price_action_features(df)
        df = self.add_trend_features(df)
        
        # Drop NaN rows (from indicator calculations)
        initial_rows = len(df)
        df = df.dropna()
        final_rows = len(df)
        
        logger.info(f"Feature engineering complete. Rows: {initial_rows} → {final_rows}")
        logger.info(f"Total features: {len(df.columns)}")
        
        return df
    
    def get_feature_columns(self):
        """Get list of all feature column names"""
        feature_cols = [
            # Price features
            'close', 'open', 'high', 'low', 'volume',
            # Moving averages
            'ema_9', 'ema_21', 'ema_50', 'ema_200',
            'sma_20', 'sma_50',
            # Momentum
            'rsi', 'macd', 'macd_signal', 'macd_hist',
            'stoch_k', 'stoch_d',
            # Volatility
            'atr', 'bb_upper', 'bb_middle', 'bb_lower', 'bb_width',
            # Volume
            'vwap', 'obv', 'volume_roc',
            # Price action
            'price_change', 'price_change_pct',
            'high_low_range', 'close_open_diff',
            'body_size', 'upper_shadow', 'lower_shadow',
            # Trend
            'adx', 'adx_pos', 'adx_neg',
            'ema_9_21_cross', 'ema_21_50_cross',
            'price_vs_ema9', 'price_vs_sma20',
        ]
        
        return feature_cols

# Example usage
if __name__ == "__main__":
    from data.yahoo_connector import YahooFinanceConnector
    
    # Fetch sample data
    connector = YahooFinanceConnector()
    df = connector.get_historical_data("TCS.NS", period="1y")
    
    if df is not None:
        # Apply feature engineering
        engineer = FeatureEngineer()
        df_features = engineer.add_all_features(df)
        
        print(f"\nFeatures shape: {df_features.shape}")
        print(f"\nFeature columns: {df_features.columns.tolist()}")
        print(f"\nSample data:\n{df_features.tail()}")
