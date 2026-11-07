import type { Metadata } from "next";
import "./globals.css";
import { Space_Grotesk } from "next/font/google";
import { Navbar } from "@/components/Navbar";

const display = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "GitShield — Secret Scanner for GitHub",
  description:
    "Detect hardcoded secrets and leaked .env files in your GitHub repositories with AI-powered analysis.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={display.variable}>
      <body className="min-h-screen antialiased">
        <Navbar />
        <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-8 sm:px-6">{children}</main>
        <footer className="border-t border-border/60 py-6">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
              GitShield · Secret scanning for GitHub
            </div>
            <p className="hidden text-xs text-muted sm:block">
              Built for Hacktoberfest
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
