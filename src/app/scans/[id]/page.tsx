import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Activity,
  CheckCircle2,
  FileSearch,
  Gauge,
  Sparkles,
} from "lucide-react";
import { getScan } from "@/lib/queries";
import { cn, timeAgo } from "@/lib/utils";
import { IssueCard } from "@/components/IssueCard";
import { RemediationPanel } from "@/components/RemediationPanel";
import { StatusBadge } from "@/components/SeverityBadge";
import { Card, EmptyState, buttonClass } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ScanResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const scan = await getScan(id);
  if (!scan) notFound();

  const issues = scan.issuesFound;

  return (
    <div className="space-y-6">
      <Link
        href="/scans"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to history
      </Link>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-50">
              {scan.repository.name}
            </h1>
            <StatusBadge status={scan.status} />
          </div>
          <p className="mt-1 text-sm text-muted">
            {scan.sourceType === "REPOSITORY" ? (
              <a
                href={scan.repository.url}
                target="_blank"
                rel="noreferrer"
                className="hover:text-accent"
              >
                {scan.repository.url}
              </a>
            ) : (
              scan.repository.url.replace("paste://", "pasted file: ")
            )}{" "}
            · scanned {timeAgo(scan.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile
          icon={<FileSearch className="h-4 w-4" />}
          label="Issues Found"
          value={issues.length}
          tone={issues.length > 0 ? "danger" : "success"}
        />
        <SummaryTile
          icon={<Gauge className="h-4 w-4" />}
          label="Risk Score"
          value={scan.riskScore}
          tone={scan.riskScore >= 60 ? "danger" : scan.riskScore >= 30 ? "warning" : "success"}
        />
        <SummaryTile
          icon={<Activity className="h-4 w-4" />}
          label="Files Scanned"
          value={scan.filesScanned}
          tone="accent"
        />
        <SummaryTile
          icon={<Sparkles className="h-4 w-4" />}
          label="AI Analysis"
          value={scan.aiSummary ? "On" : "Off"}
          tone={scan.aiSummary ? "accent" : "default"}
        />
      </div>

      {issues.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CheckCircle2 className="h-5 w-5" />}
            title="No secrets detected"
            description="This scan came back clean. Keep committing an .env.example and rotating credentials regularly."
            action={
              <Link href="/scan" className={buttonClass("secondary")}>
                Scan something else
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-100">
              Detected Secrets{" "}
              <span className="text-sm font-normal text-muted">({issues.length})</span>
            </h2>
            {issues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>

          <div className="space-y-4">
            <RemediationPanel aiSummary={scan.aiSummary} />
            <Card>
              <details>
                <summary className="cursor-pointer text-sm font-medium text-slate-300">
                  Raw findings (JSON)
                </summary>
                <pre className="mt-3 max-h-80 overflow-auto rounded-xl border border-border bg-background/60 p-3 text-xs text-slate-300">
                  {JSON.stringify(issues, null, 2)}
                </pre>
              </details>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone: "default" | "danger" | "warning" | "success" | "accent";
}) {
  const tones = {
    default: "bg-surface-2 text-slate-300",
    danger: "bg-red-500/10 text-red-400",
    warning: "bg-amber-500/10 text-amber-400",
    success: "bg-emerald-500/10 text-emerald-400",
    accent: "bg-accent/10 text-accent",
  } as const;

  return (
    <Card className="animate-fade-up p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted">{label}</span>
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", tones[tone])}>
          {icon}
        </span>
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-50">{value}</div>
    </Card>
  );
}
