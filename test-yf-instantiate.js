import yahooFinance from 'yahoo-finance2';

const yf = yahooFinance.default || yahooFinance;

try {
    console.log('Trying to call yf()...');
    const instance = yf();
    console.log('Instance keys:', Object.keys(instance));
    console.log('Instance quote:', typeof instance.quote);
} catch (e) {
    console.log('Call failed:', e.message);
}

try {
    console.log('Trying new yf()...');
    const instance = new yf();
    console.log('New Instance keys:', Object.keys(instance));
    console.log('New Instance quote:', typeof instance.quote);
} catch (e) {
    console.log('New failed:', e.message);
}
