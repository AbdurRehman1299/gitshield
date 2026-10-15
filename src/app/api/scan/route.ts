import { NextResponse } from "next/server";
import { analyzeAndPersist } from "@/lib/scanner";
import type { ScanInput } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validate(body: unknown): ScanInput {
  if (typeof body !== "object" || body === null) {
    throw new Error("Request body must be a JSON object.");
  }
  const b = body as Record<string, unknown>;
  const mode = b.mode;
  if (mode !== "repo" && mode !== "paste") {
    throw new Error('Field "mode" must be either "repo" or "paste".');
  }

  const input: ScanInput = {
    mode,
    repoUrl: typeof b.repoUrl === "string" ? b.repoUrl.slice(0, 500) : undefined,
    code: typeof b.code === "string" ? b.code.slice(0, 200_000) : undefined,
    filename: typeof b.filename === "string" ? b.filename.slice(0, 200) : undefined,
    label: typeof b.label === "string" ? b.label.slice(0, 200) : undefined,
  };

  if (mode === "repo" && !input.repoUrl?.trim()) {
    throw new Error("A GitHub repository URL is required.");
  }
  if (mode === "paste" && !input.code?.trim()) {
    throw new Error("Code or a .env snippet is required.");
  }
  return input;
}

/** POST /api/scan — analyse code/repo and persist the result. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  let input: ScanInput;
  try {
    input = validate(body);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  try {
    const result = await analyzeAndPersist(input);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = (error as Error).message || "Scan failed.";
    // GitHub/user errors are client-actionable -> 400; everything else -> 500.
    const status = /repository|rate limit|valid GitHub|required|Paste/i.test(message) ? 400 : 500;
    console.error("[scan] failed:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
