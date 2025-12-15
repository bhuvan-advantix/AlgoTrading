"""
Risk Manager - Enforce trading limits and safety rules
"""

import sys
sys.path.append('..')
from config.settings import (
    RISK_PER_TRADE, MAX_POSITION_SIZE, MIN_RISK_REWARD,
    MAX_TRADES_PER_DAY, MAX_TRADES_PER_WEEK,
    MAX_DAILY_LOSS, MAX_WEEKLY_LOSS, CONSECUTIVE_LOSS_LIMIT
)
from utils.helpers import get_logger

logger = get_logger(__name__)

class RiskManager:
    """Manage trading risk and enforce safety limits"""
    
    def __init__(self):
        self.daily_trades = 0
        self.weekly_trades = 0
        self.daily_pnl = 0
        self.weekly_pnl = 0
        self.consecutive_losses = 0
        self.circuit_breaker_active = False
    
    def validate_position_size(self, investment, portfolio_value):
        """
        Validate position size doesn't exceed limits
        
        Args:
            investment: Proposed investment amount
            portfolio_value: Total portfolio value
        
        Returns:
            tuple (is_valid, reason)
        """
        position_pct = investment / portfolio_value if portfolio_value > 0 else 0
        
        if position_pct > MAX_POSITION_SIZE:
            return False, f"Position size ({position_pct:.1%}) exceeds limit ({MAX_POSITION_SIZE:.1%})"
        
        return True, "Position size OK"
    
    def validate_risk_reward(self, risk_reward_ratio):
        """
        Validate risk:reward ratio meets minimum
        
        Args:
            risk_reward_ratio: Numeric ratio (e.g., 2.0 for 1:2)
        
        Returns:
            tuple (is_valid, reason)
        """
        if risk_reward_ratio < MIN_RISK_REWARD:
            return False, f"Risk:reward ({risk_reward_ratio:.1f}) below minimum ({MIN_RISK_REWARD:.1f})"
        
        return True, "Risk:reward OK"
    
    def validate_trade_count(self):
        """
        Validate trade count limits
        
        Returns:
            tuple (is_valid, reason)
        """
        if self.daily_trades >= MAX_TRADES_PER_DAY:
            return False, f"Daily trade limit ({MAX_TRADES_PER_DAY}) reached"
        
        if self.weekly_trades >= MAX_TRADES_PER_WEEK:
            return False, f"Weekly trade limit ({MAX_TRADES_PER_WEEK}) reached"
        
        return True, "Trade count OK"
    
    def validate_loss_limits(self, portfolio_value):
        """
        Validate loss limits not exceeded
        
        Args:
            portfolio_value: Total portfolio value
        
        Returns:
            tuple (is_valid, reason)
        """
        daily_loss_pct = abs(self.daily_pnl) / portfolio_value if portfolio_value > 0 else 0
        weekly_loss_pct = abs(self.weekly_pnl) / portfolio_value if portfolio_value > 0 else 0
        
        if self.daily_pnl < 0 and daily_loss_pct > MAX_DAILY_LOSS:
            return False, f"Daily loss limit ({MAX_DAILY_LOSS:.1%}) exceeded"
        
        if self.weekly_pnl < 0 and weekly_loss_pct > MAX_WEEKLY_LOSS:
            return False, f"Weekly loss limit ({MAX_WEEKLY_LOSS:.1%}) exceeded"
        
        return True, "Loss limits OK"
    
    def validate_consecutive_losses(self):
        """
        Check consecutive loss limit
        
        Returns:
            tuple (is_valid, reason)
        """
        if self.consecutive_losses >= CONSECUTIVE_LOSS_LIMIT:
            return False, f"Consecutive loss limit ({CONSECUTIVE_LOSS_LIMIT}) reached. System paused."
        
        return True, "Consecutive losses OK"
    
    def check_circuit_breaker(self):
        """
        Check if circuit breaker is active
        
        Returns:
            tuple (is_active, reason)
        """
        if self.circuit_breaker_active:
            return True, "Circuit breaker active. Trading paused."
        
        return False, "Circuit breaker inactive"
    
    def validate_trade(self, trade_plan, portfolio_value):
        """
        Comprehensive trade validation
        
        Args:
            trade_plan: dict with trade details
            portfolio_value: Total portfolio value
        
        Returns:
            dict with validation results
        """
        validations = []
        is_valid = True
        
        # Check circuit breaker
        breaker_active, breaker_reason = self.check_circuit_breaker()
        if breaker_active:
            return {
                "is_valid": False,
                "reason": breaker_reason,
                "validations": [{"check": "Circuit Breaker", "passed": False, "reason": breaker_reason}]
            }
        
        # Position size
        investment = trade_plan.get('investment', 0)
        pos_valid, pos_reason = self.validate_position_size(investment, portfolio_value)
        validations.append({"check": "Position Size", "passed": pos_valid, "reason": pos_reason})
        if not pos_valid:
            is_valid = False
        
        # Risk:reward
        rr_ratio = trade_plan.get('risk_reward_numeric', 0)
        rr_valid, rr_reason = self.validate_risk_reward(rr_ratio)
        validations.append({"check": "Risk:Reward", "passed": rr_valid, "reason": rr_reason})
        if not rr_valid:
            is_valid = False
        
        # Trade count
        count_valid, count_reason = self.validate_trade_count()
        validations.append({"check": "Trade Count", "passed": count_valid, "reason": count_reason})
        if not count_valid:
            is_valid = False
        
        # Loss limits
        loss_valid, loss_reason = self.validate_loss_limits(portfolio_value)
        validations.append({"check": "Loss Limits", "passed": loss_valid, "reason": loss_reason})
        if not loss_valid:
            is_valid = False
        
        # Consecutive losses
        consec_valid, consec_reason = self.validate_consecutive_losses()
        validations.append({"check": "Consecutive Losses", "passed": consec_valid, "reason": consec_reason})
        if not consec_valid:
            is_valid = False
        
        result = {
            "is_valid": is_valid,
            "reason": "All checks passed" if is_valid else "One or more checks failed",
            "validations": validations
        }
        
        logger.info(f"Trade validation: {'PASSED' if is_valid else 'FAILED'}")
        
        return result
    
    def record_trade(self):
        """Record a new trade"""
        self.daily_trades += 1
        self.weekly_trades += 1
        logger.info(f"Trade recorded. Daily: {self.daily_trades}, Weekly: {self.weekly_trades}")
    
    def record_trade_outcome(self, profit_loss):
        """
        Record trade outcome
        
        Args:
            profit_loss: Profit or loss amount
        """
        self.daily_pnl += profit_loss
        self.weekly_pnl += profit_loss
        
        if profit_loss < 0:
            self.consecutive_losses += 1
        else:
            self.consecutive_losses = 0
        
        logger.info(f"Trade outcome recorded. P&L: {profit_loss:.2f}, Consecutive losses: {self.consecutive_losses}")
        
        # Check for circuit breaker activation
        if self.consecutive_losses >= CONSECUTIVE_LOSS_LIMIT:
            self.activate_circuit_breaker("Consecutive loss limit reached")
    
    def activate_circuit_breaker(self, reason):
        """Activate circuit breaker to stop trading"""
        self.circuit_breaker_active = True
        logger.warning(f"CIRCUIT BREAKER ACTIVATED: {reason}")
    
    def deactivate_circuit_breaker(self):
        """Deactivate circuit breaker"""
        self.circuit_breaker_active = False
        self.consecutive_losses = 0
        logger.info("Circuit breaker deactivated")
    
    def reset_daily_counters(self):
        """Reset daily counters (call at market open)"""
        self.daily_trades = 0
        self.daily_pnl = 0
        logger.info("Daily counters reset")
    
    def reset_weekly_counters(self):
        """Reset weekly counters (call on Monday)"""
        self.weekly_trades = 0
        self.weekly_pnl = 0
        logger.info("Weekly counters reset")
    
    def get_risk_status(self):
        """Get current risk status"""
        return {
            "daily_trades": self.daily_trades,
            "weekly_trades": self.weekly_trades,
            "daily_pnl": round(self.daily_pnl, 2),
            "weekly_pnl": round(self.weekly_pnl, 2),
            "consecutive_losses": self.consecutive_losses,
            "circuit_breaker_active": self.circuit_breaker_active,
            "daily_trades_remaining": MAX_TRADES_PER_DAY - self.daily_trades,
            "weekly_trades_remaining": MAX_TRADES_PER_WEEK - self.weekly_trades
        }

# Example usage
if __name__ == "__main__":
    risk_manager = RiskManager()
    
    # Example trade validation
    trade_plan = {
        "investment": 50000,
        "risk_reward_numeric": 2.0
    }
    
    portfolio_value = 100000
    
    result = risk_manager.validate_trade(trade_plan, portfolio_value)
    print(f"\nValidation result: {result}")
    
    # Record trade
    if result['is_valid']:
        risk_manager.record_trade()
        risk_manager.record_trade_outcome(-1000)  # Loss
    
    # Get status
    status = risk_manager.get_risk_status()
    print(f"\nRisk status: {status}")
