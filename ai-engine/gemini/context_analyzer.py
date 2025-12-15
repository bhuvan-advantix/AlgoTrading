"""
Gemini AI Context Analyzer
Provides market context and trade reasoning
"""

import google.generativeai as genai
import sys
sys.path.append('..')
from config.settings import GEMINI_API_KEY, GEMINI_MODEL, GEMINI_TEMPERATURE, GEMINI_MAX_TOKENS
from utils.helpers import get_logger

logger = get_logger(__name__)

class GeminiContextAnalyzer:
    """Use Gemini AI to analyze market context and explain trades"""
    
    def __init__(self, api_key=None):
        self.api_key = api_key or GEMINI_API_KEY
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel(GEMINI_MODEL)
        else:
            logger.warning("Gemini API key not provided")
            self.model = None
    
    def analyze_market_context(self, index_data, sector_data):
        """
        Analyze overall market context
        
        Args:
            index_data: dict with Nifty/Sensex data
            sector_data: dict with sector performance
        
        Returns:
            str with market context analysis
        """
        if not self.model:
            return "Market analysis unavailable (API key not configured)"
        
        try:
            prompt = f"""
Analyze the current Indian stock market context based on this data:

Nifty 50: {index_data.get('ltp', 0):.2f} ({index_data.get('change_percent', 0):+.2f}%)
Sensex: Not provided

Sector Performance:
{self._format_sector_data(sector_data)}

Provide a brief 2-3 sentence market context analysis focusing on:
- Overall market sentiment (bullish/bearish/neutral)
- Key sector trends
- Market breadth

Keep it concise and actionable for traders.
"""
            
            response = self.model.generate_content(
                prompt,
                generation_config={
                    "temperature": GEMINI_TEMPERATURE,
                    "max_output_tokens": 200
                }
            )
            
            return response.text.strip()
            
        except Exception as e:
            logger.error(f"Error analyzing market context: {e}")
            return f"Market showing {'bullish' if index_data.get('change_percent', 0) > 0 else 'bearish'} sentiment."
    
    def analyze_trade_reasoning(self, symbol, prediction, confidence, technical_indicators, 
                                news_sentiment, trade_plan):
        """
        Generate detailed trade reasoning
        
        Args:
            symbol: Stock symbol
            prediction: BUY/SELL/HOLD
            confidence: ML confidence
            technical_indicators: dict with indicators
            news_sentiment: dict with news data
            trade_plan: dict with entry/SL/target
        
        Returns:
            str with trade reasoning
        """
        if not self.model:
            return self._generate_fallback_reasoning(prediction, confidence, technical_indicators)
        
        try:
            prompt = f"""
Analyze this trading opportunity and provide clear reasoning:

Stock: {symbol}
AI Prediction: {prediction}
Confidence: {confidence:.1f}%

Technical Indicators:
- RSI: {technical_indicators.get('RSI', 'N/A')}
- MACD: {technical_indicators.get('MACD', 'N/A')}
- EMA 9: {technical_indicators.get('EMA_9', 'N/A')}
- EMA 21: {technical_indicators.get('EMA_21', 'N/A')}
- Volume: {technical_indicators.get('Volume', 'N/A')}
- ATR: {technical_indicators.get('ATR', 'N/A')}

News Sentiment: {news_sentiment.get('sentiment', {}).get('sentiment', 'NEUTRAL')}

Trade Plan:
- Entry: ₹{trade_plan.get('entry_price', 0):.2f}
- Stop-Loss: ₹{trade_plan.get('stop_loss', 0):.2f}
- Target: ₹{trade_plan.get('target', 0):.2f}
- Risk:Reward: {trade_plan.get('risk_reward_ratio', 'N/A')}

Provide a 3-4 sentence explanation covering:
1. Why this is a {prediction} opportunity
2. Key technical factors supporting the trade
3. Expected price movement timeline

Be specific and actionable. Write for Indian retail traders.
"""
            
            response = self.model.generate_content(
                prompt,
                generation_config={
                    "temperature": GEMINI_TEMPERATURE,
                    "max_output_tokens": GEMINI_MAX_TOKENS
                }
            )
            
            return response.text.strip()
            
        except Exception as e:
            logger.error(f"Error generating trade reasoning: {e}")
            return self._generate_fallback_reasoning(prediction, confidence, technical_indicators)
    
    def analyze_risk_factors(self, symbol, prediction, market_context, news_data):
        """
        Identify potential risk factors
        
        Args:
            symbol: Stock symbol
            prediction: BUY/SELL/HOLD
            market_context: str with market analysis
            news_data: dict with news sentiment
        
        Returns:
            list of risk factors
        """
        if not self.model:
            return self._generate_fallback_risks(prediction, news_data)
        
        try:
            prompt = f"""
Identify 2-3 key risk factors for this trade:

Stock: {symbol}
Action: {prediction}
Market Context: {market_context}
News Sentiment: {news_data.get('sentiment', {}).get('sentiment', 'NEUTRAL')}

List specific risks that could impact this trade. Be concise.
Format as bullet points.
"""
            
            response = self.model.generate_content(
                prompt,
                generation_config={
                    "temperature": GEMINI_TEMPERATURE,
                    "max_output_tokens": 300
                }
            )
            
            # Parse response into list
            risks = [line.strip('- ').strip() for line in response.text.split('\n') if line.strip()]
            return risks[:3]  # Top 3 risks
            
        except Exception as e:
            logger.error(f"Error analyzing risk factors: {e}")
            return self._generate_fallback_risks(prediction, news_data)
    
    def _format_sector_data(self, sector_data):
        """Format sector data for prompt"""
        if not sector_data:
            return "No sector data available"
        
        lines = []
        for sector, data in sector_data.items():
            change = data.get('change_percent', 0)
            lines.append(f"- {sector}: {change:+.2f}%")
        
        return '\n'.join(lines)
    
    def _generate_fallback_reasoning(self, prediction, confidence, technical_indicators):
        """Generate simple reasoning when Gemini is unavailable"""
        rsi = technical_indicators.get('RSI', 50)
        macd = technical_indicators.get('MACD', '')
        volume = technical_indicators.get('Volume', '')
        
        reasoning = f"{prediction} signal with {confidence:.1f}% confidence. "
        
        if 'bullish' in macd.lower():
            reasoning += "MACD shows bullish momentum. "
        elif 'bearish' in macd.lower():
            reasoning += "MACD shows bearish momentum. "
        
        if rsi < 30:
            reasoning += "RSI indicates oversold conditions, potential reversal. "
        elif rsi > 70:
            reasoning += "RSI indicates overbought conditions, caution advised. "
        
        if '+' in str(volume):
            reasoning += "Volume surge confirms buying interest. "
        
        reasoning += "Monitor price action closely for confirmation."
        
        return reasoning
    
    def _generate_fallback_risks(self, prediction, news_data):
        """Generate simple risk factors when Gemini is unavailable"""
        risks = []
        
        sentiment = news_data.get('sentiment', {}).get('sentiment', 'NEUTRAL')
        
        if sentiment == 'NEGATIVE':
            risks.append("Negative news sentiment may impact price")
        
        if prediction == "BUY":
            risks.append("Resistance levels may slow upward momentum")
            risks.append("Market reversal could trigger stop-loss")
        else:
            risks.append("Support levels may halt downward movement")
            risks.append("Short covering could reverse the trade")
        
        return risks[:3]

# Example usage
if __name__ == "__main__":
    # Note: Replace with actual API key
    analyzer = GeminiContextAnalyzer(api_key="your_api_key_here")
    
    # Test market context
    index_data = {
        "ltp": 19500,
        "change_percent": 1.2
    }
    
    sector_data = {
        "IT": {"change_percent": 1.5},
        "BANK": {"change_percent": 0.8},
        "AUTO": {"change_percent": -0.3}
    }
    
    context = analyzer.analyze_market_context(index_data, sector_data)
    print(f"Market Context: {context}")
