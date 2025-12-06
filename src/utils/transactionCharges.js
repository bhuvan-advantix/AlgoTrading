/**
 * Transaction Charges Calculator
 * Automatically calculates trading fees based on market/exchange and currency
 */

/**
 * Get currency symbol and name based on symbol suffix or exchange
 */
export function getCurrencyInfo(symbol, exchange) {
    const sym = (symbol || '').toUpperCase();
    const exch = (exchange || '').toUpperCase();

    // Indian markets
    if (sym.endsWith('.NS') || sym.endsWith('.BO') || exch === 'NSE' || exch === 'BSE') {
        return { code: 'INR', symbol: '₹', name: 'Indian Rupee' };
    }

    // US markets
    if (exch === 'NYSE' || exch === 'NASDAQ' || exch === 'AMEX' || exch === 'BATS') {
        return { code: 'USD', symbol: '$', name: 'US Dollar' };
    }

    // UK markets
    if (sym.endsWith('.L') || exch === 'LSE' || exch === 'LON') {
        return { code: 'GBP', symbol: '£', name: 'British Pound' };
    }

    // European markets
    if (sym.endsWith('.DE') || sym.endsWith('.PA') || sym.endsWith('.AS') ||
        exch === 'FRA' || exch === 'PAR' || exch === 'AMS') {
        return { code: 'EUR', symbol: '€', name: 'Euro' };
    }

    // Japanese markets
    if (sym.endsWith('.T') || exch === 'JPX' || exch === 'TYO') {
        return { code: 'JPY', symbol: '¥', name: 'Japanese Yen' };
    }

    // Hong Kong markets
    if (sym.endsWith('.HK') || exch === 'HKG') {
        return { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' };
    }

    // Australian markets
    if (sym.endsWith('.AX') || exch === 'ASX') {
        return { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' };
    }

    // Canadian markets
    if (sym.endsWith('.TO') || exch === 'TSE' || exch === 'TSX') {
        return { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' };
    }

    // Default to USD
    return { code: 'USD', symbol: '$', name: 'US Dollar' };
}

/**
 * Calculate Indian market charges (NSE/BSE)
 */
function calculateIndianCharges(grossAmount, quantity, transactionType) {
    const isBuy = transactionType.toUpperCase() === 'BUY';

    // Brokerage: ₹20 or 0.03% whichever is lower
    const brokeragePercent = grossAmount * 0.0003; // 0.03%
    const brokerage = Math.min(20, brokeragePercent);

    // STT (Securities Transaction Tax): 0.1% on sell side only
    const stt = isBuy ? 0 : grossAmount * 0.001;

    // Exchange Transaction Charges: 0.00325% (NSE)
    const transactionCharges = grossAmount * 0.0000325;

    // GST: 18% on (brokerage + transaction charges)
    const gst = (brokerage + transactionCharges) * 0.18;

    // SEBI Charges: ₹10 per crore
    const sebi = (grossAmount / 10000000) * 10;

    // Stamp Duty: 0.015% on buy side, 0.003% on sell side
    const stampDuty = isBuy ? (grossAmount * 0.00015) : (grossAmount * 0.00003);

    const totalCharges = brokerage + stt + transactionCharges + gst + sebi + stampDuty;
    const netAmount = isBuy ? (grossAmount + totalCharges) : (grossAmount - totalCharges);

    return {
        currency: 'INR',
        currencySymbol: '₹',
        grossAmount: parseFloat(grossAmount.toFixed(2)),
        charges: {
            brokerage: parseFloat(brokerage.toFixed(2)),
            stt: parseFloat(stt.toFixed(2)),
            transactionCharges: parseFloat(transactionCharges.toFixed(2)),
            gst: parseFloat(gst.toFixed(2)),
            sebi: parseFloat(sebi.toFixed(2)),
            stampDuty: parseFloat(stampDuty.toFixed(2))
        },
        totalCharges: parseFloat(totalCharges.toFixed(2)),
        netAmount: parseFloat(netAmount.toFixed(2))
    };
}

/**
 * Calculate US market charges (NYSE/NASDAQ)
 */
function calculateUSCharges(grossAmount, quantity, transactionType) {
    const isBuy = transactionType.toUpperCase() === 'BUY';

    // Brokerage: $0 (assuming zero-commission broker like Robinhood)
    // Or use $0.005 per share for traditional brokers
    const brokerage = 0; // Can be changed to: quantity * 0.005

    // SEC Fee: $5.10 per $1,000,000 (sell side only)
    const secFee = isBuy ? 0 : (grossAmount / 1000000) * 5.10;

    // FINRA Trading Activity Fee (TAF): $0.000119 per share (sell side only)
    const finraFee = isBuy ? 0 : quantity * 0.000119;

    // No sales tax on stock trades in US
    const tax = 0;

    const totalCharges = brokerage + secFee + finraFee + tax;
    const netAmount = isBuy ? (grossAmount + totalCharges) : (grossAmount - totalCharges);

    return {
        currency: 'USD',
        currencySymbol: '$',
        grossAmount: parseFloat(grossAmount.toFixed(2)),
        charges: {
            brokerage: parseFloat(brokerage.toFixed(2)),
            secFee: parseFloat(secFee.toFixed(4)),
            finraFee: parseFloat(finraFee.toFixed(4)),
            tax: parseFloat(tax.toFixed(2))
        },
        totalCharges: parseFloat(totalCharges.toFixed(4)),
        netAmount: parseFloat(netAmount.toFixed(2))
    };
}

/**
 * Calculate UK market charges (LSE)
 */
function calculateUKCharges(grossAmount, quantity, transactionType) {
    const isBuy = transactionType.toUpperCase() === 'BUY';

    // Brokerage: £10 flat fee (typical UK broker)
    const brokerage = 10;

    // Stamp Duty Reserve Tax (SDRT): 0.5% on buy side only
    const stampDuty = isBuy ? (grossAmount * 0.005) : 0;

    // PTM Levy: £1 per £10,000 traded
    const ptmLevy = (grossAmount / 10000) * 1;

    const totalCharges = brokerage + stampDuty + ptmLevy;
    const netAmount = isBuy ? (grossAmount + totalCharges) : (grossAmount - totalCharges);

    return {
        currency: 'GBP',
        currencySymbol: '£',
        grossAmount: parseFloat(grossAmount.toFixed(2)),
        charges: {
            brokerage: parseFloat(brokerage.toFixed(2)),
            stampDuty: parseFloat(stampDuty.toFixed(2)),
            ptmLevy: parseFloat(ptmLevy.toFixed(2))
        },
        totalCharges: parseFloat(totalCharges.toFixed(2)),
        netAmount: parseFloat(netAmount.toFixed(2))
    };
}

/**
 * Calculate European market charges (EUR)
 */
function calculateEuropeanCharges(grossAmount, quantity, transactionType) {
    const isBuy = transactionType.toUpperCase() === 'BUY';

    // Brokerage: €10 flat fee (typical European broker)
    const brokerage = 10;

    // Financial Transaction Tax (FTT): 0.2% in France, 0.1% in Italy
    // Using 0.2% as average
    const ftt = grossAmount * 0.002;

    // Exchange fees: ~0.01%
    const exchangeFee = grossAmount * 0.0001;

    const totalCharges = brokerage + ftt + exchangeFee;
    const netAmount = isBuy ? (grossAmount + totalCharges) : (grossAmount - totalCharges);

    return {
        currency: 'EUR',
        currencySymbol: '€',
        grossAmount: parseFloat(grossAmount.toFixed(2)),
        charges: {
            brokerage: parseFloat(brokerage.toFixed(2)),
            ftt: parseFloat(ftt.toFixed(2)),
            exchangeFee: parseFloat(exchangeFee.toFixed(2))
        },
        totalCharges: parseFloat(totalCharges.toFixed(2)),
        netAmount: parseFloat(netAmount.toFixed(2))
    };
}

/**
 * Calculate Japanese market charges (JPX)
 */
function calculateJapaneseCharges(grossAmount, quantity, transactionType) {
    const isBuy = transactionType.toUpperCase() === 'BUY';

    // Brokerage: ¥500 flat fee (typical Japanese broker)
    const brokerage = 500;

    // Consumption Tax: 10% on brokerage
    const consumptionTax = brokerage * 0.10;

    // Exchange fees: ~0.01%
    const exchangeFee = grossAmount * 0.0001;

    const totalCharges = brokerage + consumptionTax + exchangeFee;
    const netAmount = isBuy ? (grossAmount + totalCharges) : (grossAmount - totalCharges);

    return {
        currency: 'JPY',
        currencySymbol: '¥',
        grossAmount: parseFloat(grossAmount.toFixed(0)), // JPY has no decimals
        charges: {
            brokerage: parseFloat(brokerage.toFixed(0)),
            consumptionTax: parseFloat(consumptionTax.toFixed(0)),
            exchangeFee: parseFloat(exchangeFee.toFixed(0))
        },
        totalCharges: parseFloat(totalCharges.toFixed(0)),
        netAmount: parseFloat(netAmount.toFixed(0))
    };
}

/**
 * Calculate charges for other markets (generic)
 */
function calculateGenericCharges(grossAmount, quantity, transactionType, currencyInfo) {
    const isBuy = transactionType.toUpperCase() === 'BUY';

    // Generic brokerage: 0.1% or equivalent flat fee
    const brokerage = grossAmount * 0.001;

    // Generic regulatory fee: 0.01%
    const regulatoryFee = grossAmount * 0.0001;

    // Generic tax: 0.1%
    const tax = grossAmount * 0.001;

    const totalCharges = brokerage + regulatoryFee + tax;
    const netAmount = isBuy ? (grossAmount + totalCharges) : (grossAmount - totalCharges);

    return {
        currency: currencyInfo.code,
        currencySymbol: currencyInfo.symbol,
        grossAmount: parseFloat(grossAmount.toFixed(2)),
        charges: {
            brokerage: parseFloat(brokerage.toFixed(2)),
            regulatoryFee: parseFloat(regulatoryFee.toFixed(2)),
            tax: parseFloat(tax.toFixed(2))
        },
        totalCharges: parseFloat(totalCharges.toFixed(2)),
        netAmount: parseFloat(netAmount.toFixed(2))
    };
}

/**
 * Main function to calculate transaction charges
 * @param {string} symbol - Stock symbol (e.g., 'TCS.NS', 'AAPL', 'VOD.L')
 * @param {number} price - Price per share
 * @param {number} quantity - Number of shares
 * @param {string} transactionType - 'BUY' or 'SELL'
 * @param {string} exchange - Exchange name (optional)
 * @returns {object} Detailed breakdown of charges
 */
export function calculateTransactionCharges(symbol, price, quantity, transactionType, exchange = '') {
    const grossAmount = price * quantity;
    const currencyInfo = getCurrencyInfo(symbol, exchange);

    let result;

    // Determine market and calculate appropriate charges
    if (currencyInfo.code === 'INR') {
        result = calculateIndianCharges(grossAmount, quantity, transactionType);
    } else if (currencyInfo.code === 'USD') {
        result = calculateUSCharges(grossAmount, quantity, transactionType);
    } else if (currencyInfo.code === 'GBP') {
        result = calculateUKCharges(grossAmount, quantity, transactionType);
    } else if (currencyInfo.code === 'EUR') {
        result = calculateEuropeanCharges(grossAmount, quantity, transactionType);
    } else if (currencyInfo.code === 'JPY') {
        result = calculateJapaneseCharges(grossAmount, quantity, transactionType);
    } else {
        result = calculateGenericCharges(grossAmount, quantity, transactionType, currencyInfo);
    }

    // Add metadata
    result.symbol = symbol;
    result.price = price;
    result.quantity = quantity;
    result.transactionType = transactionType.toUpperCase();
    result.exchange = exchange || 'Unknown';
    result.currencyName = currencyInfo.name;

    return result;
}

/**
 * Format currency value with appropriate symbol
 */
export function formatCurrency(amount, currencyCode) {
    const currencyInfo = {
        'INR': { symbol: '₹', decimals: 2 },
        'USD': { symbol: '$', decimals: 2 },
        'GBP': { symbol: '£', decimals: 2 },
        'EUR': { symbol: '€', decimals: 2 },
        'JPY': { symbol: '¥', decimals: 0 },
        'HKD': { symbol: 'HK$', decimals: 2 },
        'AUD': { symbol: 'A$', decimals: 2 },
        'CAD': { symbol: 'C$', decimals: 2 }
    };

    const info = currencyInfo[currencyCode] || { symbol: '$', decimals: 2 };
    return `${info.symbol}${amount.toFixed(info.decimals)}`;
}

export default {
    calculateTransactionCharges,
    getCurrencyInfo,
    formatCurrency
};
