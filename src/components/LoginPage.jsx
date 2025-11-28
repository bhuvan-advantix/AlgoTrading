import React from 'react';
import { SignIn } from '@clerk/clerk-react';

const LoginPage = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-full max-w-md">
            <SignIn afterSignInUrl="/" signUpUrl="/sign-up" />
        </div>
    </div>
);

export default LoginPage;