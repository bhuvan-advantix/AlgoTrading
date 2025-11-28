import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { Card } from './Card';
import { BarChart2Icon, TrendingUpIcon, ZapIcon } from '../icons/index.jsx';
import OpenPositions from './OpenPositions';
import TradeLog from './TradeLog';

const DashboardPage = () => {
    const { isKiteConnected } = useContext(AppContext);

    return (
        <div className="p-6 space-y-6">
            {/* Header with Status */}
            <div className="flex justify-between items-center">
                <h1 className="text-4xl font-extrabold text-white tracking-tight">Dashboard</h1>
                <div className="flex items-center space-x-4">
                    <span className={`flex items-center px-3 py-1 rounded-lg ${
                        isKiteConnected ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                        {isKiteConnected ? '● Connected' : '○ Not Connected'}
                    </span>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <div className="p-4">
                        <div className="flex items-center">
                            <BarChart2Icon className="w-5 h-5 text-blue-400 mr-2" />
                            <h3 className="text-lg font-semibold">Today's P&L</h3>
                        </div>
                        <p className="text-3xl font-bold text-green-400 mt-2">+₹12,450</p>
                    </div>
                </Card>
                <Card>
                    <div className="p-4">
                        <div className="flex items-center">
                            <TrendingUpIcon className="w-5 h-5 text-teal-400 mr-2" />
                            <h3 className="text-lg font-semibold">Win Rate</h3>
                        </div>
                        <p className="text-3xl font-bold text-white mt-2">68%</p>
                    </div>
                </Card>
                <Card>
                    <div className="p-4">
                        <div className="flex items-center">
                            <ZapIcon className="w-5 h-5 text-purple-400 mr-2" />
                            <h3 className="text-lg font-semibold">Open Positions</h3>
                        </div>
                        <p className="text-3xl font-bold text-white mt-2">5</p>
                    </div>
                </Card>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card title="Open Positions" titleIcon={BarChart2Icon}>
                    <OpenPositions />
                </Card>
                <Card title="Recent Trades" titleIcon={TrendingUpIcon}>
                    <TradeLog />
                </Card>
            </div>
        </div>
    );
};

export default DashboardPage;