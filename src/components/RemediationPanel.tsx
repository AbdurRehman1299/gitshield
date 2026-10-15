import { BookLock, GitBranch, KeyRound, ShieldCheck } from "lucide-react";
import { Card } from "./ui";

const STEPS = [
  {
    icon: <KeyRound className="h-4 w-4" />,
    title: "Rotate every exposed secret",
    body: "Assume any committed credential is compromised. Revoke and regenerate keys at the provider (AWS IAM, GitHub, Stripe, Google Cloud, …) before doing anything else.",
  },
  {
    icon: <BookLock className="h-4 w-4" />,
    title: "Commit a .env.example",
    body: "Replace real values with placeholders and commit that template instead. This documents required configuration without leaking anything.",
  },
  {
    icon: <GitBranch className="h-4 w-4" />,
    title: "Add secrets to .gitignore",
    body: "Ignore .env, .env.* and credential files, then purge history with `git filter-repo` (or the BFG) so old commits no longer contain them.",
  },
  {
    icon: <ShieldCheck className="h-4 w-4" />,
    title: "Automate future prevention",
    body: "Enable GitHub secret scanning + push protection and run GitShield on every pull request so leaks never reach the default branch.",
  },
];

export function RemediationPanel({ aiSummary }: { aiSummary?: string | null }) {
  return (
    <Card className="animate-fade-up">
      <h2 className="text-lg font-semibold text-slate-100">Remediation playbook</h2>
      {aiSummary ? (
        <p className="mt-2 rounded-xl border border-accent/20 bg-accent/5 px-3 py-2.5 text-sm leading-relaxed text-cyan-100/90">
          <span className="font-semibold text-accent">AI summary: </span>
          {aiSummary}
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted">
          General steps to remove leaked secrets and prevent them from happening again.
        </p>
      )}

      <ol className="mt-4 space-y-3">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-accent">
              {step.icon}
            </span>
            <div>
              <p className="text-sm font-medium text-slate-200">
                {i + 1}. {step.title}
              </p>
              <p className="mt-0.5 text-sm text-muted">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
