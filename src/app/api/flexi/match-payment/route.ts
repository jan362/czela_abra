import { NextRequest, NextResponse } from "next/server";
import { getFlexiClient } from "@/lib/flexi-client";
import { FlexiApiError } from "@/lib/flexi-errors";
import { auth } from "@/lib/auth";

/**
 * POST /api/flexi/match-payment
 *
 * Matches a bank payment to one or more invoices using Flexi's sparovani mechanism.
 *
 * Body: {
 *   bankId: number | string,      // Bank record ID
 *   invoices: Array<{
 *     id: string,                  // Invoice code like "code:VF1-0001/2024"
 *     type: "faktura-vydana" | "faktura-prijata",
 *     amount?: number              // Optional: partial payment amount
 *   }>,
 *   remainder: "ne" | "ignorovat" | "zauctovat" | "castecnaUhrada" | "castecnaUhradaNeboIgnorovat"
 * }
 */
export async function POST(request: NextRequest) {
  // Verify authentication
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { bankId, invoices, remainder = "ignorovat" } = body;

    if (!bankId || !invoices || !Array.isArray(invoices) || invoices.length === 0) {
      return NextResponse.json(
        { error: "Missing bankId or invoices array" },
        { status: 400 }
      );
    }

    const client = getFlexiClient();

    // Build sparovani payload
    // Multiple invoices: uhrazovanaFak can be an array
    const uhrazovanaFak = invoices.map(
      (inv: { id: string; type: string; amount?: number }) => {
        const entry: Record<string, unknown> = {
          "@type": inv.type,
        };
        if (inv.amount) {
          entry["@castka"] = String(inv.amount);
        }
        // The invoice reference goes as the value
        entry["$"] = inv.id;
        return entry;
      }
    );

    const payload = {
      winstrom: {
        banka: [
          {
            id: bankId,
            sparovani: {
              uhrazovanaFak:
                uhrazovanaFak.length === 1 ? uhrazovanaFak[0] : uhrazovanaFak,
              zbytek: remainder,
            },
          },
        ],
      },
    };

    // Send PUT request to update the bank record with matching
    const baseUrl = process.env.FLEXI_BASE_URL;
    const company = process.env.FLEXI_COMPANY;
    const url = `${baseUrl}/c/${company}/banka.json`;

    const username = process.env.FLEXI_USERNAME!;
    const password = process.env.FLEXI_PASSWORD!;
    const authHeader =
      "Basic " +
      Buffer.from(`${username}:${password}`).toString("base64");

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            result?.winstrom?.message || `Flexi API error ${response.status}`,
          details: result,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err) {
    if (err instanceof FlexiApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status }
      );
    }
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
