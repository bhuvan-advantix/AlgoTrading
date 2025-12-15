"""
Trade Analyzer - Calculate Entry, Stop-Loss, Target
"""

import sys
sys.path.append('..')
from config.settings import (
    STOP_LOSS_METHOD, STOP_LOSS_ATR_MULTIPLIER,
    STOP_LOSS_PERCENTAGE, TARGET_RISK_REWARD
)
from utils.helpers import get_logger, round_to_tick

logger = get_logger(__name__)

class TradeAnalyzer:
    """Analyze trades and calculate entry/exit points"""
    
    def __init__(self):
        pass
    
    def calculate_entry_price(self, current_price, prediction):
        """
        Calculate entry price
        
        Args:
            current_price: Current market price
            prediction: BUY or SELL
        
        Returns:
            Entry price
        """
        # For simplicity, use current price as entry
        # Can be enhanced with limit orders at support/resistance
        return round_to_tick(current_price)
    
    def calculate_stop_loss(self, entry_price, atr, prediction, support_level=None):
        """
        Calculate stop-loss price
        
        Args:
            entry_price: Entry price
            atr: Average True Range
            prediction: BUY or SELL
            support_level: Optional support level
        
        Returns:
            Stop-loss price
        """
        if STOP_LOSS_METHOD == "ATR":
            # ATR-based stop-loss
            if prediction == "BUY":
                stop_loss = entry_price - (atr * STOP_LOSS_ATR_MULTIPLIER)
            else:  # SELL
                stop_loss = entry_price + (atr * STOP_LOSS_ATR_MULTIPLIER)
        
        elif STOP_LOSS_METHOD == "PERCENTAGE":
            # Percentage-based stop-loss
            if prediction == "BUY":
                stop_loss = entry_price * (1 - STOP_LOSS_PERCENTAGE)
            else:  # SELL
                stop_loss = entry_price * (1 + STOP_LOSS_PERCENTAGE)
        
        elif STOP_LOSS_METHOD == "SUPPORT" and support_level:
            # Support-based stop-loss
            if prediction == "BUY":
                stop_loss = support_level - 0.50  # Buffer below support
            else:  # SELL
                stop_loss = support_level + 0.50  # Buffer above resistance
        
        else:
            # Default to ATR method
            if prediction == "BUY":
                stop_loss = entry_price - (atr * STOP_LOSS_ATR_MULTIPLIER)
            else:
                stop_loss = entry_price + (atr * STOP_LOSS_ATR_MULTIPLIER)
        
        return round_to_tick(stop_loss)
    
    def calculate_target(self, entry_price, stop_loss, prediction, risk_reward_ratio=TARGET_RISK_REWARD):
        """
        Calculate target price based on risk:reward ratio
        
        Args:
            entry_price: Entry price
            stop_loss: Stop-loss price
            prediction: BUY or SELL
            risk_reward_ratio: Target risk:reward ratio
        
        Returns:
            Target price
        """
        risk = abs(entry_price - stop_loss)
        reward = risk * risk_reward_ratio
        
        if prediction == "BUY":
            target = entry_price + reward
        else:  # SELL
            target = entry_price - reward
        
        return round_to_tick(target)
    
    def calculate_multiple_targets(self, entry_price, stop_loss, prediction):
        """
        Calculate multiple target levels
        
        Returns:
            dict with multiple targets
        """
        risk = abs(entry_price - stop_loss)
        
        targets = {}
        
        if prediction == "BUY":
            targets['target_1'] = round_to_tick(entry_price + (risk * 1.5))  # 1:1.5
            targets['target_2'] = round_to_tick(entry_price + (risk * 2.0))  # 1:2
            targets['target_3'] = round_to_tick(entry_price + (risk * 3.0))  # 1:3
        else:  # SELL
            targets['target_1'] = round_to_tick(entry_price - (risk * 1.5))
            targets['target_2'] = round_to_tick(entry_price - (risk * 2.0))
            targets['target_3'] = round_to_tick(entry_price - (risk * 3.0))
        
        return targets
    
    def analyze_trade(self, symbol, current_price, prediction, atr, support=None, resistance=None):
        """
        Complete trade analysis
        
        Args:
            symbol: Stock symbol
            current_price: Current market price
            prediction: BUY or SELL
            atr: Average True Range
            support: Support level (optional)
            resistance: Resistance level (optional)
        
        Returns:
            dict with complete trade plan
        """
        try:
            # Calculate entry
            entry_price = self.calculate_entry_price(current_price, prediction)
            
            # Calculate stop-loss
            support_resistance = support if prediction == "BUY" else resistance
            stop_loss = self.calculate_stop_loss(entry_price, atr, prediction, support_resistance)
            
            # Calculate target
            target = self.calculate_target(entry_price, stop_loss, prediction)
            
            # Calculate multiple targets
            multiple_targets = self.calculate_multiple_targets(entry_price, stop_loss, prediction)
            
            # Calculate risk and reward
            risk_amount = abs(entry_price - stop_loss)
            reward_amount = abs(target - entry_price)
            risk_reward_ratio = reward_amount / risk_amount if risk_amount > 0 else 0
            
            trade_plan = {
                "symbol": symbol,
                "action": prediction,
                "entry_price": entry_price,
                "stop_loss": stop_loss,
                "target": target,
                "multiple_targets": multiple_targets,
                "risk_amount": round(risk_amount, 2),
                "reward_amount": round(reward_amount, 2),
                "risk_reward_ratio": f"1:{risk_reward_ratio:.1f}",
                "risk_reward_numeric": round(risk_reward_ratio, 2)
            }
            
            logger.info(f"Trade plan for {symbol}: {prediction} @ {entry_price}, SL: {stop_loss}, Target: {target}")
            
            return trade_plan
            
        except Exception as e:
            logger.error(f"Error analyzing trade for {symbol}: {e}")
            return None
    
    def calculate_position_size(self, portfolio_value, risk_per_trade, entry_price, stop_loss):
        """
        Calculate position size based on risk management
        
        Args:
            portfolio_value: Total portfolio value
            risk_per_trade: Risk percentage (e.g., 0.02 for 2%)
            entry_price: Entry price per share
            stop_loss: Stop-loss price per share
        
        Returns:
            dict with position sizing details
        """
        risk_amount = portfolio_value * risk_per_trade
        risk_per_share = abs(entry_price - stop_loss)
        
        if risk_per_share == 0:
            return {
                "quantity": 0,
                "investment": 0,
                "risk_amount": 0
            }
        
        quantity = int(risk_amount / risk_per_share)
        investment = quantity * entry_price
        
        return {
            "quantity": quantity,
            "investment": round(investment, 2),
            "risk_amount": round(risk_amount, 2),
            "risk_per_share": round(risk_per_share, 2)
        }

# Example usage
if __name__ == "__main__":
    analyzer = TradeAnalyzer()
    
    # Example trade analysis
    trade_plan = analyzer.analyze_trade(
        symbol="TCS.NS",
        current_price=3850.50,
        prediction="BUY",
        atr=27.75,
        support=3795,
        resistance=3900
    )
    
    print(f"\nTrade Plan: {trade_plan}")
    
    # Position sizing
    position = analyzer.calculate_position_size(
        portfolio_value=100000,
        risk_per_trade=0.02,
        entry_price=trade_plan['entry_price'],
        stop_loss=trade_plan['stop_loss']
    )
    
    print(f"\nPosition Size: {position}")
