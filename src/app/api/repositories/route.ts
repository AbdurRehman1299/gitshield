import { NextResponse } from "next/server";
import { listRepositories } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/repositories — all repositories GitShield has scanned. */
export async function GET() {
  try {
    const repositories = await listRepositories();
    return NextResponse.json({ count: repositories.length, repositories });
  } catch (error) {
    console.error("[repositories] failed:", error);
    return NextResponse.json({ error: "Failed to load repositories." }, { status: 500 });
  }
}
