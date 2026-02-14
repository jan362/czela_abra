import Link from "next/link";

export const metadata = {
  title: "Chyba přihlášení | Flexi Operations",
  description: "Došlo k chybě při přihlašování",
};

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-gray-100">
      <div className="w-full max-w-md px-6">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Error icon */}
          <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Chyba přihlášení
          </h1>

          {/* Message */}
          <p className="text-gray-600 text-center mb-6">
            Došlo k chybě při ověřování vašich přihlašovacích údajů.
            Zkuste to prosím znovu.
          </p>

          {/* Actions */}
          <div className="space-y-3">
            <Link
              href="/auth/login"
              className="block w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-center"
            >
              Zpět na přihlášení
            </Link>
          </div>
        </div>

        {/* Help text */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Pokud problém přetrvává, kontaktujte správce systému.
        </p>
      </div>
    </div>
  );
}
