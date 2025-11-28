import React from 'react';
import { SignUp } from '@clerk/clerk-react';

export default function ClerkSignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md">
        <SignUp routing="path" signInUrl="/sign-in" />
      </div>
    </div>
  );
}