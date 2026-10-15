import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isGroqConfigured } from "@/lib/groq";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/health — liveness probe for Docker Compose / load balancers. */
export async function GET() {
  let database = "down";
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "up";
  } catch (error) {
    console.error("[health] database check failed:", error);
  }

  return NextResponse.json(
    {
      status: database === "up" ? "ok" : "degraded",
      services: {
        database,
        groq: isGroqConfigured() ? "configured" : "not-configured",
      },
      timestamp: new Date().toISOString(),
    },
    { status: database === "up" ? 200 : 503 },
  );
}
