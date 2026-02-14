import Link from "next/link";

export default function InvoicesPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Fakturace</h1>
        <p className="mt-2 text-gray-500">Správa vydaných a přijatých faktur.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Vydané faktury */}
        <Link href="/invoices/issued">
          <div className="group border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-blue-300 transition-all bg-white">
            <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
              Faktury vydané
            </h2>
            <p className="text-sm text-gray-500 mt-1">faktura-vydana</p>
            <p className="text-sm text-gray-600 mt-3">
              Přehled, vytváření a správa vydaných faktur.
            </p>
            <div className="mt-4 text-sm text-blue-600 font-medium">
              Otevřít &rarr;
            </div>
          </div>
        </Link>

        {/* Přijaté faktury */}
        <Link href="/invoices/received">
          <div className="group border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-blue-300 transition-all bg-white">
            <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
              Faktury přijaté
            </h2>
            <p className="text-sm text-gray-500 mt-1">faktura-prijata</p>
            <p className="text-sm text-gray-600 mt-3">
              Přehled, vytváření a správa přijatých faktur.
            </p>
            <div className="mt-4 text-sm text-blue-600 font-medium">
              Otevřít &rarr;
            </div>
          </div>
        </Link>
      </div>

      {/* Placeholder for future actions */}
      <div className="mt-8 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
        <p className="text-gray-400 text-sm">
          Další akce a workflow pro fakturaci budou doplněny později.
        </p>
      </div>
    </div>
  );
}
