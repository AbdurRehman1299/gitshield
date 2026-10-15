import type { Prisma } from "@prisma/client";
import type { ScanAnalysis, ScanApiResponse, ScanInput, SecretIssue } from "@/types";
import { computeRiskScore } from "@/lib/utils";
import { analyzeWithGroq } from "@/lib/groq";
import { fetchRepoFiles, parseRepoUrl } from "@/lib/github";
import { runRegexScan } from "./regex";
import type { ScannedFile } from "./types";

function normalizeType(type: string): string {
  return type.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Merge regex + AI findings, removing obvious duplicates by file/line/type. */
function mergeIssues(regexIssues: SecretIssue[], aiIssues: SecretIssue[]): SecretIssue[] {
  const merged = new Map<string, SecretIssue>();

  const key = (i: SecretIssue) => `${i.file}::${i.line ?? "?"}::${normalizeType(i.type)}`;

  for (const issue of regexIssues) {
    merged.set(key(issue), issue);
  }
  for (const issue of aiIssues) {
    const k = key(issue);
    // The AI issue carries remediation prose, so it wins ties.
    const existing = merged.get(k);
    if (!existing || issue.source === "groq") {
      merged.set(k, issue);
    }
  }

  // Sort by severity then file/line for a stable, readable order.
  const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;
  return [...merged.values()].sort((a, b) => {
    if (order[a.severity] !== order[b.severity]) return order[a.severity] - order[b.severity];
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    return (a.line ?? 0) - (b.line ?? 0);
  });
}

/** Resolve the scan input into a name/url plus the files to inspect. */
async function collectFiles(input: ScanInput): Promise<{
  name: string;
  url: string;
  sourceType: "REPOSITORY" | "PASTE";
  files: ScannedFile[];
  warnings: string[];
}> {
  if (input.mode === "repo") {
    const parsed = parseRepoUrl(input.repoUrl ?? "");
    if (!parsed) {
      throw new Error("Enter a valid GitHub repository (e.g. https://github.com/owner/repo).");
    }
    const { owner, repo } = parsed;
    const { files, branch, warnings } = await fetchRepoFiles(owner, repo);
    return {
      name: `${owner}/${repo}`,
      url: `https://github.com/${owner}/${repo}`,
      sourceType: "REPOSITORY",
      files,
      warnings: [`Scanned the "${branch}" branch.`, ...warnings],
    };
  }

  const code = input.code ?? "";
  if (!code.trim()) {
    throw new Error("Paste some code or a .env snippet to scan.");
  }
  const filename = input.filename?.trim() || "snippet.txt";
  const label = input.label?.trim() || filename;
  return {
    name: label,
    url: `paste://${encodeURIComponent(filename.toLowerCase())}`,
    sourceType: "PASTE",
    files: [{ path: filename, content: code }],
    warnings: [],
  };
}

/**
 * Run a full analysis without touching the database. Shared by the API route
 * and the server action.
 */
export async function analyze(input: ScanInput): Promise<ScanAnalysis> {
  const { name, url, sourceType, files, warnings } = await collectFiles(input);

  const regexIssues = runRegexScan(files);

  let aiIssues: SecretIssue[] = [];
  let aiSummary: string | null = null;
  let groqUsed = false;

  const groqResult = await analyzeWithGroq(files);
  if (groqResult) {
    groqUsed = true;
    aiIssues = groqResult.issues;
    aiSummary = groqResult.summary;
    warnings.push(...groqResult.warnings);
  } else {
    warnings.push(
      "AI analysis unavailable (GROQ_API_KEY not set or Groq error). Showing deterministic regex findings only.",
    );
  }

  const issues = mergeIssues(regexIssues, aiIssues);

  return {
    name,
    url,
    sourceType,
    filesScanned: files.length,
    issues,
    aiSummary,
    groqUsed,
    warnings,
  };
}

/** Persist an analysis to the database and return the API-friendly response. */
export async function analyzeAndPersist(input: ScanInput): Promise<ScanApiResponse> {
  const { prisma } = await import("@/lib/prisma");
  const analysis = await analyze(input);

  const status = analysis.issues.length > 0 ? "VULNERABLE" : "SAFE";
  const riskScore = computeRiskScore(analysis.issues);

  const repository = await prisma.repository.upsert({
    where: { url: analysis.url },
    update: { name: analysis.name, lastScannedAt: new Date() },
    create: { name: analysis.name, url: analysis.url, lastScannedAt: new Date() },
  });

  const scan = await prisma.scanResult.create({
    data: {
      repositoryId: repository.id,
      status,
      sourceType: analysis.sourceType,
      issuesFound: analysis.issues as unknown as Prisma.InputJsonValue,
      filesScanned: analysis.filesScanned,
      riskScore,
      aiSummary: analysis.aiSummary,
    },
  });

  return {
    scanId: scan.id,
    status,
    riskScore,
    filesScanned: analysis.filesScanned,
    issues: analysis.issues,
    aiSummary: analysis.aiSummary,
    groqUsed: analysis.groqUsed,
    warnings: analysis.warnings,
  };
}
