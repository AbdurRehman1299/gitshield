import { GitBranch, KeyRound, Sparkles, Zap } from "lucide-react";
import { ScanForm } from "@/components/ScanForm";
import { isGroqConfigured } from "@/lib/groq";
import { Card } from "@/components/ui";

export const metadata = { title: "New Scan — GitShield" };

const features = [
  {
    icon: <GitBranch className="h-4 w-4" />,
    title: "Repository scan",
    body: "Point GitShield at a public GitHub repo. It downloads the most likely files (.env, config, source) and audits them.",
  },
  {
    icon: <Zap className="h-4 w-4" />,
    title: "Instant snippet scan",
    body: "Paste a .env or a code fragment to get immediate findings — perfect for pre-commit checks.",
  },
  {
    icon: <Sparkles className="h-4 w-4" />,
    title: "AI remediation",
    body: "Groq analyses context and returns severity, an explanation and concrete fix advice for each finding.",
  },
];

export default function ScanPage() {
  const groqReady = isGroqConfigured();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
          Run a New Scan
        </h1>
        <p className="mt-1 text-sm text-muted">
          Scan a GitHub repository URL or paste code / a <code className="text-slate-300">.env</code>{" "}
          snippet for instant secret detection.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ScanForm />
        </div>

        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <KeyRound className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-200">AI engine</p>
                <p className="text-xs text-muted">
                  {groqReady ? "Groq connected" : "Regex-only mode"}
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted">
              {groqReady ? (
                <>
                  Findings are enriched with Groq&apos;s{" "}
                  <code className="text-slate-300">llama-3.3-70b-versatile</code> model for
                  explanation and remediation.
                </>
              ) : (
                <>
                  Set <code className="text-slate-300">GROQ_API_KEY</code> in your{" "}
                  <code className="text-slate-300">.env</code> to enable AI remediation advice.
                  Deterministic regex + entropy scanning is always on.
                </>
              )}
            </p>
          </Card>

          {features.map((feature) => (
            <Card key={feature.title}>
              <div className="flex items-center gap-2 text-slate-200">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-accent">
                  {feature.icon}
                </span>
                <p className="text-sm font-semibold">{feature.title}</p>
              </div>
              <p className="mt-2 text-sm text-muted">{feature.body}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
