/** A text file that is about to be scanned. */
export interface ScannedFile {
  /** Display path, e.g. "src/config.ts" or ".env". */
  path: string;
  /** Full text content. */
  content: string;
}

/** Definition of a single deterministic detection rule. */
export interface RegexRule {
  /** Stable identifier used for deduping. */
  id: string;
  /** Human readable secret type. */
  type: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  /** Global regex. The first capturing group (if any) is treated as the value. */
  pattern: RegExp;
  explanation: string;
  remediation: string;
  /**
   * When true the rule also matches placeholder-looking values
   * (e.g. "your_api_key_here") and should therefore be filtered out.
   */
  skipPlaceholders?: boolean;
}
