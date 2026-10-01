// Small shared presentation pieces for the reviewer console. Every rate is
// shown with its sample size, and small samples are labelled as indicative.

import type { ReactNode } from "react";
import type { Rate } from "../metrics";
import { MIN_SAMPLE_SIZE } from "../config";

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** A percentage that never pretends to be reliable on a tiny sample. */
export function RateValue({ rate, label }: { rate: Rate; label?: string }) {
  if (rate.value == null) {
    return <span className="text-muted-foreground">No data yet</span>;
  }
  return (
    <span>
      {rate.value}%
      <span className="ml-2 align-middle text-xs font-normal text-muted-foreground">
        n = {rate.n}
        {!rate.reliable && ` · indicative only, fewer than ${MIN_SAMPLE_SIZE}`}
      </span>
      {label && <span className="ml-1 text-xs text-muted-foreground">{label}</span>}
    </span>
  );
}

export function RateStat({ label, rate, hint }: { label: string; rate: Rate; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">
        {rate.value == null ? "—" : `${rate.value}%`}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {rate.value == null
          ? "No data yet"
          : `based on ${rate.n} case${rate.n === 1 ? "" : "s"}${
              rate.reliable ? "" : " · too few to be reliable"
            }`}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: string }) {
  const tones: Record<string, string> = {
    neutral: "border-border text-muted-foreground",
    good: "border-primary/40 bg-primary/5 text-primary",
    warn: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    bad: "border-destructive/40 bg-destructive/5 text-destructive",
  };
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs capitalize ${tones[tone] ?? tones["neutral"]}`}
    >
      {children}
    </span>
  );
}

export function statusTone(status: string): string {
  if (["trusted", "expert_verified", "farmer_confirmed", "verified"].includes(status)) return "good";
  if (["needs_review", "candidate", "unverified", "needs_evidence"].includes(status)) return "warn";
  if (["rejected", "deprecated", "incorrect", "duplicate"].includes(status)) return "bad";
  return "neutral";
}

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Table({
  head,
  rows,
  empty = "No data yet",
}: {
  head: string[];
  rows: ReactNode[][];
  empty?: string;
}) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
            {head.map((h) => (
              <th key={h} className="whitespace-nowrap py-2 pr-4 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border/60 last:border-0">
              {r.map((cell, j) => (
                <td key={j} className="py-2 pr-4 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
