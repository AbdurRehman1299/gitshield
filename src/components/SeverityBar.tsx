import { SEVERITY_ORDER, severityColor } from "@/lib/utils";
import type { Severity } from "@/types";

export function SeverityBar({ counts }: { counts: Record<Severity, number> }) {
  const total = SEVERITY_ORDER.reduce((sum, s) => sum + (counts[s] ?? 0), 0);

  return (
    <div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
        {total === 0 ? (
          <div className="h-full w-full bg-emerald-500/40" />
        ) : (
          SEVERITY_ORDER.map((severity) => {
            const value = counts[severity] ?? 0;
            if (value === 0) return null;
            return (
              <div
                key={severity}
                className={severityColor(severity).dot}
                style={{ width: `${(value / total) * 100}%` }}
                title={`${severity}: ${value}`}
              />
            );
          })
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {SEVERITY_ORDER.map((severity) => (
          <div key={severity} className="flex items-center gap-2 text-sm">
            <span className={`h-2 w-2 rounded-full ${severityColor(severity).dot}`} />
            <span className="text-muted">{severity}</span>
            <span className="font-semibold text-slate-200">{counts[severity] ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
