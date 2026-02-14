import { NextRequest, NextResponse } from "next/server";
import { getFlexiClient } from "@/lib/flexi-client";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface CustomerBalance {
  firma: string;
  nazFirmy: string;
  pohledavky: number; // Celkové pohledávky (FAV)
  zavazky: number;    // Celkové závazky (FAP)
  saldoCelkem: number; // Celkové saldo
  unpaidInvoices: number; // Počet nezaplacených dokladů
  overdueInvoices: number; // Počet po splatnosti
}

/**
 * GET /api/flexi/customer-balance
 *
 * Načte saldo odběratelů pomocí evidence "saldo-k-datu"
 * Podle dokumentace: https://podpora.flexibee.eu/cs/articles/3422357-stav-uhrad-k-datu-rest-api
 *
 * Query parametry:
 * - page: číslo stránky (default 1)
 * - limit: počet záznamů na stránku (default 100)
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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "100");
    const filterType = searchParams.get("filterType") || "receivables";
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const minSaldo = parseFloat(searchParams.get("minSaldo") || "701");

    console.log(`[CustomerBalance] Načítám saldo, typ ${filterType}, rok ${year}, min. saldo ${minSaldo}...`);

    // Build date filter for the selected year
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;
    const dateFilter = `datSplat between '${yearStart}' '${yearEnd}'`;

    // 1. Načíst pohledávky (FAV - faktury vydané) pomocí saldo-k-datu
    console.log("[CustomerBalance] Načítám pohledávky (FAV)...");
    const pohledavkyData = await client.list("saldo-k-datu", {
      filter: `modul = 'FAV' and zbyvaUhradit > 0 and ${dateFilter}`,
      detail: "custom:firma,nazFirmy,datSplat,sumCelkem,zbyvaUhradit",
      limit: 10000,
    });

    // 2. Načíst závazky (FAP - faktury přijaté) pomocí saldo-k-datu
    console.log("[CustomerBalance] Načítám závazky (FAP)...");
    const zavazkyData = await client.list("saldo-k-datu", {
      filter: `modul = 'FAP' and zbyvaUhradit > 0 and ${dateFilter}`,
      detail: "custom:firma,nazFirmy,datSplat,sumCelkem,zbyvaUhradit",
      limit: 10000,
    });

    console.log(`[CustomerBalance] Načteno ${pohledavkyData.rows?.length || 0} pohledávek, ${zavazkyData.rows?.length || 0} závazků za ${Date.now() - startTime}ms`);

    // 3. Agregovat podle firmy
    const saldoByFirma = new Map<string, {
      firma: string;
      nazFirmy: string;
      pohledavky: number;
      zavazky: number;
      unpaidInvoices: number;
      overdueInvoices: number;
      invoices: any[];
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
          invoices: [],
        });
      }

      const entry = saldoByFirma.get(firmaCode)!;
      entry.pohledavky += zbyvaUhradit;
      entry.unpaidInvoices++;
      entry.invoices.push(item);

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
          invoices: [],
        });
      }

      const entry = saldoByFirma.get(firmaCode)!;
      entry.zavazky += zbyvaUhradit;
      entry.invoices.push(item);
    }

    // 4. Převést na pole a filtrovat podle typu
    let allBalances: CustomerBalance[] = Array.from(saldoByFirma.values()).map(
      (entry) => ({
        firma: entry.firma,
        nazFirmy: entry.nazFirmy,
        pohledavky: entry.pohledavky,
        zavazky: entry.zavazky,
        saldoCelkem: entry.pohledavky - entry.zavazky,
        unpaidInvoices: entry.unpaidInvoices,
        overdueInvoices: entry.overdueInvoices,
      })
    );

    // Filtrovat podle typu a minimálního salda
    if (filterType === "receivables") {
      // Pouze pohledávky (saldoCelkem > 0) s minimální hodnotou
      allBalances = allBalances.filter((b) => b.saldoCelkem >= minSaldo);
      // Seřadit podle nejvyšších pohledávek
      allBalances.sort((a, b) => b.saldoCelkem - a.saldoCelkem);
    } else if (filterType === "payables") {
      // Pouze závazky (saldoCelkem < 0) s minimální absolutní hodnotou
      allBalances = allBalances.filter((b) => Math.abs(b.saldoCelkem) >= minSaldo);
      // Seřadit podle nejvyšších závazků
      allBalances.sort((a, b) => a.saldoCelkem - b.saldoCelkem);
    } else {
      // Vše - filtrovat podle absolutní hodnoty a seřadit
      allBalances = allBalances.filter((b) => Math.abs(b.saldoCelkem) >= minSaldo);
      allBalances.sort((a, b) => Math.abs(b.saldoCelkem) - Math.abs(a.saldoCelkem));
    }

    const totalCount = allBalances.length;

    // 5. Aplikovat stránkování
    const start = (page - 1) * limit;
    const end = start + limit;
    const balances = allBalances.slice(start, end);

    console.log(`[CustomerBalance] Po filtrování: ${totalCount} odběratelů, zobrazuji ${start}-${end}`);

    const totalTime = Date.now() - startTime;
    console.log(`[CustomerBalance] Hotovo za ${totalTime}ms (${(totalTime / 1000).toFixed(1)}s)`);

    return NextResponse.json({
      success: true,
      balances,
      count: balances.length,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    console.error("CustomerBalance error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Načítání salda se nezdařilo",
      },
      { status: 500 }
    );
  }
}
