import { NextResponse } from "next/server";
import { listScans } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/scans — recent scan history (newest first). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number.parseInt(searchParams.get("limit") ?? "50", 10) || 50, 200);
  try {
    const scans = await listScans(limit);
    return NextResponse.json({ count: scans.length, scans });
  } catch (error) {
    console.error("[scans] failed:", error);
    return NextResponse.json({ error: "Failed to load scans." }, { status: 500 });
  }
}
