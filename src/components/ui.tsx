import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface/50 p-6 shadow-2xl shadow-black/40 backdrop-blur-md ring-1 ring-white/5 transition-all duration-300 hover:bg-surface/60 hover:ring-white/10",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2/50 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase transition-colors",
        className,
      )}
      {...props}
    />
  );
}

export function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-lg font-semibold tracking-tight text-slate-100">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/40 px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-accent">
        {icon}
      </div>
      <h3 className="font-display text-base font-semibold text-slate-100">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 cursor-pointer";

export const buttonVariants = {
  primary: "bg-accent text-slate-950 hover:bg-cyan-300 shadow-md shadow-accent/20 hover:shadow-cyan-400/30",
  secondary: "border border-border bg-surface-2/80 text-slate-100 hover:bg-surface-2 hover:border-slate-600",
  ghost: "text-muted hover:text-slate-100 hover:bg-surface-2/50",
  danger: "bg-rose-500 text-white hover:bg-rose-400 shadow-md shadow-rose-500/20",
} as const;

export function buttonClass(
  variant: keyof typeof buttonVariants = "primary",
  className?: string,
) {
  return cn(buttonBase, buttonVariants[variant], className);
}
