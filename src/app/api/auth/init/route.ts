import { initializeUserStore } from "@/lib/user-store";
import { NextResponse } from "next/server";

/**
 * Initialize user store with default admin user
 * This runs in Node.js runtime, not Edge Runtime
 */
export async function GET() {
  try {
    await initializeUserStore();
    return NextResponse.json({
      success: true,
      message: "User store initialized successfully"
    });
  } catch (error) {
    console.error("[Auth Init] Failed to initialize user store:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
