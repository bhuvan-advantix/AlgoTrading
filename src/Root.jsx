import React from 'react';
import { ClerkProvider } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingScreen from './components/LoadingScreen';
import App from './App';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!PUBLISHABLE_KEY) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in environment. Please add it to .env.local');
}

export default function Root() {
  const navigate = useNavigate();

  return (
    <ErrorBoundary>
      <ClerkProvider 
        publishableKey={PUBLISHABLE_KEY}
        navigate={(to) => navigate(to)}
        routing="path"
        afterSignInUrl="/dashboard"
        afterSignUpUrl="/dashboard"
        afterSignOutUrl="/sign-in"
        loadingFallback={<LoadingScreen />}
      >
        <App />
      </ClerkProvider>
    </ErrorBoundary>
  );
}