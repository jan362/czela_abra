import { NextRequest, NextResponse } from "next/server";
import { getFlexiClient } from "@/lib/flexi-client";
import { FlexiApiError } from "@/lib/flexi-errors";
import { auth } from "@/lib/auth";

/**
 * Generic CRUD proxy for any Flexi evidence.
 * Browser calls /api/flexi/{evidence}?params and this route
 * securely proxies to the Flexi server with credentials.
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ evidence: string }> }
) {
  // Verify authentication
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { evidence } = await params;
  const searchParams = request.nextUrl.searchParams;

  try {
    const client = getFlexiClient();
    const result = await client.list(evidence, {
      filter: searchParams.get("filter") ?? undefined,
      detail: searchParams.get("detail") ?? "summary",
      limit: searchParams.has("limit")
        ? Number(searchParams.get("limit"))
        : 20,
      start: searchParams.has("start")
        ? Number(searchParams.get("start"))
        : 0,
      order: searchParams.get("order") ?? undefined,
      addRowCount: true,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof FlexiApiError) {
      return NextResponse.json(
        { error: err.message, status: err.status },
        { status: err.status }
      );
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ evidence: string }> }
) {
  // Verify authentication
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { evidence } = await params;

  try {
    const body = await request.json();
    const client = getFlexiClient();
    const result = await client.create(evidence, body);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof FlexiApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status }
      );
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ evidence: string }> }
) {
  // Verify authentication
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { evidence } = await params;
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Missing 'id' query parameter" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const client = getFlexiClient();
    const result = await client.update(evidence, id, body);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof FlexiApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status }
      );
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ evidence: string }> }
) {
  // Verify authentication
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { evidence } = await params;
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Missing 'id' query parameter" },
      { status: 400 }
    );
  }

  try {
    const client = getFlexiClient();
    await client.delete(evidence, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof FlexiApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status }
      );
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
