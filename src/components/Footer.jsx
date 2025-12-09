import React from 'react';

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="mt-12 pt-6 border-t border-slate-700/50 bg-slate-900/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    {/* Left side - Copyright */}
                    <div className="text-sm text-slate-400">
                        © {currentYear} <span className="font-semibold text-cyan-400">Pulse915</span>. All rights reserved.
                    </div>

                    {/* Center - Version */}
                    <div className="text-xs text-slate-500 bg-slate-800/50 px-3 py-1 rounded-full">
                        v1.0.0
                    </div>

                    {/* Right side - Links */}
                    <div className="flex items-center gap-4 text-sm">
                        <a
                            href="#"
                            className="text-slate-400 hover:text-cyan-400 transition-colors duration-200"
                        >
                            Privacy
                        </a>
                        <span className="text-slate-600">•</span>
                        <a
                            href="#"
                            className="text-slate-400 hover:text-cyan-400 transition-colors duration-200"
                        >
                            Terms
                        </a>
                        <span className="text-slate-600">•</span>
                        <a
                            href="#"
                            className="text-slate-400 hover:text-cyan-400 transition-colors duration-200"
                        >
                            Support
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
