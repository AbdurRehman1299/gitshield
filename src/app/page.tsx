import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { getDashboardData } from "@/lib/queries";
import { cn, timeAgo } from "@/lib/utils";
import { StatCard } from "@/components/StatCard";
import { SeverityBar } from "@/components/SeverityBar";
import { StatusBadge, SeverityBadge } from "@/components/SeverityBadge";
import { buttonClass, Card, EmptyState, SectionHeading } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { totals, recentScans, criticalAlerts, severityCounts } = await getDashboardData();

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
            Security Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted">
            Monitor hardcoded secrets and leaked <code className="text-slate-300">.env</code> files
            across your repositories.
          </p>
        </div>
        <Link href="/scan" className={buttonClass("primary", "px-5 py-2.5")}>
          <ScanLine className="h-4 w-4" />
          New Scan
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Activity className="h-4 w-4" />}
          label="Total Scans"
          value={totals.scans}
          tone="accent"
        />
        <StatCard
          icon={<ShieldAlert className="h-4 w-4" />}
          label="Vulnerable"
          value={totals.vulnerable}
          tone="danger"
          hint="Repositories with leaked secrets"
        />
        <StatCard
          icon={<ShieldCheck className="h-4 w-4" />}
          label="Safe"
          value={totals.safe}
          tone="success"
        />
        <StatCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Avg Risk Score"
          value={totals.avgRisk}
          hint="0 – 100 scale"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <SectionHeading title="Severity Breakdown" subtitle="Across the latest scans" />
          <SeverityBar counts={severityCounts} />
        </Card>

        <Card className="lg:col-span-2">
          <SectionHeading
            title="Recent Security Alerts"
            subtitle="High and critical findings"
            action={
              <Link
                href="/scans"
                className="inline-flex items-center gap-1 text-sm text-accent hover:text-cyan-300"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          {criticalAlerts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              No high-severity alerts. Nice and clean. ✨
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {criticalAlerts.map(({ issue, repoName, scanId, createdAt }) => (
                <li key={`${scanId}:${issue.id}`}>
                  <Link
                    href={`/scans/${scanId}`}
                    className="flex items-center justify-between gap-3 py-3 transition-colors hover:opacity-90"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-200">{issue.type}</p>
                      <p className="truncate font-mono text-xs text-muted">
                        {repoName} · {issue.file}
                        {issue.line ? `:${issue.line}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <SeverityBadge severity={issue.severity} />
                      <span className="hidden text-xs text-muted sm:inline">
                        {timeAgo(createdAt)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <SectionHeading title="Recent Scans" subtitle="Newest first" />
        {recentScans.length === 0 ? (
          <EmptyState
            icon={<ScanLine className="h-5 w-5" />}
            title="No scans yet"
            description="Run your first scan on a GitHub repository or paste a .env snippet to see results here."
            action={
              <Link href="/scan" className={buttonClass("primary")}>
                Start scanning
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-3 py-2 font-medium">Repository</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Issues</th>
                  <th className="px-3 py-2 font-medium">Risk</th>
                  <th className="px-3 py-2 text-right font-medium">Scanned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {recentScans.map((scan) => (
                  <tr key={scan.id} className="transition-colors hover:bg-surface-2/40">
                    <td className="px-3 py-3">
                      <Link
                        href={`/scans/${scan.id}`}
                        className="font-medium text-slate-200 hover:text-accent"
                      >
                        {scan.repository.name}
                      </Link>
                      <p className="text-xs text-muted">{scan.sourceType.toLowerCase()}</p>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={scan.status} />
                    </td>
                    <td className="px-3 py-3 text-slate-300">{scan.issuesFound.length}</td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "font-semibold",
                          scan.riskScore >= 60
                            ? "text-red-400"
                            : scan.riskScore >= 30
                              ? "text-amber-400"
                              : "text-emerald-400",
                        )}
                      >
                        {scan.riskScore}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-xs text-muted">
                      {timeAgo(scan.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
