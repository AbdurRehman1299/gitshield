"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GitBranch, Loader2, ScanLine, Braces, FileCode2 } from "lucide-react";
import { runScanAction } from "@/actions/scan";
import { cn } from "@/lib/utils";
import type { ScanMode } from "@/types";
import { SAMPLE_ENV } from "@/lib/sample";
import { buttonClass, Card } from "./ui";

export function ScanForm() {
  const router = useRouter();
  const [mode, setMode] = useState<ScanMode>("repo");
  const [repoUrl, setRepoUrl] = useState("");
  const [code, setCode] = useState("");
  const [filename, setFilename] = useState(".env");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const input =
      mode === "repo"
        ? { mode, repoUrl: repoUrl.trim() }
        : { mode, code, filename: filename.trim() || "snippet.txt", label: label.trim() };

    if (mode === "repo" && !repoUrl.trim()) {
      setError("Enter a GitHub repository URL.");
      return;
    }
    if (mode === "paste" && !code.trim()) {
      setError("Paste some code or a .env snippet.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await runScanAction(input);
        router.push(`/scans/${result.scanId}`);
      } catch (err) {
        setError((err as Error).message || "Scan failed. Please try again.");
      }
    });
  }

  const tabs: { id: ScanMode; label: string; icon: React.ReactNode }[] = [
    { id: "repo", label: "GitHub Repo URL", icon: <GitBranch className="h-4 w-4" /> },
    { id: "paste", label: "Paste Code / .env", icon: <Braces className="h-4 w-4" /> },
  ];

  return (
    <Card className="animate-fade-up">
      <div className="mb-5 flex gap-1 rounded-xl border border-border bg-surface-2/60 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMode(tab.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              mode === tab.id
                ? "bg-accent text-slate-950"
                : "text-muted hover:text-slate-200",
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "repo" ? (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Repository URL
            </label>
            <div className="relative">
              <GitBranch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                className="w-full rounded-xl border border-border bg-background/60 py-2.5 pl-10 pr-3 text-sm text-slate-100 placeholder:text-muted/70 focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <p className="mt-1.5 text-xs text-muted">
              Public repositories are fetched via the GitHub API. Prioritises{" "}
              <code className="text-slate-300">.env</code> and config files.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Filename
                </label>
                <div className="relative">
                  <FileCode2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    placeholder=".env"
                    className="w-full rounded-xl border border-border bg-background/60 py-2.5 pl-10 pr-3 text-sm text-slate-100 placeholder:text-muted/70 focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Label <span className="text-muted">(optional)</span>
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="my-service config"
                  className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm text-slate-100 placeholder:text-muted/70 focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium text-slate-300">Code / .env content</label>
                <button
                  type="button"
                  onClick={() => {
                    setCode(SAMPLE_ENV);
                    setFilename(".env");
                    setLabel("demo.env");
                  }}
                  className="text-xs font-medium text-accent hover:text-cyan-300"
                >
                  Load sample secrets
                </button>
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows={12}
                spellCheck={false}
                placeholder="DATABASE_URL=postgres://user:password@host:5432/db&#10;API_KEY=your_api_key_here"
                className="w-full rounded-xl border border-border bg-background/60 p-3 font-mono text-xs leading-relaxed text-slate-100 placeholder:text-muted/70 focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
          </>
        )}

        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        <button type="submit" disabled={pending} className={buttonClass("primary", "w-full py-3")}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Scanning…
            </>
          ) : (
            <>
              <ScanLine className="h-4 w-4" />
              Run Security Scan
            </>
          )}
        </button>
      </form>
    </Card>
  );
}
