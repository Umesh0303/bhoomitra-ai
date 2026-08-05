import {
  AlertTriangle,
  BadgeCheck,
  BookOpen,
  Camera,
  CloudSun,
  Leaf,
  ShieldCheck,
  Sparkles,
  Star,
  Tractor,
  XCircle,
} from "lucide-react";
import { confidenceLabel, stars } from "../confidence";
import {
  DISEASE_TYPE_LABEL,
  type CropScanRow,
  type Citation,
  type Differential,
  type Diagnosis,
  type EvidenceBundle,
  type HealthScore,
  type Progression,
  type ScanAlert,
  type TreatmentPlan,
  type Treatment,
  type WeatherRisk,
  type DiseaseType,
} from "../types";

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h3 className="flex items-center gap-2 font-display text-base font-bold">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function EvidenceList({ items }: { items: Array<{ text: string }> }) {
  if (!items?.length) return <p className="text-sm text-muted-foreground">No signals from this source.</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((e, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>{e.text}</span>
        </li>
      ))}
    </ul>
  );
}

function TreatmentList({ title, items }: { title: string; items: Treatment[] }) {
  if (!items?.length) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">{title}</h4>
      {items.map((t, i) => (
        <div key={i} className="rounded-xl border border-border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">{t.name}</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              {Array.from({ length: 5 }).map((_, s) => (
                <Star
                  key={s}
                  className={`h-3.5 w-3.5 ${s < stars(t.expectedSuccess) ? "fill-highlight text-highlight" : "text-muted-foreground/40"}`}
                />
              ))}
              {t.expectedSuccess}% expected success
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t.how}</p>
          <dl className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
            {t.dosage && <div><dt className="inline font-medium">Dosage: </dt><dd className="inline">{t.dosage}</dd></div>}
            {t.interval && <div><dt className="inline font-medium">Interval: </dt><dd className="inline">{t.interval}</dd></div>}
            {t.safetyNotes && <div><dt className="inline font-medium">Safety: </dt><dd className="inline">{t.safetyNotes}</dd></div>}
          </dl>
        </div>
      ))}
    </div>
  );
}

export function ScanReport({ scan, imageUrls }: { scan: CropScanRow; imageUrls: string[] }) {
  const diagnosis = scan.diagnosis as unknown as Diagnosis | null;
  if (!diagnosis) return null;

  const evidence = (scan.evidence ?? {}) as unknown as EvidenceBundle;
  const differential = (scan.differential ?? {}) as unknown as Differential;
  const plan = (scan.treatment_plan ?? {}) as unknown as TreatmentPlan;
  const risk = (scan.weather_risk ?? {}) as unknown as WeatherRisk;
  const progression = (scan.progression ?? {}) as unknown as Progression;
  const health = (scan.health_score ?? {}) as unknown as HealthScore;
  const alerts = (scan.alerts ?? []) as unknown as ScanAlert[];
  const citations = (scan.citations ?? []) as unknown as Citation[];
  const missing = (scan.missing_evidence ?? []) as unknown as string[];
  const confidence = scan.confidence ?? 0;
  const uncertain = confidence < 70;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Most likely</p>
            <h2 className="font-display text-2xl font-bold">{diagnosis.name}</h2>
            {diagnosis.scientificName && (
              <p className="text-sm italic text-muted-foreground">{diagnosis.scientificName}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-muted px-2.5 py-1">
                {DISEASE_TYPE_LABEL[(diagnosis.type as DiseaseType) ?? "unknown"]}
              </span>
              <span className="rounded-full bg-muted px-2.5 py-1">Severity: {diagnosis.severity}</span>
              <span className="rounded-full bg-muted px-2.5 py-1">Risk: {diagnosis.riskLevel}</span>
              <span className="rounded-full bg-muted px-2.5 py-1">
                Recovery chance: {diagnosis.recoveryProbability}%
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-3xl font-bold text-primary">{confidence}%</div>
            <p className="text-xs text-muted-foreground">{confidenceLabel(confidence)}</p>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary" style={{ width: `${confidence}%` }} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{diagnosis.cause}</p>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-xs text-muted-foreground">Estimated spread</dt><dd>{diagnosis.estimatedSpread}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Yield impact</dt><dd>{diagnosis.yieldImpact}</dd></div>
        </dl>
      </section>

      {uncertain && (
        <section className="rounded-2xl border border-highlight/40 bg-highlight/10 p-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <Camera className="h-4 w-4" /> Diagnosis uncertain
          </h3>
          <p className="mt-1 text-sm">To improve accuracy, please upload:</p>
          <ul className="mt-2 list-inside list-disc text-sm">
            {(missing.length ? missing : ["Back side of the leaf", "Stem image", "Fruit image"]).map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </section>
      )}

      {imageUrls.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {imageUrls.map((u) => (
            <img key={u} src={u} alt="Scan photo" className="h-28 w-28 shrink-0 rounded-xl object-cover" loading="lazy" />
          ))}
        </div>
      )}

      <Section title="Why this diagnosis" icon={Sparkles}>
        <p className="text-sm">{scan.reasoning}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><h4 className="mb-1.5 flex items-center gap-2 text-sm font-semibold"><Camera className="h-4 w-4" /> Image evidence</h4><EvidenceList items={evidence.image ?? []} /></div>
          <div><h4 className="mb-1.5 flex items-center gap-2 text-sm font-semibold"><Leaf className="h-4 w-4" /> Farmer responses</h4><EvidenceList items={evidence.answers ?? []} /></div>
          <div><h4 className="mb-1.5 flex items-center gap-2 text-sm font-semibold"><CloudSun className="h-4 w-4" /> Weather evidence</h4><EvidenceList items={evidence.weather ?? []} /></div>
          <div><h4 className="mb-1.5 flex items-center gap-2 text-sm font-semibold"><Tractor className="h-4 w-4" /> Farm context</h4><EvidenceList items={evidence.farm ?? []} /></div>
        </div>
        {(evidence.knowledge?.length || citations.length) > 0 && (
          <div className="mt-4">
            <h4 className="mb-1.5 flex items-center gap-2 text-sm font-semibold"><BookOpen className="h-4 w-4" /> Knowledge base</h4>
            <EvidenceList items={evidence.knowledge ?? []} />
            {citations.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {citations.map((c, i) => (
                  <li key={i}>• {c.filename}{c.page ? ` p.${c.page}` : ""}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Section>

      <Section title="Differential diagnosis" icon={ShieldCheck}>
        <h4 className="text-sm font-semibold">Also consider</h4>
        <ul className="mt-2 space-y-2">
          {(differential.alsoConsider ?? []).map((d, i) => (
            <li key={i} className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>{d.name}</span>
                <span className="text-muted-foreground">{d.confidence}%</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{d.note}</p>
            </li>
          ))}
          {!(differential.alsoConsider ?? []).length && (
            <li className="text-sm text-muted-foreground">No close alternatives.</li>
          )}
        </ul>
        {(differential.ruledOut ?? []).length > 0 && (
          <>
            <h4 className="mt-4 text-sm font-semibold">Ruled out</h4>
            <ul className="mt-2 space-y-2">
              {differential.ruledOut.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span><span className="font-medium">{d.name}</span> — {d.reason}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>

      <Section title="Disease progression" icon={AlertTriangle}>
        <dl className="grid gap-3 sm:grid-cols-4">
          <div><dt className="text-xs text-muted-foreground">Stage</dt><dd className="text-sm font-medium capitalize">{progression.stage ?? "unknown"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Affected area</dt><dd className="text-sm font-medium">{progression.affectedAreaPct ?? 0}%</dd></div>
          <div><dt className="text-xs text-muted-foreground">Progression risk</dt><dd className="text-sm font-medium capitalize">{progression.progressionRisk ?? "low"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Time since infection</dt><dd className="text-sm font-medium">{progression.timeSinceInfection ?? "—"}</dd></div>
        </dl>
      </Section>

      <Section title="Treatment plan" icon={ShieldCheck}>
        <div className="space-y-4">
          <TreatmentList title="Organic" items={plan.organic ?? []} />
          <TreatmentList title="Chemical" items={plan.chemical ?? []} />
          <TreatmentList title="Cultural practices" items={plan.cultural ?? []} />
          <TreatmentList title="Preventive measures" items={plan.preventive ?? []} />
          {plan.sprayInterval && (
            <p className="text-sm"><span className="font-medium">Recommended spray interval:</span> {plan.sprayInterval}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {plan.safetySummary ||
              "Always follow label instructions and protective equipment guidance. When in doubt, consult your local Krishi Vigyan Kendra."}
          </p>
        </div>
      </Section>

      <Section title="Weather risk" icon={CloudSun}>
        <p className="text-sm">{risk.explanation}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-muted px-2.5 py-1">Now: {risk.level ?? "low"}</span>
          <span className="rounded-full bg-muted px-2.5 py-1">Next days: {risk.futureRisk ?? "low"}</span>
        </div>
        <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
          {(risk.factors ?? []).map((f) => <li key={f}>{f}</li>)}
        </ul>
      </Section>

      <Section title="Crop health score" icon={Leaf}>
        <div className="flex items-baseline gap-2">
          <span className="font-display text-3xl font-bold">{health.overall ?? 0}</span>
          <span className="text-muted-foreground">/100</span>
        </div>
        <dl className="mt-3 grid gap-3 sm:grid-cols-5">
          <div><dt className="text-xs text-muted-foreground">Leaf health</dt><dd className="text-sm font-medium">{health.leafHealth ?? 0}%</dd></div>
          <div><dt className="text-xs text-muted-foreground">Disease risk</dt><dd className="text-sm font-medium capitalize">{health.diseaseRisk ?? "low"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Water stress</dt><dd className="text-sm font-medium capitalize">{health.waterStress ?? "low"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Nutrient status</dt><dd className="text-sm font-medium capitalize">{health.nutrientStatus ?? "good"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Growth</dt><dd className="text-sm font-medium">{health.growthStatus ?? "—"}</dd></div>
        </dl>
      </Section>

      {alerts.length > 0 && (
        <Section title="Smart alerts" icon={AlertTriangle}>
          <ul className="space-y-2">
            {alerts.map((a, i) => (
              <li key={i} className="rounded-xl border border-border p-3">
                <div className="text-sm font-semibold">{a.title}</div>
                <p className="text-sm text-muted-foreground">{a.message}</p>
                {a.action && <p className="mt-1 text-sm font-medium">Recommended action: {a.action}</p>}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
