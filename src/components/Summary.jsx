import React from "react";

// Component
const Summary = ({ summary = {} }) => {
    // Destructure, providing safe defaults
    const { pnl = 0, winRate = 0, notes = "No specific notes recorded for this session." } = summary;

    // Determine P&L color class
    const pnlColorClass = pnl > 0 ? "text-green-600 bg-green-500/10" : pnl < 0 ? "text-red-600 bg-red-500/10" : "text-gray-600 bg-gray-100";
    
    // Format P&L with sign and currency
    const formattedPnl = `${pnl >= 0 ? '₹+' : '₹'}${pnl.toFixed(2)}`;
    const formattedWinRate = `${winRate.toFixed(1)}%`;

    return (
        <div className="p-4 sm:p-6 bg-gray-800 text-white sm:bg-white sm:text-gray-900 border sm:border-gray-200 rounded-xl shadow-lg transition duration-300 hover:shadow-xl">
            <h2 className="text-xl font-extrabold mb-4 text-gray-100 sm:text-gray-900 border-b pb-2 flex items-center">
                <span className="text-blue-400 sm:text-blue-500 mr-2">📊</span> End of Day Summary
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                
                {/* P&L Block */}
                <div className={`p-4 rounded-lg border border-opacity-30 ${pnlColorClass} shadow-inner`}>
                    <div className="text-sm font-medium uppercase tracking-wider text-gray-700">Net Profit & Loss</div>
                    <div className="text-3xl font-extrabold mt-1">
                        {formattedPnl}
                    </div>
                </div>

                {/* Win Rate Block */}
                <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-700 shadow-inner">
                    <div className="text-sm font-medium uppercase tracking-wider text-gray-700">Win Rate</div>
                    <div className="text-3xl font-extrabold mt-1">
                        {formattedWinRate}
                    </div>
                </div>
            </div>

            {/* Notes Section */}
            <div className="pt-4 border-t border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-1">Session Notes:</h3>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200 italic">
                    {notes}
                </p>
            </div>
        </div>
    );
};

export default Summary;
