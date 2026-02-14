import { LoginForm } from "@/components/auth/LoginForm";
import { Suspense } from "react";

export const metadata = {
  title: "Přihlášení | Flexi Operations",
  description: "Přihlaste se k pokračování",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100">
      <div className="w-full max-w-md px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Flexi Operations
          </h1>
          <p className="text-gray-600">Přihlaste se k pokračování</p>
        </div>

        {/* Login Form */}
        <Suspense fallback={
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          </div>
        }>
          <LoginForm />
        </Suspense>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-8">
          Pro přístup k účetnímu systému ABRA Flexi
        </p>
      </div>
    </div>
  );
}
