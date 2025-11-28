import React, { useEffect, useState, useCallback } from "react";

// --- Mock API Data and Services (To replace axios) ---
const MOCK_AI_STOCKS = [
  { symbol: "TCS", reason: "Strong Q3 earnings and sector consolidation breakout.", action: "BUY", confidence: 92, SL: 3400.00, TP: 3650.00, allocation: 15 },
  { symbol: "HDFC", reason: "Interest rate hike risk outweighs sector momentum.", action: "SELL", confidence: 85, SL: 1550.50, TP: 1400.00, allocation: 10 },
  { symbol: "RELIANCE", reason: "Upcoming infrastructure project win anticipated.", action: "BUY", confidence: 78, SL: 2750.00, TP: 2900.00, allocation: 20 },
  { symbol: "WIPRO", reason: "Underperforming against tech peers; likely correction.", action: "SELL", confidence: 70, SL: 510.00, TP: 480.00, allocation: 5 },
];

const fetchAiStocksMock = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, data: MOCK_AI_STOCKS });
    }, 1000); // Simulate network delay
  });
};

const handleAutoTradeMock = () => {
  return new Promise((resolve) => {
    const success = Math.random() > 0.1; // 90% success rate
    setTimeout(() => {
      if (success) {
        resolve({ success: true, orderId: `TRADE-${Date.now()}` });
      } else {
        resolve({ success: false, message: "Order rejection due to unexpected volatility." });
      }
    }, 800);
  });
};

// --- Custom Components (Replacing Windmill UI) ---

const Loader = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props} className={"lucide lucide-loader " + props.className}>
      <path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/>
  </svg>
);

const Badge = ({ children, action }) => {
  let colorClasses = 'bg-gray-100 text-gray-800';
  if (action === 'BUY') colorClasses = 'bg-green-600/10 text-green-700 font-bold';
  if (action === 'SELL') colorClasses = 'bg-red-600/10 text-red-700 font-bold';

  return (
    <span className={`inline-flex px-3 py-1 text-sm leading-5 rounded-full ${colorClasses}`}>
      {children}
    </span>
  );
};

// Main Card style - slightly softer shadow
const Card = ({ children, className = '' }) => (
    <div className={`
      bg-gray-800 text-white p-4 sm:p-6 rounded-xl shadow-xl border sm:border-gray-100 sm:bg-white sm:text-gray-900
      transition-colors duration-300 ${className}
    `}>
      {children}
    </div>
  );

// Button style - removed default shadow and made it rely on dynamic colors
const Button = ({ children, onClick, size = 'small', className = '' }) => {
    let paddingClass = 'px-4 py-2.5 text-sm';
    // Kept size logic for compatibility, but the main styling is driven by className
    if (size === 'small') paddingClass = 'px-3 py-1.5 text-xs'; 

    return (
      <button
        onClick={onClick}
        className={`
          ${paddingClass} font-semibold rounded-lg transition-all duration-200 ease-in-out
          focus:outline-none focus:ring-4 focus:ring-blue-400/50
          bg-blue-600 text-white hover:bg-blue-700
          ${className}
        `}
      >
        {children}
      </button>
    );
};
// --- Refactored AI Recommendations Component ---

function AiRecommendations() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [overrides, setOverrides] = useState({});
  const [autoTradeStatus, setAutoTradeStatus] = useState(null);

  // 🧠 Fetch AI recommendations
  const fetchAiStocks = useCallback(async () => {
    try {
      setLoading(true);
      // Using mock service instead of axios
      const res = await fetchAiStocksMock();
      if (res.success) {
        setStocks(res.data || []);
      } else {
        setStocks([]);
      }
    } catch (err) {
      console.error("AI fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAiStocks();
    // Auto-run every 10 minutes
    const interval = setInterval(fetchAiStocks, 600000);
    return () => clearInterval(interval);
  }, [fetchAiStocks]);

  // ⚙️ Handle overrides for SL/TP/Allocation
  const handleChange = (symbol, field, value) => {
    setOverrides((prev) => ({
      ...prev,
      [symbol]: { ...prev[symbol], [field]: value === "" ? null : Number(value) }, // Use null for empty input
    }));
  };

  // 🚀 Auto-trade immediately
  const handleAutoTrade = async (stock) => {
    try {
      setAutoTradeStatus(`Placing order for ${stock.symbol}...`);
      const override = overrides[stock.symbol] || {};
      
      const payload = {
        symbol: stock.symbol,
        action: stock.action || "BUY",
        quantity: stock.quantity || 1,
        // Use overrides, fall back to stock recommendation, then default (SL/TP default is often null)
        SL: override.SL !== null ? override.SL : stock.SL,
        TP: override.TP !== null ? override.TP : stock.TP,
        allocation: override.allocation || stock.allocation || 10,
      };

      // Using mock service instead of axios
      const res = await handleAutoTradeMock(payload);
      
      if (res.success) {
        setAutoTradeStatus(`✅ Order placed for ${stock.symbol}. ID: ${res.orderId}`);
      } else {
        setAutoTradeStatus(`❌ Failed for ${stock.symbol}: ${res.message}`);
      }
    } catch (err) {
      setAutoTradeStatus(`❌ Error: ${err.message}`);
    }
  };

  // 🧩 UI Rendering
    return (
    <Card className="bg-gray-800 text-white sm:bg-white sm:text-gray-900 p-4 sm:p-6 rounded-xl shadow-2xl">
      <h2 className="text-2xl font-extrabold mb-6 text-gray-900 border-b pb-2 border-blue-100">
        <span className="text-blue-600">🤖</span> AI Stock Recommendations
      </h2>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-blue-600 font-medium bg-blue-50/50 rounded-lg">
          <Loader className="animate-spin mr-3 w-6 h-6" /> Loading fresh AI insights...
        </div>
      ) : stocks.length === 0 ? (
        <div className="text-gray-500 p-4 border border-dashed rounded-lg text-center">No AI recommendations available right now. Check back soon.</div>
      ) : (
        <div className="grid gap-4">
          {stocks.map((stock) => {
            const currentOverride = overrides[stock.symbol] || {};
            const currentSL = currentOverride.SL !== null ? currentOverride.SL : stock.SL;
            // FIX: Referenced currentTP before assignment. Now correctly using currentOverride.TP.
            const currentTP = currentOverride.TP !== null ? currentOverride.TP : stock.TP;
            const currentAlloc = currentOverride.allocation || stock.allocation || 10;
            const isBuy = stock.action === 'BUY';
            
            // New design classes for visual appeal
            const confidenceColor = isBuy ? 'text-green-600' : 'text-red-600';
            const actionBorderColor = isBuy ? 'border-l-green-500' : 'border-l-red-500';

            return (
              <div key={stock.symbol} className={`
                p-4 rounded-xl shadow-md bg-white 
                border-l-4 ${actionBorderColor} 
                hover:shadow-xl transition duration-300
              `}>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                  
                  {/* Stock Info and Reason */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <span className="font-bold text-2xl text-gray-900">{stock.symbol}</span>
                            <Badge action={stock.action}>{stock.action || "BUY"}</Badge>
                        </div>
                        {/* Confidence moved to the right and styled strongly */}
                        <div className="text-sm text-gray-400 font-semibold">
                            Confidence: <span className={`text-xl font-extrabold ${confidenceColor}`}>{stock.confidence || "N/A"}%</span>
                        </div>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">{stock.reason}</div>
                  </div>

                  {/* Overrides Inputs and Button */}
                  <div className="flex space-x-2 shrink-0 border-t lg:border-t-0 lg:border-l border-gray-100 pt-3 lg:pt-0 lg:pl-4">
                    <input
                      type="number"
                      placeholder="S/L"
                      className="border border-gray-300 rounded-lg text-sm px-2 py-1.5 w-16 focus:ring-2 focus:ring-red-400 focus:border-red-400 transition"
                      value={currentSL || ""}
                      onChange={(e) => handleChange(stock.symbol, "SL", e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="T/P"
                      className="border border-gray-300 rounded-lg text-sm px-2 py-1.5 w-16 focus:ring-2 focus:ring-green-400 focus:border-green-400 transition"
                      value={currentTP || ""}
                      onChange={(e) => handleChange(stock.symbol, "TP", e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="% Alloc"
                      className="border border-gray-300 rounded-lg text-sm px-2 py-1.5 w-20 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
                      value={currentAlloc}
                      onChange={(e) => handleChange(stock.symbol, "allocation", e.target.value)}
                    />

                    {/* Action Button */}
                    <Button
                        onClick={() => handleAutoTrade(stock)}
                        className={`
                        w-auto mt-0
                        ${isBuy ? 'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-400/30' : 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-400/30'}
                        `}
                    >
                        Trade
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Trade Status Notification */}
      {autoTradeStatus && (
        <div 
          className={`
            mt-6 p-3 rounded-lg text-sm font-semibold transition-all duration-300
            ${autoTradeStatus.startsWith('✅') ? 'bg-green-50 text-green-800 border-2 border-green-300' : 
              autoTradeStatus.startsWith('❌') ? 'bg-red-50 text-red-800 border-2 border-red-300' : 
              'bg-blue-50 text-blue-800 border-2 border-blue-300'}
          `}
        >
          {autoTradeStatus}
        </div>
      )}
    </Card>
  );
}

export default AiRecommendations;
