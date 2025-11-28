import React from 'react';

const IndexMini = ({ index }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'up':
        return 'text-green-500';
      case 'down':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="p-4 bg-gradient-to-br from-gray-800/40 to-gray-900/40 rounded-lg border border-gray-700">
      <div className="flex justify-between items-center">
        <div>
          <div className="text-sm text-gray-300">{index.name}</div>
          <div className="text-lg font-semibold">{index.value}</div>
        </div>
        <div className={`text-sm ${getStatusColor(index.status)}`}>
          {index.change}
        </div>
      </div>
    </div>
  );
};

export default IndexMini;
