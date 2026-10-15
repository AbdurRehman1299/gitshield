import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Severity } from "@/types";

/** Merge Tailwind class names, resolving conflicts predictably. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Mask the middle of a secret so the UI never renders a usable credential.
 * e.g. "AKIAIOSFODNN7EXAMPLE" -> "AKIA••••••AMPLE"
 */
export function maskSecret(value: string, keep = 4): string {
  const trimmed = value.trim();
  if (trimmed.length <= keep * 2) {
    return "•".repeat(Math.max(trimmed.length, 4));
  }
  const start = trimmed.slice(0, keep);
  const end = trimmed.slice(-keep);
  const hidden = "•".repeat(Math.min(trimmed.length - keep * 2, 12));
  return `${start}${hidden}${end}`;
}

export const SEVERITY_ORDER: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

export const SEVERITY_WEIGHT: Record<Severity, number> = {
  CRITICAL: 40,
  HIGH: 20,
  MEDIUM: 8,
  LOW: 3,
};

/**
 * Derive a 0-100 risk score from a list of issue severities. The score is not
 * linear — it saturates as more issues of the same kind are found.
 */
export function computeRiskScore(issues: { severity: Severity }[]): number {
  const raw = issues.reduce((sum, i) => sum + SEVERITY_WEIGHT[i.severity], 0);
  return Math.min(100, raw);
}

export function severityColor(severity: Severity): {
  text: string;
  bg: string;
  border: string;
  dot: string;
} {
  switch (severity) {
    case "CRITICAL":
      return {
        text: "text-red-400",
        bg: "bg-red-500/10",
        border: "border-red-500/30",
        dot: "bg-red-500",
      };
    case "HIGH":
      return {
        text: "text-orange-400",
        bg: "bg-orange-500/10",
        border: "border-orange-500/30",
        dot: "bg-orange-500",
      };
    case "MEDIUM":
      return {
        text: "text-amber-400",
        bg: "bg-amber-500/10",
        border: "border-amber-500/30",
        dot: "bg-amber-500",
      };
    case "LOW":
    default:
      return {
        text: "text-sky-400",
        bg: "bg-sky-500/10",
        border: "border-sky-500/30",
        dot: "bg-sky-500",
      };
  }
}

/** Format a date as a short relative string ("2m ago", "3d ago"). */
export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}
