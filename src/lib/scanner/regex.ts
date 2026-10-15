import type { SecretIssue } from "@/types";
import { maskSecret } from "@/lib/utils";
import { findHighEntropyTokens } from "./entropy";
import type { RegexRule, ScannedFile } from "./types";

// ---------------------------------------------------------------------------
// Detection rules. Ordered roughly by confidence. Patterns are intentionally
// conservative to keep false positives low during a live demo.
// ---------------------------------------------------------------------------
export const RULES: RegexRule[] = [
  {
    id: "aws-access-key-id",
    type: "AWS Access Key ID",
    severity: "CRITICAL",
    pattern: /\b((?:AKIA|ASIA|ABIA|ACCA)[0-9A-Z]{16})\b/g,
    explanation:
      "An AWS access key ID was committed. Paired with a secret key it grants full programmatic access to your AWS account.",
    remediation:
      "Deactivate the key in AWS IAM immediately, rotate it, and load credentials from environment variables or AWS SSM/Secrets Manager instead.",
  },
  {
    id: "aws-secret-access-key",
    type: "AWS Secret Access Key",
    severity: "CRITICAL",
    pattern:
      /(?:aws_secret_access_key|AWS_SECRET_ACCESS_KEY)\s*[=:]\s*['"]?([A-Za-z0-9/+=]{40})['"]?/g,
    explanation:
      "The AWS secret access key is present in the source. This is the sensitive half of an AWS credential pair.",
    remediation:
      "Rotate the access key in AWS IAM, purge it from git history (git filter-repo), and store it in a secrets manager.",
  },
  {
    id: "github-token",
    type: "GitHub Token",
    severity: "CRITICAL",
    pattern: /\b(gh[pousr]_[A-Za-z0-9]{36,255})\b/g,
    explanation:
      "A GitHub personal access / OAuth / app token was committed, allowing repository read or write access.",
    remediation:
      "Revoke the token at https://github.com/settings/tokens and use GitHub Actions secrets or a secrets manager.",
  },
  {
    id: "github-fine-grained-pat",
    type: "GitHub Fine-Grained PAT",
    severity: "CRITICAL",
    pattern: /\b(github_pat_[A-Za-z0-9_]{22,255})\b/g,
    explanation:
      "A fine-grained GitHub personal access token was committed. It can carry scoped write access to repositories.",
    remediation:
      "Revoke the token in GitHub developer settings and inject it at runtime via CI secrets.",
  },
  {
    id: "slack-token",
    type: "Slack Token",
    severity: "HIGH",
    pattern: /\b(xox[baprs]-[A-Za-z0-9-]{10,})\b/g,
    explanation:
      "A Slack API token was committed. It can be used to read messages or post as your workspace bots.",
    remediation:
      "Revoke the token in the Slack app settings, rotate it, and store the new value as an environment variable.",
  },
  {
    id: "google-api-key",
    type: "Google API Key",
    severity: "HIGH",
    pattern: /\b(AIza[0-9A-Za-z\-_]{35,})\b/g,
    explanation:
      "A Google API key was committed. Depending on its restrictions it may allow billable API access.",
    remediation:
      "Regenerate the key in Google Cloud Console and add HTTP/referrer restrictions. Prefer workload identity over static keys.",
  },
  {
    id: "stripe-secret-key",
    type: "Stripe Secret Key",
    severity: "CRITICAL",
    pattern: /\b(sk_(?:live|test)_[0-9a-zA-Z]{16,})\b/g,
    explanation:
      "A Stripe secret key was committed. It can create charges, read customers, and issue refunds.",
    remediation:
      "Roll the key in the Stripe dashboard immediately and set it as a server-side environment variable only.",
  },
  {
    id: "sendgrid-api-key",
    type: "SendGrid API Key",
    severity: "HIGH",
    pattern: /\b(SG\.[A-Za-z0-9_\-]{22}\.[A-Za-z0-9_\-]{22})\b/g,
    explanation:
      "A SendGrid API key was committed, allowing the sender to send email on your behalf.",
    remediation: "Delete the key in SendGrid and create a new one stored in an environment variable.",
  },
  {
    id: "private-key-block",
    type: "Private Key",
    severity: "CRITICAL",
    pattern: /(-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----)/g,
    explanation:
      "A private key block was committed. Anyone with this key can impersonate the key holder or decrypt data.",
    remediation:
      "Treat the key as compromised, generate a new key pair, rotate any dependent certificates, and remove it from git history.",
  },
  {
    id: "jwt",
    type: "JSON Web Token",
    severity: "MEDIUM",
    pattern: /\b(eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b/g,
    explanation:
      "A JSON Web Token was committed. If the signing secret is weak or leaked it can be forged; leaked tokens may still be valid until expiry.",
    remediation:
      "Invalidate the token/session, rotate the signing secret, and never commit session tokens.",
  },
  {
    id: "database-url-with-creds",
    type: "Database Connection String",
    severity: "HIGH",
    pattern:
      /\b((?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis|amqp):\/\/[^\s:@/]+:[^\s:@/]+@[^\s'"]+)/g,
    explanation:
      "A database connection string with embedded credentials was committed, exposing username and password.",
    remediation:
      "Rotate the database password, restrict network access, and inject DATABASE_URL from the runtime environment.",
  },
  {
    id: "twilio-account-sid",
    type: "Twilio Account SID",
    severity: "LOW",
    pattern: /\b(AC[a-f0-9]{32})\b/g,
    explanation:
      "A Twilio account SID was committed. While not secret on its own, it aids targeted attacks when combined with an auth token leak.",
    remediation: "Avoid committing account identifiers; load them from the environment.",
  },
  {
    id: "generic-secret-assignment",
    type: "Hardcoded Credential",
    severity: "HIGH",
    pattern:
      /(?:password|passwd|pwd|secret|token|api[_-]?key|apikey|access[_-]?key|client[_-]?secret|auth[_-]?token)\s*[:=]\s*['"]([^'"\n]{8,})['"]/gi,
    skipPlaceholders: true,
    explanation:
      "A credential-like value is hardcoded in the source. Hardcoded secrets are hard to rotate and easy to leak.",
    remediation:
      "Move the value into an environment variable, reference it via process.env, and add the real file to .gitignore. Commit a .env.example instead.",
  },
];

// Values that look like secrets but are actually documentation placeholders.
const PLACEHOLDER_RE =
  /(example|placeholder|your[_-]?|changeme|change[_-]?me|dummy|sample|xxxx|todo|redacted|fake|test[_-]?key|not[_-]?a[_-]?real|<[^>]+>)/i;

function isPlaceholder(value: string): boolean {
  return PLACEHOLDER_RE.test(value);
}

function lineOf(content: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < content.length; i++) {
    if (content[i] === "\n") line++;
  }
  return line;
}

/** Does this path look like a committed environment file? */
function isEnvFile(path: string): boolean {
  const base = path.split("/").pop() ?? path;
  return base === ".env" || base.startsWith(".env.") || base === ".envrc";
}

const MAX_ISSUES_PER_FILE = 50;

/**
 * Run all deterministic rules (+ entropy detection) over a set of files.
 */
export function runRegexScan(files: ScannedFile[]): SecretIssue[] {
  const issues: SecretIssue[] = [];

  for (const file of files) {
    let fileIssueCount = 0;
    const matchedValues = new Set<string>();

    // 1. Committed .env file as a whole.
    if (isEnvFile(file.path) && file.content.trim().length > 0) {
      issues.push({
        id: `${file.path}:env-file`,
        file: file.path,
        line: 1,
        type: "Committed .env File",
        severity: "HIGH",
        matchMasked: maskSecret(file.path),
        explanation:
          "A .env file appears to be committed to the repository. Environment files routinely hold database passwords and API keys.",
        remediation:
          "Add .env to .gitignore, commit a sanitized .env.example instead, and rotate every value that was ever committed.",
        source: "regex",
      });
      fileIssueCount++;
    }

    // 2. Pattern-based rules.
    for (const rule of RULES) {
      // Reset lastIndex defensively (regexes are module-level/global).
      rule.pattern.lastIndex = 0;
      for (const match of file.content.matchAll(rule.pattern)) {
        if (fileIssueCount >= MAX_ISSUES_PER_FILE) break;
        const value = match[1] ?? match[0];
        if (rule.skipPlaceholders && isPlaceholder(value)) continue;
        matchedValues.add(value);
        const index = match.index ?? 0;
        issues.push({
          id: `${file.path}:${rule.id}:${index}`,
          file: file.path,
          line: lineOf(file.content, index),
          type: rule.type,
          severity: rule.severity,
          matchMasked: maskSecret(value),
          explanation: rule.explanation,
          remediation: rule.remediation,
          source: "regex",
        });
        fileIssueCount++;
      }
    }

    // 3. Entropy-based detection for random-looking strings.
    if (fileIssueCount < MAX_ISSUES_PER_FILE && !isEnvFile(file.path)) {
      for (const { token, index } of findHighEntropyTokens(file.content, matchedValues)) {
        if (fileIssueCount >= MAX_ISSUES_PER_FILE) break;
        if (isPlaceholder(token)) continue;
        issues.push({
          id: `${file.path}:entropy:${index}`,
          file: file.path,
          line: lineOf(file.content, index),
          type: "High-Entropy String",
          severity: "MEDIUM",
          matchMasked: maskSecret(token),
          explanation:
            "A long, high-entropy string was found. Strings like this are frequently randomly generated API keys or secrets.",
          remediation:
            "Confirm whether this is a real secret. If so, rotate it and load it from an environment variable or secrets manager.",
          source: "regex",
        });
        fileIssueCount++;
      }
    }
  }

  return issues;
}
