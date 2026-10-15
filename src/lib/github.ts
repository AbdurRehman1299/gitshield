import type { ScannedFile } from "./scanner/types";

const GITHUB_API = "https://api.github.com";
const RAW_HOST = "https://raw.githubusercontent.com";

function envInt(name: string, fallback: number): number {
  const n = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const MAX_REPO_FILES = () => envInt("MAX_REPO_FILES", 40);
const MAX_FILE_BYTES = () => envInt("MAX_FILE_BYTES", 102_400);
const MAX_TOTAL_BYTES = () => envInt("MAX_TOTAL_BYTES", 2_097_152);

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "GitShield-Scanner",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) {
    h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return h;
}

export interface ParsedRepo {
  owner: string;
  repo: string;
}

/** Accept full URLs, git@ SSH remotes, or a bare "owner/repo" string. */
export function parseRepoUrl(input: string): ParsedRepo | null {
  const value = input.trim();
  if (!value) return null;

  const ssh = value.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/i);
  if (ssh) return { owner: ssh[1], repo: ssh[2] };

  const bare = value.match(/^([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
  if (bare && !bare[1].includes(".")) return { owner: bare[1], repo: bare[2] };

  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    if (!/(^|\.)github\.com$/i.test(url.hostname)) return null;
    const parts = url.pathname.replace(/^\/+|\/+$/g, "").split("/");
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1].replace(/\.git$/i, "") };
  } catch {
    return null;
  }
}

const ALLOWED_EXTENSIONS = new Set([
  "env", "js", "jsx", "mjs", "cjs", "ts", "tsx", "json", "py", "rb", "go",
  "rs", "java", "kt", "php", "sh", "bash", "zsh", "yml", "yaml", "toml",
  "ini", "cfg", "conf", "properties", "tf", "tfvars", "sql", "cs", "c",
  "cpp", "h", "hpp", "swift", "scala", "gradle", "xml", "pem", "key", "txt",
  "dockerfile", "npmrc", "gitconfig", "babelrc", "eslintrc",
]);

const ALLOWED_BASENAMES = new Set([
  ".env", ".env.local", ".env.production", ".env.development", ".env.example",
  ".npmrc", ".babelrc", ".eslintrc", ".gitconfig", "dockerfile", "makefile",
  "id_rsa", "id_ed25519", "credentials",
]);

const IGNORED_SEGMENTS = [
  "node_modules/", "dist/", "build/", ".next/", "vendor/", "coverage/",
  ".git/", "target/", "__pycache__/", ".venv/", "venv/", "test/", "tests/",
  "fixtures/", "examples/", "docs/",
];

function isScannable(path: string): boolean {
  const lower = path.toLowerCase();
  if (IGNORED_SEGMENTS.some((seg) => lower.includes(seg))) return false;

  const base = lower.split("/").pop() ?? lower;
  if (ALLOWED_BASENAMES.has(base)) return true;
  if (base.endsWith(".lock") || base.endsWith(".min.js") || base.endsWith(".map")) {
    return false;
  }

  const ext = base.includes(".") ? base.split(".").pop()! : "";
  if (base.startsWith(".env.") && ext !== "example") return true;
  return ALLOWED_EXTENSIONS.has(ext);
}

/** Give .env and config files priority so they are never dropped by the cap. */
function priority(path: string): number {
  const base = path.toLowerCase().split("/").pop() ?? path;
  if (base === ".env" || base.startsWith(".env.")) return 0;
  if (/(^|\.)(env|key|pem|credentials)$/.test(base)) return 1;
  if (/(json|ya?ml|t(o|)ml|ini|cfg|conf|properties)$/.test(base)) return 2;
  if (/(dockerfile|makefile)$/.test(base)) return 3;
  return 4;
}

interface TreeEntry {
  path: string;
  type: string;
  size?: number;
}

/** Fetch metadata for a repository (used to resolve the default branch). */
async function getRepoMeta(owner: string, repo: string): Promise<{ default_branch: string }> {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: headers(),
    cache: "no-store",
  });
  if (res.status === 404) {
    throw new Error(`Repository "${owner}/${repo}" was not found (or is private).`);
  }
  if (res.status === 403) {
    throw new Error("GitHub API rate limit exceeded. Set GITHUB_TOKEN to raise the limit.");
  }
  if (!res.ok) {
    throw new Error(`GitHub API error (${res.status}) while loading repository metadata.`);
  }
  return res.json();
}

/** Recursively list every blob in the repository for a given ref. */
async function listTree(owner: string, repo: string, ref: string): Promise<TreeEntry[]> {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
    { headers: headers(), cache: "no-store" },
  );
  if (!res.ok) {
    throw new Error(`GitHub API error (${res.status}) while listing repository files.`);
  }
  const data = (await res.json()) as { tree?: TreeEntry[] };
  return data.tree ?? [];
}

/** Fetch raw text for a single file from the fast raw.githubusercontent CDN. */
async function fetchRawFile(owner: string, repo: string, ref: string, path: string): Promise<string> {
  const url = `${RAW_HOST}/${owner}/${repo}/${encodeURIComponent(ref)}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Unable to download ${path} (${res.status}).`);
  }
  return res.text();
}

export interface RepoFilesResult {
  files: ScannedFile[];
  branch: string;
  skipped: number;
  warnings: string[];
}

/**
 * Download the scannable text files of a public GitHub repository.
 * Files are prioritised (.env first), size-capped, and downloaded in parallel.
 */
export async function fetchRepoFiles(owner: string, repo: string): Promise<RepoFilesResult> {
  const warnings: string[] = [];
  const meta = await getRepoMeta(owner, repo);
  const branch = meta.default_branch || "main";

  const tree = await listTree(owner, repo, branch);
  const maxFileBytes = MAX_FILE_BYTES();
  const maxTotalBytes = MAX_TOTAL_BYTES();
  const maxFiles = MAX_REPO_FILES();

  const candidates = tree
    .filter((e) => e.type === "blob" && typeof e.path === "string")
    .filter((e) => isScannable(e.path))
    .filter((e) => (e.size ?? 0) > 0 && (e.size ?? 0) <= maxFileBytes)
    .sort((a, b) => priority(a.path) - priority(b.path))
    .slice(0, maxFiles);

  const skipped = tree.filter((e) => e.type === "blob").length - candidates.length;

  const files: ScannedFile[] = [];
  let totalBytes = 0;

  // Download in small batches to stay friendly to the raw CDN.
  const BATCH = 6;
  for (let i = 0; i < candidates.length; i += BATCH) {
    const batch = candidates.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(async (entry) => {
        const content = await fetchRawFile(owner, repo, branch, entry.path);
        const bytes = new TextEncoder().encode(content).length;
        return { path: entry.path, content, bytes };
      }),
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        if (totalBytes + result.value.bytes > maxTotalBytes) {
          warnings.push("Total size limit reached; some files were not scanned.");
          return { files, branch, skipped, warnings };
        }
        totalBytes += result.value.bytes;
        files.push({ path: result.value.path, content: result.value.content });
      }
    }
  }

  if (files.length === 0) {
    warnings.push("No scannable text files were found in this repository.");
  }

  return { files, branch, skipped, warnings };
}
