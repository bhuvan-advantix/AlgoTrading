import React from 'react';
import { SignIn } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { ZapIcon, TrendingUpIcon, ShieldIcon, BarChart2Icon } from '../icons/index.jsx';

export default function ClerkAuthPage() {
  return (
    <div className="min-h-screen flex bg-[#0f172a] text-white overflow-hidden font-sans selection:bg-cyan-500/30">

      {/* Left Side - Visuals (Hidden on mobile, visible on lg screens) */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden border-r border-slate-800/50">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-[#0f172a] to-[#0f172a] z-0" />
        <div className="absolute inset-0 opacity-10 z-0"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '32px 32px' }}>
        </div>

        {/* Animated Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[100px]" />

        {/* Content */}
        <div className="relative z-10 mt-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg shadow-lg shadow-cyan-500/25">
              <ZapIcon className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">Advantix AGI</span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6 max-w-lg"
          >
            <h1 className="text-5xl font-extrabold leading-tight tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
              Master the Markets with AI Precision
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed font-light">
              Join the elite traders using institutional-grade algorithms.
              Automate your strategies, backtest with precision, and execute with confidence.
            </p>
          </motion.div>
        </div>

        {/* Feature Cards */}
        <div className="relative z-10 grid grid-cols-2 gap-4 mt-12 mb-10">
          {[
            { icon: TrendingUpIcon, title: "AI Signals", desc: "Real-time predictive analysis" },
            { icon: ShieldIcon, title: "Risk Guard", desc: "Automated position sizing" },
            { icon: BarChart2Icon, title: "Deep Analytics", desc: "Institutional grade metrics" },
            { icon: ZapIcon, title: "Fast Execution", desc: "Low latency order routing" }
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + (idx * 0.1) }}
              className="p-4 rounded-xl bg-slate-800/20 border border-slate-700/30 backdrop-blur-sm hover:bg-slate-800/40 transition-colors group"
            >
              <item.icon className="w-6 h-6 text-cyan-500 mb-2 group-hover:text-cyan-400 transition-colors" />
              <h3 className="font-semibold text-slate-200">{item.title}</h3>
              <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        <div className="relative z-10 text-xs text-slate-600 font-medium">
          © 2025 Advantix AGI. All rights reserved.
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative bg-[#0f172a]">
        {/* Mobile Background (visible only on small screens) */}
        <div className="absolute inset-0 lg:hidden bg-[#0f172a] z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 to-[#0f172a]" />
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '24px 24px' }}>
          </div>
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg shadow-lg shadow-cyan-500/20">
                <ZapIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Advantix AGI</span>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-slate-900/40 border border-slate-800 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden backdrop-blur-xl"
          >
            <div className="p-1">
              <SignIn
                routing="path"
                signUpUrl="/sign-up"
                appearance={{
                  layout: {
                    socialButtonsPlacement: "bottom",
                    showOptionalFields: false
                  },
                  elements: {
                    rootBox: "w-full",
                    card: "bg-transparent shadow-none w-full p-8",
                    headerTitle: "text-2xl font-bold text-white mb-2",
                    headerSubtitle: "text-slate-400 text-sm mb-6",
                    socialButtonsBlockButton: "bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 transition-all h-10",
                    socialButtonsBlockButtonText: "font-medium",
                    dividerLine: "bg-slate-700",
                    dividerText: "text-slate-500 text-xs uppercase tracking-wider bg-transparent",
                    formFieldLabel: "text-slate-300 text-sm font-medium mb-1.5",
                    formFieldInput: "bg-slate-950/50 border border-slate-700 text-white rounded-lg focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all h-10",
                    formButtonPrimary: "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold h-10 rounded-lg shadow-lg shadow-cyan-500/20 border-none transition-all transform active:scale-[0.98]",
                    footerActionLink: "text-cyan-400 hover:text-cyan-300 font-medium",
                    identityPreviewText: "text-slate-300",
                    formFieldAction: "text-cyan-400 hover:text-cyan-300"
                  }
                }}
              />
            </div>
          </motion.div>

          <div className="mt-8 text-center lg:hidden text-xs text-slate-500 font-medium">
            Institutional Grade Trading Intelligence
          </div>
        </div>
      </div>
    </div>
  );
}
