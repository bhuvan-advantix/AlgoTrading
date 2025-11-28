import yahooFinance from 'yahoo-finance2';

console.log('Type of yahooFinance:', typeof yahooFinance);
console.log('Keys of yahooFinance:', Object.keys(yahooFinance));
console.log('Is yahooFinance.default present?', !!yahooFinance.default);

const yf = yahooFinance.default || yahooFinance;
console.log('Type of yf:', typeof yf);
console.log('Is yf.quote a function?', typeof yf.quote === 'function');

try {
    const quote = await yf.quote('AAPL');
    console.log('Quote fetch success:', quote.symbol, quote.regularMarketPrice);
} catch (e) {
    console.error('Quote fetch failed:', e.message);
}
