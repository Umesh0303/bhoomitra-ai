// Reviewer case screen: the complete evidence for one case, then an explicit
// decision. Historical knowledge is shown read-only.

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Loader2, ShieldCheck, X } from "lucide-react";
import {
  getCaseDetail,
  getMyDiseaseRole,
  submitCaseReview,
} from "@/features/disease-intelligence/disease-intelligence.functions";
import { REVIEW_ACTIONS, REVIEW_EVIDENCE_OPTIONS } from "@/features/disease-intelligence/config";
import {
  Badge,
  Section,
  Table,
  statusTone,
} from "@/features/disease-intelligence/components/MetricBits";

export const Route = createFileRoute("/_authenticated/app/disease-intelligence/review/$caseId")({
  component: CaseReviewPage,
  head: () => ({
    meta: [
      { title: "Review Disease Case – Bhoomitra AI" },
      {
        name: "description",
        content:
          "Review the full evidence behind one crop disease case before it can become trusted agricultural knowledge.",
      },
      { property: "og:title", content: "Review Disease Case – Bhoomitra AI" },
      {
        property: "og:description",
        content: "Images, farm context, diagnostic evidence and reviewer decision for one case.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Field({ label, value }: { label: string; value: unknown }) {
  const text =
    value == null || value === "" ? "—" : Array.isArray(value) ? value.join(", ") : String(value);
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{text}</p>
    </div>
  );
}

function CaseReviewPage() {
  const { caseId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const roleFn = useServerFn(getMyDiseaseRole);
  const detailFn = useServerFn(getCaseDetail);
  const reviewFn = useServerFn(submitCaseReview);
  const openedAt = useRef(Date.now());

  const [decision, setDecision] = useState<string>("");
  const [evidence, setEvidence] = useState<string[]>([]);
  const [corrected, setCorrected] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);

  const { data: role, isLoading: roleLoading } = useQuery({
    queryKey: ["disease-role"],
    queryFn: () => roleFn(),
  });
  const reviewer = Boolean(role?.reviewer);

  const { data, isLoading, error } = useQuery({
    queryKey: ["disease-case-detail", caseId],
    queryFn: () => detailFn({ data: { caseId } }),
    enabled: reviewer,
  });

  const kase = data?.case as Record<string, any> | undefined;
  const diagnosis = (kase?.["ai_diagnosis"] ?? {}) as Record<string, any>;
  const images = (data?.images ?? []) as Array<Record<string, any>>;
  const urls = data?.imageUrls ?? {};

  const differential = useMemo(() => {
    const d = diagnosis["differential"] ?? diagnosis["alternatives"] ?? [];
    return Array.isArray(d) ? d : [];
  }, [diagnosis]);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoom(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);

  async function save() {
    if (!decision) {
      toast.error("Choose a decision first");
      return;
    }
    if (decision === "corrected" && !corrected.trim()) {
      toast.error("Enter the correct disease name");
      return;
    }
    setBusy(true);
    try {
      const res = await reviewFn({
        data: {
          caseId,
          decision,
          evidence,
          notes: notes.trim() || null,
          correctedDisease: corrected.trim() || null,
          reviewSeconds: Math.round((Date.now() - openedAt.current) / 1000),
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["disease-review-queue"] });
      await queryClient.invalidateQueries({ queryKey: ["disease-dashboard"] });
      toast.success(res.reasons?.[0] ?? "Review saved");
      navigate({ to: "/app/disease-intelligence" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save this review");
    } finally {
      setBusy(false);
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
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading case…</p>;
  if (error || !kase) {
    return (
      <p className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {error instanceof Error ? error.message : "Case not found"}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <Link
        to="/app/disease-intelligence"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Disease Intelligence
      </Link>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-2xl font-bold">
          {diagnosis["top_diagnosis"]?.name ?? "Unnamed diagnosis"} · {kase["crop_name"]}
        </h1>
        <Badge tone={statusTone(kase["validation_status"])}>
          {String(kase["validation_status"]).replace(/_/g, " ")}
        </Badge>
      </div>

      <Section title="Photos" description="The farmer's original images — never changed here.">
        {images.length === 0 ? (
          <p className="text-sm text-muted-foreground">No photos recorded for this case.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((img) => {
              const url = urls[img["storage_path"]];
              return (
                <button
                  key={img["id"]}
                  onClick={() => url && setZoom(url)}
                  className="overflow-hidden rounded-xl border border-border"
                >
                  {url ? (
                    <img
                      src={url}
                      alt={`${kase["crop_name"]} ${img["image_type"] ?? "plant"} photo for review`}
                      loading="lazy"
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <span className="block p-4 text-xs text-muted-foreground">Image unavailable</span>
                  )}
                  <span className="block border-t border-border p-1 text-center text-xs capitalize text-muted-foreground">
                    {img["image_type"] ?? "photo"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Farm context">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Crop" value={kase["crop_name"]} />
          <Field label="Variety" value={kase["crop_variety"]} />
          <Field label="Crop stage" value={kase["crop_stage"]} />
          <Field label="Days after sowing" value={kase["days_after_sowing"]} />
          <Field label="Affected part" value={kase["affected_part"]} />
          <Field
            label="Region"
            value={(kase["location_name"] ?? "").split(",").slice(-2).join(",").trim() || "—"}
          />
          <Field label="Soil" value={(kase["soil_context"] as any)?.soilType} />
          <Field label="Irrigation" value={(kase["irrigation_context"] as any)?.method} />
          <Field
            label="Weather"
            value={
              kase["weather_context"]
                ? Object.entries(kase["weather_context"] as Record<string, unknown>)
                    .slice(0, 4)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" · ")
                : null
            }
          />
        </div>
      </Section>

      <Section title="Diagnostic evidence">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Symptoms" value={kase["symptoms"]} />
          <Field label="AI observations" value={diagnosis["observed_symptoms"]} />
          <Field label="Top diagnosis" value={diagnosis["top_diagnosis"]?.name} />
          <Field
            label="Confidence trail"
            value={[
              kase["confidence_initial"] != null ? `initial ${kase["confidence_initial"]}%` : null,
              kase["confidence_after_answers"] != null
                ? `after answers ${kase["confidence_after_answers"]}%`
                : null,
              kase["confidence_after_history"] != null
                ? `after history ${kase["confidence_after_history"]}%`
                : null,
              kase["confidence_final"] != null ? `final ${kase["confidence_final"]}%` : null,
            ]
              .filter(Boolean)
              .join(" → ")}
          />
        </div>
        {differential.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-muted-foreground">Alternative diagnoses</p>
            <ul className="mt-1 space-y-1 text-sm">
              {differential.map((d: any, i: number) => (
                <li key={i}>
                  {d?.name ?? "Unnamed"} {d?.confidence != null && `· ${d.confidence}%`}
                </li>
              ))}
            </ul>
          </div>
        )}
        {Array.isArray(kase["followup_questions"]) && kase["followup_questions"].length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-muted-foreground">Follow-up questions and answers</p>
            <ul className="mt-1 space-y-1 text-sm">
              {(kase["followup_questions"] as any[]).map((q: any, i: number) => (
                <li key={i}>
                  <span className="text-muted-foreground">{q?.question ?? q}</span>{" "}
                  <strong>{q?.answer ?? "—"}</strong>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      <Section
        title="Farmer feedback and treatment outcome"
        description="Diagnosis correctness and treatment result are tracked separately."
      >
        <Table
          head={["Type", "Value", "Notes", "When"]}
          rows={[
            ...(data?.feedback ?? []).map((f: any) => [
              "Feedback",
              String(f.diagnosis_rating).replace(/_/g, " "),
              f.farmer_notes ?? "—",
              new Date(f.created_at).toLocaleDateString(),
            ]),
            ...(data?.outcomes ?? []).map((o: any) => [
              "Outcome",
              `${String(o.outcome).replace(/_/g, " ")}${o.days_after_treatment ? ` after ${o.days_after_treatment} days` : ""}`,
              o.farmer_confirmed_disease
                ? `Farmer says: ${o.farmer_confirmed_disease}`
                : (o.farmer_notes ?? "—"),
              new Date(o.created_at).toLocaleDateString(),
            ]),
          ]}
          empty="No farmer feedback or treatment outcome yet."
        />
        {(() => {
          const urls = (data?.outcomes ?? []).flatMap((o: any) =>
            (Array.isArray(o.followup_images) ? o.followup_images : [])
              .map((f: any) => data?.imageUrls?.[typeof f === "string" ? f : f?.path])
              .filter(Boolean),
          ) as string[];
          if (!urls.length) return null;
          return (
            <div className="mt-4">
              <p className="text-sm font-medium">Treatment follow-up photos</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {urls.map((u) => (
                  <a key={u} href={u} target="_blank" rel="noreferrer">
                    <img src={u} alt="Crop after treatment" className="h-28 w-28 rounded-xl object-cover" />
                  </a>
                ))}
              </div>
            </div>
          );
        })()}
      </Section>

      <Section
        title="Historical evidence used"
        description="Validated past cases retrieved during this diagnosis. Read-only."
      >
        <Table
          head={["Disease", "Crop", "Similarity", "Status", "Quality", "Evidence"]}
          rows={(data?.historical ?? []).map((h: any) => [
            h.disease_name,
            h.crop_name,
            h.similarity == null ? "—" : `${Math.round(h.similarity * 100)}%`,
            <Badge tone={statusTone(h.knowledge_status)}>
              {String(h.knowledge_status).replace(/_/g, " ")}
            </Badge>,
            h.quality_score == null ? "—" : `${h.quality_score} · ${h.quality_level ?? ""}`,
            <span className="line-clamp-2 text-muted-foreground">{h.diagnostic_evidence}</span>,
          ])}
          empty="No historical knowledge was used for this diagnosis."
        />
      </Section>

      <Section title="Audit history" description="Every past decision is kept permanently.">
        <Table
          head={["When", "Decision", "Status change", "Disease change", "Notes"]}
          rows={(data?.history ?? []).map((h: any) => [
            new Date(h.created_at).toLocaleString(),
            String(h.decision ?? "—").replace(/_/g, " "),
            `${h.previous_status ?? "—"} → ${h.new_status}`,
            h.previous_disease === h.new_disease
              ? "unchanged"
              : `${h.previous_disease ?? "—"} → ${h.new_disease ?? "—"}`,
            h.notes ?? "—",
          ])}
          empty="No review decisions yet."
        />
      </Section>

      <Section title="Your decision" description="A decision and at least one reason are required.">
        <div className="flex flex-wrap gap-2">
          {REVIEW_ACTIONS.map((a) => (
            <button
              key={a.value}
              onClick={() => setDecision(a.value)}
              className={[
                "min-h-10 rounded-xl border px-4 text-sm font-medium",
                decision === a.value
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:bg-muted",
              ].join(" ")}
            >
              {a.label}
            </button>
          ))}
        </div>

        <p className="mt-4 text-xs text-muted-foreground">Supporting evidence</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {REVIEW_EVIDENCE_OPTIONS.map((e) => {
            const on = evidence.includes(e.value);
            return (
              <button
                key={e.value}
                onClick={() =>
                  setEvidence((cur) =>
                    on ? cur.filter((v) => v !== e.value) : [...cur, e.value],
                  )
                }
                className={[
                  "min-h-9 rounded-full border px-3 text-xs font-medium",
                  on ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted",
                ].join(" ")}
              >
                {e.label}
              </button>
            );
          })}
        </div>

        <input
          value={corrected}
          onChange={(e) => setCorrected(e.target.value)}
          placeholder={
            decision === "corrected" ? "Correct disease name (required)" : "Correct disease name (optional)"
          }
          className="mt-4 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm sm:w-96"
        />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Reviewer notes (optional)"
          className="mt-3 w-full rounded-xl border border-border bg-background p-3 text-sm"
        />

        <button
          onClick={save}
          disabled={busy || !decision}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save decision
        </button>
      </Section>

      {zoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4"
          onClick={() => setZoom(null)}
        >
          <button
            aria-label="Close image"
            className="absolute right-4 top-4 rounded-full border border-border p-2"
          >
            <X className="h-5 w-5" />
          </button>
          <img src={zoom} alt="Disease case photo, enlarged" className="max-h-full max-w-full rounded-xl" />
        </div>
      )}
    </div>
  );
}
