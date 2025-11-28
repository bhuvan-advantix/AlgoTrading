import React, { useState, useEffect, useMemo, useCallback, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SignedIn, SignIn, SignUp } from '@clerk/clerk-react';
import Chart from 'chart.js/auto';
import NewsAnalysisPage from './components/NewsAnalysisPage.jsx';
import { GlobalMarketsPage } from './components/GlobalMarketsPage.jsx';
// Config imports
import { ZERODHA_API_KEY, FINNHUB_API_KEY, TWELVEDATA_API_KEY, API_BASE, APP_CONFIG } from './config';

// Import all the components and utils defined in your original file...
// (I'm skipping the imports to focus on fixing the structure)

const AppContext = createContext(null);

// AppLayout handles the common layout across protected routes
const AppLayout = () => {
    const {
        currentPage, setCurrentPage, isMobileMenuOpen, setIsMobileMenuOpen,
        alert, alertUser, isAuthReady, isKiteConnected, userId
    } = useContext(AppContext);

    // Navigation handler
    const handleNavigate = (page) => {
        setCurrentPage(page);
        setIsMobileMenuOpen(false);
    };

    // Navigation items definition
    const navItems = [
        { name: 'Dashboard', icon: BarChart2Icon, page: 'dashboard' },
        { name: 'Global Markets', icon: TrendingUpIcon, page: 'markets' },
        { name: 'News & Analysis', icon: ZapIcon, page: 'news' },
        { name: 'Settings', icon: SettingsIcon, page: 'settings' },
        {
            name: isKiteConnected ? 'Connected to Zerodha' : 'Connect Zerodha',
            icon: ShieldIcon,
            page: 'auth',
            className: isKiteConnected ? 'text-green-400' : 'text-yellow-400'
        },
    ];

    return (
        <div className="flex h-screen bg-gray-900 text-white font-sans">
            {/* Sidebar for Desktop */}
            <nav className="hidden lg:flex flex-col w-64 bg-gray-800 border-r border-gray-700 shadow-xl">
                <div className="p-6 border-b border-gray-700">
                    <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-teal-400 tracking-wider">
                        ADVANTIX AGI
                    </span>
                    <p className="text-xs mt-1 text-gray-400">Advantix AGI | v1.1</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {navItems.map((item) => (
                        <button
                            key={item.page}
                            onClick={() => handleNavigate(item.page)}
                            className={`flex items-center w-full px-4 py-3 rounded-xl transition-all duration-200 ${
                                currentPage === item.page
                                    ? 'bg-teal-600/30 text-teal-400 font-semibold border border-teal-500'
                                    : 'text-gray-300 hover:bg-gray-700/50'
                            }`}
                        >
                            <item.icon className="w-5 h-5 mr-3" />
                            {item.name}
                        </button>
                    ))}
                </div>
                <div className="p-4 border-t border-gray-700 text-xs text-gray-500">
                    <p>User ID: <span className="font-mono text-teal-400">{userId || 'N/A'}</span></p>
                    <p>App ID: <span className="font-mono text-teal-400">{appId}</span></p>
                </div>
            </nav>

            {/* Mobile Sidebar */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)}>
                    {/* ... mobile sidebar content ... */}
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex flex-col flex-1 overflow-hidden">
                {/* Header */}
                <header className="flex items-center justify-between p-3 sm:p-4 bg-gray-800 border-b border-gray-700 shadow-md lg:hidden">
                    {/* ... header content ... */}
                </header>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto custom-scrollbar">
                    <Routes>
                        <Route path="/" element={<DashboardPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="/auth" element={<AuthPage />} />
                        <Route path="/news" element={<NewsAnalysisPage />} />
                        <Route path="/markets" element={<GlobalMarketsPage />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>

                {/* Global Alert */}
                {alert && (
                    <div className={`fixed bottom-4 right-4 z-50 p-4 rounded-xl shadow-2xl transition-all duration-300 transform ${
                        alert.type === 'success' ? 'bg-green-600' : alert.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
                    }`}>
                        <div className="flex items-center text-white">
                            {alert.type === 'success' && <CheckCircleIcon className="w-5 h-5 mr-2" />}
                            {alert.type === 'error' && <XCircleIcon className="w-5 h-5 mr-2" />}
                            <span className="font-medium">{alert.message}</span>
                            <button onClick={() => alertUser(null)} className="ml-4 opacity-70 hover:opacity-100">
                                &times;
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Main App component that handles routing
const App = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route
                    path="/sign-in/*"
                    element={
                        <div className="min-h-screen flex items-center justify-center bg-gray-900">
                            <div className="w-full max-w-md">
                                <SignIn routing="path" signUpUrl="/sign-up" />
                            </div>
                        </div>
                    }
                />
                <Route
                    path="/sign-up/*"
                    element={
                        <div className="min-h-screen flex items-center justify-center bg-gray-900">
                            <div className="w-full max-w-md">
                                <SignUp routing="path" signInUrl="/sign-in" />
                            </div>
                        </div>
                    }
                />
                <Route
                    path="/*"
                    element={
                        <SignedIn>
                            <AppLayout />
                        </SignedIn>
                    }
                />
                <Route path="*" element={<Navigate to="/sign-in" replace />} />
            </Routes>
        </BrowserRouter>
    );
};

// Root component that provides context
const AppWrapper = () => {
    const advantixState = useAdvantixState();
    return (
        <AppContext.Provider value={advantixState}>
            <App />
        </AppContext.Provider>
    );
};

// Export the root component
export default AppWrapper;