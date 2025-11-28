// Lightweight TradingView loader - ensures tv.js is loaded once and returns a promise that resolves to the global TradingView
export const loadTradingView = (() => {
  let promise = null;
  return () => {
    if (promise) return promise;
    promise = new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && window.TradingView) {
        return resolve(window.TradingView);
      }

      // Avoid injecting twice
      const existing = document.getElementById('tradingview-js');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.TradingView));
        existing.addEventListener('error', reject);
        return;
      }

      const s = document.createElement('script');
      s.id = 'tradingview-js';
      s.src = 'https://s3.tradingview.com/tv.js';
      s.async = true;
      s.onload = () => {
        resolve(window.TradingView);
      };
      s.onerror = (err) => reject(err);
      document.head.appendChild(s);
    });
    return promise;
  };
})();

export default loadTradingView;
