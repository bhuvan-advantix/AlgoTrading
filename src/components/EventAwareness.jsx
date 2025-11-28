import React, { useEffect, useState, useCallback } from "react";
import { AlertTriangle, Calendar, Globe, TrendingUp, Loader, Zap, Clock, DollarSign } from 'lucide-react';

import { MARKET_API_BASE } from '../config';

// --- Operational Constants ---
const API_ENDPOINT = `${MARKET_API_BASE}/event-awareness`;
const MAX_RETRIES = 5; // Robustness for a trading system
const TRADING_WINDOW = {
  start: "09:15:00",
  end: "11:15:00",
  timezone: "Asia/Kolkata"
};

function EventAwareness() {
  const [marketState, setMarketState] = useState({
    regime: null,
    events: [],
    economicCalendar: [],
    tradingWindowActive: false,
    lastUpdate: null
  });
  const [loading, setLoading] = useState(false);

  // Dynamic styling based on volatility regime (Aligned with Advantix AGI risk levels)
  const regimeStyle = {
    Calm: "bg-green-500/10 text-green-700 border-green-500 shadow-green-200/50",
    Normal: "bg-blue-500/10 text-blue-700 border-blue-500 shadow-blue-200/50",
    Elevated: "bg-orange-500/10 text-orange-700 border-orange-500 shadow-orange-200/50",
    Extreme: "bg-red-700 text-white border-red-900 shadow-red-500/50 animate-pulse",
    Default: "bg-gray-500/10 text-gray-600 border-gray-500 shadow-gray-200/50",
  };

  // Check if current time is within trading window
  const checkTradingWindow = useCallback(() => {
    const now = new Date();
    const ist = new Intl.DateTimeFormat('en-US', {
      timeZone: TRADING_WINDOW.timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(now);

    const currentTime = ist.split(':').join('');
    const startTime = TRADING_WINDOW.start.split(':').join('');
    const endTime = TRADING_WINDOW.end.split(':').join('');

    return currentTime >= startTime && currentTime <= endTime;
  }, []);

  // 🧠 Fetch function with useCallback and Exponential Backoff for robustness
  const fetchEventAwareness = useCallback(async () => {
    setLoading(true);
    let success = false;

    // Retry loop with exponential backoff (e.g., 1s, 2s, 4s delay)
    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        const response = await fetch(API_ENDPOINT);
        const res = await response.json();

        if (response.ok && res.success && res.data) {
          setMarketState({
            ...res.data,
            tradingWindowActive: checkTradingWindow(),
            lastUpdate: new Date().toISOString()
          });
          success = true;
          break;
        } else {
          throw new Error(res.message || `API error with status ${response.status}`);
        }
      } catch (err) {
        if (i < MAX_RETRIES - 1) {
          const delay = Math.pow(2, i) * 1000 + Math.random() * 500;
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error("Event awareness fetch failed after multiple retries:", err);
        }
      }
    }

    setLoading(false);

    // If all retries fail, set a default state
    if (!success) {
      setMarketState({
        regime: "Normal",
        events: [],
        economicCalendar: [],
        tradingWindowActive: checkTradingWindow(),
        lastUpdate: new Date().toISOString(),
        notes: "🚨 Unable to load real-time event data. Check API connection and logs."
      });
    }
  }, [checkTradingWindow]);

  useEffect(() => {
    // Initial fetch
    fetchEventAwareness();

    // Recheck every minute for trading window status and every 5 minutes for market data
    const tradingWindowInterval = setInterval(() => {
      setMarketState(prev => ({
        ...prev,
        tradingWindowActive: checkTradingWindow()
      }));
    }, 60000);

    const dataInterval = setInterval(fetchEventAwareness, 300000);

    return () => {
      clearInterval(tradingWindowInterval);
      clearInterval(dataInterval);
    };
  }, [fetchEventAwareness, checkTradingWindow]);

  const currentRegimeStyle = regimeStyle[marketState.regime] || regimeStyle.Default;

  const formatTime = (date) => {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: TRADING_WINDOW.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(new Date(date));
  };

  return (
    <div className="space-y-6">
      {/* Trading Window Status */}
      <div className="p-3 sm:p-4 bg-gray-800 text-white sm:bg-white sm:text-gray-900 rounded-xl shadow-lg border sm:border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Clock className="w-6 h-6 text-purple-500" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Trading Window</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {TRADING_WINDOW.start} - {TRADING_WINDOW.end} IST
              </p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${marketState.tradingWindowActive
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
            {marketState.tradingWindowActive ? 'ACTIVE' : 'CLOSED'}
          </div>
        </div>
      </div>

      {/* Main Event Awareness Card */}
      <div className="p-4 sm:p-6 bg-gray-800 text-white sm:bg-white sm:text-gray-900 rounded-xl shadow-xl border sm:border-gray-100 dark:border-gray-700">
        {loading ? (
          <div className="flex items-center space-x-3 text-blue-600 dark:text-blue-400 font-semibold py-1">
            <Loader className="animate-spin w-5 h-5" />
            <span>Analyzing global context for Advantix AGI...</span>
          </div>
        ) : marketState.regime ? (
          <div className="space-y-6">
            {/* Header with Regime Status */}
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div className="flex items-start space-x-3">
                <Globe className="w-6 h-6 text-purple-500 shrink-0" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Market Context (EAL)
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {marketState.notes}
                  </p>
                </div>
              </div>
              <div className={`
                px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-wider
                border-2 transition-all duration-300 shadow-md
                ${currentRegimeStyle}
              `}>
                {marketState.regime}
              </div>
            </div>

            {/* Event Flags */}
            {marketState.events.length > 0 && (
              <div className="border-t dark:border-gray-700 pt-4">
                <div className="flex items-center space-x-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    Active Event Flags
                  </h3>
                </div>
                <div className="grid gap-3">
                  {marketState.events.map((event, i) => (
                    <div key={i} className="flex items-start space-x-3 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <div className={`w-2 h-2 mt-2 rounded-full ${event.severity === 'high' ? 'bg-red-500' :
                          event.severity === 'medium' ? 'bg-yellow-500' :
                            'bg-blue-500'
                        }`} />
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">{event.type}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{event.description}</p>
                        {event.time && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {formatTime(event.time)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Economic Calendar */}
            {marketState.economicCalendar.length > 0 && (
              <div className="border-t dark:border-gray-700 pt-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Calendar className="w-5 h-5 text-purple-500" />
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    Economic Calendar
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="text-xs font-semibold tracking-wide text-left text-gray-500 uppercase dark:text-gray-400">
                        <th className="px-4 py-2">Time (IST)</th>
                        <th className="px-4 py-2">Event</th>
                        <th className="px-4 py-2">Impact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-gray-700">
                      {marketState.economicCalendar.map((event, i) => (
                        <tr key={i} className="text-sm">
                          <td className="px-4 py-2 whitespace-nowrap text-gray-600 dark:text-gray-400">
                            {formatTime(event.time)}
                          </td>
                          <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                            {event.title}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${event.impact === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                event.impact === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                  'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              }`}>
                              {event.impact.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-500 dark:text-gray-400 text-sm">
            No event data available. Check API connection.
          </div>
        )}
      </div>
    </div>
  );
}

export default EventAwareness;
