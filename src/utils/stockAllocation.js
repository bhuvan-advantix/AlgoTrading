/**
 * Stock Allocation Algorithm for Intraday Trading
 * 
 * This implements the EXACT 7-step algorithm for proportional capital allocation
 * across multiple stocks based on AI signal strength weights.
 * 
 * CRITICAL: This ensures ₹1L is NOT allocated as ₹1L × 5 stocks
 */

/**
 * Calculate stock allocation following the exact 7-step algorithm
 * 
 * @param {Object} params - Allocation parameters
 * @param {number} params.totalCapital - Total capital available (C)
 * @param {number} params.basketLossPercent - Max basket loss % (L%)
 * @param {number} params.basketProfitPercent - Target basket profit % (G%)
 * @param {number} params.riskRewardRatio - Risk-reward ratio (R)
 * @param {number} params.stopLossPercent - Stop loss % per stock (s%)
 * @param {number} params.capitalCapPercent - Max capital per stock % (c%)
 * @param {Array} params.stocks - Array of stock objects with {symbol, price, weight}
 * 
 * @returns {Object} Allocation results with quantities, stops, targets, and validation
 */
export function calculateStockAllocation(params) {
    const {
        totalCapital,
        basketLossPercent,
        basketProfitPercent,
        riskRewardRatio,
        stopLossPercent,
        capitalCapPercent,
        stocks
    } = params;

    // Validate inputs
    if (!totalCapital || totalCapital <= 0) {
        throw new Error('Total capital must be positive');
    }
    if (!stocks || stocks.length === 0) {
        throw new Error('At least one stock required');
    }
    if (stocks.length > 5) {
        throw new Error('Maximum 5 stocks allowed');
    }

    const results = {
        stocks: [],
        summary: {
            totalCapital,
            capitalUsed: 0,
            capitalRemaining: 0,
            maxBasketLoss: 0,
            targetBasketProfit: 0,
            actualRiskReward: 0,
            utilizationPercent: 0
        },
        validation: {
            basketLossValid: false,
            basketProfitValid: false,
            capitalValid: false,
            allValid: false
        }
    };

    // STEP 1: Normalize Weights
    const totalWeight = stocks.reduce((sum, stock) => sum + (stock.weight || 1), 0);
    const normalizedStocks = stocks.map(stock => ({
        ...stock,
        normalizedWeight: (stock.weight || 1) / totalWeight
    }));

    // STEP 2: Per-Stock Loss Cap
    const maxBasketLoss = totalCapital * (basketLossPercent / 100);
    normalizedStocks.forEach(stock => {
        stock.lossCapital = maxBasketLoss * stock.normalizedWeight;
    });

    // STEP 3: Entry, Stop, Target Calculation
    normalizedStocks.forEach(stock => {
        stock.entry = stock.price;
        stock.stop = stock.entry * (1 - stopLossPercent / 100);
        stock.target = stock.entry + (stock.entry - stock.stop) * riskRewardRatio;
    });

    // STEP 4: Raw Quantity from Risk
    normalizedStocks.forEach(stock => {
        const riskPerShare = stock.entry - stock.stop;
        stock.rawQuantity = stock.lossCapital / riskPerShare;
    });

    // STEP 5: Capital Cap Per Stock
    const maxCapitalPerStock = totalCapital * (capitalCapPercent / 100);
    normalizedStocks.forEach(stock => {
        const cappedQuantity = Math.min(
            stock.rawQuantity,
            maxCapitalPerStock / stock.entry
        );
        // Ensure at least 1 share if we can afford it
        const flooredQty = Math.floor(cappedQuantity);
        stock.quantity = flooredQty > 0 ? flooredQty : (stock.entry <= maxCapitalPerStock ? 1 : 0);
    });

    // STEP 6: Total Capital Check & Scaling
    let capitalUsed = normalizedStocks.reduce((sum, stock) =>
        sum + (stock.quantity * stock.entry), 0
    );

    if (capitalUsed > totalCapital) {
        const scaleFactor = totalCapital / capitalUsed;
        normalizedStocks.forEach(stock => {
            stock.quantity = Math.floor(stock.quantity * scaleFactor);
        });

        // Recalculate capital used after scaling
        capitalUsed = normalizedStocks.reduce((sum, stock) =>
            sum + (stock.quantity * stock.entry), 0
        );
    }

    // STEP 7: Basket-Level Loss & Profit Validation
    let totalLoss = 0;
    let totalProfit = 0;

    normalizedStocks.forEach(stock => {
        stock.capitalAllocated = stock.quantity * stock.entry;
        stock.maxLoss = stock.quantity * (stock.entry - stock.stop);
        stock.targetProfit = stock.quantity * (stock.target - stock.entry);

        totalLoss += stock.maxLoss;
        totalProfit += stock.targetProfit;

        // Add to results
        results.stocks.push({
            symbol: stock.symbol,
            name: stock.name || stock.symbol.replace('.NS', ''),
            entry: parseFloat(stock.entry.toFixed(2)),
            stop: parseFloat(stock.stop.toFixed(2)),
            target: parseFloat(stock.target.toFixed(2)),
            quantity: stock.quantity,
            capitalAllocated: parseFloat(stock.capitalAllocated.toFixed(2)),
            maxLoss: parseFloat(stock.maxLoss.toFixed(2)),
            targetProfit: parseFloat(stock.targetProfit.toFixed(2)),
            weight: stock.normalizedWeight,
            riskPerShare: parseFloat((stock.entry - stock.stop).toFixed(2)),
            rewardPerShare: parseFloat((stock.target - stock.entry).toFixed(2))
        });
    });

    // Update summary
    results.summary.capitalUsed = parseFloat(capitalUsed.toFixed(2));
    results.summary.capitalRemaining = parseFloat((totalCapital - capitalUsed).toFixed(2));
    results.summary.maxBasketLoss = parseFloat(totalLoss.toFixed(2));
    results.summary.targetBasketProfit = parseFloat(totalProfit.toFixed(2));
    results.summary.actualRiskReward = totalProfit > 0 ?
        parseFloat((totalProfit / totalLoss).toFixed(2)) : 0;
    results.summary.utilizationPercent = parseFloat(
        ((capitalUsed / totalCapital) * 100).toFixed(2)
    );

    // Validation
    const expectedMaxLoss = totalCapital * (basketLossPercent / 100);
    const expectedMinProfit = totalCapital * (basketProfitPercent / 100);

    results.validation.basketLossValid = totalLoss <= expectedMaxLoss;
    results.validation.basketProfitValid = totalProfit >= expectedMinProfit;
    results.validation.capitalValid = capitalUsed <= totalCapital;
    results.validation.allValid =
        results.validation.basketLossValid &&
        results.validation.basketProfitValid &&
        results.validation.capitalValid;

    return results;
}

/**
 * Calculate 100-point AI score for a stock
 * 
 * @param {Object} data - Stock data
 * @param {number} data.globalNewsSentiment - Global news sentiment (-1 to 1)
 * @param {number} data.usAsiaTrend - US close & Asia open trend (-1 to 1)
 * @param {number} data.stockNewsSentiment - Stock-specific news sentiment (-1 to 1)
 * @param {number} data.technicalMomentum - Technical momentum score (0 to 1)
 * @param {number} data.fundamentalScore - Fundamental score (0 to 1)
 * 
 * @returns {Object} Score breakdown and total
 */
export function calculateAIScore(data) {
    const {
        globalNewsSentiment = 0,
        usAsiaTrend = 0,
        stockNewsSentiment = 0,
        technicalMomentum = 0,
        fundamentalScore = 0
    } = data;

    // Each factor contributes 20 points
    const scores = {
        globalNews: Math.round((globalNewsSentiment + 1) * 10), // -1 to 1 → 0 to 20
        usAsia: Math.round((usAsiaTrend + 1) * 10), // -1 to 1 → 0 to 20
        stockNews: Math.round((stockNewsSentiment + 1) * 10), // -1 to 1 → 0 to 20
        technical: Math.round(technicalMomentum * 20), // 0 to 1 → 0 to 20
        fundamentals: Math.round(fundamentalScore * 20) // 0 to 1 → 0 to 20
    };

    const total = scores.globalNews + scores.usAsia + scores.stockNews +
        scores.technical + scores.fundamentals;

    return {
        breakdown: scores,
        total: Math.min(100, Math.max(0, total)),
        normalized: total / 100 // For use as weight
    };
}

/**
 * Validate allocation parameters
 */
export function validateAllocationParams(params) {
    const errors = [];

    if (!params.totalCapital || params.totalCapital <= 0) {
        errors.push('Total capital must be positive');
    }

    if (params.basketLossPercent <= 0 || params.basketLossPercent > 100) {
        errors.push('Basket loss % must be between 0 and 100');
    }

    if (params.basketProfitPercent <= 0 || params.basketProfitPercent > 100) {
        errors.push('Basket profit % must be between 0 and 100');
    }

    if (params.riskRewardRatio <= 0) {
        errors.push('Risk-reward ratio must be positive');
    }

    if (params.stopLossPercent <= 0 || params.stopLossPercent > 100) {
        errors.push('Stop loss % must be between 0 and 100');
    }

    if (params.capitalCapPercent <= 0 || params.capitalCapPercent > 100) {
        errors.push('Capital cap % must be between 0 and 100');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount) {
    return `₹${amount.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

/**
 * Calculate expectancy from trade history
 */
export function calculateExpectancy(trades) {
    if (!trades || trades.length === 0) {
        return {
            winRate: 0,
            avgWin: 0,
            avgLoss: 0,
            expectancy: 0,
            totalTrades: 0
        };
    }

    const wins = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl < 0);

    const winRate = wins.length / trades.length;
    const avgWin = wins.length > 0 ?
        wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ?
        Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length) : 0;

    const expectancy = (winRate * avgWin) - ((1 - winRate) * avgLoss);

    return {
        winRate: parseFloat((winRate * 100).toFixed(2)),
        avgWin: parseFloat(avgWin.toFixed(2)),
        avgLoss: parseFloat(avgLoss.toFixed(2)),
        expectancy: parseFloat(expectancy.toFixed(2)),
        totalTrades: trades.length,
        wins: wins.length,
        losses: losses.length
    };
}

export default {
    calculateStockAllocation,
    calculateAIScore,
    validateAllocationParams,
    formatCurrency,
    calculateExpectancy
};
