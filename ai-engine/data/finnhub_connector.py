"""
Finnhub News and Sentiment Connector
"""

import requests
from datetime import datetime, timedelta
import sys
sys.path.append('..')
from config.settings import FINNHUB_API_KEY, NEWS_LOOKBACK_HOURS
from utils.helpers import get_logger

logger = get_logger(__name__)

class FinnhubConnector:
    """Connector for Finnhub news and sentiment data"""
    
    def __init__(self, api_key=None):
        self.api_key = api_key or FINNHUB_API_KEY
        self.base_url = "https://finnhub.io/api/v1"
    
    def get_company_news(self, symbol, days_back=1):
        """
        Get company news
        
        Args:
            symbol: Stock symbol (without .NS suffix)
            days_back: Number of days to look back
        
        Returns:
            list of news articles
        """
        try:
            # Remove exchange suffix
            clean_symbol = symbol.replace('.NS', '').replace('.BO', '')
            
            # Calculate date range
            to_date = datetime.now()
            from_date = to_date - timedelta(days=days_back)
            
            url = f"{self.base_url}/company-news"
            params = {
                "symbol": clean_symbol,
                "from": from_date.strftime("%Y-%m-%d"),
                "to": to_date.strftime("%Y-%m-%d"),
                "token": self.api_key
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            news = response.json()
            logger.info(f"Fetched {len(news)} news articles for {clean_symbol}")
            
            return news
            
        except Exception as e:
            logger.error(f"Error fetching news for {symbol}: {e}")
            return []
    
    def get_market_news(self, category="general"):
        """
        Get general market news
        
        Args:
            category: News category (general, forex, crypto, merger)
        
        Returns:
            list of news articles
        """
        try:
            url = f"{self.base_url}/news"
            params = {
                "category": category,
                "token": self.api_key
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            news = response.json()
            logger.info(f"Fetched {len(news)} market news articles")
            
            return news
            
        except Exception as e:
            logger.error(f"Error fetching market news: {e}")
            return []
    
    def analyze_news_sentiment(self, news_articles):
        """
        Analyze sentiment from news articles
        
        Args:
            news_articles: List of news articles
        
        Returns:
            dict with sentiment analysis
        """
        if not news_articles:
            return {
                "sentiment": "NEUTRAL",
                "score": 0,
                "positive_count": 0,
                "negative_count": 0,
                "neutral_count": 0,
                "total_count": 0
            }
        
        # Simple keyword-based sentiment (can be enhanced with NLP)
        positive_keywords = [
            "profit", "growth", "surge", "gain", "bullish", "upgrade",
            "beat", "strong", "positive", "rally", "high", "record"
        ]
        
        negative_keywords = [
            "loss", "decline", "fall", "bearish", "downgrade", "miss",
            "weak", "negative", "crash", "low", "concern", "risk"
        ]
        
        positive_count = 0
        negative_count = 0
        neutral_count = 0
        
        for article in news_articles:
            headline = article.get("headline", "").lower()
            summary = article.get("summary", "").lower()
            text = headline + " " + summary
            
            pos_score = sum(1 for word in positive_keywords if word in text)
            neg_score = sum(1 for word in negative_keywords if word in text)
            
            if pos_score > neg_score:
                positive_count += 1
            elif neg_score > pos_score:
                negative_count += 1
            else:
                neutral_count += 1
        
        total = len(news_articles)
        
        # Calculate overall sentiment score (-1 to 1)
        if total > 0:
            score = (positive_count - negative_count) / total
        else:
            score = 0
        
        # Determine sentiment label
        if score > 0.3:
            sentiment = "POSITIVE"
        elif score < -0.3:
            sentiment = "NEGATIVE"
        else:
            sentiment = "NEUTRAL"
        
        return {
            "sentiment": sentiment,
            "score": round(score, 2),
            "positive_count": positive_count,
            "negative_count": negative_count,
            "neutral_count": neutral_count,
            "total_count": total
        }
    
    def get_stock_sentiment(self, symbol, days_back=1):
        """
        Get complete sentiment analysis for a stock
        
        Args:
            symbol: Stock symbol
            days_back: Days to look back for news
        
        Returns:
            dict with news and sentiment
        """
        news = self.get_company_news(symbol, days_back)
        sentiment = self.analyze_news_sentiment(news)
        
        # Get recent headlines
        recent_headlines = []
        for article in news[:5]:  # Top 5 recent
            recent_headlines.append({
                "headline": article.get("headline", ""),
                "source": article.get("source", ""),
                "url": article.get("url", ""),
                "datetime": article.get("datetime", 0)
            })
        
        return {
            "symbol": symbol,
            "sentiment": sentiment,
            "recent_news": recent_headlines,
            "news_count": len(news)
        }
    
    def check_major_events(self, symbol):
        """
        Check for major events (earnings, dividends, etc.)
        
        Returns:
            dict with event information
        """
        # This would require additional Finnhub endpoints
        # For now, return placeholder
        return {
            "has_earnings": False,
            "has_dividend": False,
            "has_split": False,
            "event_description": None
        }

# Example usage
if __name__ == "__main__":
    # Note: Replace with actual API key
    connector = FinnhubConnector(api_key="your_api_key_here")
    
    # Test company news
    news = connector.get_company_news("TCS", days_back=1)
    print(f"Found {len(news)} news articles")
    
    # Test sentiment
    sentiment_data = connector.get_stock_sentiment("TCS", days_back=1)
    print(f"\nSentiment: {sentiment_data['sentiment']}")
