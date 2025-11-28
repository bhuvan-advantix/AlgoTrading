import React, { useState, useEffect, useMemo, useCallback, useRef, createContext, useContext } from 'react';
import Chart from 'chart.js/auto';
import NewsAnalysisPage from './components/NewsAnalysisPage.jsx';
import { GlobalMarketsPage } from './components/GlobalMarketsPage.jsx';
import PaperTrading from './pages/PaperTrading.jsx';
import PaperTradingTerminal from './pages/PaperTradingTerminal';
import AccountView from './components/paper/AccountView';
import TradingView from './components/paper/TradingView';
import WatchlistView from './components/paper/WatchlistView';
import PortfolioView from './components/paper/PortfolioView';
import OrdersView from './components/paper/OrdersView';
import StockSearchAI from './components/StockSearchAI';
import { placeMarketOrder, readState } from './utils/paperTradingStore';

// --- Global Config & Firebase Imports ---
// IMPORTANT: These variables are provided by the canvas environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Firebase imports (must be available in the environment)
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection, query, limit, orderBy } from 'firebase/firestore';

// Base API URL assumes the backend is running on port 5000
// Import configuration
import { ZERODHA_API_KEY, FINNHUB_API_KEY, TWELVEDATA_API_KEY, API_BASE, MARKET_API_BASE, APP_CONFIG } from './config';

// --- UTILITIES ---

// Exponential backoff for API retries
const fetchWithRetry = async (url, options = {}, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);

            // Try to parse error response for better error handling
            let errorData;
            try {
                errorData = await response.clone().json();
            } catch {
                // If parsing fails, continue with normal flow
            }

            if (response.ok) return response;

            // Don't retry for authentication/token errors
            if (response.status === 401 || (errorData?.error_type === 'TokenException')) {
                throw new Error(errorData?.error || "Authentication failed. Please reconnect Zerodha.");
            }

            // For other errors
            throw new Error(errorData?.error || `Request failed with status ${response.status}`);

        } catch (error) {
            // If it's an auth error or we've run out of retries, throw immediately
            if (error.message.includes('Authentication failed') || i === retries - 1) {
                throw error;
            }

            // For other errors, retry with exponential backoff
            const delay = Math.pow(2, i) * 1000;
            console.warn(`Request failed, retrying in ${delay / 1000}s...`, error.message);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
};

const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

const generateUUID = () => crypto.randomUUID();

// --- INLINE SVG ICONS (Lucide-React style for Tailwind) ---

// Import icons
import {
    ZapIcon, ClockIcon, ShieldIcon, BarChart2Icon, MenuIcon,
    TrendingUpIcon, TrendingDownIcon, XCircleIcon, CheckCircleIcon,
    MaximizeIcon, LogOutIcon, SettingsIcon
} from './icons/index.jsx';

// --- INITIAL DATA & MOCKS ---

const MOCK_AI_RECOMMENDATIONS = [
    { symbol: 'RELIANCE', confidence: 'High', rationale: 'ORB: Above overnight consolidation high (Elevated Volatility)', method: 'ATR(14)', allocation: 25 },
    { symbol: 'HDFCBANK', confidence: 'Medium', rationale: 'VWAP Reversion: Pullback to 50% overnight gap fill (Calm Volatility)', method: 'VWAP Dev', allocation: 15 },
    { symbol: 'TCS', confidence: 'Low', rationale: 'Momentum: Weak open, watching for re-acceleration above HOD (Normal Volatility)', method: 'SL fixed %', allocation: 10 },
];

const MOCK_DAILY_LOG = [
    { id: generateUUID(), timestamp: '09:20:00', type: 'ENTRY', symbol: 'HDFCBANK', price: 1520.50, qty: 100, mode: 'Live', status: 'FILLED', notes: 'VWAP Reversion Entry' },
    { id: generateUUID(), timestamp: '09:35:00', type: 'EXIT', symbol: 'HDFCBANK', price: 1525.80, qty: 100, mode: 'Live', status: 'COMPLETE', pnl: 530.00, notes: 'TP Hit' },
];

// --- APP CONTEXT ---

const AppContext = createContext(null);

const AppWrapper = () => {
    const advantixState = useAdvantixState();
    return (
        <AppContext.Provider value={advantixState}>
            <AdvantixApp />
        </AppContext.Provider>
    );
};

// Custom hook for managing application state and persistence
const useAdvantixState = () => {
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    const [kiteToken, setKiteToken] = useState(null); // The Zerodha request_token
    const [isKiteConnected, setIsKiteConnected] = useState(false); // True if session is active
    const [kiteSessionKey, setKiteSessionKey] = useState(null); // The final session key (mocked or received from backend)
    const [kiteUserId, setKiteUserId] = useState(() => {
        try { return localStorage.getItem('kiteUserId'); } catch { return null; }
    });

    const [currentPage, setCurrentPage] = useState('dashboard');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Trading State
    const [mode, setMode] = useState('Paper'); // 'Paper' | 'Live'
    const [isRunning, setIsRunning] = useState(false);
    const [dailyPnl, setDailyPnl] = useState(0);
    const [tradeCount, setTradeCount] = useState(0);

    // Risk Parameters
    const [riskParams, setRiskParams] = useState({
        dailyCapital: 100000.00,
        maxTrades: 2,
        dailyLossCap: -1500.00,
        allowAIOverride: true,
        tradeWindowEnd: '11:15', // Time to enforce flat/trail
    });

    // AI/EAL State (Mocked)
    const [ealStatus, setEalStatus] = useState('Normal'); // 'Calm' | 'Normal' | 'Elevated'
    const [aiRecommendations, setAiRecommendations] = useState(MOCK_AI_RECOMMENDATIONS);
    const [selectedSymbol, setSelectedSymbol] = useState(null);

    // Logs & Positions (Simulated Firestore sync)
    const [runLog, setRunLog] = useState(MOCK_DAILY_LOG);
    const [openPositions, setOpenPositions] = useState([]);


    // --- FIREBASE INITIALIZATION & AUTH ---

    useEffect(() => {
        // Init Firebase
        if (Object.keys(firebaseConfig).length > 0) {
            try {
                const app = initializeApp(firebaseConfig);
                const firestore = getFirestore(app);
                const authInstance = getAuth(app);
                setDb(firestore);
                setAuth(authInstance);

                // Auth listener
                const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
                    if (user) {
                        setUserId(user.uid);
                        // Save user profile data (just to show connectivity)
                        const userRef = doc(firestore, "artifacts", appId, "users", user.uid, "profile", "data");
                        const userDoc = await getDoc(userRef);
                        if (!userDoc.exists()) {
                            await setDoc(userRef, { lastLogin: new Date().toISOString() });
                        }
                    } else {
                        // Sign in anonymously if no token is available for the current session
                        if (!initialAuthToken) {
                            await signInAnonymously(authInstance);
                        }
                    }
                    setIsAuthReady(true);
                });

                // Sign in with custom token if available
                if (initialAuthToken) {
                    signInWithCustomToken(authInstance, initialAuthToken).catch(err => {
                        console.error("Custom token sign-in failed:", err);
                        signInAnonymously(authInstance);
                    });
                } else {
                    signInAnonymously(authInstance);
                }

                return () => unsubscribe();
            } catch (e) {
                console.error("Firebase Initialization Error:", e);
                // Fallback to non-persisted state if Firebase fails
                setIsAuthReady(true);
            }
        } else {
            // Treat as auth ready if config is missing (will run without persistence)
            setIsAuthReady(true);
            setUserId(generateUUID()); // Mock user ID
        }
    }, []);


    // --- FIRESTORE DATA SYNC (LOGS) ---
    useEffect(() => {
        if (db && userId) {
            const logsRef = collection(db, "artifacts", appId, "users", userId, "trading_logs");
            // Set up listener for the run log
            const q = query(logsRef, orderBy("timestamp", "desc"), limit(50));

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const logs = snapshot.docs.map(doc => doc.data());
                // Sort by timestamp if necessary as query is only partial
                logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                setRunLog(logs);
                // Calculate daily P&L from logs (very simple calculation)
                const currentPnl = logs.reduce((sum, log) => sum + (log.pnl || 0), 0);
                setDailyPnl(currentPnl);
                setTradeCount(logs.filter(log => log.type === 'ENTRY').length);
            }, (error) => {
                console.error("Error listening to logs:", error);
            });

            return () => unsubscribe();
        }
    }, [db, userId]);


    // --- ZERODHA AUTH FLOW HANDLERS ---

    const generateKiteAuthUrl = () => {
        // In a real app, this should fetch client details from the backend
        const redirect_uri = window.location.origin; // Using the app's current origin
        const url = `https://kite.zerodha.com/connect/login?v=3&api_key=${ZERODHA_API_KEY}&redirect_uri=${redirect_uri}`;
        return url;
    };

    const handleZerodhaLogin = async () => {
        try {
            // Fetch login URL from backend which uses the user's stored API key
            const response = await fetch(`${API_BASE}/kite/login?userId=${userId}`);
            const data = await response.json();

            if (data.success && data.data?.loginUrl) {
                window.open(data.data.loginUrl, '_blank', 'noopener,noreferrer');
            } else {
                alertUser({ type: 'error', message: 'Could not generate login URL. Please check your API keys.' });
            }
        } catch (error) {
            console.error("Zerodha Login Error:", error);
            alertUser({ type: 'error', message: 'Failed to initiate Zerodha login.' });
        }
    };

    const handleTokenExchange = async (token) => {
        if (!token) {
            console.error("Token is required for exchange.");
            return;
        }
        setKiteToken(token); // Store token temporarily
        console.log("Attempting to exchange Kite request token:", token);

        // --- STEP 2: Send to Backend for Session Key Exchange ---
        // The backend must complete the exchange using the API secret.
        try {
            const response = await fetchWithRetry(`${API_BASE}/kite/exchange-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': userId // Pass UID for tracking
                },
                body: JSON.stringify({ request_token: token })
            });

            let data;
            const text = await response.text();
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error("Failed to parse backend response:", text);
                throw new Error("Invalid response from server. Check backend logs.");
            }

            // Check if we got a valid response with a session key
            if (data.success && data.sessionKey) {
                setKiteSessionKey(data.sessionKey);
                setIsKiteConnected(true);
                // Save kiteUserId into state as well so components react immediately
                if (data.data?.kiteUserId) setKiteUserId(data.data.kiteUserId);
                // Persist kite user id and session key so other components can call kite endpoints
                try {
                    if (data.data?.kiteUserId) localStorage.setItem('kiteUserId', data.data.kiteUserId);
                    if (data.sessionKey) localStorage.setItem('kiteSessionKey', data.sessionKey);
                } catch (e) {
                    console.warn('Could not persist kite session to localStorage', e);
                }
                alertUser({
                    type: 'success',
                    message: `Connected to Zerodha! ${data.data?.userName ? `Welcome, ${data.data.userName}` : ''}`
                });
                // Open the Paper Trading panel and show Account tab
                setCurrentPage('paper');
                try { setActiveTab('account'); } catch (e) { /* ignore if not in scope */ }
            } else {
                // If backend response indicates failure
                const errorMsg = data.error || 'Failed to establish Zerodha session.';
                console.error('Kite session setup failed:', errorMsg);
                alertUser({
                    type: 'error',
                    message: `Zerodha connection failed: ${errorMsg}`
                });
                setKiteSessionKey(null);
                setIsKiteConnected(false);
            }
        } catch (error) {
            console.error("Kite Token Exchange Error:", error);
            alertUser({ type: 'error', message: `Token exchange failed: ${error.message}` });
        }
    };

    // --- GUARDRAIL LOGIC (Simplified Frontend Check) ---

    const checkGuardrails = useMemo(() => {
        const isTradeCountBreached = tradeCount >= riskParams.maxTrades;
        const isDailyLossCapBreached = dailyPnl <= riskParams.dailyLossCap;
        const isTimeWindowBreached = new Date().getHours() * 60 + new Date().getMinutes() > (parseInt(riskParams.tradeWindowEnd.split(':')[0]) * 60 + parseInt(riskParams.tradeWindowEnd.split(':')[1]));
        const canEnterTrade = !isTradeCountBreached && !isDailyLossCapBreached && !isTimeWindowBreached && isRunning;

        return {
            isTradeCountBreached,
            isDailyLossCapBreached,
            isTimeWindowBreached,
            canEnterTrade,
        };
    }, [tradeCount, dailyPnl, isRunning, riskParams]);

    // --- UI/UX State ---
    const [alert, setAlert] = useState(null); // { type: 'success'|'error'|'info', message: '...' }

    const alertUser = useCallback((newAlert) => {
        setAlert(newAlert);
        const timer = setTimeout(() => setAlert(null), 5000);
        return () => clearTimeout(timer);
    }, []);

    // Restore Kite session from localStorage on mount
    useEffect(() => {
        try {
            const storedUser = localStorage.getItem('kiteUserId');
            const storedKey = localStorage.getItem('kiteSessionKey');
            if (storedUser && storedKey) {
                setKiteUserId(storedUser);
                setKiteSessionKey(storedKey);
                setIsKiteConnected(true);
            }
        } catch (err) {
            // ignore
        }
    }, []);

    const contextValue = useMemo(() => ({
        // Auth/Firebase
        db, auth, userId, isAuthReady,
        // UI/Navigation
        currentPage, setCurrentPage, isMobileMenuOpen, setIsMobileMenuOpen,
        alertUser, alert,
        // Trading
        mode, setMode, isRunning, setIsRunning, dailyPnl, tradeCount,
        riskParams, setRiskParams,
        ealStatus, aiRecommendations, setAiRecommendations, selectedSymbol, setSelectedSymbol,
        runLog, setRunLog, openPositions, setOpenPositions,
        checkGuardrails,
        // Kite Connect
        isKiteConnected, kiteUserId, kiteSessionKey, setKiteUserId, handleZerodhaLogin, handleTokenExchange, generateKiteAuthUrl,
    }), [
        db, auth, userId, isAuthReady, currentPage, isMobileMenuOpen, alert,
        mode, isRunning, dailyPnl, tradeCount, riskParams, ealStatus, aiRecommendations,
        selectedSymbol, runLog, openPositions, checkGuardrails, isKiteConnected, kiteUserId, kiteSessionKey
    ]);

    return contextValue;
};


// --- CARD & BUTTON COMPONENTS ---

const Card = ({ title, children, className = '', titleIcon: TitleIcon, titleClassName = '' }) => (
    <div className={`bg-gray-800 rounded-xl p-5 shadow-lg border border-gray-700 ${className}`}>
        {title && (
            <div className={`flex items-center mb-4 pb-2 border-b border-gray-700 ${titleClassName}`}>
                {TitleIcon && <TitleIcon className="w-5 h-5 mr-2 text-teal-400" />}
                <h2 className="text-lg font-semibold text-gray-100">{title}</h2>
            </div>
        )}
        {children}
    </div>
);

const Button = ({ children, onClick, disabled, className = '', variant = 'primary', icon: Icon, type = 'button' }) => {
    let baseStyles = "flex items-center justify-center px-4 py-2 font-medium rounded-lg transition-all duration-200 shadow-md transform active:scale-[0.98]";
    let variantStyles = '';

    switch (variant) {
        case 'primary':
            variantStyles = 'bg-gradient-to-r from-purple-600 to-teal-500 hover:from-purple-700 hover:to-teal-600 text-white';
            break;
        case 'secondary':
            variantStyles = 'bg-gray-700 text-gray-100 hover:bg-gray-600 border border-gray-600';
            break;
        case 'danger':
            variantStyles = 'bg-red-600 text-white hover:bg-red-700';
            break;
        case 'outline':
            variantStyles = 'bg-transparent text-teal-400 border border-teal-400 hover:bg-teal-900/30';
            break;
    }

    if (disabled) {
        // Ensure disabled buttons have visible text in both dark/light contexts
        variantStyles = 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-70';
    }

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`${baseStyles} ${variantStyles} ${className}`}
        >
            {Icon && <Icon className="w-5 h-5 mr-2" />}
            {children}
        </button>
    );
};


// --- PAGE COMPONENTS ---
const DashboardPage = () => {
    const {
        mode, setMode, isRunning, setIsRunning, dailyPnl, tradeCount,
        riskParams, setRiskParams,
        ealStatus,
        runLog, checkGuardrails, alertUser, isKiteConnected, setCurrentPage,
        userId, setRunLog, handleZerodhaLogin, setAiRecommendations
    } = useContext(AppContext);

    // Show Zerodha connect banner only when in Live mode and not connected
    const showZerodhaPrompt = mode === 'Live' && !isKiteConnected;

    // EAL Status styling
    const getEalStyles = () => {
        switch (ealStatus) {
            case 'Calm': return { bg: 'bg-green-700', text: 'text-green-200', icon: CheckCircleIcon };
            case 'Normal': return { bg: 'bg-blue-700', text: 'text-blue-200', icon: BarChart2Icon };
            case 'Elevated': return { bg: 'bg-red-700', text: 'text-red-200', icon: ZapIcon };
            default: return { bg: 'bg-gray-700', text: 'text-gray-400', icon: SettingsIcon };
        }
    };
    const eal = getEalStyles();

    const handleRunToggle = () => {
        if (!isKiteConnected && mode === 'Live') {
            alertUser({ type: 'error', message: 'Cannot start Live mode: Zerodha session is not active.' });
            return;
        }

        if (checkGuardrails.isDailyLossCapBreached && !isRunning) {
            alertUser({ type: 'error', message: 'Daily Loss Cap breached. Cannot start new trading session.' });
            return;
        }

        setIsRunning(!isRunning);
        alertUser({ type: 'info', message: isRunning ? 'Trading halted. All open positions will be flattened at market.' : `Trading session started in ${mode} mode.` });
    };

    // Mode selection helper: allow choosing Live but prompt/connect if needed
    const handleModeSelect = (targetMode) => {
        if (targetMode === 'Live') {
            if (!isKiteConnected) {
                // Allow UI to switch to Live but prompt connection
                setMode('Live');
                alertUser({ type: 'info', message: 'Live mode requires Zerodha connection. Opening auth flow...' });
                if (typeof handleZerodhaLogin === 'function') handleZerodhaLogin();
                // user must complete auth before starting session
                return;
            }
            setMode('Live');
            return;
        }

        // Paper mode
        setMode('Paper');
    };

    // --- Order Placement State & Handlers ---
    const [orderSymbol, setOrderSymbol] = useState('');
    const [orderQty, setOrderQty] = useState(1);
    const [orderSide, setOrderSide] = useState('BUY'); // BUY | SELL
    const [orderType, setOrderType] = useState('MARKET'); // MARKET | LIMIT
    const [limitPrice, setOrderPrice] = useState('');
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    // Note: AI picks now loaded dynamically via StockSearchAI component
    // Legacy endpoint removed - use /api/ai-picks endpoint in backend if needed
    const [orderConfirmation, setOrderConfirmation] = useState(null);

};

return (
    <div className="p-4 sm:p-6 space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6 tracking-tight">Advantix AGI Algo Dashboard</h1>

        {/* Quick Order removed from the top banner - now placed in Control Panel (right column) for a professional layout */}
        {/* Zerodha Connection Banner */}
        {showZerodhaPrompt && (
            <>
                {/* Large banner for sm+ devices */}
                <div className="hidden sm:flex bg-gray-800 border-l-4 border-yellow-500 p-4 mb-6 rounded-r-xl">
                    <div className="flex items-center">
                        <ShieldIcon className="w-6 h-6 text-yellow-500 mr-3" />
                        <div>
                            <h3 className="text-lg font-medium text-white">Connect Zerodha for Live Trading</h3>
                            <p className="text-gray-400 mt-1">Your account needs to be connected to Zerodha to enable live trading features.</p>
                            <Button
                                variant="outline"
                                className="mt-3"
                                onClick={() => setCurrentPage('auth')}
                            >
                                Connect Zerodha Account
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Compact inline notice for xs screens */}
                <div className="sm:hidden mb-4">
                    <div className="flex items-center justify-between bg-yellow-900/10 border border-yellow-500/20 p-2 rounded-md">
                        <div className="flex items-center space-x-2">
                            <ShieldIcon className="w-4 h-4 text-yellow-400" />
                            <span className="text-xs text-yellow-300">Live mode requires Zerodha connection</span>
                        </div>
                        <button onClick={() => setCurrentPage('auth')} className="text-xs text-yellow-200 bg-yellow-800/20 px-2 py-1 rounded-md">Connect</button>
                    </div>
                </div>
            </>
        )}

        {/* --- TOP BANNER STATS & EAL --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <Card title="Daily P&L" className="col-span-1 border-2 border-transparent hover:border-teal-500">
                <p className={`text-2xl sm:text-3xl font-extrabold ${dailyPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatCurrency(dailyPnl)}
                </p>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">Daily Cap: {formatCurrency(riskParams.dailyLossCap)}</p>
            </Card>

            <Card title="Trades Executed" className="col-span-1 border-2 border-transparent hover:border-teal-500">
                <p className="text-2xl sm:text-3xl font-extrabold text-teal-400">
                    {tradeCount} <span className="text-xl text-gray-400">/ {riskParams.maxTrades}</span>
                </p>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">Trade Window: 09:15 - {riskParams.tradeWindowEnd} IST</p>
            </Card>

            <Card title="Volatility Regime " className={`col-span-1 ${eal.bg} bg-opacity-30 border border-gray-700 hover:border-teal-500`}>
                <div className="flex items-center">
                    <eal.icon className={`w-6 h-6 mr-2 ${eal.text}`} />
                    <p className={`text-2xl sm:text-3xl font-extrabold ${eal.text}`}>{ealStatus}</p>
                </div>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">Global events analyzed pre-open.</p>
            </Card>

            <Card title="System Status" className={`col-span-1 border-2 border-transparent hover:border-teal-500`}>
                <div className="flex flex-col space-y-2">
                    <span className={`inline-flex items-center text-sm font-medium ${isRunning ? 'text-green-400' : 'text-yellow-400'}`}>
                        <span className={`w-3 h-3 rounded-full mr-2 ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></span>
                        Algo Status: {isRunning ? 'RUNNING' : 'HALTED'}
                    </span>
                    <span className={`inline-flex items-center text-sm font-medium ${isKiteConnected ? 'text-green-400' : 'text-red-400'}`}>
                        <span className={`w-3 h-3 rounded-full mr-2 ${isKiteConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        Kite Connect: {isKiteConnected ? 'CONNECTED' : 'DISCONNECTED'}
                    </span>
                </div>
            </Card>
        </div>

        {/* --- CONTROL, RECOMMENDATIONS, & RISK SETUP --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

            {/* Left Column: AI Stock Search & Analysis */}
            <Card title="AI Stock Search & Analysis (Institutional Grade)" titleIcon={ZapIcon} className="lg:col-span-2">
                <StockSearchAI />
            </Card>

            {/* Right Column: Risk Setup & Control */}
            <div className="lg:col-span-1 space-y-4 sm:space-y-6">
                {/* Control Panel */}
                <Card title="Control Panel" titleIcon={MaximizeIcon}>
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-gray-400">Mode:</span>
                        <div className="flex bg-gray-700 p-1 rounded-lg">
                            <Button onClick={() => handleModeSelect('Paper')} variant={mode === 'Paper' ? 'primary' : 'secondary'} className="px-3 py-1 text-sm mr-1 !shadow-none">Paper (Sim)</Button>
                            <Button onClick={() => handleModeSelect('Live')} variant={mode === 'Live' ? 'primary' : 'secondary'} className="px-3 py-1 text-sm !shadow-none">Live</Button>
                        </div>
                    </div>
                    <Button
                        onClick={handleRunToggle}
                        variant={isRunning ? 'danger' : 'primary'}
                        className="w-full text-lg"
                    >
                        {isRunning ? <XCircleIcon /> : <CheckCircleIcon />}
                        {isRunning ? 'HALT & FLATTEN' : 'START SESSION'}
                    </Button>
                    {checkGuardrails.isDailyLossCapBreached && <p className="text-xs text-red-500 mt-2 font-semibold">GUARDRAIL BREACH: Daily Loss Cap hit. System is halted.</p>}
                    {!isKiteConnected && mode === 'Live' && <p className="text-xs text-red-500 mt-2 font-semibold">Kite Disconnected. Live Mode is disabled.</p>}
                </Card>

                {/* Compact Order Card placed under Control Panel for professional layout */}
                <Card title="Place Order" titleIcon={TrendingUpIcon} className="mt-4">
                    <div className="space-y-3 text-sm text-gray-300">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs text-gray-400">Symbol</label>
                                <input type="text" value={orderSymbol} onChange={(e) => setOrderSymbol(e.target.value)} placeholder="RELIANCE" className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400">Qty</label>
                                <input type="number" min="1" value={orderQty} onChange={(e) => setOrderQty(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white" />
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 sm:space-x-2">
                            <div className="flex space-x-2 w-full sm:w-auto">
                                <button onClick={() => setOrderSide('BUY')} className={`flex-1 px-3 py-1 rounded-md text-sm ${orderSide === 'BUY' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'}`}>BUY</button>
                                <button onClick={() => setOrderSide('SELL')} className={`flex-1 px-3 py-1 rounded-md text-sm ${orderSide === 'SELL' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}>SELL</button>
                            </div>

                            <div className="flex items-center space-x-2 w-full sm:w-auto">
                                <select value={orderType} onChange={(e) => setOrderType(e.target.value)} className="flex-1 bg-gray-700 border border-gray-600 rounded-md p-2 text-white text-xs">
                                    <option value="MARKET">Market</option>
                                    <option value="LIMIT">Limit</option>
                                </select>
                                {orderType === 'LIMIT' && (
                                    <input type="number" value={limitPrice} onChange={(e) => setOrderPrice(e.target.value)} placeholder="Limit" className="flex-1 w-24 bg-gray-700 border border-gray-600 rounded-md p-2 text-white text-xs" />
                                )}
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Button onClick={placeOrder} disabled={isPlacingOrder || (mode === 'Live' && !isKiteConnected)} className="px-4 py-2 flex-1">
                                {isPlacingOrder ? 'Placing...' : `${orderSide} ${orderSymbol || ''}`}
                            </Button>
                            <Button variant="outline" onClick={() => { setOrderSymbol(''); setOrderQty(1); setOrderPrice(''); }} className="flex-1">Reset</Button>
                        </div>

                        {!isKiteConnected && mode === 'Live' && (
                            <div className="text-xs text-yellow-300">Live orders require Zerodha connection. <Button variant="outline" className="ml-2" onClick={() => setCurrentPage('auth')}>Connect</Button></div>
                        )}
                    </div>
                </Card>

                {/* Order Confirmation */}
                {orderConfirmation && (
                    <Card title="Order Confirmation" titleIcon={CheckCircleIcon} className="mt-4 border-l-4 border-green-500">
                        <div className="text-sm text-gray-200 space-y-2">
                            <div className="flex justify-between text-xs text-gray-400">
                                <span>Order ID</span>
                                <span className="font-mono text-teal-300">{orderConfirmation.orderId}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-300">{orderConfirmation.symbol}</span>
                                <span className="font-semibold">{orderConfirmation.quantity} @ {orderConfirmation.price}</span>
                            </div>
                            <div className="text-xs text-gray-400">Status: <span className="text-teal-300">{orderConfirmation.status}</span></div>
                            <div className="pt-2">
                                <Button variant="outline" onClick={() => setOrderConfirmation(null)}>Dismiss</Button>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Risk Setup Panel */}
                <Card title="Daily Risk Setup" titleIcon={ShieldIcon}>
                    <div className="space-y-3">
                        {/* Daily Capital */}
                        <div className="flex justify-between items-center">
                            <label className="text-gray-300 text-sm">Daily Capital (INR)</label>
                            <input
                                type="number"
                                value={riskParams.dailyCapital}
                                onChange={(e) => handleRiskChange('dailyCapital', parseFloat(e.target.value) || 0)}
                                className="w-1/3 bg-gray-700 border border-gray-600 rounded-md p-2 text-right text-teal-400 focus:ring-teal-500 focus:border-teal-500"
                            />
                        </div>
                        {/* Max Trades */}
                        <div className="flex justify-between items-center">
                            <label className="text-gray-300 text-sm">Max Trades / Day</label>
                            <input
                                type="number"
                                value={riskParams.maxTrades}
                                onChange={(e) => handleRiskChange('maxTrades', parseInt(e.target.value) || 1)}
                                min="1" max="5"
                                className="w-1/3 bg-gray-700 border border-gray-600 rounded-md p-2 text-right text-teal-400"
                            />
                        </div>
                        {/* Daily Loss Cap */}
                        <div className="flex justify-between items-center">
                            <label className="text-gray-300 text-sm">Daily Loss Cap (Hard Stop)</label>
                            <input
                                type="number"
                                value={riskParams.dailyLossCap}
                                onChange={(e) => handleRiskChange('dailyLossCap', parseFloat(e.target.value) || 0)}
                                className="w-1/3 bg-gray-700 border border-gray-600 rounded-md p-2 text-right text-red-400"
                            />
                        </div>
                        {/* Time Window End */}
                        <div className="flex justify-between items-center">
                            <label className="text-gray-300 text-sm">Time Exit (IST)</label>
                            <input
                                type="time"
                                value={riskParams.tradeWindowEnd}
                                onChange={(e) => handleRiskChange('tradeWindowEnd', e.target.value)}
                                className="w-1/3 bg-gray-700 border border-gray-600 rounded-md p-2 text-right text-teal-400"
                            />
                        </div>
                        {/* AI Override Toggle */}
                        <div className="flex justify-between items-center pt-2 border-t border-gray-700">
                            <label className="text-gray-300 text-sm">Allow AI Risk Override</label>
                            <input
                                type="checkbox"
                                checked={riskParams.allowAIOverride}
                                onChange={(e) => handleRiskChange('allowAIOverride', e.target.checked)}
                                className="h-5 w-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                            />
                        </div>
                    </div>
                </Card>
            </div>
        </div>

        {/* --- RUN LOG --- */}
        <Card title="Session Run Log" titleIcon={ClockIcon}>
            <div className="max-h-80 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-700">
                    <thead>
                        <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 sticky top-0 bg-gray-800/95">
                            <th className="py-2 px-3">Time</th>
                            <th className="py-2 px-3">Type</th>
                            <th className="py-2 px-3">Symbol</th>
                            <th className="py-2 px-3 text-right">Price (INR)</th>
                            <th className="py-2 px-3 text-right">Qty</th>
                            <th className="py-2 px-3 text-right">P&L (INR)</th>
                            <th className="py-2 px-3">Notes</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700 text-sm">
                        {runLog.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-700/50 text-gray-300">
                                <td className="py-2 px-3 font-mono text-xs">{log.timestamp}</td>
                                <td className="py-2 px-3 font-semibold text-teal-400">{log.type}</td>
                                <td className="py-2 px-3 text-white">{log.symbol}</td>
                                <td className="py-2 px-3 text-right">{log.price ? formatCurrency(log.price).replace('₹', '') : '---'}</td>
                                <td className="py-2 px-3 text-right">{log.qty || '---'}</td>
                                <td className={`py-2 px-3 text-right font-bold ${log.pnl > 0 ? 'text-green-500' : log.pnl < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                    {log.pnl ? formatCurrency(log.pnl) : '---'}
                                </td>
                                <td className="py-2 px-3 text-xs text-gray-400">{log.notes}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    </div>
);
};

// --- AUTH PAGE & ZERODHA SETUP ---

// UI ENHANCEMENT APPLIED HERE: Premium SaaS-Quality AuthPage
const AuthPage = () => {
    const { isAuthReady, userId, handleTokenExchange, alertUser } = useContext(AppContext);

    // State for inputs
    const [apiKey, setApiKey] = useState('');
    const [apiSecret, setApiSecret] = useState('');
    const [showSecret, setShowSecret] = useState(false);
    const [reqToken, setReqToken] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Handler: Save Keys & Connect (First Time)
    const handleSaveAndConnect = async (e) => {
        e.preventDefault();
        if (!apiKey || !apiSecret) {
            alertUser({ type: 'error', message: 'Please enter both API Key and API Secret.' });
            return;
        }

        setIsLoading(true);
        try {
            // 1. Save Keys to Backend
            const saveResp = await fetch(`${API_BASE}/user/save-kite-keys`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, apiKey, apiSecret })
            });
            const saveData = await saveResp.json();

            if (!saveData.success) {
                throw new Error(saveData.error || 'Failed to save API keys.');
            }

            // 2. Initiate Login (Fetch URL from backend)
            const loginResp = await fetch(`${API_BASE}/kite/login?userId=${userId}`);
            const loginData = await loginResp.json();

            if (loginData.success && loginData.data?.loginUrl) {
                // Open in new window/tab
                window.open(loginData.data.loginUrl, '_blank', 'noopener,noreferrer');
                alertUser({ type: 'success', message: 'Keys saved! Please login at Zerodha and copy the request_token.' });
            } else {
                throw new Error('Could not generate login URL.');
            }

        } catch (error) {
            console.error("Setup Error:", error);
            alertUser({ type: 'error', message: error.message || 'Setup failed.' });
        } finally {
            setIsLoading(false);
        }
    };

    // Handler: Connect using Request Token (Next Time)
    const handleConnectToken = async (e) => {
        e.preventDefault();
        if (!reqToken) {
            alertUser({ type: 'error', message: 'Please enter the request token.' });
            return;
        }

        setIsLoading(true);
        try {
            await handleTokenExchange(reqToken);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isAuthReady) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0b0e1b]">
                <div className="text-white flex flex-col items-center">
                    <ZapIcon className="w-12 h-12 mb-4 animate-spin text-teal-400" />
                    <p className="text-lg font-medium text-gray-300">Initializing Advantix AGI...</p>
                </div>
            </div>
        );
    }

    // Construct the Redirect URL for display
    const redirectUrlDisplay = `${window.location.origin}/api/kite/token?userId=${userId || '<your_user_id>'}`;

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0b0e1b] p-4 sm:p-6 lg:p-8 font-sans">
            <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* SECTION 1: FIRST TIME SETUP (Left Column - Larger) */}
                <div className="lg:col-span-7 flex flex-col">
                    <div className="bg-gray-800/40 backdrop-blur-xl rounded-3xl border border-gray-700/50 shadow-2xl overflow-hidden flex-1 flex flex-col transition-all hover:border-purple-500/30 group">

                        {/* Elegant Header */}
                        <div className="p-8 border-b border-gray-700/50 bg-gradient-to-r from-gray-900/80 to-gray-800/80">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-2xl border border-purple-500/20 shadow-inner">
                                    <SettingsIcon className="w-8 h-8 text-purple-400" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white tracking-tight group-hover:text-purple-300 transition-colors">First Time Setup</h2>
                                    <p className="text-sm text-gray-400 mt-1">Configure your Zerodha Kite Connect API securely.</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 flex-1 flex flex-col space-y-8">
                            {/* Step-by-Step Guide */}
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-gray-200 flex items-center">
                                    <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs mr-3 border border-purple-500/30">i</span>
                                    How to connect your Zerodha account
                                </h3>

                                <div className="space-y-4 pl-2">
                                    {/* Steps List */}
                                    <div className="grid gap-4">
                                        <div className="flex items-start">
                                            <span className="text-purple-400 font-bold mr-3 mt-0.5">01</span>
                                            <p className="text-sm text-gray-400">Log in to <a href="https://developers.kite.trade/apps" target="_blank" rel="noreferrer" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">developers.kite.trade</a> and click <strong>Create new app</strong>.</p>
                                        </div>

                                        <div className="flex items-start">
                                            <span className="text-purple-400 font-bold mr-3 mt-0.5">02</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-gray-400 mb-1">Choose the correct plan:</p>
                                                <ul className="list-disc list-inside text-xs text-gray-500 ml-1 space-y-1">
                                                    <li><strong className="text-gray-300">Personal (Free)</strong> — Recommended for single-user usage</li>
                                                    <li><strong className="text-gray-300">Connect (Paid)</strong> — Required only for multi-user production</li>
                                                </ul>
                                            </div>
                                        </div>

                                        <div className="flex items-start">
                                            <span className="text-purple-400 font-bold mr-3 mt-0.5">03</span>
                                            <p className="text-sm text-gray-400">Copy your <strong>API Key</strong> and <strong>API Secret</strong> from the app dashboard.</p>
                                        </div>

                                        <div className="flex items-start">
                                            <span className="text-purple-400 font-bold mr-3 mt-0.5">04</span>
                                            <p className="text-sm text-gray-400">Paste them below and click <strong>Save Keys & Connect Zerodha</strong>.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr className="border-gray-700/50" />

                            {/* Input Form */}
                            <form onSubmit={handleSaveAndConnect} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Zerodha API Key</label>
                                        <input
                                            type="text"
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            placeholder="e.g. 73k6zq3vc6hr..."
                                            className="w-full bg-gray-900/50 border border-gray-600 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all outline-none shadow-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Zerodha API Secret</label>
                                        <div className="relative">
                                            <input
                                                type={showSecret ? "text" : "password"}
                                                value={apiSecret}
                                                onChange={(e) => setApiSecret(e.target.value)}
                                                placeholder="e.g. h7oqtuehtv..."
                                                className="w-full bg-gray-900/50 border border-gray-600 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all outline-none shadow-sm pr-12"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowSecret(!showSecret)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 p-1"
                                            >
                                                {showSecret ? <span className="text-xs font-medium">Hide</span> : <span className="text-xs font-medium">Show</span>}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <Button
                                        type="submit"
                                        className="w-full py-4 text-sm font-bold tracking-wide shadow-lg shadow-purple-900/20 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transform hover:-translate-y-0.5 transition-all"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <span className="flex items-center justify-center">
                                                <ZapIcon className="w-5 h-5 mr-2 animate-spin" /> Saving & Connecting...
                                            </span>
                                        ) : (
                                            "Save Keys & Connect Zerodha"
                                        )}
                                    </Button>
                                    <p className="text-center text-xs text-gray-500 mt-4">
                                        Your keys are encrypted and stored securely. You only need to do this once.
                                    </p>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                {/* SECTION 3: DAILY LOGIN (Right Column - Smaller) */}
                <div className="lg:col-span-5 flex flex-col">
                    <div className="bg-gray-800/40 backdrop-blur-xl rounded-3xl border border-gray-700/50 shadow-2xl overflow-hidden flex-1 flex flex-col transition-all hover:border-teal-500/30 group h-full">

                        {/* Header */}
                        <div className="p-8 border-b border-gray-700/50 bg-gradient-to-r from-gray-900/80 to-gray-800/80 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-emerald-500"></div>
                            <div className="flex items-center space-x-4 relative z-10">
                                <div className="p-3 bg-gradient-to-br from-teal-500/20 to-emerald-500/20 rounded-2xl border border-teal-500/20 shadow-inner">
                                    <ZapIcon className="w-8 h-8 text-teal-400" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white tracking-tight group-hover:text-teal-300 transition-colors">Daily Session</h2>
                                    <p className="text-sm text-gray-400 mt-1">Reconnect instantly.</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 flex-1 flex flex-col justify-center space-y-8">
                            <div className="text-center space-y-4">
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-700 shadow-2xl mb-2">
                                    <ShieldIcon className="w-10 h-10 text-teal-500" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-white">Already Setup?</h3>
                                    <p className="text-sm text-gray-400 max-w-xs mx-auto mt-3 leading-relaxed">
                                        Paste today’s <code className="bg-gray-700/50 px-2 py-0.5 rounded text-teal-300 font-mono text-xs border border-gray-600">request_token</code> from the redirect URL below.
                                    </p>
                                </div>
                            </div>

                            <form onSubmit={handleConnectToken} className="space-y-6 mt-4">
                                <div className="space-y-2">
                                    <label className="block text-xs font-semibold text-gray-400 text-center uppercase tracking-wider">Request Token</label>
                                    <input
                                        type="text"
                                        value={reqToken}
                                        onChange={(e) => setReqToken(e.target.value)}
                                        placeholder="Paste token here..."
                                        className="w-full bg-gray-900/50 border border-gray-600 rounded-xl px-4 py-5 text-white text-center font-mono text-lg tracking-widest placeholder-gray-700 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all outline-none shadow-inner"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    className="w-full py-4 text-base font-bold tracking-wide shadow-lg shadow-teal-900/20 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 transform hover:-translate-y-0.5 transition-all"
                                    disabled={isLoading || !reqToken}
                                >
                                    {isLoading ? (
                                        <span className="flex items-center justify-center">
                                            <ZapIcon className="w-5 h-5 mr-2 animate-spin" /> Connecting...
                                        </span>
                                    ) : (
                                        "Connect Using Request Token"
                                    )}
                                </Button>
                            </form>

                            <div className="mt-auto pt-8 border-t border-gray-700/50 text-center">
                                <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-teal-900/10 border border-teal-500/20">
                                    <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse shadow-[0_0_8px_rgba(20,184,166,0.5)]"></span>
                                    <span className="text-xs font-medium text-teal-400 tracking-wide">Encrypted & Secure</span>
                                </div>
                                <p className="text-[10px] text-gray-600 mt-4 font-mono">
                                    User ID: <span className="text-gray-500">{userId}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

// --- MAIN APPLICATION STRUCTURE ---

const AdvantixApp = () => {
    const {
        currentPage, setCurrentPage, isMobileMenuOpen, setIsMobileMenuOpen,
        alert, alertUser, isAuthReady, isKiteConnected, userId,
        setRunLog, setOpenPositions
    } = useContext(AppContext);

    // Order confirmation modal state (global)
    const [orderModal, setOrderModal] = useState({ open: false, detail: null });
    const [orderModalLoading, setOrderModalLoading] = useState(false);

    // Add activeTab state
    const [activeTab, setActiveTab] = useState('trading');

    // When Kite connects and the user is on Paper page, switch to Account tab
    useEffect(() => {
        if (isKiteConnected && currentPage === 'paper') {
            setActiveTab('account');
        }
    }, [isKiteConnected, currentPage]);

    // Handle navigation
    const handleNavigate = (page) => {
        setCurrentPage(page);
        setIsMobileMenuOpen(false);
        // keep URL in sync for direct links /paper-trading
        if (page === 'paper') {
            window.history.pushState({}, '', '/paper-trading');
        } else {
            window.history.pushState({}, '', '/');
        }
    };

    // Listen for order intents from OrderForm and show confirmation modal
    useEffect(() => {
        const onIntent = (e) => {
            const detail = e?.detail || {};
            setOrderModal({ open: true, detail });
        };
        window.addEventListener('paper-order-intent', onIntent);
        return () => window.removeEventListener('paper-order-intent', onIntent);
    }, []);

    const confirmModalOrder = async () => {
        const d = orderModal.detail;
        if (!d || !d.symbol) {
            alertUser({ type: 'error', message: 'Invalid order details' });
            setOrderModal({ open: false, detail: null });
            return;
        }
        setOrderModalLoading(true);
        try {
            const result = placeMarketOrder({ symbol: d.symbol, side: d.side, amount: d.amount, qty: d.qty });
            if (result && result.success) {
                const order = result.order;
                // Update run log visible in UI
                const newEntry = {
                    id: order.id || ('o_' + Date.now()),
                    timestamp: new Date().toISOString(),
                    type: order.side === 'BUY' ? 'ENTRY' : 'EXIT',
                    symbol: order.symbol,
                    price: order.price,
                    qty: order.qty,
                    mode: 'Paper',
                    status: order.status,
                    amount: order.amount
                };
                setRunLog(prev => [newEntry, ...(prev || [])]);

                // refresh open positions from store
                const st = readState();
                const posArr = Object.entries(st.positions || {}).map(([sym, p]) => ({ symbol: sym, qty: p.qty, avgPrice: p.avgPrice }));
                setOpenPositions(posArr);

                // notify other components
                window.dispatchEvent(new Event('paper-trade-update'));
                // notify components and OrderForm specifically
                window.dispatchEvent(new CustomEvent('paper-order-confirmed', { detail: order }));
                alertUser({ type: 'success', message: `Order executed: ${order.side} ${order.qty} @ ₹${order.price}` });
                // close modal
                setOrderModal({ open: false, detail: null });
            } else {
                alertUser({ type: 'error', message: result?.reason || 'Order failed' });
            }
        } catch (err) {
            console.error('Confirm order error', err);
            alertUser({ type: 'error', message: err?.message || 'Order failed' });
        } finally {
            setOrderModalLoading(false);
        }
    };

    // Navigation items
    const navItems = [
        { name: 'Dashboard', icon: BarChart2Icon, page: 'dashboard' },
        { name: 'Global Markets', icon: TrendingUpIcon, page: 'markets' },
        { name: 'News & Analysis', icon: ZapIcon, page: 'news' },
        { name: 'Paper Trading', icon: ShieldIcon, page: 'paper' }, // <-- ADDED
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
            case 'markets':
                return <GlobalMarketsPage />;
            case 'news':
                return <NewsAnalysisPage />;
            case 'paper':
                return (
                    <div className="min-h-screen bg-[#0b0e1b] text-white p-4">
                        <div className="max-w-7xl mx-auto">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                                <div className="w-full md:w-auto">
                                    {/* Very Small Mobile: Ultra-short title */}
                                    <h1 className="block sm:hidden text-lg font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent whitespace-nowrap">
                                        Trading
                                    </h1>
                                    {/* Small Mobile/Tablet: Medium title */}
                                    <h1 className="hidden sm:block md:hidden text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent whitespace-nowrap">
                                        Paper Trading
                                    </h1>
                                    {/* Desktop: Full title */}
                                    <h1 className="hidden md:block text-2xl lg:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent whitespace-nowrap">
                                        Paper Trading Terminal
                                    </h1>
                                    <p className="text-xs sm:text-sm text-gray-400 mt-1">Practice trading with real market data</p>
                                </div>
                                <div className="flex gap-2 w-full md:w-auto">
                                    <button className="flex-1 md:flex-none px-3 sm:px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 text-xs sm:text-sm whitespace-nowrap">
                                        Export Data
                                    </button>
                                    <button className="flex-1 md:flex-none px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-lg text-xs sm:text-sm whitespace-nowrap">
                                        Reset Session
                                    </button>
                                </div>
                            </div>


                            {/* Tabs - Grid layout on mobile, flex on desktop */}
                            <div className="mb-4">
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:flex gap-1 bg-gray-800/50 p-1 rounded-lg">
                                    {['Trading', 'Watchlist', 'Portfolio', 'Orders', 'Account'].map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab.toLowerCase())}
                                            className={`px-2 sm:px-3 md:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.toLowerCase()
                                                ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow-lg'
                                                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                                                }`}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>
                            </div>


                            {/* Render active tab content */}
                            {activeTab === 'trading' && <TradingView />}
                            {activeTab === 'watchlist' && <WatchlistView />}
                            {activeTab === 'portfolio' && <PortfolioView />}
                            {activeTab === 'orders' && <OrdersView />}
                            {activeTab === 'account' && <AccountView />}
                        </div>
                    </div>
                );
            case 'settings':
                return <SettingsPage />;
            case 'auth':
                return <AuthPage />;
            default:
                return <DashboardPage />;
        }
    };

    // NOTE: duplicate handleNavigate removed here — keep only the single implementation above.
    // On mount, honor path
    useEffect(() => {
        if (window.location.pathname === '/paper-trading') {
            setCurrentPage('paper');
        }
    }, []);

    // Rich Settings Page
    const SettingsPage = () => {
        const { riskParams, setRiskParams, isKiteConnected, alertUser, handleZerodhaLogin, aiRecommendations, runLog } = useContext(AppContext);

        // Local UI state for AI preferences and picks
        const [localAiPicks, setLocalAiPicks] = useState(aiRecommendations || []);
        const [aiPrefs, setAiPrefs] = useState(() => {
            try {
                const raw = localStorage.getItem('advantix_ai_prefs');
                return raw ? JSON.parse(raw) : { enabled: true, windowStart: '09:05', windowEnd: '09:15', model: 'gemini-small' };
            } catch (e) {
                return { enabled: true, windowStart: '09:05', windowEnd: '09:15', model: 'gemini-small' };
            }
        });

        useEffect(() => {
            // Seed local picks from context on mount
            setLocalAiPicks(aiRecommendations || []);
        }, [aiRecommendations]);

        const handleRiskChangeLocal = (key, value) => {
            setRiskParams(prev => ({ ...prev, [key]: value }));
            alertUser({ type: 'success', message: 'Risk settings updated' });
        };

        const openAuthSetup = () => {
            // Open Zerodha connect flow in a new tab/window
            if (typeof handleZerodhaLogin === 'function') {
                handleZerodhaLogin();
                alertUser({ type: 'info', message: 'Opening Kite Connect in a new tab. Complete login there.' });
            } else {
                alertUser({ type: 'error', message: 'Kite Connect handler not available.' });
            }
        };

        const regeneratePicks = async () => {
            alertUser({ type: 'info', message: 'Regenerating AI picks…' });
            try {
                const resp = await fetch(`${API_BASE || ''}/api/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ timeframe: 'open' }) });
                if (!resp.ok) throw new Error('AI backend returned an error');
                const data = await resp.json();
                const picks = data.picks || data.recommendations || aiRecommendations || [];
                setLocalAiPicks(picks);
                alertUser({ type: 'success', message: `AI picks updated (${picks.length} items).` });
            } catch {
                console.warn('Regenerate AI picks failed, falling back to local picks');
                setLocalAiPicks(aiRecommendations || []);
                alertUser({ type: 'error', message: `Failed to regenerate picks.` });
            }
        };

        const exportPicks = (format = 'csv') => {
            const picks = localAiPicks && localAiPicks.length ? localAiPicks : (aiRecommendations || []);
            if (!picks.length) {
                alertUser({ type: 'info', message: 'No picks available to export.' });
                return;
            }

            if (format === 'json') {
                const blob = new Blob([JSON.stringify(picks, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `ai_picks_${new Date().toISOString()}.json`;
                a.click();
                URL.revokeObjectURL(url);
            } else {
                // CSV
                const keys = Object.keys(picks[0]);
                const csv = [keys.join(',')].concat(picks.map(row => keys.map(k => JSON.stringify(row[k] ?? '')).join(','))).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `ai_picks_${new Date().toISOString()}.csv`;
                a.click();
                URL.revokeObjectURL(url);
            }
            alertUser({ type: 'success', message: 'Picks exported.' });
        };

        const downloadRunLog = () => {
            const logs = runLog || [];
            if (!logs.length) {
                alertUser({ type: 'info', message: 'No run logs available for download.' });
                return;
            }
            const csvKeys = Object.keys(logs[0] || {});
            const csv = [csvKeys.join(',')].concat(logs.map(r => csvKeys.map(k => JSON.stringify(r[k] ?? '')).join(','))).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `run_log_${new Date().toISOString()}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            alertUser({ type: 'success', message: 'Run log downloaded.' });
        };

        const generateEodSummary = () => {
            const logs = runLog || [];
            const totalPnL = logs.reduce((s, l) => s + (l.pnl || 0), 0);
            const summary = {
                generatedAt: new Date().toISOString(),
                totalTrades: logs.filter(l => l.type === 'ENTRY').length,
                totalPnL,
            };
            const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `eod_summary_${new Date().toISOString()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            alertUser({ type: 'success', message: 'EOD summary generated.' });
        };

        const saveAiPrefs = () => {
            try {
                localStorage.setItem('advantix_ai_prefs', JSON.stringify(aiPrefs));
                alertUser({ type: 'success', message: 'AI preferences saved.' });
            } catch (err) {
                console.error('Save AI prefs error:', err);
                alertUser({ type: 'error', message: 'Failed to save AI preferences.' });
            }
        };

        return (
            <div className="p-4 sm:p-6 space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">System Settings</h1>
                        <p className="text-sm text-gray-400">Configure trading policies, risk limits, and AI preferences.</p>
                    </div>
                    <div className="text-left sm:text-right mt-4 sm:mt-0">
                        <p className="text-sm text-gray-300">Mode: <span className={`font-semibold ${isKiteConnected ? 'text-green-400' : 'text-yellow-400'}`}>{isKiteConnected ? 'Live Ready' : 'Disconnected'}</span></p>
                        <p className="text-xs text-gray-500">Version: v1.1 • Last updated: 11 Oct 2025</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                    <Card title="Account & Broker" className="lg:col-span-1">
                        <div className="space-y-3 text-sm text-gray-300">
                            <p className="font-medium text-white">Kite Connect</p>
                            <p className="text-xs">Status: <span className={`font-mono ${isKiteConnected ? 'text-green-300' : 'text-red-300'}`}>{isKiteConnected ? 'Connected' : 'Not connected'}</span></p>
                            <p className="text-xs">API keys are managed on the backend. For live trading, ensure your account has margin and permissions.</p>
                            <div className="pt-3 flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                                <Button onClick={openAuthSetup} variant="primary" className="w-full sm:w-auto">Open Auth Setup</Button>
                                <Button onClick={() => { navigator.clipboard?.writeText(window.location.href); alertUser({ type: 'info', message: 'App URL copied to clipboard' }); }} variant="outline" className="w-full sm:w-auto">Copy App URL</Button>
                            </div>
                        </div>
                    </Card>

                    <Card title="Risk & Trading Window" className="lg:col-span-1">
                        <div className="space-y-3 text-sm text-gray-300">
                            <div className="flex justify-between items-center">
                                <label className="text-xs">Daily Capital (INR)</label>
                                <input type="number" value={riskParams.dailyCapital} onChange={(e) => handleRiskChangeLocal('dailyCapital', parseFloat(e.target.value) || 0)} className="w-1/2 bg-gray-800 border border-gray-700 rounded-md p-2 text-right text-teal-300" />
                            </div>
                            <div className="flex justify-between items-center">
                                <label className="text-xs">Max Trades / Day</label>
                                <input type="number" value={riskParams.maxTrades} onChange={(e) => handleRiskChangeLocal('maxTrades', parseInt(e.target.value) || 1)} min="1" max="5" className="w-1/2 bg-gray-800 border border-gray-700 rounded-md p-2 text-right text-teal-300" />
                            </div>
                            <div className="flex justify-between items-center">
                                <label className="text-xs">Daily Loss Cap (INR)</label>
                                <input type="number" value={riskParams.dailyLossCap} onChange={(e) => handleRiskChangeLocal('dailyLossCap', parseFloat(e.target.value) || 0)} className="w-1/2 bg-gray-800 border border-gray-700 rounded-md p-2 text-right text-red-400" />
                            </div>
                            <div className="flex justify-between items-center">
                                <label className="text-xs">Trade Window End (IST)</label>
                                <input type="time" value={riskParams.tradeWindowEnd} onChange={(e) => handleRiskChangeLocal('tradeWindowEnd', e.target.value)} className="w-1/2 bg-gray-800 border border-gray-700 rounded-md p-2 text-right text-teal-300" />
                            </div>
                        </div>
                    </Card>

                    <Card title="Event Policy & EAL" className="lg:col-span-1">
                        <div className="space-y-3 text-sm text-gray-300">
                            <p className="font-medium text-white">Event Awareness Layer (EAL)</p>
                            <p className="text-xs">Choose how the system reacts to high-impact global events around the open.</p>
                            <div className="space-y-2 pt-2">
                                <label className="flex items-center space-x-2">
                                    <input type="radio" name="ealPolicy" className="h-4 w-4 text-teal-600 bg-gray-700 border-gray-600 focus:ring-teal-500" defaultChecked />
                                    <span className="text-sm">Reduce size & tighten stops on major events</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                    <input type="radio" name="ealPolicy" className="h-4 w-4 text-teal-600 bg-gray-700 border-gray-600 focus:ring-teal-500" />
                                    <span className="text-sm">Pause new entries during blackout window</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                    <input type="radio" name="ealPolicy" className="h-4 w-4 text-teal-600 bg-gray-700 border-gray-600 focus:ring-teal-500" />
                                    <span className="text-sm">Allow entries with stricter rules</span>
                                </label>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    <Card title="AI Preferences & Signals" className="lg:col-span-1">
                        <div className="space-y-3 text-sm text-gray-300">
                            <div className="flex items-start justify-between flex-col sm:flex-row">
                                <div className="mb-2 sm:mb-0">
                                    <p className="font-medium text-white">AI Recommendation Window</p>
                                    <p className="text-xs">When enabled, AI suggestions are generated during the selected window and shown on Dashboard.</p>
                                </div>
                                <div className="text-left sm:text-right">
                                    <label className="text-xs text-gray-400">Enabled</label>
                                    <div className="mt-1">
                                        <input type="checkbox" checked={aiPrefs.enabled} onChange={(e) => setAiPrefs(prev => ({ ...prev, enabled: e.target.checked }))} className="h-5 w-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                                <input type="time" value={aiPrefs.windowStart} onChange={(e) => setAiPrefs(prev => ({ ...prev, windowStart: e.target.value }))} className="w-full sm:w-auto bg-gray-800 border border-gray-700 rounded-md p-2 text-teal-300" />
                                <span className="text-xs text-gray-400">to</span>
                                <input type="time" value={aiPrefs.windowEnd} onChange={(e) => setAiPrefs(prev => ({ ...prev, windowEnd: e.target.value }))} className="w-full sm:w-auto bg-gray-800 border border-gray-700 rounded-md p-2 text-teal-300" />
                                <select value={aiPrefs.model} onChange={(e) => setAiPrefs(prev => ({ ...prev, model: e.target.value }))} className="w-full sm:w-auto sm:ml-2 bg-gray-800 border border-gray-700 rounded-md p-2 text-teal-300">
                                    <option value="gemini-small">Advantix AGI (fast)</option>
                                    <option value="gemini-medium">Advantix AGI (balanced)</option>
                                </select>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-2">
                                <Button variant="secondary" onClick={regeneratePicks}>Regenerate Picks</Button>
                                <Button variant="outline" onClick={() => exportPicks('csv')}>Export Picks (CSV)</Button>
                                <Button variant="outline" onClick={() => exportPicks('json')}>Export Picks (JSON)</Button>
                                <Button variant="primary" className="ml-auto" onClick={saveAiPrefs}>Save Preferences</Button>
                            </div>

                            {/* Quick preview */}
                            {localAiPicks && localAiPicks.length > 0 && (
                                <div className="mt-3 bg-gray-800 border border-gray-700 rounded-md p-3">
                                    <p className="text-xs text-gray-400 mb-2">Preview (first 5 picks)</p>
                                    <ul className="space-y-1 text-sm text-gray-200">
                                        {localAiPicks.slice(0, 5).map((p, idx) => (
                                            <li key={idx} className="flex justify-between">
                                                <span className="font-medium">{p.symbol || p.ticker || p.name}</span>
                                                <span className="text-xs text-gray-400">{p.confidence || p.allocation || ''}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card title="Audit & Export" className="lg:col-span-1">
                        <div className="space-y-3 text-sm text-gray-300">
                            <p className="font-medium text-white">Run Logs & Exports</p>
                            <p className="text-xs">Download the session logs and EOD summary for compliance and review.</p>
                            <div className="pt-2 flex flex-wrap gap-2">
                                <Button variant="outline" onClick={downloadRunLog}>Download Run Log</Button>
                                <Button variant="secondary" onClick={generateEodSummary}>Generate EOD Summary</Button>
                                <Button variant="outline" onClick={() => alertUser({ type: 'info', message: 'Audit viewer coming soon' })}>Open Audit Viewer</Button>
                            </div>
                            <div className="text-xs text-gray-400 pt-2">Tip: Exported logs include timestamps, P&L, and notes. Use for compliance and journaling.</div>
                        </div>
                    </Card>
                </div>
            </div>
        );
    };

    const LoadingScreen = () => (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <div className="text-white flex items-center">
                <ZapIcon className="w-8 h-8 mr-3 animate-spin text-teal-400" />
                <p>Loading user session...</p>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-gray-900 text-white font-sans">
            {/* Sidebar for Desktop */}
            <nav className={`hidden lg:flex flex-col w-64 bg-gray-800 border-r border-gray-700 shadow-xl`}>
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
                            className={`flex items-center w-full px-4 py-3 rounded-xl transition-all duration-200 ${currentPage === item.page
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
                    <div className="absolute inset-0 bg-black opacity-75"></div>
                    <nav className="relative flex flex-col w-64 h-full bg-gray-800 shadow-xl" onClick={(e) => e.stopPropagation()}>
                        {/* Mobile Sidebar Header */}
                        <div className="p-4 border-b border-gray-700">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-teal-400 tracking-wider">
                                    ADVANTIX AGI
                                </span>
                                <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-400 hover:text-white">
                                    <XCircleIcon className="w-6 h-6" />
                                </button>
                            </div>
                            <p className="text-xs text-gray-400">Advantix AGI | v1.1</p>
                        </div>

                        {/* Navigation Items */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {navItems.map((item) => (
                                <button
                                    key={item.page}
                                    onClick={() => {
                                        setCurrentPage(item.page);
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className={`flex items-center w-full px-4 py-3 rounded-lg transition-all duration-200 ${currentPage === item.page
                                        ? 'bg-teal-600/30 text-teal-400 font-semibold border border-teal-500'
                                        : 'text-gray-300 hover:bg-gray-700'
                                        }`}
                                >
                                    <item.icon className="w-5 h-5 mr-3" />
                                    {item.name}
                                </button>
                            ))}
                        </div>

                        {/* Mobile Sidebar Footer */}
                        <div className="p-4 border-t border-gray-700 text-xs text-gray-500">
                            <p>User ID: <span className="font-mono text-teal-400">{userId || 'N/A'}</span></p>
                            <p>App ID: <span className="font-mono text-teal-400">{appId}</span></p>
                        </div>
                    </nav>
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex flex-col flex-1 overflow-hidden">
                {/* Header */}
                <header className="flex items-center justify-between p-3 sm:p-4 bg-gray-800 border-b border-gray-700 shadow-md lg:hidden">
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="text-gray-500 dark:text-gray-400 focus:outline-none p-2 rounded-md flex-shrink-0"
                    >
                        <MenuIcon className="w-6 h-6" />
                    </button>
                    {/* Mobile: Shorter title for very small screens */}
                    <span className="block sm:hidden text-base font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-teal-500 tracking-wider">
                        ADVANTIX
                    </span>
                    {/* Tablet: Full title */}
                    <span className="hidden sm:block text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-teal-500 tracking-wider">
                        ADVANTIX AGI
                    </span>
                    {/* Kite Status Button is shown on tablets and up for mobile view, but not on xs screen */}
                    <div className="hidden sm:block flex-shrink-0">
                        <KiteStatusButton />
                    </div>
                    {/* Placeholder for alignment on very small screens */}
                    <div className="w-10 sm:hidden flex-shrink-0"></div>
                </header>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto custom-scrollbar">
                    {renderPage()}
                </main>

                {/* Order Confirmation Modal */}
                {orderModal.open && (
                    <div className="fixed inset-0 z-60 flex items-center justify-center">
                        <div className="absolute inset-0 bg-black/60" onClick={() => setOrderModal({ open: false, detail: null })} />
                        <div className="relative bg-slate-900 rounded-xl border border-slate-700/40 shadow-2xl p-6 w-full max-w-md z-70">
                            <h3 className="text-lg font-semibold text-white mb-2">Confirm Order</h3>
                            <div className="text-sm text-slate-300 mb-4">
                                <div><strong>Symbol:</strong> {orderModal.detail?.symbol || '—'}</div>
                                <div><strong>Side:</strong> {orderModal.detail?.side || '—'}</div>
                                <div><strong>Qty:</strong> {orderModal.detail?.qty || 0}</div>
                                <div><strong>Amount:</strong> ₹{(orderModal.detail?.amount || 0).toFixed(2)}</div>
                                <div><strong>Price:</strong> ₹{(orderModal.detail?.livePrice || 0).toFixed(2)}</div>
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button onClick={() => setOrderModal({ open: false, detail: null })} className="px-3 py-2 bg-slate-700 rounded-md text-sm">Cancel</button>
                                <button onClick={confirmModalOrder} disabled={orderModalLoading} className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 rounded-md text-sm font-semibold text-white">
                                    {orderModalLoading ? 'Placing...' : 'Confirm'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Global Alert */}
                {alert && (
                    <div
                        className={`fixed bottom-4 right-4 z-50 p-4 rounded-xl shadow-2xl transition-all duration-300 transform ${alert.type === 'success' ? 'bg-green-600' : alert.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
                            }`}
                    >
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

const KiteStatusButton = () => {
    const { isKiteConnected, setCurrentPage } = useContext(AppContext);
    return (
        <Button
            variant={isKiteConnected ? 'secondary' : 'danger'}
            className={`px-3 py-1 text-sm ${isKiteConnected ? 'text-green-400 bg-green-900/40 border-green-700' : 'text-red-400 bg-red-900/40 border-red-700'}`}
            onClick={() => setCurrentPage('auth')}
            icon={isKiteConnected ? CheckCircleIcon : XCircleIcon}
        >
            Kite {isKiteConnected ? 'Active' : 'Setup'}
        </Button>
    );
};



export default AppWrapper;