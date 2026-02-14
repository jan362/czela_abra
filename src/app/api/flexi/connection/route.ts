import { NextResponse } from "next/server";
import { getFlexiClient } from "@/lib/flexi-client";
import { auth } from "@/lib/auth";

/**
 * Test connection to the Flexi server.
 * Returns { ok: true, version, company } on success.
 */
export async function GET() {
  // Verify authentication
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = getFlexiClient();
    const result = await client.testConnection();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Configuration error",
      },
      { status: 500 }
    );
  }
}
