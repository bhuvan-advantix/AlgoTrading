import yahooFinance from 'yahoo-finance2';

const YFClass = yahooFinance.default || yahooFinance;
const yf = new YFClass();

try {
    const quote = await yf.quote('AAPL');
    console.log('Final test success:', quote.symbol, quote.regularMarketPrice);
} catch (e) {
    console.error('Final test failed:', e);
}
