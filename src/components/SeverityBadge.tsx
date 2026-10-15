import { cn, severityColor } from "@/lib/utils";
import type { Severity } from "@/types";

export function SeverityBadge({
  severity,
  className,
}: {
  severity: Severity;
  className?: string;
}) {
  const c = severityColor(severity);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        c.text,
        c.bg,
        c.border,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
      {severity}
    </span>
  );
}

export function StatusBadge({ status }: { status: "SAFE" | "VULNERABLE" }) {
  const safe = status === "SAFE";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        safe
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          : "border-red-500/30 bg-red-500/10 text-red-400",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", safe ? "bg-emerald-400" : "bg-red-400")} />
      {safe ? "SAFE" : "VULNERABLE"}
    </span>
  );
}
