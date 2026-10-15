import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "GitShield — Secret Scanner for GitHub",
  description:
    "Detect hardcoded secrets and leaked .env files in your GitHub repositories with AI-powered analysis.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Navbar />
        <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-8 sm:px-6">{children}</main>
        <footer className="border-t border-border/60 py-6 text-center text-xs text-muted">
          GitShield · Secret scanning for GitHub · Built for Hacktoberfest
        </footer>
      </body>
    </html>
  );
}
