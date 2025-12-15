"""
Utility Helper Functions
"""

import logging
from datetime import datetime, time
import pytz

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

def get_logger(name):
    """Get logger instance"""
    return logging.getLogger(name)

def is_market_open():
    """Check if Indian market is currently open"""
    ist = pytz.timezone('Asia/Kolkata')
    now = datetime.now(ist)
    
    # Check if weekday (Monday=0, Sunday=6)
    if now.weekday() > 4:  # Saturday or Sunday
        return False
    
    # Market hours: 09:15 - 15:30
    market_open = time(9, 15)
    market_close = time(15, 30)
    current_time = now.time()
    
    return market_open <= current_time <= market_close

def get_market_status():
    """Get current market status"""
    ist = pytz.timezone('Asia/Kolkata')
    now = datetime.now(ist)
    
    if now.weekday() > 4:
        return "CLOSED_WEEKEND"
    
    current_time = now.time()
    pre_market = time(9, 0)
    market_open = time(9, 15)
    market_close = time(15, 30)
    post_market = time(16, 0)
    
    if current_time < pre_market:
        return "CLOSED"
    elif pre_market <= current_time < market_open:
        return "PRE_MARKET"
    elif market_open <= current_time <= market_close:
        return "OPEN"
    elif market_close < current_time <= post_market:
        return "POST_MARKET"
    else:
        return "CLOSED"

def format_currency(amount):
    """Format amount in Indian currency format"""
    if amount >= 10000000:  # 1 Crore
        return f"₹{amount/10000000:.2f}Cr"
    elif amount >= 100000:  # 1 Lakh
        return f"₹{amount/100000:.2f}L"
    else:
        return f"₹{amount:,.2f}"

def calculate_percentage_change(old_value, new_value):
    """Calculate percentage change"""
    if old_value == 0:
        return 0
    return ((new_value - old_value) / old_value) * 100

def validate_stock_symbol(symbol):
    """Validate and format stock symbol for NSE"""
    if not symbol:
        return None
    
    symbol = symbol.upper().strip()
    
    # Add .NS suffix if not present
    if not symbol.endswith('.NS') and not symbol.endswith('.BO'):
        symbol = f"{symbol}.NS"
    
    return symbol

def generate_prediction_id(symbol):
    """Generate unique prediction ID"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    clean_symbol = symbol.replace('.NS', '').replace('.BO', '')
    return f"pred_{timestamp}_{clean_symbol}"

def calculate_position_size(portfolio_value, risk_per_trade, entry_price, stop_loss):
    """
    Calculate position size based on risk management
    
    Args:
        portfolio_value: Total portfolio value
        risk_per_trade: Risk percentage (e.g., 0.02 for 2%)
        entry_price: Entry price per share
        stop_loss: Stop loss price per share
    
    Returns:
        quantity: Number of shares to buy
    """
    risk_amount = portfolio_value * risk_per_trade
    risk_per_share = abs(entry_price - stop_loss)
    
    if risk_per_share == 0:
        return 0
    
    quantity = int(risk_amount / risk_per_share)
    return quantity

def calculate_risk_reward_ratio(entry, stop_loss, target):
    """Calculate risk:reward ratio"""
    risk = abs(entry - stop_loss)
    reward = abs(target - entry)
    
    if risk == 0:
        return 0
    
    return reward / risk

def get_trading_session():
    """Get current trading session identifier"""
    ist = pytz.timezone('Asia/Kolkata')
    now = datetime.now(ist)
    return now.strftime("%Y%m%d")

def safe_divide(numerator, denominator, default=0):
    """Safe division to avoid division by zero"""
    try:
        if denominator == 0:
            return default
        return numerator / denominator
    except:
        return default

def round_to_tick(price, tick_size=0.05):
    """Round price to nearest tick size"""
    return round(price / tick_size) * tick_size

def get_ist_timestamp():
    """Get current IST timestamp"""
    ist = pytz.timezone('Asia/Kolkata')
    return datetime.now(ist).isoformat()

def parse_timeframe(timeframe):
    """Parse timeframe string (e.g., '1d', '5m', '1h')"""
    unit = timeframe[-1]
    value = int(timeframe[:-1])
    
    mapping = {
        'm': 'minute',
        'h': 'hour',
        'd': 'day',
        'w': 'week',
        'M': 'month'
    }
    
    return value, mapping.get(unit, 'day')
