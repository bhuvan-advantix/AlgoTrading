import React from 'react';

const StatCard = ({ title, value, change }) => (
  <div className="bg-[#1a1a1a] rounded-lg p-4 border border-gray-800">
    <div className="text-gray-400 text-sm mb-1">{title}</div>
    <div className="text-white text-lg font-semibold">{value}</div>
    {change && (
      <div className={`text-sm ${parseFloat(change) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
        {parseFloat(change) >= 0 ? '▲' : '▼'} {Math.abs(parseFloat(change)).toFixed(2)}%
      </div>
    )}
  </div>
);

const HistoricalData = ({ stats }) => {
  if (!stats) return null;

  const formatNumber = (num) => {
    if (num === null || num === undefined) return 'N/A';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(num);
  };

  const formatPercent = (num) => {
    if (num === null || num === undefined) return 'N/A';
    return `${num.toFixed(2)}%`;
  };

  return (
    <div className="mt-6 space-y-6">
      <div>
        <h3 className="text-white text-lg font-semibold mb-4">Historical Performance</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard 
            title="Week Change" 
            value={formatPercent(stats.weekChange)}
            change={stats.weekChange} 
          />
          <StatCard 
            title="Month Change" 
            value={formatPercent(stats.monthChange)}
            change={stats.monthChange} 
          />
          <StatCard 
            title="Year Change" 
            value={formatPercent(stats.yearChange)}
            change={stats.yearChange} 
          />
          <StatCard 
            title="YTD Return" 
            value={formatPercent(stats.yearToDateReturn)}
            change={stats.yearToDateReturn} 
          />
        </div>
      </div>

      <div>
        <h3 className="text-white text-lg font-semibold mb-4">Key Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="52 Week High" value={formatNumber(stats.fiftyTwoWeekHigh)} />
          <StatCard title="52 Week Low" value={formatNumber(stats.fiftyTwoWeekLow)} />
          <StatCard title="50 Day Avg" value={formatNumber(stats.fiftyDayAvg)} />
          <StatCard title="200 Day Avg" value={formatNumber(stats.twoHundredDayAvg)} />
          <StatCard title="P/E Ratio" value={stats.peRatio?.toFixed(2) || 'N/A'} />
          <StatCard title="Forward P/E" value={stats.forwardPE?.toFixed(2) || 'N/A'} />
          <StatCard title="EPS (TTM)" value={formatNumber(stats.eps)} />
          <StatCard title="Beta" value={stats.beta?.toFixed(2) || 'N/A'} />
        </div>
      </div>

      <div>
        <h3 className="text-white text-lg font-semibold mb-4">Analyst Recommendations</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Recommendation" value={stats.recommendationKey?.toUpperCase()} />
          <StatCard title="Number of Analysts" value={stats.numberOfAnalystOpinions} />
          <StatCard title="Target Low" value={formatNumber(stats.targetLowPrice)} />
          <StatCard title="Target High" value={formatNumber(stats.targetHighPrice)} />
        </div>
      </div>
    </div>
  );
};

export default HistoricalData;