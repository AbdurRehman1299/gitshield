export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type IssueSource = "regex" | "groq";

/** A single leaked secret detected in a file. */
export interface SecretIssue {
  id: string;
  /** Path of the file the issue was found in (or the paste label). */
  file: string;
  /** 1-based line number, or null when it could not be determined. */
  line: number | null;
  /** Short machine-ish label, e.g. "AWS Access Key". */
  type: string;
  severity: Severity;
  /** Masked evidence — never store/render the raw secret. */
  matchMasked: string;
  /** Why this is dangerous. */
  explanation: string;
  /** Concrete fix steps. */
  remediation: string;
  source: IssueSource;
}

export type ScanMode = "repo" | "paste";

export interface ScanInput {
  mode: ScanMode;
  /** Required when mode === "repo". */
  repoUrl?: string;
  /** Required when mode === "paste". */
  code?: string;
  /** Optional filename for pasted content, e.g. ".env". */
  filename?: string;
  /** Optional human label used as the repository name. */
  label?: string;
}

export interface ScanAnalysis {
  name: string;
  url: string;
  sourceType: "REPOSITORY" | "PASTE";
  filesScanned: number;
  issues: SecretIssue[];
  aiSummary: string | null;
  groqUsed: boolean;
  warnings: string[];
}

/** Shape returned by POST /api/scan. */
export interface ScanApiResponse {
  scanId: string;
  status: "SAFE" | "VULNERABLE";
  riskScore: number;
  filesScanned: number;
  issues: SecretIssue[];
  aiSummary: string | null;
  groqUsed: boolean;
  warnings: string[];
}
