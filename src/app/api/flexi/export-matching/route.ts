import { NextRequest, NextResponse } from "next/server";
import { getFlexiClient } from "@/lib/flexi-client";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/flexi/export-matching
 *
 * Exportuje nespárované platby a faktury s matchujícím variabilním symbolem do CSV.
 * OPTIMALIZOVÁNO: Načítá všechny faktury najednou místo jednotlivých dotazů.
 *
 * CSV formát:
 * - Platba (kod, datum, částka, VS, firma, popis)
 * - Faktura (kod, typ, datum, částka, VS, firma, stav úhrady)
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

    // 1. Načíst nespárované platby
    console.log("[Export] Načítám nespárované platby...");
    const paymentsData = await client.list("banka", {
      filter: "sparovano = false",
      detail: "custom:id,kod,datVyst,sumCelkem,varSym,popis,sparovano,firma,typPohybuK",
      limit: 1000,
      order: "datVyst@D",
    });

    const payments = paymentsData.rows || [];
    console.log(`[Export] Načteno ${payments.length} plateb za ${Date.now() - startTime}ms`);

    if (payments.length === 0) {
      return new NextResponse("Zadna data k exportu", {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="nesparovane-platby-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    // 2. Sesbírat unikátní variabilní symboly
    const uniqueVarSyms = new Set<string>();
    for (const payment of payments) {
      const varSym = payment.varSym?.toString().trim();
      if (varSym) {
        uniqueVarSyms.add(varSym);
      }
    }

    console.log(`[Export] Nalezeno ${uniqueVarSyms.size} unikátních VS`);

    // 3. Načíst VŠECHNY faktury najednou pomocí IN operátoru
    const invoicesByVS = new Map<string, any[]>();

    if (uniqueVarSyms.size > 0) {
      const vsArray = Array.from(uniqueVarSyms);

      // Rozdělit VS na chunky (max 50 najednou kvůli limitu URL)
      const chunkSize = 50;
      const chunks: string[][] = [];
      for (let i = 0; i < vsArray.length; i += chunkSize) {
        chunks.push(vsArray.slice(i, i + chunkSize));
      }

      console.log(`[Export] Načítám faktury v ${chunks.length} dávkách...`);

      // Paralelně načíst všechny chunky
      const chunkPromises = chunks.flatMap((chunk) => {
        // Vytvořit filter pro IN operátor
        const vsFilter = chunk.map(vs => `'${vs}'`).join(",");
        const filter = `varSym in (${vsFilter})`;

        return [
          client.list("faktura-vydana", {
            filter,
            detail: "custom:id,kod,datVyst,datSplat,sumCelkem,varSym,stavUhrK,firma",
            limit: 1000,
          }),
          client.list("faktura-prijata", {
            filter,
            detail: "custom:id,kod,datVyst,datSplat,sumCelkem,varSym,stavUhrK,firma",
            limit: 1000,
          }),
        ];
      });

      const chunkResults = await Promise.all(chunkPromises);

      // Zpracovat výsledky a seskupit podle VS
      let totalInvoices = 0;
      for (let i = 0; i < chunkResults.length; i += 2) {
        const issuedData = chunkResults[i];
        const receivedData = chunkResults[i + 1];

        // Vydané faktury
        for (const inv of issuedData.rows || []) {
          const vs = inv.varSym?.toString().trim();
          if (!vs) continue;

          if (!invoicesByVS.has(vs)) {
            invoicesByVS.set(vs, []);
          }
          invoicesByVS.get(vs)!.push({ ...inv, _type: "Vydaná" });
          totalInvoices++;
        }

        // Přijaté faktury
        for (const inv of receivedData.rows || []) {
          const vs = inv.varSym?.toString().trim();
          if (!vs) continue;

          if (!invoicesByVS.has(vs)) {
            invoicesByVS.set(vs, []);
          }
          invoicesByVS.get(vs)!.push({ ...inv, _type: "Přijatá" });
          totalInvoices++;
        }
      }

      console.log(`[Export] Načteno ${totalInvoices} faktur za ${Date.now() - startTime}ms`);
    }

    // 4. Sestavit export data (rychlé - vše je v paměti)
    const exportData: {
      platbaKod: string;
      platybaDatum: string;
      platybaPartka: string;
      platbaVS: string;
      platbaFirma: string;
      platybaTyp: string;
      platybaPoplis: string;
      fakturaKod: string;
      fakturaTyp: string;
      fakturaDatum: string;
      fakturaSplatnost: string;
      fakturaCastka: string;
      fakturaVS: string;
      fakturaFirma: string;
      fakturaStav: string;
    }[] = [];

    for (const payment of payments) {
      const varSym = payment.varSym?.toString().trim();

      if (!varSym) {
        // Platba bez VS
        exportData.push({
          platbaKod: payment.kod || "",
          platybaDatum: formatDate(payment.datVyst),
          platybaPartka: payment.sumCelkem?.toString() || "0",
          platbaVS: "",
          platbaFirma: payment["firma@showAs"] || "",
          platybaTyp: payment["typPohybuK@showAs"] || "",
          platybaPoplis: payment.popis || "",
          fakturaKod: "",
          fakturaTyp: "",
          fakturaDatum: "",
          fakturaSplatnost: "",
          fakturaCastka: "",
          fakturaVS: "",
          fakturaFirma: "",
          fakturaStav: "",
        });
        continue;
      }

      const invoices = invoicesByVS.get(varSym) || [];

      if (invoices.length === 0) {
        // Platba s VS, ale bez faktur
        exportData.push({
          platbaKod: payment.kod || "",
          platybaDatum: formatDate(payment.datVyst),
          platybaPartka: payment.sumCelkem?.toString() || "0",
          platbaVS: varSym,
          platbaFirma: payment["firma@showAs"] || "",
          platybaTyp: payment["typPohybuK@showAs"] || "",
          platybaPoplis: payment.popis || "",
          fakturaKod: "",
          fakturaTyp: "",
          fakturaDatum: "",
          fakturaSplatnost: "",
          fakturaCastka: "",
          fakturaVS: "",
          fakturaFirma: "",
          fakturaStav: "",
        });
      } else {
        // Platba s fakturami
        for (const invoice of invoices) {
          exportData.push({
            platbaKod: payment.kod || "",
            platybaDatum: formatDate(payment.datVyst),
            platybaPartka: payment.sumCelkem?.toString() || "0",
            platbaVS: varSym,
            platbaFirma: payment["firma@showAs"] || "",
            platybaTyp: payment["typPohybuK@showAs"] || "",
            platybaPoplis: payment.popis || "",
            fakturaKod: invoice.kod || "",
            fakturaTyp: invoice._type || "",
            fakturaDatum: formatDate(invoice.datVyst),
            fakturaSplatnost: formatDate(invoice.datSplat),
            fakturaCastka: invoice.sumCelkem?.toString() || "0",
            fakturaVS: invoice.varSym?.toString() || "",
            fakturaFirma: invoice["firma@showAs"] || "",
            fakturaStav: invoice["stavUhrK@showAs"] || "",
          });
        }
      }
    }

    console.log(`[Export] Sestaveno ${exportData.length} řádků za ${Date.now() - startTime}ms`);

    // 5. Vygenerovat CSV
    const csv = generateCSV(exportData);

    const totalTime = Date.now() - startTime;
    console.log(`[Export] Hotovo za ${totalTime}ms (${(totalTime / 1000).toFixed(1)}s)`);

    // 6. Vrátit jako CSV file
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="nesparovane-platby-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
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
 * Formátování data pro CSV
 */
function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "";
  const clean = dateStr.split("+")[0].split("T")[0];
  return clean;
}

/**
 * Generování CSV z dat
 */
function generateCSV(data: Array<Record<string, string>>): string {
  if (data.length === 0) {
    return "Žádná data k exportu";
  }

  // Hlavička
  const headers = [
    "Platba - Kód",
    "Platba - Datum",
    "Platba - Částka",
    "Platba - VS",
    "Platba - Firma",
    "Platba - Typ",
    "Platba - Popis",
    "Faktura - Kód",
    "Faktura - Typ",
    "Faktura - Datum vystavení",
    "Faktura - Datum splatnosti",
    "Faktura - Částka",
    "Faktura - VS",
    "Faktura - Firma",
    "Faktura - Stav úhrady",
  ];

  // BOM pro správné zobrazení UTF-8 v Excelu
  const bom = "\uFEFF";

  const headerRow = headers.join(";");

  const dataRows = data.map((row) => {
    return [
      escapeCsvValue(row.platbaKod),
      escapeCsvValue(row.platybaDatum),
      escapeCsvValue(row.platybaPartka),
      escapeCsvValue(row.platbaVS),
      escapeCsvValue(row.platbaFirma),
      escapeCsvValue(row.platybaTyp),
      escapeCsvValue(row.platybaPoplis),
      escapeCsvValue(row.fakturaKod),
      escapeCsvValue(row.fakturaTyp),
      escapeCsvValue(row.fakturaDatum),
      escapeCsvValue(row.fakturaSplatnost),
      escapeCsvValue(row.fakturaCastka),
      escapeCsvValue(row.fakturaVS),
      escapeCsvValue(row.fakturaFirma),
      escapeCsvValue(row.fakturaStav),
    ].join(";");
  });

  return bom + [headerRow, ...dataRows].join("\n");
}

/**
 * Escapování hodnoty pro CSV (ošetření čárek, uvozovek, nových řádků)
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
