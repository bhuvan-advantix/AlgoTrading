import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, SignIn, SignUp } from '@clerk/clerk-react';
import AppWrapper from './App';
import { motion } from 'framer-motion';
import { ZapIcon, TrendingUpIcon, ShieldIcon, BarChart2Icon } from './icons/index.jsx';

// --- Components for the Login Page ---

const TradingChartBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
    {/* Grid Lines */}
    <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(56, 189, 248, 0.1)" strokeWidth="1" />
        </pattern>
        <linearGradient id="neonGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>

    {/* Animated Chart Line */}
    <svg className="absolute bottom-0 left-0 w-full h-3/4" viewBox="0 0 1000 400" preserveAspectRatio="none">
      <motion.path
        d="M0,350 Q100,300 200,320 T400,250 T600,200 T800,100 T1000,50 V400 H0 Z"
        fill="url(#chartFill)"
        initial={{ d: "M0,400 Q100,400 200,400 T400,400 T600,400 T800,400 T1000,400 V400 H0 Z" }}
        animate={{ d: "M0,350 Q100,300 200,320 T400,250 T600,200 T800,100 T1000,50 V400 H0 Z" }}
        transition={{ duration: 2, ease: "easeOut" }}
      />
      <defs>
        <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d="M0,350 Q100,300 200,320 T400,250 T600,200 T800,100 T1000,50"
        fill="none"
        stroke="url(#neonGradient)"
        strokeWidth="4"
        filter="url(#glow)"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2.5, ease: "easeInOut" }}
      />
    </svg>
  </div>
);

const AuthLayout = ({ title, subtitle, children }) => {
  return (
    <div className="min-h-screen flex bg-[#0B1120] text-white overflow-hidden font-sans selection:bg-blue-500/30">

      {/* Left Side - Visuals (Hidden on mobile, visible on lg screens) */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-16 overflow-hidden border-r border-white/5 bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0f172a]">

        <TradingChartBackground />

        {/* Ambient Glows */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px] mix-blend-screen" />
        </div>

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/30 ring-1 ring-white/20">
              <ZapIcon className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">Advantix AGI</span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8 max-w-xl"
          >
            <h1 className="text-6xl font-extrabold leading-tight tracking-tight text-white drop-shadow-lg">
              Trade with <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 animate-gradient-x">
                Superhuman Edge
              </span>
            </h1>
            <p className="text-xl text-blue-100/80 leading-relaxed font-light">
              Harness the power of institutional AI.
              <span className="text-white font-medium"> Real-time signals</span>,
              <span className="text-white font-medium"> automated risk management</span>, and
              <span className="text-white font-medium"> lightning-fast execution</span>.
            </p>
          </motion.div>
        </div>

        {/* Feature Cards - Vibrant & Glassy */}
        <div className="relative z-10 grid grid-cols-2 gap-5 mt-auto">
          {[
            { icon: TrendingUpIcon, title: "AI Predictive Signals", desc: "94% Accuracy Models" },
            { icon: ShieldIcon, title: "Automated Risk Guard", desc: "Zero-latency protection" },
            { icon: BarChart2Icon, title: "Live Market Analytics", desc: "Global data coverage" },
            { icon: ZapIcon, title: "Ultra-Low Latency", desc: "Direct market access" }
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + (idx * 0.1) }}
              className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-400/50 hover:bg-white/10 transition-all group backdrop-blur-md shadow-xl"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                  <item.icon className="w-5 h-5 text-blue-400 group-hover:text-blue-300" />
                </div>
                <h3 className="font-semibold text-blue-50 group-hover:text-white transition-colors">{item.title}</h3>
              </div>
              <p className="text-sm text-blue-200/60 pl-[3.25rem]">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 relative bg-[#0B1120]">
        {/* Mobile Background */}
        <div className="absolute inset-0 lg:hidden z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-[#0B1120]" />
          <TradingChartBackground />
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-10">
            <div className="flex items-center gap-2">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/30">
                <ZapIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Advantix AGI</span>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-slate-900/40 border border-white/10 rounded-3xl shadow-2xl shadow-blue-900/20 overflow-hidden backdrop-blur-xl"
          >
            <div className="p-10">
              <h2 className="text-3xl font-bold text-white mb-2">{title}</h2>
              <p className="text-blue-200/60 text-sm mb-8">{subtitle}</p>
              {children}
            </div>
          </motion.div>

          <div className="mt-8 text-center text-xs text-slate-500 font-medium">
            Secured by <span className="text-slate-400">Clerk</span> • Bank-Grade Security
          </div>
        </div>
      </div>
    </div>
  );
};

const ClerkLoginPage = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const redirectTo = searchParams.get('redirect_url') || '/';

  useEffect(() => {
    const replaceOrgName = () => {
      try {
        const nodes = Array.from(document.querySelectorAll('h1, h2, h3, p, span'));
        nodes.forEach((n) => {
          if (n && typeof n.textContent === 'string' && /uber[_\s]?clone/i.test(n.textContent)) {
            n.textContent = n.textContent.replace(/uber[_\s]?clone/gi, 'Advantix AGI');
          }
        });
      } catch { /* ignore */ }
    };
    replaceOrgName();
    const t = setTimeout(replaceOrgName, 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Enter your credentials to access the terminal"
    >
      <div className="mx-auto max-w-md clerk-theme">
        <SignIn
          appearance={{
            layout: {
              socialButtonsPlacement: "bottom",
              showOptionalFields: false
            },
            elements: {
              rootBox: "w-full",
              card: "bg-transparent shadow-none w-full p-0",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
              socialButtonsBlockButton: "bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all h-12 rounded-xl",
              socialButtonsBlockButtonText: "font-medium",
              dividerLine: "bg-white/10",
              dividerText: "text-slate-500 text-xs uppercase tracking-wider bg-transparent",
              formFieldLabel: "text-blue-200/80 text-sm font-medium mb-2",
              formFieldInput: "bg-black/20 border border-white/10 text-white rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all h-12 placeholder-white/20",
              formButtonPrimary: "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white font-bold h-12 rounded-xl shadow-lg shadow-blue-500/25 border-none transition-all transform active:scale-[0.99]",
              footerActionLink: "text-blue-400 hover:text-blue-300 font-medium",
              identityPreviewText: "text-slate-300",
              formFieldAction: "text-blue-400 hover:text-blue-300",
              formFieldInputShowPasswordButton: "text-slate-400 hover:text-white"
            }
          }}
          routing="virtual"
          signUpUrl={`/sign-up?redirect_url=${encodeURIComponent(redirectTo)}`}
          afterSignInUrl={redirectTo}
          redirectUrl={redirectTo}
        />
      </div>
    </AuthLayout>
  );
};

const ClerkSignUpPage = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const redirectTo = searchParams.get('redirect_url') || '/';

  useEffect(() => {
    try {
      const nodes = Array.from(document.querySelectorAll('h1, h2, h3, p, span'));
      nodes.forEach((n) => {
        if (n && typeof n.textContent === 'string' && /uber[_\s]?clone/i.test(n.textContent)) {
          n.textContent = n.textContent.replace(/uber[_\s]?clone/gi, 'Advantix AGI');
        }
      });
    } catch { /* ignore */ }
  }, []);

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Start your journey with professional tools"
    >
      <div className="mx-auto max-w-md clerk-theme">
        <SignUp
          appearance={{
            layout: {
              socialButtonsPlacement: "bottom",
              showOptionalFields: false
            },
            elements: {
              rootBox: "w-full",
              card: "bg-transparent shadow-none w-full p-0",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
              socialButtonsBlockButton: "bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all h-12 rounded-xl",
              socialButtonsBlockButtonText: "font-medium",
              dividerLine: "bg-white/10",
              dividerText: "text-slate-500 text-xs uppercase tracking-wider bg-transparent",
              formFieldLabel: "text-blue-200/80 text-sm font-medium mb-2",
              formFieldInput: "bg-black/20 border border-white/10 text-white rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all h-12 placeholder-white/20",
              formButtonPrimary: "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white font-bold h-12 rounded-xl shadow-lg shadow-blue-500/25 border-none transition-all transform active:scale-[0.99]",
              footerActionLink: "text-blue-400 hover:text-blue-300 font-medium",
              identityPreviewText: "text-slate-300",
              formFieldAction: "text-blue-400 hover:text-blue-300",
              formFieldInputShowPasswordButton: "text-slate-400 hover:text-white"
            }
          }}
          routing="virtual"
          signInUrl={`/sign-in?redirect_url=${encodeURIComponent(redirectTo)}`}
          afterSignUpUrl={redirectTo}
          redirectUrl={redirectTo}
        />
      </div>
    </AuthLayout>
  );
};

const ClerkApp = () => {
  return (
    <>
      <SignedIn>
        <Routes>
          <Route path="/*" element={<AppWrapper />} />
        </Routes>
      </SignedIn>

      <SignedOut>
        <Routes>
          <Route path="/sign-up" element={<ClerkSignUpPage />} />
          <Route path="/sign-in" element={<ClerkLoginPage />} />
          <Route path="/*" element={<Navigate to="/sign-in" replace />} />
        </Routes>
      </SignedOut>
    </>
  );
};

export default ClerkApp;
