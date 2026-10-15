import Link from "next/link";
import { ScanLine } from "lucide-react";
import { listScans } from "@/lib/queries";
import { cn, timeAgo } from "@/lib/utils";
import { StatusBadge, SeverityBadge } from "@/components/SeverityBadge";
import { buttonClass, Card, EmptyState, SectionHeading } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Scan History — GitShield" };

export default async function ScansPage() {
  const scans = await listScans(100);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
            Scan History
          </h1>
          <p className="mt-1 text-sm text-muted">{scans.length} scan(s) recorded.</p>
        </div>
        <Link href="/scan" className={buttonClass("primary")}>
          <ScanLine className="h-4 w-4" />
          New Scan
        </Link>
      </div>

      <Card>
        {scans.length === 0 ? (
          <EmptyState
            icon={<ScanLine className="h-5 w-5" />}
            title="No scans yet"
            description="Your scan history will appear here once you run your first scan."
            action={
              <Link href="/scan" className={buttonClass("primary")}>
                Start scanning
              </Link>
            }
          />
        ) : (
          <>
            <SectionHeading title="All Scans" subtitle="Newest first" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
                    <th className="px-3 py-2 font-medium">Repository</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Top Severity</th>
                    <th className="px-3 py-2 font-medium">Issues</th>
                    <th className="px-3 py-2 font-medium">Files</th>
                    <th className="px-3 py-2 font-medium">Risk</th>
                    <th className="px-3 py-2 text-right font-medium">Scanned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {scans.map((scan) => {
                    const top = scan.issuesFound[0]?.severity;
                    return (
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
                        <td className="px-3 py-3">
                          {top ? <SeverityBadge severity={top} /> : <span className="text-muted">—</span>}
                        </td>
                        <td className="px-3 py-3 text-slate-300">{scan.issuesFound.length}</td>
                        <td className="px-3 py-3 text-slate-300">{scan.filesScanned}</td>
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
