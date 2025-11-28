# Changes needed for App.jsx:

1. Remove BrowserRouter from App.jsx (should be in main.jsx)
2. Update imports to include useNavigate and useUser
3. Fix component structure

Key changes:
```jsx
// --- At the top of the file ---
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { SignedIn, SignedOut, SignIn, SignUp, useUser } from '@clerk/clerk-react';

// --- Add auth pages ---
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

// --- Update AppLayout to use useUser and useNavigate ---
const AppLayout = () => {
    const { isLoaded, isSignedIn, user } = useUser();
    const navigate = useNavigate();
    // ... rest of the component
};

// --- Update root component ---
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

export { AppContext, useAdvantixState };
export default App;
```

main.jsx should look like:
```jsx
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!publishableKey) {
    throw new Error('Missing Clerk publishable key');
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ClerkProvider publishableKey={publishableKey}>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </ClerkProvider>
    </React.StrictMode>
);