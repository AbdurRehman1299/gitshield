"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, ScanLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonClass } from "./ui";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/scans", label: "Scan History" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent ring-1 ring-accent/30">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-100">
            Git<span className="text-accent">Shield</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {links.map((link) => {
            const active =
              link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-surface-2 text-slate-100" : "text-muted hover:text-slate-200",
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <Link href="/scan" className={buttonClass("primary", "ml-2 hidden sm:inline-flex")}>
            <ScanLine className="h-4 w-4" />
            New Scan
          </Link>
        </nav>
      </div>
    </header>
  );
}
