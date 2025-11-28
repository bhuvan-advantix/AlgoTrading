import React from "react";

// Helper function to format prices cleanly
const formatPrice = (price) => {
    if (typeof price === 'number') {
        return price.toFixed(2);
    }
    return price;
};

// Component
const OpenPositions = ({ positions = [] }) => {
    // Dynamic styling for P&L or Status (simulated here since real PnL isn't in props)
    const getStatusStyle = (status) => {
        const lowerStatus = status.toLowerCase();
        if (lowerStatus === "open") {
            // Highlighting active positions
            return "text-blue-600 bg-blue-500/10 font-bold border-blue-600";
        }
        if (lowerStatus === "closed") {
             // Gray for historical/inactive positions
            return "text-gray-500 bg-gray-100 font-medium border-gray-400";
        }
        // Assuming a new position (often marked with green)
        return "text-green-600 bg-green-500/10 font-bold border-green-600";
    };

    return (
        <div className="p-4 sm:p-6 bg-gray-800 text-white sm:bg-white sm:text-gray-900 border sm:border-gray-100 rounded-xl shadow-2xl transition duration-300 transform hover:scale-[1.005] ease-in-out">
            <h2 className="text-xl font-extrabold mb-4 text-gray-100 sm:text-gray-900 border-b pb-2">Active Positions & Brackets</h2>
            
            <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                    <thead className="bg-gray-50 uppercase text-xs tracking-wider text-gray-600 border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-2 font-medium">Symbol</th>
                            <th className="px-4 py-2 font-medium text-right">Entry Price</th>
                            <th className="px-4 py-2 font-medium text-right">Stop Loss (SL)</th>
                            <th className="px-4 py-2 font-medium text-right">Take Profit (TP)</th>
                            <th className="px-4 py-2 font-medium text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {positions.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-4 py-4 text-center text-gray-400 italic bg-transparent text-sm">
                                    The Advantix AGI system currently has no open positions.
                                </td>
                            </tr>
                        ) : (
                            positions.map((pos, idx) => {
                                const statusClasses = getStatusStyle(pos.status || 'open');
                                
                                return (
                                    <tr
                                        key={idx}
                                        className="border-b border-gray-100 hover:bg-blue-50/50 transition duration-150"
                                    >
                                        <td className="px-4 py-3 font-bold text-gray-800">{pos.symbol}</td>
                                        <td className="px-4 py-3 text-right font-mono text-sm text-gray-700">{formatPrice(pos.entryPrice)}</td>
                                        <td className="px-4 py-3 text-right font-mono text-sm text-red-600">{formatPrice(pos.SL)}</td>
                                        <td className="px-4 py-3 text-right font-mono text-sm text-green-600">{formatPrice(pos.TP)}</td>
                                        
                                        <td className="px-4 py-3 text-center">
                                            <span 
                                                className={`
                                                    px-3 py-1 text-xs rounded-full border 
                                                    ${statusClasses}
                                                `}
                                            >
                                                {pos.status || 'Open'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default OpenPositions;
