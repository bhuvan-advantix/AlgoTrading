import React from "react";
import Header from "../components/Header";
import AiRecommendation from "../components/AiRecommendation";
import EventAwareness from "../components/EventAwareness";
import OpenPositions from "../components/OpenPositions";
import RiskSetup from "../components/RiskSetup";
import Summary from "../components/Summary";
import TradeLog from "../components/TradeLog";

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* 🌟 Top Header */}
      <Header />

      {/* 🧩 Dashboard Main Content */}
      <main className="p-4 sm:p-6 space-y-6">
        {/* Row 1: AI Recommendation + Event Awareness */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* AI Recommendation */}
          <section className="bg-gray-800 text-white sm:bg-white sm:text-gray-900 rounded-2xl shadow-md hover:shadow-lg transition-shadow p-4 sm:p-6">
            <h2 className="text-xl font-semibold mb-4 text-indigo-400 sm:text-indigo-600">
              🤖 AI Recommendations
            </h2>
            <AiRecommendation />
          </section>

          {/* Event Awareness */}
          <section className="bg-gray-800 text-white sm:bg-white sm:text-gray-900 rounded-2xl shadow-md hover:shadow-lg transition-shadow p-4 sm:p-6">
            <h2 className="text-xl font-semibold mb-4 text-indigo-400 sm:text-indigo-600">
              📊 Event Awareness
            </h2>
            <EventAwareness />
          </section>
        </div>

        {/* Row 2: Open Positions + Risk Setup */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Open Positions */}
          <section className="bg-gray-800 text-white sm:bg-white sm:text-gray-900 rounded-2xl shadow-md hover:shadow-lg transition-shadow p-4 sm:p-6">
            <h2 className="text-xl font-semibold mb-4 text-indigo-400 sm:text-indigo-600">
              💼 Open Positions
            </h2>
            <OpenPositions />
          </section>

          {/* Risk Setup */}
          <section className="bg-gray-800 text-white sm:bg-white sm:text-gray-900 rounded-2xl shadow-md hover:shadow-lg transition-shadow p-4 sm:p-6">
            <h2 className="text-xl font-semibold mb-4 text-indigo-400 sm:text-indigo-600">
              ⚠ Risk Setup
            </h2>
            <RiskSetup />
          </section>
        </div>

        {/* Row 3: Summary + Trade Log */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Summary */}
          <section className="bg-gray-800 text-white sm:bg-white sm:text-gray-900 rounded-2xl shadow-md hover:shadow-lg transition-shadow p-4 sm:p-6">
            <h2 className="text-xl font-semibold mb-4 text-indigo-400 sm:text-indigo-600">
              📈 Summary
            </h2>
            <Summary />
          </section>

          {/* Trade Log */}
          <section className="bg-gray-800 text-white sm:bg-white sm:text-gray-900 rounded-2xl shadow-md hover:shadow-lg transition-shadow p-4 sm:p-6">
            <h2 className="text-xl font-semibold mb-4 text-indigo-400 sm:text-indigo-600">
              📝 Trade Log
            </h2>
            <TradeLog />
          </section>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
