import Groq from "groq-sdk";
import type { SecretIssue, Severity } from "@/types";
import { maskSecret } from "@/lib/utils";
import type { ScannedFile } from "./scanner/types";

const PRIMARY_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const FALLBACK_MODEL = process.env.GROQ_FALLBACK_MODEL || "llama-3.1-8b-instant";
const MAX_GROQ_CHARS = Number.parseInt(process.env.MAX_GROQ_CHARS ?? "", 10) || 24_000;

export function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().length > 0);
}

let client: Groq | null = null;
function getClient(): Groq | null {
  if (!isGroqConfigured()) return null;
  if (!client) {
    client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return client;
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are "GitShield", an expert application-security engineer specialising in secret detection and incident response. You audit source code and configuration files for accidentally committed credentials.

You MUST respond with a SINGLE valid JSON object and nothing else. Do not wrap the JSON in markdown fences. Do not add prose before or after the JSON.

The JSON object MUST match this exact schema:
{
  "summary": string,                 // 1-3 sentence executive summary of the security posture
  "issues": [
    {
      "file": string,                // path of the file (use the provided path exactly)
      "line": number | null,         // 1-based line number, or null if unknown
      "type": string,                // e.g. "AWS Access Key", "Database Password"
      "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      "evidence": string,            // the offending value, MASKED so it is not usable (e.g. "AKIA••••EXAMPLE")
      "explanation": string,         // why this is dangerous, one or two sentences
      "remediation": string          // a concrete, actionable fix
    }
  ],
  "generalAdvice": string            // paragraph advising on .env.example, .gitignore, secret rotation and git history cleanup
}

Rules:
1. Never output a usable secret. Always mask the middle of any credential in "evidence".
2. Report real, high-signal findings only. Do NOT report placeholder values such as "your_api_key_here", "changeme", "\${VAR}", or "<TOKEN>".
3. Assign severity by real-world impact: CRITICAL for cloud/provider credentials and private keys, HIGH for other usable tokens and database credentials, MEDIUM for JWTs and generic high-entropy strings, LOW for low-impact identifiers.
4. If you find no secrets, return an empty "issues" array and say so in "summary".
5. Line numbers are 1-based and relative to the start of each file block.`;

interface GroqRawIssue {
  file?: unknown;
  line?: unknown;
  type?: unknown;
  severity?: unknown;
  evidence?: unknown;
  explanation?: unknown;
  remediation?: unknown;
}

const VALID_SEVERITIES: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

function coerceSeverity(value: unknown): Severity {
  const upper = String(value ?? "").toUpperCase() as Severity;
  return VALID_SEVERITIES.includes(upper) ? upper : "MEDIUM";
}

function coerceLine(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Robustly extract a JSON object from a model response. */
function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Model did not return valid JSON.");
  }
}

// ---------------------------------------------------------------------------
// Calls
// ---------------------------------------------------------------------------
async function callGroq(model: string, fileBlocks: string): Promise<string> {
  const groq = getClient();
  if (!groq) throw new Error("Groq is not configured.");

  const completion = await groq.chat.completions.create({
    model,
    temperature: 0,
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Audit the following files for hardcoded secrets. Return ONLY the JSON object described in the system prompt.\n\n${fileBlocks}`,
      },
    ],
  });

  return completion.choices[0]?.message?.content ?? "";
}

function formatFileBlocks(files: ScannedFile[]): string {
  return files
    .map((f) => `<file path="${f.path}">\n${f.content}\n</file>`)
    .join("\n\n");
}

/** Split files into chunks that respect the character budget. */
function chunkFiles(files: ScannedFile[]): ScannedFile[][] {
  const chunks: ScannedFile[][] = [];
  let current: ScannedFile[] = [];
  let size = 0;

  for (const file of files) {
    // Truncate any single file that alone exceeds the budget.
    const content =
      file.content.length > MAX_GROQ_CHARS
        ? file.content.slice(0, MAX_GROQ_CHARS)
        : file.content;
    const entry = { path: file.path, content };
    if (size + entry.content.length > MAX_GROQ_CHARS && current.length > 0) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(entry);
    size += entry.content.length;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

export interface GroqAnalysis {
  issues: SecretIssue[];
  summary: string | null;
  warnings: string[];
}

/**
 * Analyse files with Groq. Returns null when Groq is not configured or every
 * call failed — callers should then fall back to regex-only results.
 */
export async function analyzeWithGroq(files: ScannedFile[]): Promise<GroqAnalysis | null> {
  const groq = getClient();
  if (!groq || files.length === 0) return null;

  const warnings: string[] = [];
  const issues: SecretIssue[] = [];
  const summaries: string[] = [];
  const advice: string[] = [];
  let succeeded = false;

  for (const chunk of chunkFiles(files).slice(0, 5)) {
    const blocks = formatFileBlocks(chunk);
    let raw = "";
    try {
      raw = await callGroq(PRIMARY_MODEL, blocks);
    } catch (primaryError) {
      warnings.push(
        `Primary model failed (${(primaryError as Error).message}); retried with ${FALLBACK_MODEL}.`,
      );
      try {
        raw = await callGroq(FALLBACK_MODEL, blocks);
      } catch (fallbackError) {
        warnings.push(`Groq analysis failed: ${(fallbackError as Error).message}`);
        continue;
      }
    }

    try {
      const parsed = extractJson(raw) as {
        summary?: unknown;
        issues?: unknown;
        generalAdvice?: unknown;
      };
      succeeded = true;
      if (typeof parsed.summary === "string" && parsed.summary) summaries.push(parsed.summary);
      if (typeof parsed.generalAdvice === "string" && parsed.generalAdvice) {
        advice.push(parsed.generalAdvice);
      }
      const rawIssues = Array.isArray(parsed.issues) ? (parsed.issues as GroqRawIssue[]) : [];
      rawIssues.forEach((item, idx) => {
        const evidence = String(item.evidence ?? "");
        issues.push({
          id: `groq:${chunk[0]?.path ?? "chunk"}:${idx}:${Date.now()}`,
          file: String(item.file ?? chunk[0]?.path ?? "unknown"),
          line: coerceLine(item.line),
          type: String(item.type ?? "Other Secret"),
          severity: coerceSeverity(item.severity),
          // Defensively mask even if the model ignored the instruction.
          matchMasked: evidence ? maskSecret(evidence) : "••••",
          explanation: String(item.explanation ?? "Potential hardcoded secret detected."),
          remediation: String(item.remediation ?? "Rotate the value and move it to an environment variable."),
          source: "groq",
        });
      });
    } catch (parseError) {
      warnings.push(`Could not parse Groq response: ${(parseError as Error).message}`);
    }
  }

  if (!succeeded) return null;

  const summaryParts = [...summaries];
  if (advice.length > 0) summaryParts.push(advice.join(" "));
  return { issues, summary: summaryParts.join(" ") || null, warnings };
}
