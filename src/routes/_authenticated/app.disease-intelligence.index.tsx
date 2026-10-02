// Reviewer-only Disease Intelligence console: evaluation dashboard, review
// queue, knowledge entries and the reviewer's own workload. Every rate shows
// its sample size; small samples are never presented as reliable.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Brain, RefreshCw, ShieldCheck } from "lucide-react";
import {
  getEvaluationDashboard,
  getMyDiseaseRole,
  getReviewerPerformance,
  listCasesForReview,
  listKnowledgeEntries,
  recomputeKnowledgeQuality,
  setKnowledgeStatus,
} from "@/features/disease-intelligence/disease-intelligence.functions";
import { KNOWLEDGE_STATUSES } from "@/features/disease-intelligence/config";
import {
  Badge,
  RateStat,
  RateValue,
  Section,
  Stat,
  Table,
  statusTone,
} from "@/features/disease-intelligence/components/MetricBits";

export const Route = createFileRoute("/_authenticated/app/disease-intelligence/")({
  component: DiseaseIntelligencePage,
  head: () => ({
    meta: [
      { title: "Disease Intelligence – Bhoomitra AI" },
      {
        name: "description",
        content:
          "Reviewer console to verify crop disease cases, track knowledge quality and see honest evaluation metrics.",
      },
      { property: "og:title", content: "Disease Intelligence – Bhoomitra AI" },
      {
        property: "og:description",
        content: "Verify disease cases and monitor trusted agricultural knowledge.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const TABS = ["Overview", "Review queue", "Knowledge", "Analytics", "My work"] as const;
type Tab = (typeof TABS)[number];
const pretty = (s: unknown) => String(s ?? "—").replace(/_/g, " ");

function DiseaseIntelligencePage() {
  const roleFn = useServerFn(getMyDiseaseRole);
  const [tab, setTab] = useState<Tab>("Overview");
  const { data: role, isLoading } = useQuery({
    queryKey: ["disease-role"],
    queryFn: () => roleFn(),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!role?.reviewer) {
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
          AI diagnoses are never treated as truth. Cases become trusted knowledge only after a
          farmer or reviewer confirms them.
        </p>
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "min-h-10 shrink-0 rounded-xl border px-4 text-sm font-medium",
              tab === t ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted",
            ].join(" ")}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Review queue" && <ReviewQueue />}
      {tab === "Knowledge" && <KnowledgeEntries />}
      {tab === "My work" && <MyWork />}
      {(tab === "Overview" || tab === "Analytics") && <Dashboard view={tab} />}
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="text-xs text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block min-h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function Dashboard({ view }: { view: "Overview" | "Analytics" }) {
  const dashFn = useServerFn(getEvaluationDashboard);
  const [f, setF] = useState({ crop: "", disease: "", region: "", cropStage: "", from: "", to: "" });
  const { data, isLoading, error } = useQuery({
    queryKey: ["disease-dashboard", f],
    queryFn: () =>
      dashFn({
        data: {
          crop: f.crop || null,
          disease: f.disease || null,
          region: f.region || null,
          cropStage: f.cropStage || null,
          from: f.from || null,
          to: f.to || null,
        },
      }),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading analytics…</p>;
  if (error || !data) {
    return (
      <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
        Analytics are unavailable right now. Diagnosis for farmers is not affected.
      </p>
    );
  }
  const o = data.overview;
  const k = data.knowledgeHealth;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-3 lg:grid-cols-6">
        <Select label="Crop" value={f.crop} options={data.filterOptions.crops as string[]} onChange={(v) => setF({ ...f, crop: v })} />
        <Select label="Disease" value={f.disease} options={data.filterOptions.diseases as string[]} onChange={(v) => setF({ ...f, disease: v })} />
        <Select label="Region" value={f.region} options={data.filterOptions.regions as string[]} onChange={(v) => setF({ ...f, region: v })} />
        <Select label="Crop stage" value={f.cropStage} options={data.filterOptions.stages} onChange={(v) => setF({ ...f, cropStage: v })} />
        <label className="text-xs text-muted-foreground">
          From
          <input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} className="mt-1 block min-h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground" />
        </label>
        <label className="text-xs text-muted-foreground">
          To
          <input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} className="mt-1 block min-h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground" />
        </label>
      </div>

      {view === "Overview" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Total cases" value={o.totalCases} />
            <Stat label="With farmer feedback" value={o.casesWithFeedback} />
            <Stat label="Validated" value={o.validatedCases} />
            <Stat label="Expert reviewed" value={o.expertReviewed} />
            <Stat label="Pending review" value={o.pendingReview} />
            <Stat label="Rejected" value={o.rejectedCases} />
            <Stat label="Treatment outcomes recorded" value={o.outcomesRecorded} />
            <Stat label="Trusted knowledge" value={`${o.trustedEntries} / ${o.knowledgeEntries}`} hint={`${o.knowledgeNeedingReview} need review`} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <RateStat label="Confirmation rate" rate={data.metrics.confirmationRate} hint="Of cases with a validation decision" />
            <RateStat label="Farmer agreement" rate={data.metrics.farmerAgreementRate} />
            <RateStat label="Reviewer agreement" rate={data.metrics.reviewerAgreementRate} />
            <RateStat label="Treatment improvement" rate={data.metrics.treatmentSuccessRate} hint="Observed outcome — not proof the treatment caused it" />
          </div>
          <Section title="Knowledge health" description={`Entries older than ${data.config.staleAfterDays} days are flagged for review, never deleted. Trusted needs quality ≥ ${data.config.trustedQualityThreshold}.`}>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <Stat label="Trusted" value={k.trusted} />
              <Stat label="Candidates" value={k.candidates} />
              <Stat label="Needs review" value={k.needsReview} />
              <Stat label="Conflicting evidence" value={k.conflicting} />
              <Stat label="Stale" value={k.stale} />
              <Stat label="Deprecated" value={k.deprecated} />
              <Stat label="Rejected" value={k.rejected} />
              <Stat label="Not yet searchable" value={k.unindexed} />
              <Stat label="Average quality" value={k.averageQuality ?? "—"} hint="Descriptive score, not scientific certainty" />
            </div>
          </Section>
          <Section title="Data quality" description="Gaps that weaken evidence.">
            <Table head={["Issue", "Cases", "Suggested action"]} rows={data.dataQuality.map((d) => [d.issue, d.count, d.action])} empty="No data quality issues found." />
          </Section>
        </>
      ) : (
        <>
          <Section title="Confidence calibration" description="Does stated AI confidence match how often it was confirmed?">
            <Table head={["Confidence", "Predictions", "Confirmed", "Incorrect", "Confirmation rate"]} rows={data.calibration.map((b) => [b.label, b.predictions, b.confirmed, b.incorrect, <RateValue rate={b.confirmationRate} />])} />
          </Section>
          {(
            [
              ["Diseases", data.diseases],
              ["Crops", data.crops],
              ["Regions (broad, small groups hidden for privacy)", data.regions],
            ] as const
          ).map(([title, rows]) => (
            <Section key={title} title={title}>
              <Table head={["Name", "Cases", "Confirmed", "Rejected", "Pending", "Avg confidence", "Confirmation", "Treatment improvement"]} rows={rows.map((r) => [r.name, r.cases, r.confirmed, r.rejected, r.pending, r.averageConfidence == null ? "—" : `${r.averageConfidence}%`, <RateValue rate={r.confirmationRate} />, <RateValue rate={r.treatmentSuccessRate} />])} />
            </Section>
          ))}
          <Section title="Treatment outcomes" description="Observed results only. These do not prove a treatment caused recovery.">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Stat label="Recorded" value={data.treatment.recorded} />
              <Stat label="Fully recovered" value={data.treatment.fullRecovery} />
              <Stat label="Improved" value={data.treatment.improved} />
              <Stat label="No change" value={data.treatment.noChange} />
              <Stat label="Worse" value={data.treatment.worse} />
              <RateStat label="Improvement" rate={data.treatment.improvementRate} />
            </div>
          </Section>
          <Section title="Most common confusions" description="Shown only where reviewers or farmers named a different disease.">
            <Table head={["AI said", "Actually", "Cases"]} rows={data.confusion.map((c) => [c.predicted, c.actual, c.count])} empty="Not enough corrected cases yet." />
          </Section>
          <Section title="Error patterns">
            <Table head={["Pattern", "Cases", "What it suggests"]} rows={data.errors.map((e) => [e.pattern, e.count, e.hint])} empty="No error patterns yet." />
          </Section>
          <Section title="With vs. without historical knowledge" description="Comparative observation only — not proof that history improves diagnosis.">
            <Table head={["Group", "Cases", "Confirmation", "Avg confidence", "Treatment improvement"]} rows={data.impact.map((g) => [g.label, g.cases, <RateValue rate={g.confirmationRate} />, g.averageConfidence == null ? "—" : `${g.averageConfidence}%`, <RateValue rate={g.treatmentSuccessRate} />])} />
          </Section>
        </>
      )}
    </div>
  );
}

const SORTS = [
  ["needs_review", "Needs review"],
  ["high_impact", "Most evidence"],
  ["low_confidence", "Low confidence"],
  ["conflicting", "Conflicting"],
  ["with_outcome", "Has outcome"],
] as const;

function ReviewQueue() {
  const listFn = useServerFn(listCasesForReview);
  const [status, setStatus] = useState("unverified");
  const [sort, setSort] = useState<string>("needs_review");
  const { data: cases = [], isLoading } = useQuery({
    queryKey: ["disease-review-queue", status, sort],
    queryFn: () => listFn({ data: { status, sort } as never }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {["unverified", "farmer_confirmed", "expert_verified", "rejected", "all"].map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={["min-h-10 rounded-xl border px-4 text-sm font-medium capitalize", status === s ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"].join(" ")}>
            {pretty(s)}
          </button>
        ))}
      </div>
      <label className="block text-xs text-muted-foreground">
        Order by
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="mt-1 block min-h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground">
          {SORTS.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </label>
      {isLoading && <p className="text-sm text-muted-foreground">Loading cases…</p>}
      {!isLoading && cases.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No cases in this list.</p>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {cases.map((c: Record<string, any>) => (
          <Link key={c["id"]} to="/app/disease-intelligence/review/$caseId" params={{ caseId: c["id"] }} className="block rounded-2xl border border-border bg-card p-4 transition hover:border-primary/50">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-display text-base font-bold">
                {c["ai_diagnosis"]?.top_diagnosis?.name ?? "Unknown"} · {c["crop_name"]}
              </p>
              <Badge tone={statusTone(c["validation_status"])}>{pretty(c["validation_status"])}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {c["crop_stage"] ?? "stage unknown"} · {c["affected_part"] ?? "part unknown"} · confidence {c["confidence_final"] ?? "—"}% · {c["image_count"] ?? 0} photos · {c["ageDays"]}d old
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {c["rating"] && <Badge tone={c["rating"] === "incorrect" ? "bad" : "neutral"}>farmer: {pretty(c["rating"])}</Badge>}
              {c["outcome"] && <Badge tone={c["outcome"] === "worse" ? "bad" : "neutral"}>outcome: {pretty(c["outcome"])}</Badge>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function KnowledgeEntries() {
  const qc = useQueryClient();
  const listFn = useServerFn(listKnowledgeEntries);
  const setFn = useServerFn(setKnowledgeStatus);
  const recomputeFn = useServerFn(recomputeKnowledgeQuality);
  const [status, setStatus] = useState("all");
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["disease-knowledge", status],
    queryFn: () => listFn({ data: { status } }),
  });

  async function change(id: string, next: string) {
    const reason = window.prompt(`Reason for moving this entry to "${pretty(next)}"?`);
    if (!reason?.trim()) return;
    try {
      await setFn({ data: { knowledgeId: id, status: next, reason } });
      toast.success("Status updated — previous version kept");
      qc.invalidateQueries({ queryKey: ["disease-knowledge"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update");
    }
  }
  async function recompute(id: string) {
    const res = await recomputeFn({ data: { knowledgeId: id } });
    toast[res.ok ? "success" : "error"](res.ok ? `Quality ${res.score}/100 · ${pretty(res.status)}` : "Could not recalculate");
    qc.invalidateQueries({ queryKey: ["disease-knowledge"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {["all", ...KNOWLEDGE_STATUSES].map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={["min-h-10 rounded-xl border px-4 text-sm font-medium capitalize", status === s ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"].join(" ")}>
            {pretty(s)}
          </button>
        ))}
      </div>
      <Section title="Knowledge entries" description="Entries are never deleted. Independent sources count distinct farms, so one farmer's repeats don't inflate evidence.">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <Table
            head={["Disease", "Crop", "Status", "Quality", "Sources (independent)", "Conflicts", "Version", "Actions"]}
            rows={rows.map((r) => [
              r["disease_name"],
              r["crop_name"],
              <div>
                <Badge tone={statusTone(r["knowledge_status"])}>{pretty(r["knowledge_status"])}</Badge>
                {r["status_reason"] && <p className="mt-1 max-w-48 text-xs text-muted-foreground">{r["status_reason"]}</p>}
              </div>,
              r["quality_score"] == null ? "—" : `${r["quality_score"]} · ${r["quality_level"] ?? ""}`,
              `${r["source_case_count"]} (${r["independent_source_count"]})`,
              r["has_conflicting_evidence"] ? <Badge tone="warn">yes</Badge> : "no",
              `v${r["knowledge_version"]}`,
              <div className="flex flex-wrap gap-2">
                <select defaultValue="" onChange={(e) => e.target.value && change(r["id"], e.target.value)} className="min-h-9 rounded-lg border border-border bg-background px-2 text-xs">
                  <option value="">Move to…</option>
                  {KNOWLEDGE_STATUSES.filter((s) => s !== r["knowledge_status"]).map((s) => (
                    <option key={s} value={s}>{pretty(s)}</option>
                  ))}
                </select>
                <button onClick={() => recompute(r["id"])} aria-label="Recalculate quality" className="inline-flex min-h-9 items-center rounded-lg border border-border px-2 hover:bg-muted">
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>,
            ])}
            empty="No knowledge entries yet."
          />
        )}
      </Section>
    </div>
  );
}

function MyWork() {
  const perfFn = useServerFn(getReviewerPerformance);
  const { data } = useQuery({ queryKey: ["disease-reviewer-perf"], queryFn: () => perfFn() });
  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  return (
    <Section title="Your review workload" description="Private to you — reviewers are never publicly ranked.">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Reviewed" value={data.reviewed} />
        <Stat label="Verified" value={data.verified} />
        <Stat label="Corrected" value={data.corrected} />
        <Stat label="Marked incorrect" value={data.rejected} />
        <Stat label="Avg time per case" value={data.averageSeconds == null ? "—" : `${data.averageSeconds}s`} />
      </div>
    </Section>
  );
}
