// Reviewer-only Disease Intelligence console: how the learning layer is
// performing, and the case review queue that gates trusted knowledge.

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Brain, Loader2, ShieldCheck } from "lucide-react";
import {
  getDiseaseAnalytics,
  getMyDiseaseRole,
  listCasesForReview,
  submitCaseReview,
} from "@/features/disease-intelligence/disease-intelligence.functions";
import { REVIEW_DECISIONS } from "@/features/disease-intelligence/types";

export const Route = createFileRoute("/_authenticated/app/disease-intelligence")({
  component: DiseaseIntelligencePage,
  head: () => ({
    meta: [
      { title: "Disease Intelligence – Bhoomitra AI" },
      {
        name: "description",
        content:
          "Review validated crop disease cases and track how real-world farmer outcomes improve future diagnoses.",
      },
      { property: "og:title", content: "Disease Intelligence – Bhoomitra AI" },
      {
        property: "og:description",
        content: "Validated disease case review and learning analytics for Bhoomitra AI.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}

function DiseaseIntelligencePage() {
  const queryClient = useQueryClient();
  const role = useServerFn(getMyDiseaseRole);
  const analyticsFn = useServerFn(getDiseaseAnalytics);
  const listFn = useServerFn(listCasesForReview);
  const reviewFn = useServerFn(submitCaseReview);

  const [status, setStatus] = useState("unverified");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [correction, setCorrection] = useState<Record<string, string>>({});

  const { data: roleData, isLoading: roleLoading } = useQuery({
    queryKey: ["disease-role"],
    queryFn: () => role(),
  });
  const reviewer = Boolean(roleData?.reviewer);

  const { data: analytics } = useQuery({
    queryKey: ["disease-analytics"],
    queryFn: () => analyticsFn(),
    enabled: reviewer,
  });
  const { data: cases = [] } = useQuery({
    queryKey: ["disease-review-queue", status],
    queryFn: () => listFn({ data: { status } }),
    enabled: reviewer,
  });

  async function decide(caseId: string, decision: string) {
    setBusyId(caseId);
    try {
      const res = await reviewFn({
        data: { caseId, decision, correctedDisease: correction[caseId] ?? null },
      });
      await queryClient.invalidateQueries({ queryKey: ["disease-review-queue"] });
      await queryClient.invalidateQueries({ queryKey: ["disease-analytics"] });
      toast.success(res.promoted ? "Verified and added to trusted knowledge" : "Review saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save this review");
    } finally {
      setBusyId(null);
    }
  }

  if (roleLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (!reviewer) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center">
        <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground" />
        <h1 className="mt-3 font-display text-xl font-bold">Reviewers only</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This page is for the team that verifies disease cases before they are trusted.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
          <Brain className="h-6 w-6 text-primary" /> Disease Intelligence
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real cases become trusted knowledge only after a farmer or a reviewer confirms them.
        </p>
      </div>

      {analytics && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total cases" value={analytics.totalCases} />
          <Stat label="Validated" value={analytics.validatedCases} />
          <Stat label="Awaiting validation" value={analytics.pendingValidation} />
          <Stat label="Rejected" value={analytics.rejectedCases} />
          <Stat label="Knowledge entries" value={analytics.knowledgeEntries} />
          <Stat
            label="Treatment success"
            value={analytics.treatmentSuccessRate == null ? "—" : `${analytics.treatmentSuccessRate}%`}
          />
          <Stat
            label="Average confidence"
            value={analytics.averageConfidence == null ? "—" : `${analytics.averageConfidence}%`}
          />
          <Stat
            label="Farmer agreed / corrected"
            value={`${analytics.farmerConfirmed} / ${analytics.farmerCorrected}`}
          />
        </div>
      )}

      {analytics && (analytics.topDiseases.length > 0 || analytics.topCrops.length > 0) && (
        <div className="grid gap-3 md:grid-cols-3">
          {(
            [
              ["Most common diseases", analytics.topDiseases],
              ["Crops", analytics.topCrops],
              ["Regions", analytics.regions],
            ] as const
          ).map(([label, items]) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-semibold">{label}</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {items.length === 0 && <li>No data yet</li>}
                {items.map((i) => (
                  <li key={i.name} className="flex justify-between gap-2">
                    <span className="truncate">{i.name}</span>
                    <span>{i.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {["unverified", "farmer_confirmed", "expert_verified", "rejected", "all"].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={[
              "min-h-10 rounded-xl border px-4 text-sm font-medium capitalize",
              status === s ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted",
            ].join(" ")}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {cases.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No cases in this list.
          </p>
        )}
        {cases.map((c: Record<string, any>) => {
          const name = c["ai_diagnosis"]?.top_diagnosis?.name ?? "Unknown";
          return (
            <div key={c["id"]} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-display text-base font-bold">
                  {name} · {c["crop_name"]}
                </p>
                <span className="rounded-full border border-border px-2 py-0.5 text-xs capitalize text-muted-foreground">
                  {String(c["validation_status"]).replace("_", " ")}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {c["crop_stage"] ?? "stage unknown"} · {c["affected_part"] ?? "part unknown"} ·{" "}
                {c["location_name"] ?? "region unknown"} · confidence {c["confidence_final"] ?? "—"}%
              </p>
              {Array.isArray(c["symptoms"]) && c["symptoms"].length > 0 && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {(c["symptoms"] as string[]).slice(0, 4).join("; ")}
                </p>
              )}
              <input
                value={correction[c["id"]] ?? ""}
                onChange={(e) => setCorrection((m) => ({ ...m, [c["id"]]: e.target.value }))}
                placeholder="Correct disease name (optional)"
                className="mt-3 min-h-10 w-full rounded-xl border border-border bg-background px-3 text-sm sm:w-80"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {REVIEW_DECISIONS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => decide(c["id"], d.value)}
                    disabled={busyId === c["id"]}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium hover:bg-muted disabled:opacity-50"
                  >
                    {busyId === c["id"] && <Loader2 className="h-4 w-4 animate-spin" />}
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
