import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import './index.css';
import ClerkApp from './ClerkApp';

// Load environment variable
const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!publishableKey) {
  throw new Error('❌ Missing Clerk publishable key in .env');
}

// Mount React App
const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ClerkProvider
        publishableKey={publishableKey}
        appearance={{
          layout: {
            logoPlacement: 'none',
            socialButtonsPlacement: 'bottom',
            socialButtonsVariant: 'blockButton',
            showOptionalFields: false,
          },
          variables: {
            // Brand color palette (deep navy + blue/indigo accent)
            colorPrimary: '#3b82f6', // blue-500
            colorTextPrimary: '#e2e8f0', // slate-200
            colorTextSecondary: '#94a3b8', // slate-400
            colorBackground: '#060b1b',
            colorInputBackground: '#0f172a',
            colorInputText: '#e2e8f0',
            colorSuccess: '#10b981',
            colorDanger: '#ef4444',
            colorWarning: '#f59e0b',
            borderRadius: '0.8rem',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontFamilyButtons: 'Inter, system-ui, sans-serif',
          },
          elements: {
            // Card styling (Glassmorphism + glow)
            card: `
              bg-gradient-to-br from-[#0b1220]/80 to-[#0e1b3a]/70 
              border border-white/10 
              backdrop-blur-xl 
              p-6 sm:p-8 
              rounded-2xl 
              shadow-[0_0_25px_-5px_rgba(37,99,235,0.25)]
              transition-all duration-300
            `,
            headerSubtitle: 'text-slate-400',
            button: 'transition-all duration-200 hover:opacity-90',
            socialButtonsProviderIcon: 'w-5 h-5',
            formButtonPrimary: `
              bg-gradient-to-r from-blue-500 to-indigo-600 
              hover:from-blue-600 hover:to-indigo-700 
              text-white font-medium 
              py-2 rounded-lg shadow-md 
              transition-all duration-300
            `,
            formButtonReset: 'text-gray-400 hover:text-white hover:bg-gray-800/40 rounded-md',
            formFieldLabel: 'text-slate-300 text-sm mb-1',
            formFieldInput: `
              bg-white/5 border border-white/10 text-white 
              focus:ring-2 focus:ring-blue-600 focus:border-blue-600
              rounded-lg placeholder-gray-500
              transition-all duration-300
            `,
            dividerLine: 'bg-gray-700/60',
            dividerText: 'text-gray-500 uppercase text-xs tracking-wide',
            footer: 'text-gray-500 mt-4 text-xs',
            anchorButton: 'text-blue-400 hover:text-blue-300 font-medium transition-all',
          },
        }}
      >
        <ClerkApp />
      </ClerkProvider>
    </BrowserRouter>
  </React.StrictMode>
);
