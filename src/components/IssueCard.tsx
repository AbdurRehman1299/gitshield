import { FileWarning, Sparkles, Wrench } from "lucide-react";
import type { SecretIssue } from "@/types";
import { Badge } from "./ui";
import { SeverityBadge } from "./SeverityBadge";

export function IssueCard({ issue }: { issue: SecretIssue }) {
  return (
    <div className="animate-fade-up rounded-2xl border border-border bg-surface/70 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">
            <FileWarning className="h-4 w-4" />
          </span>
          <div>
            <h3 className="font-semibold text-slate-100">{issue.type}</h3>
            <p className="mt-0.5 font-mono text-xs text-muted">
              {issue.file}
              {issue.line ? <span className="text-slate-400">:{issue.line}</span> : null}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {issue.source === "groq" ? (
            <Badge className="border-accent/30 bg-accent/10 text-accent">
              <Sparkles className="h-3 w-3" />
              AI
            </Badge>
          ) : (
            <Badge className="border-border bg-surface-2 text-muted">rule</Badge>
          )}
          <SeverityBadge severity={issue.severity} />
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-background/60 px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          Detected value
        </span>
        <p className="mt-0.5 break-all font-mono text-sm text-amber-300">{issue.matchMasked}</p>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-slate-300">{issue.explanation}</p>

      <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
        <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
        <p className="text-sm leading-relaxed text-emerald-100/90">{issue.remediation}</p>
      </div>
    </div>
  );
}
