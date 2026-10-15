"use server";

import { revalidatePath } from "next/cache";
import { analyzeAndPersist } from "@/lib/scanner";
import { listScans, type ScanWithRepo } from "@/lib/queries";
import type { ScanApiResponse, ScanInput } from "@/types";

/**
 * Server Action used by the scan form. Runs the same pipeline as POST /api/scan
 * and revalidates the dashboard so the new result appears immediately.
 */
export async function runScanAction(input: ScanInput): Promise<ScanApiResponse> {
  const result = await analyzeAndPersist(input);
  revalidatePath("/");
  revalidatePath("/scans");
  return result;
}

/** Server Action returning recent scan history. */
export async function getScansAction(limit = 50): Promise<ScanWithRepo[]> {
  return listScans(limit);
}
