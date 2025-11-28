import React, { useState, useEffect, useMemo, useCallback, createContext, useContext } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { SignedIn, SignedOut, SignIn, SignUp, useUser } from '@clerk/clerk-react';
import Chart from 'chart.js/auto';
import NewsAnalysisPage from './components/NewsAnalysisPage.jsx';
import { GlobalMarketsPage } from './components/GlobalMarketsPage.jsx';

// Import icons
import {
    ZapIcon, ClockIcon, ShieldIcon, BarChart2Icon, MenuIcon,
    TrendingUpIcon, TrendingDownIcon, XCircleIcon, CheckCircleIcon,
    MaximizeIcon, LogOutIcon, SettingsIcon
} from './icons/index.jsx';

// Import configuration
import { ZERODHA_API_KEY, FINNHUB_API_KEY, TWELVEDATA_API_KEY, API_BASE, APP_CONFIG } from './config';

// --- App Context ---
const AppContext = createContext(null);

// --- Global Config & Firebase Constants ---
const appId = 'default-app-id';
const firebaseConfig = {};
const initialAuthToken = null;

// --- Login Components ---
const LoginPage = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-full max-w-md">
            <SignIn routing="path" signUpUrl="/sign-up" />
        </div>
    </div>
);

const SignUpPage = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-full max-w-md">
            <SignUp routing="path" signInUrl="/sign-in" />
        </div>
    </div>
);

// --- AppLayout Component ---
const AppLayout = () => {
    const { isLoaded, isSignedIn, user } = useUser();
    const navigate = useNavigate();
    const {
        currentPage, setCurrentPage, isMobileMenuOpen, setIsMobileMenuOpen,
        alert, alertUser, isAuthReady, isKiteConnected
    } = useContext(AppContext);

    // Handle navigation
    const handleNavigate = (page) => {
        setCurrentPage(page);
        setIsMobileMenuOpen(false);
        navigate(`/${page === 'dashboard' ? '' : page}`);
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

    if (!isLoaded || !isAuthReady) {
        return <LoadingScreen />;
    }

    if (!isSignedIn) {
        navigate('/sign-in');
        return null;
    }

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
                    <p>User ID: <span className="font-mono text-teal-400">{user?.id || 'N/A'}</span></p>
                    <p>App ID: <span className="font-mono text-teal-400">{appId}</span></p>
                </div>
            </nav>

            {/* Mobile Sidebar */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="absolute inset-0 bg-black opacity-75"></div>
                    <nav className="relative flex flex-col w-64 h-full bg-gray-800 p-4 shadow-xl">
                        <div className="flex justify-end mb-4">
                            <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-400 hover:text-white">
                                <XCircleIcon className="w-6 h-6" />
                            </button>
                        </div>
                        {navItems.map((item) => (
                            <button
                                key={item.page}
                                onClick={() => handleNavigate(item.page)}
                                className={`flex items-center w-full px-4 py-3 rounded-lg transition-all duration-200 mb-2 ${
                                    currentPage === item.page
                                        ? 'bg-teal-600/30 text-teal-400 font-semibold'
                                        : 'text-gray-300 hover:bg-gray-700'
                                }`}
                            >
                                <item.icon className="w-5 h-5 mr-3" />
                                {item.name}
                            </button>
                        ))}
                    </nav>
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex flex-col flex-1 overflow-hidden">
                {/* Header */}
                <header className="flex items-center justify-between p-3 sm:p-4 bg-gray-800 border-b border-gray-700 shadow-md lg:hidden">
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="text-gray-500 dark:text-gray-400 focus:outline-none p-2 rounded-md"
                    >
                        <MenuIcon className="w-6 h-6" />
                    </button>
                    <span className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-teal-500 tracking-wider">
                        ADVANTIX AGI
                    </span>
                    <div className="hidden sm:block">
                        <KiteStatusButton />
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto custom-scrollbar">
                    <Routes>
                        <Route path="/" element={<DashboardPage />} />
                        <Route path="/dashboard" element={<DashboardPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="/auth" element={<AuthPage />} />
                        <Route path="/news" element={<NewsAnalysisPage />} />
                        <Route path="/markets" element={<GlobalMarketsPage />} />
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

// --- Main App Component ---
const App = () => {
    const advantixState = useAdvantixState();
    
    return (
        <AppContext.Provider value={advantixState}>
            <Routes>
                <Route path="/sign-in/*" element={<LoginPage />} />
                <Route path="/sign-up/*" element={<SignUpPage />} />
                <Route
                    path="/*"
                    element={
                        <SignedIn>
                            <AppLayout />
                        </SignedIn>
                    }
                />
            </Routes>
        </AppContext.Provider>
    );
};

// Export components
export { AppContext, useAdvantixState };
export default App;