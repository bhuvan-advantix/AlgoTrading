// Trade Monitor Service - Monitors live prices and executes trades at entry/stop/target
import enhancedMarketDataService from './enhancedMarketDataService';
import { placeMarketOrder } from '../utils/paperTradingStore';

class TradeMonitorService {
    constructor() {
        this.activeMonitors = new Map(); // symbol -> monitor config
        this.monitorInterval = null;
        this.checkIntervalMs = 5000; // Check prices every 5 seconds
        this.maxHoldTimeHours = 3; // Auto-exit after 3 hours
    }

    /**
     * Start monitoring trades for entry, stop, and target
     * @param {Array} recommendations - AI recommendations with entry, stop, target
     */
    startMonitoring(recommendations) {
        console.log('🔍 Starting trade monitoring for', recommendations.length, 'stocks');

        // Clear existing monitors
        this.stopMonitoring();

        // Set up monitors for each stock
        recommendations.forEach(rec => {
            if (rec.quantity === 0) return;

            const monitor = {
                symbol: rec.symbol,
                name: rec.name,
                entry: rec.entry,
                stop: rec.stop,
                target: rec.target,
                quantity: rec.quantity,
                status: 'WAITING_ENTRY', // WAITING_ENTRY, POSITION_OPEN, CLOSED
                entryTime: null,
                entryExecuted: false,
                currentPrice: 0,
                lastCheck: null
            };

            this.activeMonitors.set(rec.symbol, monitor);
            console.log(`📊 Monitoring ${rec.symbol}: Entry=${rec.entry}, Stop=${rec.stop}, Target=${rec.target}`);
        });

        // Start price monitoring loop
        this.startMonitoringLoop();
    }

    /**
     * Start the monitoring loop
     */
    startMonitoringLoop() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
        }

        console.log('🔄 Starting price monitoring loop (every 5 seconds)');

        this.monitorInterval = setInterval(async () => {
            await this.checkAllPrices();
        }, this.checkIntervalMs);

        // Initial check
        this.checkAllPrices();
    }

    /**
     * Check prices for all monitored stocks
     */
    async checkAllPrices() {
        const now = new Date();

        for (const [symbol, monitor] of this.activeMonitors.entries()) {
            try {
                // Get current price using quick quote
                const quote = await enhancedMarketDataService.getQuickQuote(symbol);

                if (!quote || !quote.price) {
                    console.warn(`⚠️ No price data for ${symbol}`);
                    continue;
                }

                const currentPrice = quote.price;
                monitor.currentPrice = currentPrice;
                monitor.lastCheck = now;

                console.log(`💹 ${symbol}: Current=${currentPrice}, Entry=${monitor.entry}, Stop=${monitor.stop}, Target=${monitor.target}, Status=${monitor.status}`);

                // Check based on status
                if (monitor.status === 'WAITING_ENTRY') {
                    await this.checkEntry(monitor, currentPrice);
                } else if (monitor.status === 'POSITION_OPEN') {
                    await this.checkExitConditions(monitor, currentPrice, now);
                }

            } catch (error) {
                console.error(`❌ Error checking ${symbol}:`, error);
            }
        }
    }

    /**
     * Check if entry condition is met
     */
    async checkEntry(monitor, currentPrice) {
        // Entry condition: Current price must be BELOW entry (wait for dip)
        // Only buy if price drops below entry, not if it's already at or above
        const entryTolerance = monitor.entry * 0.005; // 0.5% tolerance below entry
        const lowerBound = monitor.entry - entryTolerance; // Buy zone: entry - 0.5%

        console.log(`🔍 Entry Check for ${monitor.symbol}:`)
            ;
        console.log(`   Current: ₹${currentPrice}`);
        console.log(`   Entry: ₹${monitor.entry}`);
        console.log(`   Tolerance: ₹${entryTolerance.toFixed(2)} (0.5% below)`);
        console.log(`   Buy Zone: ₹${lowerBound.toFixed(2)} - ₹${monitor.entry.toFixed(2)}`);
        console.log(`   Price Below Entry: ${currentPrice < monitor.entry ? 'YES ✅' : 'NO ❌'}`);
        console.log(`   Within Buy Zone: ${currentPrice >= lowerBound && currentPrice < monitor.entry ? 'YES ✅' : 'NO ❌'}`);
        console.log(`   Already Executed: ${monitor.entryExecuted ? 'YES' : 'NO'}`);

        // Only buy if price is BELOW entry (waiting for dip) and within tolerance
        if (currentPrice < monitor.entry && currentPrice >= lowerBound && !monitor.entryExecuted) {
            console.log(`🎯 ENTRY TRIGGERED for ${monitor.symbol} at ₹${currentPrice} (Entry: ₹${monitor.entry}) - Price dropped below entry!`);

            // Execute BUY order
            const success = await this.executeBuyOrder(monitor, currentPrice);

            if (success) {
                monitor.status = 'POSITION_OPEN';
                monitor.entryExecuted = true;
                monitor.entryTime = new Date();
                monitor.actualEntry = currentPrice;

                // Explicitly update the Map to ensure changes persist
                this.activeMonitors.set(monitor.symbol, monitor);

                console.log(`🎯 Position opened for ${monitor.symbol}: ${monitor.quantity} shares @ ₹${currentPrice}`);
                console.log(`📊 Monitor updated - Status: ${monitor.status}, Entry Time: ${monitor.entryTime}`);
            } else {
                console.error(`❌ Failed to execute buy order for ${monitor.symbol}`);
            }
        } else if (currentPrice >= monitor.entry) {
            console.log(`⏸️ ${monitor.symbol}: Price (₹${currentPrice}) is AT or ABOVE entry (₹${monitor.entry}) - WAITING for price to drop`);
        }
    }

    /**
     * Check exit conditions (stop loss, target, time-based)
     */
    async checkExitConditions(monitor, currentPrice, now) {
        let exitReason = null;
        let shouldExit = false;

        // 1. Check STOP LOSS
        if (currentPrice <= monitor.stop) {
            exitReason = 'STOP_LOSS';
            shouldExit = true;
            console.log(`🛑 STOP LOSS hit for ${monitor.symbol}: ${currentPrice} <= ${monitor.stop}`);
        }

        // 2. Check TARGET
        if (currentPrice >= monitor.target) {
            exitReason = 'TARGET';
            shouldExit = true;
            console.log(`🎯 TARGET hit for ${monitor.symbol}: ${currentPrice} >= ${monitor.target}`);
        }

        // 3. Check TIME-BASED EXIT (after 3 hours)
        if (monitor.entryTime) {
            const hoursHeld = (now - monitor.entryTime) / (1000 * 60 * 60);
            if (hoursHeld >= this.maxHoldTimeHours) {
                exitReason = 'TIME_EXIT';
                shouldExit = true;
                console.log(`⏰ TIME EXIT for ${monitor.symbol}: Held for ${hoursHeld.toFixed(2)} hours`);
            }
        }

        // Execute exit if any condition met
        if (shouldExit) {
            await this.executeSellOrder(monitor, currentPrice, exitReason);
            monitor.status = 'CLOSED';
            this.activeMonitors.delete(monitor.symbol);
        }
    }

    /**
     * Execute BUY order in paper trading
     */
    async executeBuyOrder(monitor, price) {
        try {
            console.log(`🛒 Executing BUY order for ${monitor.symbol}:`);
            console.log(`   Quantity: ${monitor.quantity}`);
            console.log(`   Price: ₹${price}`);
            console.log(`   Stop Loss: ₹${monitor.stop}`);
            console.log(`   Target: ₹${monitor.target}`);

            // Place market order using paper trading store
            const result = placeMarketOrder({
                symbol: monitor.symbol,
                side: 'BUY',
                qty: monitor.quantity,
                amount: 0,
                stopLoss: monitor.stop,
                takeProfit: monitor.target,
                isAIOrder: true,
                executionPrice: price
            });

            console.log(`📋 Order Result:`, result);

            if (!result.success) {
                console.error(`❌ Failed to place BUY order: ${result.reason}`);
                return false;
            }

            console.log(`✅ BUY order executed: ${monitor.symbol} x ${monitor.quantity} @ ₹${price}`);

            // Show notification
            this.showNotification(`📈 Bought ${monitor.quantity} ${monitor.symbol} @ ₹${price}`, 'success');

            // Dispatch event to update UI
            window.dispatchEvent(new CustomEvent('paper-trade-update'));

            return true;
        } catch (error) {
            console.error('❌ Error executing BUY order:', error);
            return false;
        }
    }

    /**
     * Execute SELL order in paper trading
     */
    async executeSellOrder(monitor, price, reason) {
        try {
            const entryPrice = monitor.actualEntry || monitor.entry;
            const pnl = (price - entryPrice) * monitor.quantity;
            const pnlPercent = ((price - entryPrice) / entryPrice) * 100;

            // Place market order using paper trading store
            const result = placeMarketOrder({
                symbol: monitor.symbol,
                side: 'SELL',
                qty: monitor.quantity,
                amount: 0,
                stopLoss: null,
                takeProfit: null,
                isAIOrder: true,
                executionPrice: price
            });

            if (!result.success) {
                console.error(`❌ Failed to place SELL order: ${result.reason}`);
                return false;
            }

            const pnlColor = pnl >= 0 ? '🟢' : '🔴';
            console.log(`${pnlColor} SELL order executed: ${monitor.symbol} x ${monitor.quantity} @ ${price} | P&L: ₹${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%) | Reason: ${reason}`);

            // Show notification
            const notifType = pnl >= 0 ? 'success' : 'error';
            this.showNotification(
                `📉 Sold ${monitor.quantity} ${monitor.symbol} @ ₹${price}\nP&L: ₹${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%)\nReason: ${reason}`,
                notifType
            );

            // Dispatch event to update UI
            window.dispatchEvent(new CustomEvent('paper-trade-update'));

            return true;
        } catch (error) {
            console.error('❌ Error executing SELL order:', error);
            return false;
        }
    }

    /**
     * Show browser notification
     */
    showNotification(message, type = 'info') {
        // Check if browser supports notifications
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('AI Trading Alert', {
                body: message,
                icon: type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'
            });
        }

        // Also log to console
        console.log(`🔔 ${message}`);
    }

    /**
     * Stop monitoring all trades
     */
    stopMonitoring() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }

        this.activeMonitors.clear();
        console.log('⏹️ Trade monitoring stopped');
    }

    /**
     * Get monitoring status
     */
    getStatus() {
        const monitors = Array.from(this.activeMonitors.values());
        return {
            active: monitors.length > 0,
            totalMonitored: monitors.length,
            waitingEntry: monitors.filter(m => m.status === 'WAITING_ENTRY').length,
            positionsOpen: monitors.filter(m => m.status === 'POSITION_OPEN').length,
            monitors: monitors
        };
    }

    /**
     * Request notification permission
     */
    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            console.log('Notification permission:', permission);
            return permission === 'granted';
        }
        return Notification.permission === 'granted';
    }
}

// Export singleton instance
export const tradeMonitorService = new TradeMonitorService();
