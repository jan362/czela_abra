import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * GET /api/flexi/find-invoices?varSym=100012024&type=vydane|prijate|all
 *
 * Finds unpaid invoices matching a variable symbol.
 * Returns invoices from faktura-vydana, faktura-prijata, or both.
 * Query parameters:
 * - varSym: variable symbol to search for
 * - type: "vydane" (issued), "prijate" (received), or "all" (default: "all")
 */
export async function GET(request: NextRequest) {
  // Verify authentication
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const varSym = request.nextUrl.searchParams.get("varSym");
  const type = request.nextUrl.searchParams.get("type") || "all";

  if (!varSym) {
    return NextResponse.json(
      { error: "Missing varSym parameter" },
      { status: 400 }
    );
  }

  const baseUrl = process.env.FLEXI_BASE_URL;
  const company = process.env.FLEXI_COMPANY;
  const username = process.env.FLEXI_USERNAME!;
  const password = process.env.FLEXI_PASSWORD!;
  const authHeader =
    "Basic " +
    Buffer.from(`${username}:${password}`).toString("base64");

  const headers = {
    Authorization: authHeader,
    Accept: "application/json",
  };

  try {
    // Prepare API calls based on type filter
    const promises: Promise<Response>[] = [];

    if (type === "vydane" || type === "all") {
      promises.push(
        fetch(
          `${baseUrl}/c/${company}/faktura-vydana/(varSym = '${varSym}').json?detail=custom:id,kod,datVyst,datSplat,sumCelkem,sumCelkemMen,varSym,stavUhrK,firma,mena,popis,zbpisPar&add-row-count=true&limit=100`,
          { headers }
        )
      );
    }

    if (type === "prijate" || type === "all") {
      promises.push(
        fetch(
          `${baseUrl}/c/${company}/faktura-prijata/(varSym = '${varSym}').json?detail=custom:id,kod,datVyst,datSplat,sumCelkem,sumCelkemMen,varSym,stavUhrK,firma,mena,popis,cisDosle,zbpisPar&add-row-count=true&limit=100`,
          { headers }
        )
      );
    }

    const responses = await Promise.all(promises);
    const dataList = await Promise.all(responses.map(r => r.json()));

    // Process results based on type
    let issuedInvoices: any[] = [];
    let receivedInvoices: any[] = [];
    let issuedData: any = null;
    let receivedData: any = null;

    if (type === "vydane") {
      issuedData = dataList[0];
      issuedInvoices = (issuedData?.winstrom?.["faktura-vydana"] ?? []).map((inv: Record<string, unknown>) => ({
        ...inv,
        _type: "faktura-vydana",
        _typeLabel: "Vydaná faktura",
      }));
    } else if (type === "prijate") {
      receivedData = dataList[0];
      receivedInvoices = (receivedData?.winstrom?.["faktura-prijata"] ?? []).map((inv: Record<string, unknown>) => ({
        ...inv,
        _type: "faktura-prijata",
        _typeLabel: "Přijatá faktura",
      }));
    } else {
      // type === "all"
      issuedData = dataList[0];
      receivedData = dataList[1];
      issuedInvoices = (issuedData?.winstrom?.["faktura-vydana"] ?? []).map((inv: Record<string, unknown>) => ({
        ...inv,
        _type: "faktura-vydana",
        _typeLabel: "Vydaná faktura",
      }));
      receivedInvoices = (receivedData?.winstrom?.["faktura-prijata"] ?? []).map((inv: Record<string, unknown>) => ({
        ...inv,
        _type: "faktura-prijata",
        _typeLabel: "Přijatá faktura",
      }));
    }

    const allInvoices = [...issuedInvoices, ...receivedInvoices];

    return NextResponse.json({
      invoices: allInvoices,
      totalIssued: issuedData?.winstrom?.["@rowCount"] ?? "0",
      totalReceived: receivedData?.winstrom?.["@rowCount"] ?? "0",
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
