import React from 'react';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 shadow-xl">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
          <div className="text-xl font-semibold text-gray-200">Loading Advantix AGI...</div>
          <div className="text-sm text-gray-400">Please wait while we set up your session</div>
        </div>
      </div>
    </div>
  );
}