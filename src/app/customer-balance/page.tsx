"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CustomerBalance {
  firma: string;
  nazFirmy: string;
  pohledavky: number;
  zavazky: number;
  saldoCelkem: number;
  unpaidInvoices: number;
  overdueInvoices: number;
}

interface BalanceResponse {
  success: boolean;
  balances: CustomerBalance[];
  count: number;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    minimumFractionDigits: 2,
  }).format(amount);
}

function getSaldoColor(saldo: number): string {
  if (saldo > 0.01) return "text-red-600"; // Pohledávky (kladné = nám dluží)
  if (saldo < -0.01) return "text-green-600"; // Závazky (záporné = dlužíme my)
  return "text-gray-600";
}

function getSaldoBgColor(saldo: number, hasUnpaid: boolean): string {
  if (hasUnpaid && saldo > 0.01) return "bg-red-50"; // Nezaplacené pohledávky - zvýraznit
  if (saldo > 0.01) return "bg-white";
  if (saldo < -0.01) return "bg-green-50";
  return "bg-gray-50";
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CustomerBalancePage() {
  const [balances, setBalances] = useState<CustomerBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stránkování
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 100;

  // Filtry - DEFAULT: pohledávky (kladné saldo)
  const [filterType, setFilterType] = useState<"all" | "receivables" | "payables">("receivables");
  const [showOnlyUnpaid, setShowOnlyUnpaid] = useState(false);
  const [exportInProgress, setExportInProgress] = useState(false);

  // Filtr podle roku - default aktuální rok
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Filtr podle minimální hodnoty salda - default 701 Kč
  const [minSaldo, setMinSaldo] = useState<number>(701);

  const loadBalances = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        filterType,
        year: selectedYear.toString(),
        minSaldo: minSaldo.toString(),
      });

      const res = await fetch(`/api/flexi/customer-balance?${params}`);
      if (!res.ok) {
        const errBody = await res.json();
        throw new Error(errBody.error || `HTTP ${res.status}`);
      }
      const data: BalanceResponse = await res.json();
      setBalances(data.balances || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Chyba při načítání sald"
      );
    } finally {
      setLoading(false);
    }
  }, [page, filterType, selectedYear, minSaldo]);

  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  // Reset stránky při změně filtru, roku nebo minimálního salda
  useEffect(() => {
    setPage(1);
  }, [filterType, selectedYear, minSaldo]);

  // Lokální filtr pro nezaplacené (neovlivňuje API)
  const filteredBalances = showOnlyUnpaid
    ? balances.filter((b) => b.unpaidInvoices > 0)
    : balances;

  // Statistiky ze VŠECH sald (ne jen aktuální stránky)
  const totalReceivables = balances
    .filter((b) => b.saldoCelkem > 0)
    .reduce((sum, b) => sum + b.saldoCelkem, 0);

  const totalPayables = balances
    .filter((b) => b.saldoCelkem < 0)
    .reduce((sum, b) => sum + Math.abs(b.saldoCelkem), 0);

  const totalUnpaid = balances.reduce((sum, b) => sum + b.unpaidInvoices, 0);
  const totalOverdue = balances.reduce((sum, b) => sum + b.overdueInvoices, 0);

  const exportToCSV = async () => {
    setExportInProgress(true);
    try {
      const params = new URLSearchParams({
        filterType,
        year: selectedYear.toString(),
        minSaldo: minSaldo.toString(),
      });

      const res = await fetch(`/api/flexi/export-customer-balance?${params}`);
      if (!res.ok) {
        const errBody = await res.json();
        throw new Error(errBody.error || `HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `saldo-odberatelu-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Chyba při exportu"
      );
    } finally {
      setExportInProgress(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Saldo odběratelů</h1>
        <p className="mt-2 text-gray-500">
          Přehled sald plateb a faktur u všech odběratelů služeb
        </p>
      </div>

      {/* Statistiky */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500">Celkové pohledávky</div>
          <div className="text-2xl font-bold text-red-600 mt-1">
            {formatCurrency(totalReceivables)}
          </div>
          <div className="text-xs text-gray-400 mt-1">Co nám dluží</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500">Celkové závazky</div>
          <div className="text-2xl font-bold text-green-600 mt-1">
            {formatCurrency(totalPayables)}
          </div>
          <div className="text-xs text-gray-400 mt-1">Co dlužíme my</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500">Nezaplacené faktury</div>
          <div className="text-2xl font-bold text-orange-600 mt-1">
            {totalUnpaid}
          </div>
          <div className="text-xs text-gray-400 mt-1">Celkem faktur</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500">Po splatnosti</div>
          <div className="text-2xl font-bold text-red-600 mt-1">
            {totalOverdue}
          </div>
          <div className="text-xs text-gray-400 mt-1">Upomínky</div>
        </div>
      </div>

      {/* Filtry */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mr-2">
              Rok:
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-1 text-sm"
            >
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mr-2">
              Typ salda:
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-1 text-sm"
            >
              <option value="receivables">Pohledávky (co nám dluží) 🔴</option>
              <option value="payables">Závazky (co dlužíme)</option>
              <option value="all">Vše</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mr-2">
              Min. saldo (Kč):
            </label>
            <input
              type="number"
              value={minSaldo}
              onChange={(e) => setMinSaldo(Number(e.target.value))}
              min="0"
              step="1"
              className="border border-gray-300 rounded-lg px-3 py-1 text-sm w-32"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showOnlyUnpaid}
              onChange={(e) => setShowOnlyUnpaid(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-700">Pouze s nezaplacenými fakturami</span>
          </label>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={exportToCSV}
              disabled={exportInProgress || loading}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {exportInProgress ? (
                <>
                  <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Exportuji...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export CSV
                </>
              )}
            </button>

            <button
              onClick={loadBalances}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Obnovit
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="p-12 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
          <p className="mt-4 text-gray-500">Načítání sald odběratelů...</p>
        </div>
      ) : filteredBalances.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500">Žádná salda nenalezena.</p>
        </div>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Odběratel
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pohledávky
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Závazky
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saldo celkem
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nezaplacené
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Po splatnosti
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBalances.map((balance, index) => (
                  <tr
                    key={`${balance.firma}-${index}`}
                    className={`${getSaldoBgColor(
                      balance.saldoCelkem,
                      balance.unpaidInvoices > 0
                    )} hover:bg-gray-100 transition-colors`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {balance.nazFirmy}
                      </div>
                      <div className="text-xs text-gray-500">{balance.firma}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-red-600">
                        {balance.pohledavky > 0.01
                          ? formatCurrency(balance.pohledavky)
                          : "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-green-600">
                        {balance.zavazky > 0.01
                          ? formatCurrency(balance.zavazky)
                          : "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div
                        className={`text-sm font-bold ${getSaldoColor(
                          balance.saldoCelkem
                        )}`}
                      >
                        {formatCurrency(balance.saldoCelkem)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {balance.unpaidInvoices > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          {balance.unpaidInvoices}{" "}
                          {balance.unpaidInvoices === 1 ? "faktura" : "faktur"}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {balance.overdueInvoices > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {balance.overdueInvoices}{" "}
                          {balance.overdueInvoices === 1 ? "faktura" : "faktur"}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Zobrazeno {filteredBalances.length} z {total} záznamů
              {showOnlyUnpaid && ` (filtrováno lokálně)`}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Předchozí
              </button>

              <span className="text-sm text-gray-700">
                Stránka {page} z {totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Další
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
