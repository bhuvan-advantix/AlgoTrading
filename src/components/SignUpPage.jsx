import React from 'react';
import { SignUp } from '@clerk/clerk-react';

const SignUpPage = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-full max-w-md">
            <SignUp afterSignUpUrl="/" signInUrl="/sign-in" />
        </div>
    </div>
);

export default SignUpPage;