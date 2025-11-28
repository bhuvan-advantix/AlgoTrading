import { createRequire } from 'module';
const require = createRequire(import.meta.url);

try {
    const yfModule = require('yahoo-finance2');
    console.log('require("yahoo-finance2"):', typeof yfModule);
    console.log('keys:', Object.keys(yfModule));

    const yf = yfModule.default || yfModule;
    console.log('yf type:', typeof yf);
    console.log('yf.quote type:', typeof yf.quote);

    if (typeof yf.quote === 'function') {
        const q = await yf.quote('AAPL');
        console.log('Quote success:', q.symbol);
    }
} catch (e) {
    console.error('Require failed:', e);
}
