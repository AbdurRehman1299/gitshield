import { NextResponse } from "next/server";
import { getScan } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/scans/:id — full detail for a single scan. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const scan = await getScan(id);
    if (!scan) {
      return NextResponse.json({ error: "Scan not found." }, { status: 404 });
    }
    return NextResponse.json(scan);
  } catch (error) {
    console.error("[scan:id] failed:", error);
    return NextResponse.json({ error: "Failed to load scan." }, { status: 500 });
  }
}
