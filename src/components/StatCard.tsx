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
    default: "text-slate-200 bg-surface-2",
    danger: "text-red-400 bg-red-500/10",
    success: "text-emerald-400 bg-emerald-500/10",
    accent: "text-accent bg-accent/10",
  } as const;

  return (
    <Card className="animate-fade-up">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted">{label}</span>
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", tones[tone])}>
          {icon}
        </span>
      </div>
      <div className="mt-3 text-3xl font-bold tracking-tight text-slate-50">{value}</div>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </Card>
  );
}
