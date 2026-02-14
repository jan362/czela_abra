import { NextRequest, NextResponse } from "next/server";
import { getFlexiClient } from "@/lib/flexi-client";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/flexi/export-customer-balance
 *
 * Exportuje saldo odběratelů do CSV
 * Query parametry:
 * - filterType: "all" | "receivables" | "payables" (default "receivables")
 * - year: rok filtrace (default aktuální rok)
 * - minSaldo: minimální absolutní hodnota salda (default 701)
 */
export async function GET(req: NextRequest) {
  // Verify authentication
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = getFlexiClient();
    const startTime = Date.now();

    // Query parametry
    const searchParams = req.nextUrl.searchParams;
    const filterType = searchParams.get("filterType") || "receivables";
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const minSaldo = parseFloat(searchParams.get("minSaldo") || "701");

    console.log(`[ExportBalance] Exportuji saldo, typ ${filterType}, rok ${year}, min. saldo ${minSaldo}...`);

    // Build date filter for the selected year
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;
    const dateFilter = `datSplat between '${yearStart}' '${yearEnd}'`;

    // 1. Načíst pohledávky (FAV)
    const pohledavkyData = await client.list("saldo-k-datu", {
      filter: `modul = 'FAV' and zbyvaUhradit > 0 and ${dateFilter}`,
      detail: "custom:firma,nazFirmy,datSplat,sumCelkem,zbyvaUhradit,kod",
      limit: 10000,
    });

    // 2. Načíst závazky (FAP)
    const zavazkyData = await client.list("saldo-k-datu", {
      filter: `modul = 'FAP' and zbyvaUhradit > 0 and ${dateFilter}`,
      detail: "custom:firma,nazFirmy,datSplat,sumCelkem,zbyvaUhradit,kod",
      limit: 10000,
    });

    console.log(`[ExportBalance] Načteno ${pohledavkyData.rows?.length || 0} pohledávek, ${zavazkyData.rows?.length || 0} závazků`);

    // 3. Agregovat podle firmy
    const saldoByFirma = new Map<string, {
      firma: string;
      nazFirmy: string;
      pohledavky: number;
      zavazky: number;
      unpaidInvoices: number;
      overdueInvoices: number;
    }>();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Zpracovat pohledávky (FAV)
    for (const item of pohledavkyData.rows || []) {
      const firmaCode = item.firma?.toString().replace("code:", "") || "unknown";
      const nazFirmy = item.nazFirmy || "Neznámá firma";
      const zbyvaUhradit = parseFloat(item.zbyvaUhradit?.toString() || "0");

      if (!saldoByFirma.has(firmaCode)) {
        saldoByFirma.set(firmaCode, {
          firma: firmaCode,
          nazFirmy,
          pohledavky: 0,
          zavazky: 0,
          unpaidInvoices: 0,
          overdueInvoices: 0,
        });
      }

      const entry = saldoByFirma.get(firmaCode)!;
      entry.pohledavky += zbyvaUhradit;
      entry.unpaidInvoices++;

      // Zkontrolovat splatnost
      if (item.datSplat) {
        const dueDate = new Date(item.datSplat.split("+")[0]);
        if (dueDate < today) {
          entry.overdueInvoices++;
        }
      }
    }

    // Zpracovat závazky (FAP)
    for (const item of zavazkyData.rows || []) {
      const firmaCode = item.firma?.toString().replace("code:", "") || "unknown";
      const nazFirmy = item.nazFirmy || "Neznámá firma";
      const zbyvaUhradit = parseFloat(item.zbyvaUhradit?.toString() || "0");

      if (!saldoByFirma.has(firmaCode)) {
        saldoByFirma.set(firmaCode, {
          firma: firmaCode,
          nazFirmy,
          pohledavky: 0,
          zavazky: 0,
          unpaidInvoices: 0,
          overdueInvoices: 0,
        });
      }

      const entry = saldoByFirma.get(firmaCode)!;
      entry.zavazky += zbyvaUhradit;
    }

    // 4. Převést na pole a filtrovat podle typu
    let allBalances = Array.from(saldoByFirma.values()).map((entry) => ({
      firma: entry.firma,
      nazFirmy: entry.nazFirmy,
      pohledavky: entry.pohledavky,
      zavazky: entry.zavazky,
      saldoCelkem: entry.pohledavky - entry.zavazky,
      unpaidInvoices: entry.unpaidInvoices,
      overdueInvoices: entry.overdueInvoices,
    }));

    // Filtrovat podle typu a minimálního salda
    if (filterType === "receivables") {
      allBalances = allBalances.filter((b) => b.saldoCelkem >= minSaldo);
      allBalances.sort((a, b) => b.saldoCelkem - a.saldoCelkem);
    } else if (filterType === "payables") {
      allBalances = allBalances.filter((b) => Math.abs(b.saldoCelkem) >= minSaldo);
      allBalances.sort((a, b) => a.saldoCelkem - b.saldoCelkem);
    } else {
      allBalances = allBalances.filter((b) => Math.abs(b.saldoCelkem) >= minSaldo);
      allBalances.sort((a, b) => Math.abs(b.saldoCelkem) - Math.abs(a.saldoCelkem));
    }

    console.log(`[ExportBalance] Po filtrování: ${allBalances.length} odběratelů`);

    // 5. Vygenerovat CSV
    const csv = generateCSV(allBalances);

    const totalTime = Date.now() - startTime;
    console.log(`[ExportBalance] Hotovo za ${totalTime}ms (${(totalTime / 1000).toFixed(1)}s)`);

    // 6. Vrátit jako CSV file
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="saldo-odberatelu-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("ExportBalance error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Export se nezdařil",
      },
      { status: 500 }
    );
  }
}

/**
 * Generování CSV z dat
 */
function generateCSV(
  data: Array<{
    firma: string;
    nazFirmy: string;
    pohledavky: number;
    zavazky: number;
    saldoCelkem: number;
    unpaidInvoices: number;
    overdueInvoices: number;
  }>
): string {
  if (data.length === 0) {
    return "Žádná data k exportu";
  }

  // Hlavička
  const headers = [
    "Kód odběratele",
    "Název odběratele",
    "Pohledávky (Kč)",
    "Závazky (Kč)",
    "Saldo celkem (Kč)",
    "Nezaplacených dokladů",
    "Dokladů po splatnosti",
  ];

  // BOM pro správné zobrazení UTF-8 v Excelu
  const bom = "\uFEFF";

  const headerRow = headers.join(";");

  const dataRows = data.map((row) => {
    return [
      escapeCsvValue(row.firma),
      escapeCsvValue(row.nazFirmy),
      formatNumber(row.pohledavky),
      formatNumber(row.zavazky),
      formatNumber(row.saldoCelkem),
      row.unpaidInvoices.toString(),
      row.overdueInvoices.toString(),
    ].join(";");
  });

  return bom + [headerRow, ...dataRows].join("\n");
}

/**
 * Formátování čísla pro CSV (použití čárky jako oddělovače desetinných míst)
 */
function formatNumber(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

/**
 * Escapování hodnoty pro CSV
 */
function escapeCsvValue(value: string): string {
  if (!value) return "";

  // Pokud hodnota obsahuje středník, uvozovky nebo nový řádek, obalit uvozovkami
  if (value.includes(";") || value.includes('"') || value.includes("\n")) {
    // Escape uvozovky zdvojením
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  return value;
}
