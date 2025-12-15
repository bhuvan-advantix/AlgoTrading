"""
Model Trainer - Train and evaluate ML models
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score, TimeSeriesSplit
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report
import joblib
import sys
sys.path.append('..')
from config.settings import (
    TRAIN_TEST_SPLIT, CROSS_VALIDATION_FOLDS,
    LABEL_THRESHOLD, LABEL_HORIZON,
    MODEL_FILE, SCALER_FILE, LABEL_ENCODER_FILE
)
from utils.helpers import get_logger

logger = get_logger(__name__)

class ModelTrainer:
    """Train and evaluate trading ML models"""
    
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        self.feature_columns = None
    
    def create_labels(self, df, threshold=LABEL_THRESHOLD, horizon=LABEL_HORIZON):
        """
        Create BUY/SELL/HOLD labels based on future price movement
        
        Args:
            df: DataFrame with price data
            threshold: % price change threshold
            horizon: Days to look ahead
        
        Returns:
            DataFrame with labels
        """
        logger.info(f"Creating labels with threshold={threshold}%, horizon={horizon} days")
        
        # Calculate future returns
        df['future_return'] = df['close'].pct_change(periods=horizon).shift(-horizon) * 100
        
        # Create labels
        def label_trade(future_return):
            if pd.isna(future_return):
                return 'HOLD'
            elif future_return >= threshold:
                return 'BUY'
            elif future_return <= -threshold:
                return 'SELL'
            else:
                return 'HOLD'
        
        df['label'] = df['future_return'].apply(label_trade)
        
        # Remove rows without labels (last 'horizon' days)
        df = df[df['label'] != 'HOLD'].copy()  # Focus on actionable signals
        
        label_counts = df['label'].value_counts()
        logger.info(f"Label distribution:\n{label_counts}")
        
        return df
    
    def prepare_data(self, df, feature_columns):
        """
        Prepare data for training
        
        Args:
            df: DataFrame with features and labels
            feature_columns: List of feature column names
        
        Returns:
            X, y arrays
        """
        # Store feature columns
        self.feature_columns = feature_columns
        
        # Select features
        X = df[feature_columns].copy()
        
        # Replace infinity values with NaN
        X = X.replace([np.inf, -np.inf], np.nan)
        
        # Handle missing values
        X = X.fillna(X.mean())
        
        # If still NaN (column was all NaN), fill with 0
        X = X.fillna(0)
        
        # Clip extreme outliers (beyond 5 standard deviations)
        for col in X.columns:
            mean = X[col].mean()
            std = X[col].std()
            if std > 0:  # Avoid division by zero
                X[col] = X[col].clip(lower=mean - 5*std, upper=mean + 5*std)
        
        # Get labels
        y = df['label'].values
        
        logger.info(f"Data shape: X={X.shape}, y={y.shape}")
        
        return X, y
    
    def train_model(self, X, y):
        """
        Train Random Forest model
        
        Args:
            X: Feature matrix
            y: Labels
        
        Returns:
            Trained model
        """
        logger.info("Training Random Forest model...")
        
        # Split data (time-series aware)
        train_size = int(len(X) * TRAIN_TEST_SPLIT[0])
        val_size = int(len(X) * TRAIN_TEST_SPLIT[1])
        
        X_train = X[:train_size]
        y_train = y[:train_size]
        
        X_val = X[train_size:train_size+val_size]
        y_val = y[train_size:train_size+val_size]
        
        X_test = X[train_size+val_size:]
        y_test = y[train_size+val_size:]
        
        logger.info(f"Train: {len(X_train)}, Val: {len(X_val)}, Test: {len(X_test)}")
        
        # Encode labels
        y_train_encoded = self.label_encoder.fit_transform(y_train)
        y_val_encoded = self.label_encoder.transform(y_val)
        y_test_encoded = self.label_encoder.transform(y_test)
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_val_scaled = self.scaler.transform(X_val)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train model
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=20,
            min_samples_leaf=10,
            random_state=42,
            n_jobs=-1,
            class_weight='balanced'  # Handle class imbalance
        )
        
        self.model.fit(X_train_scaled, y_train_encoded)
        
        # Evaluate on validation set
        val_predictions = self.model.predict(X_val_scaled)
        val_accuracy = accuracy_score(y_val_encoded, val_predictions)
        
        logger.info(f"Validation Accuracy: {val_accuracy:.2%}")
        
        # Evaluate on test set
        test_predictions = self.model.predict(X_test_scaled)
        test_accuracy = accuracy_score(y_test_encoded, test_predictions)
        
        logger.info(f"Test Accuracy: {test_accuracy:.2%}")
        
        # Detailed metrics
        test_labels = self.label_encoder.inverse_transform(y_test_encoded)
        pred_labels = self.label_encoder.inverse_transform(test_predictions)
        
        print("\nClassification Report:")
        print(classification_report(test_labels, pred_labels))
        
        # Feature importance
        self.print_feature_importance()
        
        return self.model
    
    def cross_validate(self, X, y):
        """
        Perform time-series cross-validation
        
        Args:
            X: Feature matrix
            y: Labels
        
        Returns:
            Cross-validation scores
        """
        logger.info("Performing cross-validation...")
        
        # Encode labels
        y_encoded = self.label_encoder.fit_transform(y)
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Time series split
        tscv = TimeSeriesSplit(n_splits=CROSS_VALIDATION_FOLDS)
        
        # Cross-validate
        scores = cross_val_score(
            self.model,
            X_scaled,
            y_encoded,
            cv=tscv,
            scoring='accuracy',
            n_jobs=-1
        )
        
        logger.info(f"Cross-validation scores: {scores}")
        logger.info(f"Mean CV Accuracy: {scores.mean():.2%} (+/- {scores.std() * 2:.2%})")
        
        return scores
    
    def print_feature_importance(self, top_n=15):
        """Print top N important features"""
        if self.model is None or self.feature_columns is None:
            return
        
        importances = self.model.feature_importances_
        indices = np.argsort(importances)[::-1]
        
        print(f"\nTop {top_n} Feature Importances:")
        for i in range(min(top_n, len(indices))):
            idx = indices[i]
            print(f"{i+1}. {self.feature_columns[idx]}: {importances[idx]:.4f}")
    
    def save_model(self):
        """Save trained model and preprocessors"""
        try:
            joblib.dump(self.model, MODEL_FILE)
            joblib.dump(self.scaler, SCALER_FILE)
            joblib.dump(self.label_encoder, LABEL_ENCODER_FILE)
            
            logger.info(f"Model saved to {MODEL_FILE}")
            logger.info(f"Scaler saved to {SCALER_FILE}")
            logger.info(f"Label encoder saved to {LABEL_ENCODER_FILE}")
            
        except Exception as e:
            logger.error(f"Error saving model: {e}")
    
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
            return False

# Example usage
if __name__ == "__main__":
    from data.yahoo_connector import YahooFinanceConnector
    from models.feature_engineering import FeatureEngineer
    
    # Fetch data
    connector = YahooFinanceConnector()
    df = connector.get_historical_data("TCS.NS", period="2y")
    
    if df is not None:
        # Add features
        engineer = FeatureEngineer()
        df_features = engineer.add_all_features(df)
        
        # Create trainer
        trainer = ModelTrainer()
        
        # Create labels
        df_labeled = trainer.create_labels(df_features)
        
        # Prepare data
        # Get only columns that exist in the dataframe
        all_possible_features = engineer.get_feature_columns()
        feature_cols = [col for col in all_possible_features if col in df_labeled.columns]
        
        print(f"Using {len(feature_cols)} features out of {len(all_possible_features)} possible")
        
        X, y = trainer.prepare_data(df_labeled, feature_cols)
        
        # Train model
        model = trainer.train_model(X, y)
        
        # Save model
        trainer.save_model()
        
        print("\nTraining complete!")
