"""
Feedback Store - Store and manage user feedback
"""

import sqlite3
import json
from datetime import datetime
import sys
sys.path.append('..')
from config.settings import DB_PATH, FEEDBACK_TABLE, PREDICTIONS_TABLE, TRADES_TABLE
from utils.helpers import get_logger, get_ist_timestamp

logger = get_logger(__name__)

class FeedbackStore:
    """Store and retrieve user feedback for ML improvement"""
    
    def __init__(self, db_path=None):
        self.db_path = db_path or DB_PATH
        self.init_database()
    
    def init_database(self):
        """Initialize database tables"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Predictions table
            cursor.execute(f"""
                CREATE TABLE IF NOT EXISTS {PREDICTIONS_TABLE} (
                    prediction_id TEXT PRIMARY KEY,
                    symbol TEXT NOT NULL,
                    prediction TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    probabilities TEXT,
                    contributing_factors TEXT,
                    technical_indicators TEXT,
                    timestamp TEXT NOT NULL,
                    valid_until TEXT
                )
            """)
            
            # User feedback table
            cursor.execute(f"""
                CREATE TABLE IF NOT EXISTS {FEEDBACK_TABLE} (
                    feedback_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    prediction_id TEXT NOT NULL,
                    user_action TEXT NOT NULL,
                    reason TEXT,
                    timestamp TEXT NOT NULL,
                    trade_executed BOOLEAN,
                    FOREIGN KEY (prediction_id) REFERENCES {PREDICTIONS_TABLE}(prediction_id)
                )
            """)
            
            # Trades table (for outcome tracking)
            cursor.execute(f"""
                CREATE TABLE IF NOT EXISTS {TRADES_TABLE} (
                    trade_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    prediction_id TEXT NOT NULL,
                    symbol TEXT NOT NULL,
                    action TEXT NOT NULL,
                    entry_price REAL,
                    stop_loss REAL,
                    target REAL,
                    quantity INTEGER,
                    entry_time TEXT,
                    exit_time TEXT,
                    exit_price REAL,
                    profit_loss REAL,
                    profit_percent REAL,
                    outcome TEXT,
                    FOREIGN KEY (prediction_id) REFERENCES {PREDICTIONS_TABLE}(prediction_id)
                )
            """)
            
            conn.commit()
            conn.close()
            
            logger.info("Database initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing database: {e}")
    
    def store_prediction(self, prediction_data):
        """
        Store ML prediction
        
        Args:
            prediction_data: dict with prediction details
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute(f"""
                INSERT INTO {PREDICTIONS_TABLE} 
                (prediction_id, symbol, prediction, confidence, probabilities, 
                 contributing_factors, technical_indicators, timestamp, valid_until)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                prediction_data.get('prediction_id'),
                prediction_data.get('symbol'),
                prediction_data.get('prediction'),
                prediction_data.get('confidence'),
                json.dumps(prediction_data.get('probabilities', {})),
                json.dumps(prediction_data.get('contributing_factors', [])),
                json.dumps(prediction_data.get('technical_indicators', {})),
                get_ist_timestamp(),
                prediction_data.get('metadata', {}).get('valid_until')
            ))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Stored prediction: {prediction_data.get('prediction_id')}")
            
        except Exception as e:
            logger.error(f"Error storing prediction: {e}")
    
    def store_feedback(self, prediction_id, user_action, reason=None, trade_executed=False):
        """
        Store user feedback
        
        Args:
            prediction_id: Prediction ID
            user_action: APPROVE or DECLINE
            reason: Optional reason for decline
            trade_executed: Whether trade was executed
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute(f"""
                INSERT INTO {FEEDBACK_TABLE}
                (prediction_id, user_action, reason, timestamp, trade_executed)
                VALUES (?, ?, ?, ?, ?)
            """, (
                prediction_id,
                user_action,
                reason,
                get_ist_timestamp(),
                trade_executed
            ))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Stored feedback for {prediction_id}: {user_action}")
            
        except Exception as e:
            logger.error(f"Error storing feedback: {e}")
    
    def store_trade_outcome(self, trade_data):
        """
        Store trade outcome for learning
        
        Args:
            trade_data: dict with trade execution and outcome
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute(f"""
                INSERT INTO {TRADES_TABLE}
                (prediction_id, symbol, action, entry_price, stop_loss, target,
                 quantity, entry_time, exit_time, exit_price, profit_loss, 
                 profit_percent, outcome)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                trade_data.get('prediction_id'),
                trade_data.get('symbol'),
                trade_data.get('action'),
                trade_data.get('entry_price'),
                trade_data.get('stop_loss'),
                trade_data.get('target'),
                trade_data.get('quantity'),
                trade_data.get('entry_time'),
                trade_data.get('exit_time'),
                trade_data.get('exit_price'),
                trade_data.get('profit_loss'),
                trade_data.get('profit_percent'),
                trade_data.get('outcome')  # SUCCESS, STOP_LOSS, TARGET_HIT
            ))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Stored trade outcome for {trade_data.get('prediction_id')}")
            
        except Exception as e:
            logger.error(f"Error storing trade outcome: {e}")
    
    def get_feedback_stats(self):
        """Get feedback statistics"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute(f"""
                SELECT user_action, COUNT(*) as count
                FROM {FEEDBACK_TABLE}
                GROUP BY user_action
            """)
            
            stats = dict(cursor.fetchall())
            conn.close()
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting feedback stats: {e}")
            return {}
    
    def get_trade_performance(self):
        """Get trade performance metrics"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute(f"""
                SELECT 
                    COUNT(*) as total_trades,
                    SUM(CASE WHEN outcome = 'SUCCESS' THEN 1 ELSE 0 END) as wins,
                    SUM(CASE WHEN outcome = 'STOP_LOSS' THEN 1 ELSE 0 END) as losses,
                    AVG(profit_percent) as avg_profit_pct,
                    SUM(profit_loss) as total_pnl
                FROM {TRADES_TABLE}
                WHERE outcome IS NOT NULL
            """)
            
            row = cursor.fetchone()
            conn.close()
            
            if row:
                total, wins, losses, avg_pct, total_pnl = row
                win_rate = (wins / total * 100) if total > 0 else 0
                
                return {
                    "total_trades": total or 0,
                    "wins": wins or 0,
                    "losses": losses or 0,
                    "win_rate": round(win_rate, 2),
                    "avg_profit_pct": round(avg_pct or 0, 2),
                    "total_pnl": round(total_pnl or 0, 2)
                }
            
            return {}
            
        except Exception as e:
            logger.error(f"Error getting trade performance: {e}")
            return {}

# Example usage
if __name__ == "__main__":
    store = FeedbackStore()
    
    # Test storing prediction
    prediction = {
        "prediction_id": "pred_20251213_170000_TCS",
        "symbol": "TCS.NS",
        "prediction": "BUY",
        "confidence": 78.5,
        "probabilities": {"BUY": 78.5, "SELL": 10.0, "HOLD": 11.5},
        "contributing_factors": ["RSI oversold", "MACD bullish"],
        "technical_indicators": {"RSI": 48.2, "MACD": "Bullish"},
        "metadata": {"valid_until": "2025-12-13T17:30:00+05:30"}
    }
    
    store.store_prediction(prediction)
    
    # Test storing feedback
    store.store_feedback("pred_20251213_170000_TCS", "APPROVE", trade_executed=True)
    
    # Get stats
    stats = store.get_feedback_stats()
    print(f"Feedback stats: {stats}")
    
    performance = store.get_trade_performance()
    print(f"Trade performance: {performance}")
