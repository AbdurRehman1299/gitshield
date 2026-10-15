import prisma from "./prisma";
import type { SecretIssue, Severity } from "@/types";

export interface ScanWithRepo {
  id: string;
  status: "SAFE" | "VULNERABLE";
  sourceType: "REPOSITORY" | "PASTE";
  issuesFound: SecretIssue[];
  filesScanned: number;
  riskScore: number;
  aiSummary: string | null;
  createdAt: Date;
  repository: { id: string; name: string; url: string };
}

function toIssues(value: unknown): SecretIssue[] {
  return Array.isArray(value) ? (value as SecretIssue[]) : [];
}

export async function listScans(limit = 50): Promise<ScanWithRepo[]> {
  const scans = await prisma.scanResult.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      repository: { select: { id: true, name: true, url: true } },
    },
  });
  return scans.map((s) => ({ ...s, issuesFound: toIssues(s.issuesFound) }));
}

export async function getScan(id: string): Promise<ScanWithRepo | null> {
  const scan = await prisma.scanResult.findUnique({
    where: { id },
    include: { repository: { select: { id: true, name: true, url: true } } },
  });
  if (!scan) return null;
  return { ...scan, issuesFound: toIssues(scan.issuesFound) };
}

export interface DashboardData {
  totals: {
    scans: number;
    vulnerable: number;
    safe: number;
    avgRisk: number;
  };
  recentScans: ScanWithRepo[];
  criticalAlerts: { issue: SecretIssue; repoName: string; scanId: string; createdAt: Date }[];
  severityCounts: Record<Severity, number>;
}

export async function getDashboardData(): Promise<DashboardData> {
  const [scans, vulnerable, safe, riskAgg, recent] = await Promise.all([
    prisma.scanResult.count(),
    prisma.scanResult.count({ where: { status: "VULNERABLE" } }),
    prisma.scanResult.count({ where: { status: "SAFE" } }),
    prisma.scanResult.aggregate({ _avg: { riskScore: true } }),
    listScans(8),
  ]);

  const severityCounts: Record<Severity, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };

  const criticalAlerts: DashboardData["criticalAlerts"] = [];
  for (const scan of recent) {
    for (const issue of scan.issuesFound) {
      severityCounts[issue.severity] = (severityCounts[issue.severity] ?? 0) + 1;
      if (
        (issue.severity === "CRITICAL" || issue.severity === "HIGH") &&
        criticalAlerts.length < 6
      ) {
        criticalAlerts.push({
          issue,
          repoName: scan.repository.name,
          scanId: scan.id,
          createdAt: scan.createdAt,
        });
      }
    }
  }

  return {
    totals: {
      scans,
      vulnerable,
      safe,
      avgRisk: Math.round(riskAgg._avg.riskScore ?? 0),
    },
    recentScans: recent,
    criticalAlerts,
    severityCounts,
  };
}

export async function listRepositories() {
  return prisma.repository.findMany({
    orderBy: { lastScannedAt: "desc" },
    include: { _count: { select: { scans: true } } },
  });
}
