"""
Trade Classifier - Mark trades as GOOD or BAD
"""

import sys
sys.path.append('..')
from config.settings import GOOD_TRADE_SCORE_THRESHOLD, SCORING_WEIGHTS, MIN_CONFIDENCE_THRESHOLD
from utils.helpers import get_logger

logger = get_logger(__name__)

class TradeClassifier:
    """Classify trades as GOOD or BAD based on multiple criteria"""
    
    def __init__(self):
        self.weights = SCORING_WEIGHTS
        self.threshold = GOOD_TRADE_SCORE_THRESHOLD
    
    def score_confidence(self, confidence):
        """
        Score based on ML confidence
        
        Args:
            confidence: ML confidence (0-100)
        
        Returns:
            Score (0-100)
        """
        # Linear scoring: confidence directly maps to score
        return min(confidence, 100)
    
    def score_trend_alignment(self, stock_trend, index_trend, sector_trend):
        """
        Score based on trend alignment
        
        Args:
            stock_trend: Stock trend direction (+1, 0, -1)
            index_trend: Index trend direction (+1, 0, -1)
            sector_trend: Sector trend direction (+1, 0, -1)
        
        Returns:
            Score (0-100)
        """
        # Perfect alignment = 100
        # Partial alignment = 50-75
        # No alignment = 0-25
        
        if stock_trend == index_trend == sector_trend:
            return 100  # Perfect alignment
        elif stock_trend == index_trend or stock_trend == sector_trend:
            return 70  # Partial alignment
        elif stock_trend == 0:
            return 50  # Neutral
        else:
            return 25  # Misalignment
    
    def score_news_sentiment(self, sentiment_score, sentiment_label):
        """
        Score based on news sentiment
        
        Args:
            sentiment_score: Sentiment score (-1 to 1)
            sentiment_label: POSITIVE, NEUTRAL, NEGATIVE
        
        Returns:
            Score (0-100)
        """
        if sentiment_label == "POSITIVE":
            return 100
        elif sentiment_label == "NEUTRAL":
            return 70
        elif sentiment_label == "NEGATIVE":
            return 30
        else:
            return 50
    
    def score_risk_reward(self, risk_reward_ratio):
        """
        Score based on risk:reward ratio
        
        Args:
            risk_reward_ratio: Numeric ratio (e.g., 2.0 for 1:2)
        
        Returns:
            Score (0-100)
        """
        if risk_reward_ratio >= 3.0:
            return 100
        elif risk_reward_ratio >= 2.0:
            return 90
        elif risk_reward_ratio >= 1.5:
            return 70
        elif risk_reward_ratio >= 1.0:
            return 50
        else:
            return 25
    
    def score_technical(self, technical_indicators):
        """
        Score based on technical indicator agreement
        
        Args:
            technical_indicators: dict with indicator signals
        
        Returns:
            Score (0-100)
        """
        # Count bullish vs bearish signals
        bullish_count = 0
        bearish_count = 0
        total_count = 0
        
        # RSI
        rsi = technical_indicators.get('RSI', 50)
        if rsi < 30:
            bullish_count += 1
        elif rsi > 70:
            bearish_count += 1
        total_count += 1
        
        # MACD
        macd = technical_indicators.get('MACD', '')
        if 'bullish' in macd.lower():
            bullish_count += 1
        elif 'bearish' in macd.lower():
            bearish_count += 1
        total_count += 1
        
        # Volume
        volume = technical_indicators.get('Volume', '')
        if '+' in str(volume):
            bullish_count += 1
        elif '-' in str(volume):
            bearish_count += 1
        total_count += 1
        
        # Calculate agreement score
        if total_count == 0:
            return 50
        
        agreement = max(bullish_count, bearish_count) / total_count
        return agreement * 100
    
    def calculate_overall_score(self, confidence, trend_alignment, news_sentiment, 
                                risk_reward, technical_score):
        """
        Calculate weighted overall score
        
        Returns:
            Overall score (0-100)
        """
        score = (
            confidence * self.weights['confidence'] +
            trend_alignment * self.weights['trend_alignment'] +
            news_sentiment * self.weights['news_sentiment'] +
            risk_reward * self.weights['risk_reward'] +
            technical_score * self.weights['technical_score']
        )
        
        return round(score, 2)
    
    def classify_trade(self, ml_prediction, trade_plan, market_context, news_data, technical_indicators):
        """
        Classify trade as GOOD or BAD
        
        Args:
            ml_prediction: dict with ML prediction results
            trade_plan: dict with entry/SL/target
            market_context: dict with market and sector data
            news_data: dict with news sentiment
            technical_indicators: dict with technical indicators
        
        Returns:
            dict with classification results
        """
        try:
            # Extract data
            confidence = ml_prediction.get('confidence', 0)
            prediction = ml_prediction.get('prediction', 'HOLD')
            
            # Score each component
            confidence_score = self.score_confidence(confidence)
            
            # Trend alignment
            stock_trend = 1 if prediction == "BUY" else -1
            index_trend = market_context.get('index_trend', 0)
            sector_trend = market_context.get('sector_trend', 0)
            trend_score = self.score_trend_alignment(stock_trend, index_trend, sector_trend)
            
            # News sentiment
            sentiment_label = news_data.get('sentiment', {}).get('sentiment', 'NEUTRAL')
            sentiment_score_val = news_data.get('sentiment', {}).get('score', 0)
            news_score = self.score_news_sentiment(sentiment_score_val, sentiment_label)
            
            # Risk:reward
            rr_ratio = trade_plan.get('risk_reward_numeric', 0)
            rr_score = self.score_risk_reward(rr_ratio)
            
            # Technical indicators
            tech_score = self.score_technical(technical_indicators)
            
            # Calculate overall score
            overall_score = self.calculate_overall_score(
                confidence_score,
                trend_score,
                news_score,
                rr_score,
                tech_score
            )
            
            # Determine label
            if overall_score >= self.threshold:
                label = "GOOD TRADE"
            else:
                label = "BAD TRADE"
            
            # Auto-reject conditions
            auto_reject_reasons = []
            
            if confidence < 50:
                auto_reject_reasons.append("Very low confidence (<50%)")
            
            if sentiment_label == "NEGATIVE" and abs(sentiment_score_val) > 0.5:
                auto_reject_reasons.append("Strong negative news")
            
            if rr_ratio < 1.0:
                auto_reject_reasons.append("Poor risk:reward (<1:1)")
            
            if auto_reject_reasons:
                label = "BAD TRADE"
            
            # Generate reasons
            reasons = []
            
            if confidence_score >= 65:
                reasons.append(f"High ML confidence ({confidence:.1f}%)")
            elif confidence_score < 50:
                reasons.append(f"Low ML confidence ({confidence:.1f}%)")
            
            if trend_score >= 70:
                reasons.append("Trend aligned with market")
            elif trend_score < 50:
                reasons.append("Trend misaligned with market")
            
            if news_score >= 70:
                reasons.append(f"{sentiment_label.capitalize()} news sentiment")
            elif news_score < 50:
                reasons.append(f"{sentiment_label.capitalize()} news (caution)")
            
            if rr_score >= 70:
                reasons.append(f"Excellent risk:reward ({trade_plan.get('risk_reward_ratio', '')})")
            elif rr_score < 50:
                reasons.append(f"Poor risk:reward ({trade_plan.get('risk_reward_ratio', '')})")
            
            if tech_score >= 70:
                reasons.append("Technical indicators confirm")
            
            result = {
                "label": label,
                "score": overall_score,
                "component_scores": {
                    "confidence": round(confidence_score, 1),
                    "trend_alignment": round(trend_score, 1),
                    "news_sentiment": round(news_score, 1),
                    "risk_reward": round(rr_score, 1),
                    "technical": round(tech_score, 1)
                },
                "reasons": reasons[:5],  # Top 5 reasons
                "auto_reject_reasons": auto_reject_reasons
            }
            
            logger.info(f"Trade classified as {label} with score {overall_score:.1f}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error classifying trade: {e}")
            return {
                "label": "BAD TRADE",
                "score": 0,
                "reasons": ["Classification error"],
                "auto_reject_reasons": ["System error"]
            }

# Example usage
if __name__ == "__main__":
    classifier = TradeClassifier()
    
    # Example classification
    ml_prediction = {
        "prediction": "BUY",
        "confidence": 78.5
    }
    
    trade_plan = {
        "entry_price": 3850.50,
        "stop_loss": 3795.00,
        "target": 3961.00,
        "risk_reward_ratio": "1:2.0",
        "risk_reward_numeric": 2.0
    }
    
    market_context = {
        "index_trend": 1,  # Bullish
        "sector_trend": 1  # Bullish
    }
    
    news_data = {
        "sentiment": {
            "sentiment": "NEUTRAL",
            "score": 0.1
        }
    }
    
    technical_indicators = {
        "RSI": 48.2,
        "MACD": "Bullish crossover",
        "Volume": "+45% above average"
    }
    
    result = classifier.classify_trade(
        ml_prediction,
        trade_plan,
        market_context,
        news_data,
        technical_indicators
    )
    
    print(f"\nClassification: {result}")
