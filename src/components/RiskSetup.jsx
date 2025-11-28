import React from "react";

// Helper component for styled Input fields
const RiskInput = ({ label, name, value, onChange, unit }) => (
    <div className="relative mb-6">
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
        </label>
        <div className="flex items-center">
            <input
                id={name}
                name={name}
                type="number"
                step={name === "allocation" ? "1" : "0.01"} // Allow decimals for Loss Cap, integer for others
                min="0"
                value={value}
                onChange={onChange}
                className="w-full h-10 px-4 py-2 border border-gray-300 rounded-lg shadow-sm 
                           focus:ring-blue-500 focus:border-blue-500 text-gray-900 
                           transition duration-150 appearance-none disabled:bg-gray-200"
                placeholder={`Enter ${label.toLowerCase()}`}
            />
            {unit && (
                <span className="absolute right-0 mr-4 text-sm font-semibold text-gray-500 pointer-events-none">
                    {unit}
                </span>
            )}
        </div>
    </div>
);

const RiskSetup = ({ risk = {}, setRisk }) => {
    // Ensure input is treated as a number
    const handleChange = (e) => {
        const { name, value } = e.target;
        // Convert to float if value exists, otherwise handle as empty string/0
        const numericValue = value === "" ? "" : parseFloat(value); 
        setRisk({ ...risk, [name]: numericValue });
    };

    return (
        <div className="p-4 sm:p-6 bg-gray-800 text-white sm:bg-white sm:text-gray-900 border sm:border-red-200 rounded-xl shadow-xl transition duration-300 hover:shadow-2xl">
            <h2 className="text-xl font-extrabold mb-4 sm:mb-5 text-red-400 sm:text-red-700 border-b-0 sm:border-b-2 border-red-100 pb-0 sm:pb-2 flex items-center">
                <span className="text-2xl mr-2">🔒</span> Daily Risk Guardrails
            </h2>

            <p className="text-sm text-gray-500 mb-6">
                Configure the **hard limits** for the current trading day. Breaching the loss cap will trigger an **instant market-flattening halt** (Section 4, Advantix AGI Spec).
            </p>

            {/* Daily Allocation */}
            <RiskInput
                label="Daily Trading Allocation"
                name="allocation"
                type="number"
                value={risk.allocation || ""}
                onChange={handleChange}
                unit="%"
            />

            {/* Daily Loss Cap */}
            <RiskInput
                label="Maximum Daily Loss Cap"
                name="lossCap"
                type="number"
                value={risk.lossCap || ""}
                onChange={handleChange}
                unit="₹"
            />

            {/* Max Trades / Day */}
            <RiskInput
                label="Maximum Trades / Day"
                name="tradeLimit"
                type="number"
                value={risk.tradeLimit || ""}
                onChange={handleChange}
            />
        </div>
    );
};

export default RiskSetup;
