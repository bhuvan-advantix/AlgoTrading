"""
Yahoo Finance Data Connector
Fetches historical and real-time stock data
"""

import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import sys
sys.path.append('..')
from config.settings import HISTORICAL_YEARS, INDEX_SYMBOLS
from utils.helpers import get_logger, validate_stock_symbol

logger = get_logger(__name__)

class YahooFinanceConnector:
    """Connector for Yahoo Finance data"""
    
    def __init__(self):
        self.cache = {}
    
    def get_historical_data(self, symbol, period="2y", interval="1d"):
        """
        Fetch historical OHLCV data
        
        Args:
            symbol: Stock symbol (e.g., 'TCS.NS')
            period: Time period (e.g., '1d', '5d', '1mo', '1y', '2y')
            interval: Data interval (e.g., '1m', '5m', '15m', '1h', '1d')
        
        Returns:
            DataFrame with OHLCV data
        """
        try:
            symbol = validate_stock_symbol(symbol)
            logger.info(f"Fetching historical data for {symbol}")
            
            ticker = yf.Ticker(symbol)
            df = ticker.history(period=period, interval=interval)
            
            if df.empty:
                logger.warning(f"No data found for {symbol}")
                return None
            
            # Clean column names
            df.columns = [col.lower() for col in df.columns]
            
            # Reset index to make date a column
            df.reset_index(inplace=True)
            
            logger.info(f"Fetched {len(df)} rows for {symbol}")
            return df
            
        except Exception as e:
            logger.error(f"Error fetching data for {symbol}: {e}")
            return None
    
    def get_latest_price(self, symbol):
        """
        Get latest price data
        
        Returns:
            dict with current price info
        """
        try:
            symbol = validate_stock_symbol(symbol)
            ticker = yf.Ticker(symbol)
            
            # Get current data
            info = ticker.info
            
            # Get latest quote
            hist = ticker.history(period="1d", interval="1m")
            
            if hist.empty:
                return None
            
            latest = hist.iloc[-1]
            
            return {
                "symbol": symbol,
                "ltp": latest['Close'],
                "open": latest['Open'],
                "high": latest['High'],
                "low": latest['Low'],
                "volume": latest['Volume'],
                "change": latest['Close'] - latest['Open'],
                "change_percent": ((latest['Close'] - latest['Open']) / latest['Open']) * 100,
                "timestamp": latest.name.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error fetching latest price for {symbol}: {e}")
            return None
    
    def get_stock_info(self, symbol):
        """
        Get stock fundamental information
        
        Returns:
            dict with stock info
        """
        try:
            symbol = validate_stock_symbol(symbol)
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            return {
                "symbol": symbol,
                "name": info.get("longName", ""),
                "sector": info.get("sector", ""),
                "industry": info.get("industry", ""),
                "market_cap": info.get("marketCap", 0),
                "pe_ratio": info.get("trailingPE", 0),
                "dividend_yield": info.get("dividendYield", 0),
                "52w_high": info.get("fiftyTwoWeekHigh", 0),
                "52w_low": info.get("fiftyTwoWeekLow", 0),
            }
            
        except Exception as e:
            logger.error(f"Error fetching info for {symbol}: {e}")
            return None
    
    def get_index_data(self, index_symbol="^NSEI"):
        """
        Get index (Nifty/Sensex) data
        
        Returns:
            dict with index info
        """
        try:
            ticker = yf.Ticker(index_symbol)
            hist = ticker.history(period="1d", interval="1m")
            
            if hist.empty:
                return None
            
            latest = hist.iloc[-1]
            first = hist.iloc[0]
            
            return {
                "symbol": index_symbol,
                "ltp": latest['Close'],
                "open": first['Open'],
                "high": hist['High'].max(),
                "low": hist['Low'].min(),
                "change": latest['Close'] - first['Open'],
                "change_percent": ((latest['Close'] - first['Open']) / first['Open']) * 100,
            }
            
        except Exception as e:
            logger.error(f"Error fetching index data for {index_symbol}: {e}")
            return None
    
    def get_intraday_data(self, symbol, interval="5m"):
        """
        Get intraday data for current trading day
        
        Args:
            symbol: Stock symbol
            interval: Time interval (1m, 5m, 15m, 30m, 1h)
        
        Returns:
            DataFrame with intraday data
        """
        try:
            symbol = validate_stock_symbol(symbol)
            ticker = yf.Ticker(symbol)
            
            # Get today's data
            df = ticker.history(period="1d", interval=interval)
            
            if df.empty:
                logger.warning(f"No intraday data for {symbol}")
                return None
            
            df.columns = [col.lower() for col in df.columns]
            df.reset_index(inplace=True)
            
            return df
            
        except Exception as e:
            logger.error(f"Error fetching intraday data for {symbol}: {e}")
            return None
    
    def get_multiple_stocks(self, symbols):
        """
        Get latest prices for multiple stocks
        
        Args:
            symbols: List of stock symbols
        
        Returns:
            dict with symbol: price_data mapping
        """
        results = {}
        
        for symbol in symbols:
            data = self.get_latest_price(symbol)
            if data:
                results[symbol] = data
        
        return results
    
    def get_sector_performance(self, sector_indices):
        """
        Get performance of sector indices
        
        Args:
            sector_indices: dict of sector: index_symbol
        
        Returns:
            dict with sector performance
        """
        results = {}
        
        for sector, index_symbol in sector_indices.items():
            data = self.get_index_data(index_symbol)
            if data:
                results[sector] = {
                    "change_percent": data["change_percent"],
                    "ltp": data["ltp"]
                }
        
        return results

# Example usage
if __name__ == "__main__":
    connector = YahooFinanceConnector()
    
    # Test historical data
    df = connector.get_historical_data("TCS.NS", period="1mo")
    if df is not None:
        print(f"Historical data shape: {df.shape}")
        print(df.head())
    
    # Test latest price
    price = connector.get_latest_price("TCS.NS")
    if price:
        print(f"\nLatest price: {price}")
    
    # Test index data
    nifty = connector.get_index_data("^NSEI")
    if nifty:
        print(f"\nNifty data: {nifty}")
