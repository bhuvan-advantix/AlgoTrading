// Execute all trades - Start monitoring for entry/stop/target
const executeAllTrades = async () => {
    if (!allocation || allocation.stocks.length === 0) {
        alert('No stocks to trade');
        return;
    }

    if (!allocation.validation.allValid) {
        const confirm = window.confirm(
            'Allocation validation failed:\n' +
            `- Basket loss valid: ${allocation.validation.basketLossValid}\n` +
            `- Basket profit valid: ${allocation.validation.basketProfitValid}\n` +
            `- Capital valid: ${allocation.validation.capitalValid}\n\n` +
            'Do you want to proceed anyway?'
        );
        if (!confirm) return;
    }

    // Request notification permission
    await tradeMonitorService.requestNotificationPermission();

    // Prepare recommendations for monitoring
    const enabledStocks = allocation.stocks.filter(stock => stock.enabled && stock.quantity > 0);

    if (enabledStocks.length === 0) {
        alert('No enabled stocks with valid quantities');
        return;
    }

    // Start monitoring
    tradeMonitorService.startMonitoring(enabledStocks);

    // Show confirmation
    alert(
        `🔍 Trade Monitoring Started!\n\n` +
        `Monitoring ${enabledStocks.length} stocks:\n` +
        enabledStocks.map(s => `• ${s.symbol}: Entry=₹${s.entry}, Stop=₹${s.stop}, Target=₹${s.target}`).join('\n') +
        `\n\nThe system will:\n` +
        `✅ Buy when price reaches entry\n` +
        `🛑 Sell at stop loss if price drops\n` +
        `🎯 Sell at target if price rises\n` +
        `⏰ Auto-exit after 3 hours\n\n` +
        `Check console (F12) for live updates!`
    );

    setStatus('🔍 Monitoring trades... Check console for updates');
};
