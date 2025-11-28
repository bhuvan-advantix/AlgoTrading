import yahooFinance from 'yahoo-finance2';

console.log('yahooFinance:', yahooFinance);
console.log('yahooFinance.prototype:', yahooFinance.prototype);
try {
    const instance = new yahooFinance();
    console.log('new yahooFinance():', instance);
} catch (e) {
    console.log('Cannot instantiate:', e.message);
}
