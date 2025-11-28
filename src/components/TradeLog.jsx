import React from "react";

// Helper function to dynamically style log entries based on content
const getLogStyle = (logMessage) => {
    const lowerLog = logMessage.toLowerCase();
    
    // Trade Entry/Exit/Fill
    if (lowerLog.includes("entry") || lowerLog.includes("exit") || lowerLog.includes("filled")) {
        return "text-indigo-700 font-semibold bg-indigo-50 border-indigo-200";
    }
    // Risk/System Halts (Critical)
    if (lowerLog.includes("halted") || lowerLog.includes("breach") || lowerLog.includes("killed")) {
        return "text-red-700 font-bold bg-red-100 border-red-300";
    }
    // Success/Information (Non-Critical)
    if (lowerLog.includes("success") || lowerLog.includes("ai update")) {
        return "text-green-700 bg-green-50 border-green-200";
    }
    // Default system log
    return "text-gray-700 bg-white border-gray-100";
};

const TradeLog = ({ logs = [] }) => {
    return (
        <div className="p-4 sm:p-6 bg-gray-800 text-white sm:bg-white sm:text-gray-900 border sm:border-gray-100 rounded-xl shadow-2xl">
            <h2 className="text-xl font-extrabold mb-4 text-gray-100 sm:text-gray-900 border-b pb-2 flex items-center">
                <span className="text-purple-400 mr-2">📜</span> System Run Log
            </h2>
            
            <div 
                className="overflow-y-auto h-56 sm:h-96 p-2 border border-gray-200 bg-gray-700 sm:bg-gray-50 rounded-lg 
                           text-sm font-mono scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-700"
            >
                {logs.length === 0 ? (
                    <p className="text-gray-500 text-center py-4 italic">
                        System monitoring active. Waiting for first trade or event log.
                    </p>
                ) : (
                    <ul className="divide-y divide-gray-200/50">
                        {/* Reverse the array to show the latest log entry at the top */}
                        {[...logs].reverse().map((log, i) => {
                            const classes = getLogStyle(log);
                            return (
                                <li 
                                    key={i} 
                                    className={`py-2 px-3 transition duration-150 rounded-md text-xs 
                                                ${classes} border-l-4 my-1`}
                                >
                                    {log}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default TradeLog;
