"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface BankPayment {
  id: number;
  kod: string;
  datVyst: string;
  sumCelkem: string;
  varSym: string;
  popis: string;
  sparovano: string;
  firma: string;
  "firma@showAs"?: string;
  typPohybuK: string;
  "typPohybuK@showAs"?: string;
}

interface Invoice {
  id: number;
  kod: string;
  datVyst: string;
  datSplat?: string;
  sumCelkem: string;
  varSym: string;
  stavUhrK: string;
  "stavUhrK@showAs"?: string;
  firma: string;
  "firma@showAs"?: string;
  mena?: string;
  popis?: string;
  zbpisPar?: string;
  _type: "faktura-vydana" | "faktura-prijata";
  _typeLabel: string;
}

interface MatchResult {
  success: boolean;
  error?: string;
  details?: Record<string, unknown>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  // Remove timezone offset like "+02:00"
  const clean = dateStr.split("+")[0].split("T")[0];
  return clean;
}

function formatCurrency(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    minimumFractionDigits: 2,
  }).format(num);
}

function getPaymentStatusColor(stavUhrK: string): string {
  if (stavUhrK === "stavUhr.uhrazeno") return "bg-green-100 text-green-800";
  if (stavUhrK === "stavUhr.castUhr") return "bg-yellow-100 text-yellow-800";
  if (stavUhrK === "" || !stavUhrK) return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-800";
}

function getPaymentStatusLabel(stavUhrK: string, showAs?: string): string {
  if (showAs) return showAs;
  if (stavUhrK === "stavUhr.uhrazeno") return "Uhrazeno";
  if (stavUhrK === "stavUhr.castUhr") return "Částečně uhrazeno";
  if (stavUhrK === "" || !stavUhrK) return "Neuhrazeno";
  return stavUhrK;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MatchingPage() {
  // State: unmatched bank payments
  const [payments, setPayments] = useState<BankPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const [totalPayments, setTotalPayments] = useState(0);

  // State: pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 100;

  // State: year filter - default to current year
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // State: payment type filter - default to "all" (both income and expense)
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<"prijem" | "vydej" | "all">("all");

  // State: selected payment
  const [selectedPayment, setSelectedPayment] = useState<BankPayment | null>(null);

  // State: found invoices for selected payment
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicesError, setInvoicesError] = useState<string | null>(null);

  // State: selected invoices for matching
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<number>>(new Set());

  // State: remainder handling
  const [remainder, setRemainder] = useState<string>("ignorovat");

  // State: matching in progress
  const [matchingInProgress, setMatchingInProgress] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);

  // State: export in progress
  const [exportInProgress, setExportInProgress] = useState(false);

  // ─── Load unmatched payments ─────────────────────────────────────────────

  const loadPayments = useCallback(async () => {
    setPaymentsLoading(true);
    setPaymentsError(null);
    try {
      // Build filter: unmatched + year + payment type
      const yearStart = `${selectedYear}-01-01`;
      const yearEnd = `${selectedYear}-12-31`;
      let filter = `sparovano = false and datVyst between '${yearStart}' '${yearEnd}'`;

      // Add payment type filter
      if (paymentTypeFilter === "prijem") {
        filter += ` and typPohybuK = 'typPohybu.prijem'`;
      } else if (paymentTypeFilter === "vydej") {
        filter += ` and typPohybuK = 'typPohybu.vydej'`;
      }

      const start = (page - 1) * limit;

      const res = await fetch(
        "/api/flexi/banka?filter=" +
          encodeURIComponent(filter) +
          "&detail=custom:id,kod,datVyst,sumCelkem,varSym,popis,sparovano,firma,typPohybuK" +
          `&limit=${limit}&start=${start}` +
          "&order=datVyst@D" +
          "&add-row-count=true"
      );
      if (!res.ok) {
        const errBody = await res.json();
        throw new Error(errBody.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setPayments(data.rows || []);
      setTotalPayments(data.rowCount || 0);
      setTotalPages(Math.ceil((data.rowCount || 0) / limit));
    } catch (err) {
      setPaymentsError(
        err instanceof Error ? err.message : "Chyba při načítání plateb"
      );
    } finally {
      setPaymentsLoading(false);
    }
  }, [page, selectedYear, paymentTypeFilter]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  // Reset page when year or payment type changes
  useEffect(() => {
    setPage(1);
  }, [selectedYear, paymentTypeFilter]);

  // ─── Search invoices by variable symbol ──────────────────────────────────

  const searchInvoices = useCallback(async (varSym: string) => {
    if (!varSym) return;
    setInvoicesLoading(true);
    setInvoicesError(null);
    setInvoices([]);
    setSelectedInvoiceIds(new Set());
    setMatchResult(null);

    try {
      const res = await fetch(
        `/api/flexi/find-invoices?varSym=${encodeURIComponent(varSym)}&type=all`
      );
      if (!res.ok) {
        const errBody = await res.json();
        throw new Error(errBody.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setInvoices(data.invoices || []);
    } catch (err) {
      setInvoicesError(
        err instanceof Error ? err.message : "Chyba při hledání faktur"
      );
    } finally {
      setInvoicesLoading(false);
    }
  }, []);


  // ─── Select a payment → auto-search invoices ────────────────────────────

  const handleSelectPayment = (payment: BankPayment) => {
    setSelectedPayment(payment);
    setMatchResult(null);
    if (payment.varSym) {
      searchInvoices(payment.varSym);
    } else {
      setInvoices([]);
      setInvoicesError("Platba nemá variabilní symbol – nelze automaticky hledat faktury.");
    }
  };

  // ─── Toggle invoice selection ────────────────────────────────────────────

  const toggleInvoiceSelection = (invoiceId: number) => {
    setSelectedInvoiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(invoiceId)) {
        next.delete(invoiceId);
      } else {
        next.add(invoiceId);
      }
      return next;
    });
  };

  // ─── Export to CSV ───────────────────────────────────────────────────────

  const exportToCSV = async () => {
    setExportInProgress(true);
    try {
      const res = await fetch("/api/flexi/export-matching");

      if (!res.ok) {
        const errBody = await res.json();
        throw new Error(errBody.error || "Export se nezdařil");
      }

      // Stáhnout CSV soubor
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nesparovane-platby-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(
        "Chyba při exportu: " +
          (err instanceof Error ? err.message : "Neznámá chyba")
      );
    } finally {
      setExportInProgress(false);
    }
  };

  // ─── Execute matching ────────────────────────────────────────────────────

  const executeMatch = async () => {
    if (!selectedPayment || selectedInvoiceIds.size === 0) return;

    setMatchingInProgress(true);
    setMatchResult(null);

    const selectedInvoices = invoices.filter((inv) =>
      selectedInvoiceIds.has(inv.id)
    );

    try {
      const res = await fetch("/api/flexi/match-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankId: selectedPayment.id,
          invoices: selectedInvoices.map((inv) => ({
            id: `code:${inv.kod}`,
            type: inv._type,
          })),
          remainder,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMatchResult({
          success: true,
        });
        // Reload payments list
        loadPayments();
        // Clear selection
        setSelectedPayment(null);
        setInvoices([]);
        setSelectedInvoiceIds(new Set());
      } else {
        setMatchResult({
          success: false,
          error: data.error || "Párování se nezdařilo",
          details: data.details,
        });
      }
    } catch (err) {
      setMatchResult({
        success: false,
        error:
          err instanceof Error ? err.message : "Chyba při párování",
      });
    } finally {
      setMatchingInProgress(false);
    }
  };

  // ─── Computed ────────────────────────────────────────────────────────────

  const selectedInvoicesTotal = invoices
    .filter((inv) => selectedInvoiceIds.has(inv.id))
    .reduce((sum, inv) => sum + parseFloat(inv.sumCelkem), 0);

  const paymentAmount = selectedPayment
    ? parseFloat(selectedPayment.sumCelkem)
    : 0;

  const difference = paymentAmount - selectedInvoicesTotal;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Párování plateb</h1>
            <p className="mt-2 text-gray-500">
              Nespárované bankovní platby a dohledání faktur dle variabilního symbolu.
            </p>
          </div>
          <button
            onClick={exportToCSV}
            disabled={exportInProgress || paymentsLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center gap-2"
          >
            {exportInProgress ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Exportuji...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Export do CSV
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success banner */}
      {matchResult?.success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="font-medium text-green-800">
            Párování proběhlo úspěšně!
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ─── Left: Unmatched Payments ──────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Nespárované platby
            </h2>
            <button
              onClick={loadPayments}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Obnovit
            </button>
          </div>

          {/* Year filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rok:
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {/* Payment type filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Typ pohybu:
            </label>
            <select
              value={paymentTypeFilter}
              onChange={(e) => setPaymentTypeFilter(e.target.value as any)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Vše (příjem i výdej)</option>
              <option value="prijem">Příjem</option>
              <option value="vydej">Výdej</option>
            </select>
          </div>

          {paymentsError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
              <p className="text-sm text-red-700">{paymentsError}</p>
            </div>
          )}

          {paymentsLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
              <p className="mt-2 text-sm text-gray-500">Načítání plateb...</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-500">
                Žádné nespárované platby.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  Celkem: {totalPayments} nespárovaných plateb
                  {selectedYear && ` (rok ${selectedYear})`}
                </p>
                {payments.map((payment) => (
                <button
                  key={payment.id}
                  onClick={() => handleSelectPayment(payment)}
                  className={`w-full text-left border rounded-lg p-4 transition-all ${
                    selectedPayment?.id === payment.id
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                      : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-gray-900">
                        {payment.kod}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {formatDate(payment.datVyst)}
                        {payment["typPohybuK@showAs"] && (
                          <span className="ml-2">
                            ({payment["typPohybuK@showAs"]})
                          </span>
                        )}
                      </div>
                      {payment.popis && (
                        <div className="text-sm text-gray-600 mt-1">
                          {payment.popis}
                        </div>
                      )}
                      {payment["firma@showAs"] && (
                        <div className="text-sm text-gray-500 mt-1">
                          {payment["firma@showAs"]}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {formatCurrency(payment.sumCelkem)}
                      </div>
                      {payment.varSym && (
                        <div className="text-xs text-gray-500 mt-1">
                          VS: {payment.varSym}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
                  <div className="text-sm text-gray-500">
                    Stránka {page} z {totalPages}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1 || paymentsLoading}
                      className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Předchozí
                    </button>

                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages || paymentsLoading}
                      className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Další
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ─── Right: Invoice Match Panel ────────────────────────────── */}
        <div>
          {!selectedPayment ? (
            <div className="p-12 text-center border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-400 text-lg">
                Vyberte platbu ze seznamu vlevo
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Faktury budou automaticky dohledány podle variabilního symbolu
              </p>
            </div>
          ) : (
            <div>
              {/* Selected payment summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-blue-900">
                  Vybraná platba: {selectedPayment.kod}
                </h3>
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-blue-800">
                  <div>Částka: {formatCurrency(selectedPayment.sumCelkem)}</div>
                  <div>Datum: {formatDate(selectedPayment.datVyst)}</div>
                  <div>VS: {selectedPayment.varSym || "–"}</div>
                  <div>
                    Firma: {selectedPayment["firma@showAs"] || "–"}
                  </div>
                </div>
              </div>

              {/* Found invoices */}
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Nalezené faktury (VS: {selectedPayment.varSym})
              </h3>

              {invoicesLoading ? (
                <div className="p-8 text-center">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                  <p className="mt-2 text-sm text-gray-500">
                    Hledání faktur...
                  </p>
                </div>
              ) : invoicesError ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                  <p className="text-sm text-yellow-700">{invoicesError}</p>
                </div>
              ) : invoices.length === 0 ? (
                <div className="p-6 text-center border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500">
                    Pro VS &quot;{selectedPayment.varSym}&quot; nebyly nalezeny žádné faktury.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 mb-6">
                    {invoices.map((invoice) => {
                      const isSelected = selectedInvoiceIds.has(invoice.id);
                      const isPaid =
                        invoice.stavUhrK === "stavUhr.uhrazeno";
                      return (
                        <label
                          key={`${invoice._type}-${invoice.id}`}
                          className={`block border rounded-lg p-4 cursor-pointer transition-all ${
                            isSelected
                              ? "border-green-500 bg-green-50 ring-2 ring-green-200"
                              : isPaid
                              ? "border-gray-200 bg-gray-50 opacity-60"
                              : "border-gray-200 bg-white hover:border-green-300"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() =>
                                toggleInvoiceSelection(invoice.id)
                              }
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-medium text-gray-900">
                                    {invoice.kod}
                                  </span>
                                  <span
                                    className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                      invoice._type === "faktura-vydana"
                                        ? "bg-blue-100 text-blue-800"
                                        : "bg-purple-100 text-purple-800"
                                    }`}
                                  >
                                    {invoice._typeLabel}
                                  </span>
                                </div>
                                <span className="font-semibold text-gray-900">
                                  {formatCurrency(invoice.sumCelkem)}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                <span>
                                  Vystaveno: {formatDate(invoice.datVyst)}
                                </span>
                                {invoice.datSplat && (
                                  <span>
                                    Splatnost: {formatDate(invoice.datSplat)}
                                  </span>
                                )}
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(
                                    invoice.stavUhrK
                                  )}`}
                                >
                                  {getPaymentStatusLabel(
                                    invoice.stavUhrK,
                                    invoice["stavUhrK@showAs"]
                                  )}
                                </span>
                              </div>
                              {invoice["firma@showAs"] && (
                                <div className="text-sm text-gray-500 mt-1">
                                  {invoice["firma@showAs"]}
                                </div>
                              )}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {/* Matching summary & action */}
                  {selectedInvoiceIds.size > 0 && (
                    <div className="border border-gray-200 rounded-lg p-4 bg-white">
                      <h4 className="font-medium text-gray-900 mb-3">
                        Souhrn párování
                      </h4>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Částka platby:</span>
                          <span className="font-medium">
                            {formatCurrency(paymentAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            Vybrané faktury ({selectedInvoiceIds.size}):
                          </span>
                          <span className="font-medium">
                            {formatCurrency(selectedInvoicesTotal)}
                          </span>
                        </div>
                        <div className="border-t border-gray-200 pt-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Rozdíl:</span>
                            <span
                              className={`font-semibold ${
                                Math.abs(difference) < 0.01
                                  ? "text-green-600"
                                  : difference > 0
                                  ? "text-yellow-600"
                                  : "text-red-600"
                              }`}
                            >
                              {formatCurrency(difference)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Remainder handling */}
                      {Math.abs(difference) >= 0.01 && (
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Naložení se zbytkem:
                          </label>
                          <select
                            value={remainder}
                            onChange={(e) => setRemainder(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="ignorovat">
                              Ignorovat rozdíl
                            </option>
                            <option value="zauctovat">
                              Zaúčtovat rozdíl (vytvořit interní doklad)
                            </option>
                            <option value="castecnaUhrada">
                              Částečná úhrada
                            </option>
                            <option value="castecnaUhradaNeboIgnorovat">
                              Částečná úhrada nebo ignorovat
                            </option>
                            <option value="castecnaUhradaNeboZauctovat">
                              Částečná úhrada nebo zaúčtovat
                            </option>
                            <option value="ne">
                              Nepovolit (odmítnout párování)
                            </option>
                          </select>
                        </div>
                      )}

                      {/* Error message */}
                      {matchResult && !matchResult.success && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm font-medium text-red-800">
                            Chyba při párování
                          </p>
                          <p className="text-sm text-red-700 mt-1">
                            {matchResult.error}
                          </p>
                        </div>
                      )}

                      {/* Match button */}
                      <button
                        onClick={executeMatch}
                        disabled={matchingInProgress}
                        className="mt-4 w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                      >
                        {matchingInProgress ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Párování probíhá...
                          </span>
                        ) : (
                          `Spárovat platbu s ${selectedInvoiceIds.size} faktur${
                            selectedInvoiceIds.size === 1
                              ? "ou"
                              : selectedInvoiceIds.size < 5
                              ? "ami"
                              : "ami"
                          }`
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
