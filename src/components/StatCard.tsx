import { cn } from "@/lib/utils";
import { Card } from "./ui";

export function StatCard({
  icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "default" | "danger" | "success" | "accent";
}) {
  const tones = {
    default: "text-slate-300 bg-surface-2",
    danger: "text-rose-400 bg-rose-500/10 ring-1 ring-rose-500/20",
    success: "text-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-500/20",
    accent: "text-cyan-300 bg-accent/10 ring-1 ring-accent/20",
  } as const;

  return (
    <Card>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</span>
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", tones[tone])}>
          {icon}
        </span>
      </div>
      <div className="mt-3 text-3xl font-bold tracking-tight text-slate-50">{value}</div>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </Card>
  );
}
