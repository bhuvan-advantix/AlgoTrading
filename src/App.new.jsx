import React, { useState, useEffect, useMemo, useCallback, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SignedIn, SignIn, SignUp } from '@clerk/clerk-react';
import Chart from 'chart.js/auto';
import NewsAnalysisPage from './components/NewsAnalysisPage.jsx';
import { GlobalMarketsPage } from './components/GlobalMarketsPage.jsx';

// Import configuration
import { ZERODHA_API_KEY, FINNHUB_API_KEY, TWELVEDATA_API_KEY, API_BASE, APP_CONFIG } from './config';

// --- Import icons ---
import {
    ZapIcon, ClockIcon, ShieldIcon, BarChart2Icon, MenuIcon,
    TrendingUpIcon, TrendingDownIcon, XCircleIcon, CheckCircleIcon,
    MaximizeIcon, LogOutIcon, SettingsIcon
} from './icons/index.jsx';

// --- App Context ---
const AppContext = createContext(null);

// --- AppLayout Component ---
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

    // Navigation items
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

    const renderPage = () => {
        if (!isAuthReady) return <LoadingScreen />;
        
        switch (currentPage) {
            case 'dashboard':
                return <DashboardPage />;
            case 'settings':
                return <SettingsPage />;
            case 'auth':
                return <AuthPage />;
            case 'news':
                return <NewsAnalysisPage />;
            case 'markets':
                return <GlobalMarketsPage />;
            default:
                return <DashboardPage />;
        }
    };

    return (
        <div className="flex h-screen bg-gray-900 text-white font-sans">
            {/* Sidebar for Desktop */}
            <nav className="hidden lg:flex flex-col w-64 bg-gray-800 border-r border-gray-700 shadow-xl">
                {/* ... rest of the sidebar content ... */}
            </nav>

            {/* Main Content Area */}
            <div className="flex flex-col flex-1 overflow-hidden">
                {/* Content */}
                <main className="flex-1 overflow-y-auto custom-scrollbar">
                    {renderPage()}
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

// --- App Component ---
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

// --- Root Component ---
const AppWrapper = () => {
    const advantixState = useAdvantixState();
    return (
        <AppContext.Provider value={advantixState}>
            <App />
        </AppContext.Provider>
    );
};

export default AppWrapper;