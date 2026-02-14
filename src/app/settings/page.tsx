"use client";

import { useState } from "react";

interface ConnectionResult {
  ok: boolean;
  version?: string;
  company?: string;
  error?: string;
}

export default function SettingsPage() {
  const [result, setResult] = useState<ConnectionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const testConnection = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/flexi/connection");
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ ok: false, error: "Nepodařilo se připojit k API" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Nastavení</h1>
        <p className="mt-2 text-gray-500">
          Konfigurace a test připojení k ABRA Flexi serveru.
        </p>
      </div>

      {/* Connection test */}
      <div className="max-w-lg">
        <div className="border border-gray-200 rounded-xl p-6 bg-white">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Test připojení
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Ověřte, že aplikace se může připojit k vašemu Flexi serveru.
            Přístupové údaje jsou konfigurované v souboru{" "}
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">
              .env.local
            </code>
          </p>

          <button
            onClick={testConnection}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {isLoading ? "Testování..." : "Otestovat připojení"}
          </button>

          {result && (
            <div
              className={`mt-4 p-4 rounded-lg ${
                result.ok
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              {result.ok ? (
                <div>
                  <p className="font-medium text-green-800">
                    Připojení úspěšné
                  </p>
                  <div className="mt-2 text-sm text-green-700 space-y-1">
                    {result.version && <p>Verze: {result.version}</p>}
                    {result.company && <p>Firma: {result.company}</p>}
                  </div>
                </div>
              ) : (
                <div>
                  <p className="font-medium text-red-800">
                    Připojení se nezdařilo
                  </p>
                  {result.error && (
                    <p className="mt-1 text-sm text-red-700">{result.error}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Configuration info */}
        <div className="border border-gray-200 rounded-xl p-6 bg-white mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Konfigurace
          </h2>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-500">Konfigurační soubor:</span>
              <code className="ml-2 bg-gray-100 px-2 py-0.5 rounded font-mono">
                .env.local
              </code>
            </div>
            <div>
              <span className="text-gray-500">Požadované proměnné:</span>
              <ul className="mt-1 ml-4 space-y-1 text-gray-700">
                <li>
                  <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-xs">
                    FLEXI_BASE_URL
                  </code>{" "}
                  — URL serveru (https://server:port)
                </li>
                <li>
                  <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-xs">
                    FLEXI_COMPANY
                  </code>{" "}
                  — Identifikátor firmy
                </li>
                <li>
                  <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-xs">
                    FLEXI_USERNAME
                  </code>{" "}
                  — Uživatelské jméno
                </li>
                <li>
                  <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-xs">
                    FLEXI_PASSWORD
                  </code>{" "}
                  — Heslo (nikdy se nezobrazuje)
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
