import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-accent">
        <ShieldAlert className="h-6 w-6" />
      </div>
      <h1 className="text-2xl font-bold text-slate-50">Not found</h1>
      <p className="mt-1 max-w-sm text-sm text-muted">
        The page or scan you are looking for does not exist.
      </p>
      <Link href="/" className={buttonClass("primary", "mt-6")}>
        Back to dashboard
      </Link>
    </div>
  );
}
