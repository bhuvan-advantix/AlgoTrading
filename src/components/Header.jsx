import React, { useState } from "react";

// --- Custom SVG Icons (Replacing lucide-react) ---
const Sun = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props} className={"lucide lucide-sun " + props.className}>
    <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
  </svg>
);

const Moon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props} className={"lucide lucide-moon " + props.className}>
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
  </svg>
);

// --- Component ---

export default function Header() {
  // We simulate the theme state and toggle function since useWindmill is external
  const [mode, setMode] = useState('light');
  
  const toggleMode = () => {
    // This logic simulates the theme switch.
    setMode(prevMode => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const isDark = mode === 'dark';

  return (
    <header className="z-40 py-3 bg-gray-800 sm:bg-white shadow-bottom dark:sm:bg-gray-800">
  <div className="container flex items-center justify-between h-full px-4 sm:px-6 mx-auto text-purple-300 sm:text-purple-600">
        {/* Logo */}
        <div className="flex items-center">
          <span className="ml-2 text-xl font-bold">Trading Dashboard</span>
        </div>

        {/* Right side */}
        <div className="flex items-center">
          {/* Theme toggler - optional */}
          <button
            onClick={toggleMode} 
            aria-label="Toggle Theme"
            className={`
              flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-semibold transition duration-300
              ${isDark 
                ? 'bg-gray-700 hover:bg-gray-600 text-yellow-300 shadow-md shadow-gray-700/50' 
                : 'bg-gray-700/10 hover:bg-gray-700/20 text-gray-100 sm:bg-white sm:text-gray-800 shadow-sm'}
            `}
          >
            {isDark 
              ? (
                <>
                  <Sun className="w-4 h-4" />
                  <span>Light Mode</span>
                </>
              ) 
              : (
                <>
                  <Moon className="w-4 h-4" />
                  <span>Dark Mode</span>
                </>
              )}
          </button>
        </div>
      </div>
    </header>
  );
}
