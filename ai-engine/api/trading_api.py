"""
FastAPI Trading API
Main API endpoint for AI trading system
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import sys
sys.path.append('..')

from models.predictor import TradingPredictor
from decision.trade_analyzer import TradeAnalyzer
from decision.trade_classifier import TradeClassifier
from decision.risk_manager import RiskManager
from data.yahoo_connector import YahooFinanceConnector
from data.finnhub_connector import FinnhubConnector
from gemini.context_analyzer import GeminiContextAnalyzer
from feedback.feedback_store import FeedbackStore
from config.settings import API_HOST, API_PORT, INDEX_SYMBOLS, SECTOR_INDICES
from utils.helpers import get_logger, get_ist_timestamp, calculate_position_size

logger = get_logger(__name__)

# Initialize FastAPI
app = FastAPI(
    title="AI Trading Engine API",
    description="AI-powered trading prediction and analysis system",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
predictor = TradingPredictor()
trade_analyzer = TradeAnalyzer()
trade_classifier = TradeClassifier()
risk_manager = RiskManager()
yahoo_connector = YahooFinanceConnector()
finnhub_connector = FinnhubConnector()
gemini_analyzer = GeminiContextAnalyzer()
feedback_store = FeedbackStore()

# Pydantic models
class PredictionRequest(BaseModel):
    symbol: str
    portfolio_value: Optional[float] = 100000

class FeedbackRequest(BaseModel):
    prediction_id: str
    user_action: str  # APPROVE or DECLINE
    reason: Optional[str] = None
    trade_executed: bool = False

class TradeOutcomeRequest(BaseModel):
    prediction_id: str
    symbol: str
    action: str
    entry_price: float
    stop_loss: float
    target: float
    quantity: int
    entry_time: str
    exit_time: Optional[str] = None
    exit_price: Optional[float] = None
    profit_loss: Optional[float] = None
    profit_percent: Optional[float] = None
    outcome: Optional[str] = None

# API Endpoints

@app.get("/")
def root():
    """API health check"""
    return {
        "status": "online",
        "message": "AI Trading Engine API",
        "version": "1.0.0",
        "timestamp": get_ist_timestamp()
    }

@app.get("/api/health")
def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "model_loaded": predictor.model is not None,
        "gemini_available": gemini_analyzer.model is not None,
        "risk_status": risk_manager.get_risk_status(),
        "timestamp": get_ist_timestamp()
    }

@app.post("/api/predict")
def predict_stock(request: PredictionRequest):
    """
    Get AI prediction for a stock
    
    Returns complete trade analysis with GOOD/BAD classification
    """
    try:
        logger.info(f"Prediction request for {request.symbol}")
        
        # Get ML prediction
        ml_prediction = predictor.predict(request.symbol)
        
        if 'error' in ml_prediction:
            raise HTTPException(status_code=400, detail=ml_prediction['error'])
        
        # Get latest price and technical data
        latest_price_data = yahoo_connector.get_latest_price(request.symbol)
        if not latest_price_data:
            raise HTTPException(status_code=404, detail="Stock data not available")
        
        current_price = latest_price_data['ltp']
        
        # Get ATR from technical indicators
        atr = ml_prediction['technical_indicators'].get('ATR', current_price * 0.02)
        
        # Analyze trade (Entry/SL/Target)
        trade_plan = trade_analyzer.analyze_trade(
            symbol=request.symbol,
            current_price=current_price,
            prediction=ml_prediction['prediction'],
            atr=atr
        )
        
        # Calculate position size
        position = trade_analyzer.calculate_position_size(
            portfolio_value=request.portfolio_value,
            risk_per_trade=0.02,
            entry_price=trade_plan['entry_price'],
            stop_loss=trade_plan['stop_loss']
        )
        
        trade_plan.update(position)
        
        # Get market context
        nifty_data = yahoo_connector.get_index_data("^NSEI")
        sector_data = yahoo_connector.get_sector_performance(SECTOR_INDICES)
        
        market_context_text = gemini_analyzer.analyze_market_context(nifty_data or {}, sector_data)
        
        # Determine market trend
        index_trend = 1 if (nifty_data and nifty_data.get('change_percent', 0) > 0) else -1
        
        # Get sector for this stock (simplified)
        sector_trend = 0
        
        market_context = {
            "index_trend": index_trend,
            "sector_trend": sector_trend,
            "market_text": market_context_text
        }
        
        # Get news sentiment
        news_data = finnhub_connector.get_stock_sentiment(request.symbol, days_back=1)
        
        # Classify trade (GOOD/BAD)
        classification = trade_classifier.classify_trade(
            ml_prediction=ml_prediction,
            trade_plan=trade_plan,
            market_context=market_context,
            news_data=news_data,
            technical_indicators=ml_prediction['technical_indicators']
        )
        
        # Generate Gemini reasoning
        gemini_reasoning = gemini_analyzer.analyze_trade_reasoning(
            symbol=request.symbol,
            prediction=ml_prediction['prediction'],
            confidence=ml_prediction['confidence'],
            technical_indicators=ml_prediction['technical_indicators'],
            news_sentiment=news_data,
            trade_plan=trade_plan
        )
        
        # Get risk factors
        risk_factors = gemini_analyzer.analyze_risk_factors(
            symbol=request.symbol,
            prediction=ml_prediction['prediction'],
            market_context=market_context_text,
            news_data=news_data
        )
        
        # Validate with risk manager
        risk_validation = risk_manager.validate_trade(trade_plan, request.portfolio_value)
        
        # Build complete response
        response = {
            "timestamp": get_ist_timestamp(),
            "stock": {
                "symbol": request.symbol,
                "name": latest_price_data.get('symbol', request.symbol),
                "ltp": current_price,
                "change": latest_price_data.get('change', 0),
                "change_percent": latest_price_data.get('change_percent', 0)
            },
            "prediction": {
                "action": ml_prediction['prediction'],
                "confidence": ml_prediction['confidence'],
                "probabilities": ml_prediction['probabilities']
            },
            "trade_plan": trade_plan,
            "classification": classification,
            "gemini_analysis": {
                "market_context": market_context_text,
                "reasoning": gemini_reasoning,
                "risk_factors": risk_factors
            },
            "technical_indicators": ml_prediction['technical_indicators'],
            "news_sentiment": news_data.get('sentiment', {}),
            "risk_validation": risk_validation,
            "metadata": {
                "prediction_id": ml_prediction['prediction_id'],
                "valid_until": get_ist_timestamp()
            }
        }
        
        # Store prediction
        feedback_store.store_prediction(ml_prediction)
        
        return response
        
    except Exception as e:
        logger.error(f"Error in predict endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/feedback")
def submit_feedback(request: FeedbackRequest):
    """Submit user feedback (APPROVE/DECLINE)"""
    try:
        feedback_store.store_feedback(
            prediction_id=request.prediction_id,
            user_action=request.user_action,
            reason=request.reason,
            trade_executed=request.trade_executed
        )
        
        # Record trade with risk manager if approved
        if request.user_action == "APPROVE" and request.trade_executed:
            risk_manager.record_trade()
        
        return {
            "status": "success",
            "message": "Feedback recorded",
            "prediction_id": request.prediction_id
        }
        
    except Exception as e:
        logger.error(f"Error submitting feedback: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/trade/outcome")
def record_trade_outcome(request: TradeOutcomeRequest):
    """Record trade outcome for learning"""
    try:
        trade_data = request.dict()
        feedback_store.store_trade_outcome(trade_data)
        
        # Update risk manager
        if request.profit_loss is not None:
            risk_manager.record_trade_outcome(request.profit_loss)
        
        return {
            "status": "success",
            "message": "Trade outcome recorded"
        }
        
    except Exception as e:
        logger.error(f"Error recording trade outcome: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/suggestions")
def get_stock_suggestions(min_confidence: float = 65, limit: int = 5):
    """Get top stock suggestions"""
    try:
        # Nifty 50 stocks (sample)
        nifty_stocks = [
            "TCS.NS", "INFY.NS", "RELIANCE.NS", "HDFCBANK.NS", "ICICIBANK.NS",
            "HINDUNILVR.NS", "ITC.NS", "SBIN.NS", "BHARTIARTL.NS", "KOTAKBANK.NS"
        ]
        
        predictions = predictor.get_top_predictions(nifty_stocks, min_confidence=min_confidence)
        
        return {
            "suggestions": predictions[:limit],
            "total_scanned": len(nifty_stocks),
            "total_found": len(predictions)
        }
        
    except Exception as e:
        logger.error(f"Error getting suggestions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stats")
def get_statistics():
    """Get system statistics"""
    try:
        feedback_stats = feedback_store.get_feedback_stats()
        trade_performance = feedback_store.get_trade_performance()
        risk_status = risk_manager.get_risk_status()
        
        return {
            "feedback": feedback_stats,
            "performance": trade_performance,
            "risk": risk_status
        }
        
    except Exception as e:
        logger.error(f"Error getting statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/model/status")
def model_status():
    """Get model status and version"""
    return {
        "model_loaded": predictor.model is not None,
        "model_type": "RandomForest",
        "features_count": len(predictor.feature_engineer.get_feature_columns()) if predictor.feature_engineer else 0,
        "gemini_available": gemini_analyzer.model is not None
    }

# Run server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("trading_api:app", host=API_HOST, port=API_PORT, reload=False)
