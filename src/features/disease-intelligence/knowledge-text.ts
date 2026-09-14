// Turns a validated diagnostic case into a clean, privacy-safe agronomy
// document. Pure functions only — no database, no network, easy to test.

export type CaseLike = {
  crop_name: string;
  crop_stage: string | null;
  affected_part: string | null;
  symptoms: string[] | null;
  weather_context: unknown;
  soil_context: unknown;
  ai_diagnosis: unknown;
  recommended_treatment: unknown;
  confidence_final: number | null;
  validation_status: string;
  location_name?: string | null;
};

export type OutcomeLike = {
  outcome: string;
  treatment_followed: boolean;
  days_after_treatment: number | null;
  farmer_confirmed_disease: string | null;
} | null;

export type FeedbackLike = { diagnosis_rating: string } | null;

const GOOD_OUTCOMES = ["fully_recovered", "improved"];

export type Eligibility = { eligible: boolean; reasons: string[] };

/**
 * A case may only become trusted knowledge when the real world agreed with
 * the AI. An unverified prediction never qualifies — that is what stops the
 * system from learning its own mistakes.
 */
export function evaluatePromotion(
  kase: CaseLike,
  feedback: FeedbackLike,
  outcome: OutcomeLike,
  reviewVerified = false,
): Eligibility {
  const reasons: string[] = [];
  const diseaseName = topDiagnosisName(kase.ai_diagnosis);

  if (!diseaseName || diseaseName.toLowerCase() === "unknown") {
    reasons.push("No identified disease on the case");
  }
  if (!kase.crop_name || kase.crop_name.toLowerCase() === "unknown") {
    reasons.push("Crop is unknown");
  }
  if (!(kase.symptoms?.length ?? 0)) {
    reasons.push("No recorded symptoms");
  }

  const farmerAgrees = feedback?.diagnosis_rating === "correct";
  const farmerCorrected = Boolean(outcome?.farmer_confirmed_disease);
  if (!reviewVerified && !farmerAgrees && !farmerCorrected) {
    reasons.push("Farmer has not confirmed the diagnosis");
  }
  if (feedback?.diagnosis_rating === "incorrect" && !farmerCorrected && !reviewVerified) {
    reasons.push("Farmer marked the diagnosis incorrect with no correction");
  }

  if (!reviewVerified) {
    if (!outcome) reasons.push("No treatment outcome reported yet");
    else if (!GOOD_OUTCOMES.includes(outcome.outcome)) {
      reasons.push("Treatment outcome does not support the diagnosis");
    }
  }

  return { eligible: reasons.length === 0, reasons };
}

export function topDiagnosisName(aiDiagnosis: unknown): string | null {
  const d = aiDiagnosis as { top_diagnosis?: { name?: string }; name?: string } | null;
  return d?.top_diagnosis?.name ?? d?.name ?? null;
}

/** The disease the knowledge entry is filed under — farmer correction wins. */
export function resolvedDiseaseName(kase: CaseLike, outcome: OutcomeLike): string {
  return outcome?.farmer_confirmed_disease?.trim() || topDiagnosisName(kase.ai_diagnosis) || "Unknown";
}

function list(values: unknown): string[] {
  return Array.isArray(values) ? values.filter((v): v is string => typeof v === "string") : [];
}

function weatherLine(weather: unknown): string {
  const w = weather as Record<string, unknown> | null;
  if (!w) return "not recorded";
  const parts: string[] = [];
  if (typeof w["tempC"] === "number") parts.push(`${w["tempC"]}°C`);
  if (typeof w["humidity"] === "number") parts.push(`${w["humidity"]}% humidity`);
  if (typeof w["rainLast3DaysMm"] === "number")
    parts.push(`${w["rainLast3DaysMm"]}mm rain in the previous 3 days`);
  if (typeof w["conditionLabel"] === "string") parts.push(String(w["conditionLabel"]));
  return parts.length ? parts.join(", ") : "not recorded";
}

function treatmentLines(treatment: unknown): string[] {
  const plan = treatment as Record<string, Array<Record<string, unknown>>> | null;
  if (!plan) return [];
  const out: string[] = [];
  for (const group of ["organic", "chemical", "cultural", "preventive"]) {
    for (const t of plan[group] ?? []) {
      const name = typeof t["name"] === "string" ? t["name"] : null;
      if (!name) continue;
      const how = typeof t["how"] === "string" ? t["how"] : "";
      out.push(`- ${group}: ${name}${how ? ` — ${how}` : ""}`);
    }
  }
  return out;
}

export type KnowledgeDraft = {
  cropName: string;
  diseaseName: string;
  symptoms: string[];
  visualFeatures: string[];
  affectedParts: string[];
  cropStage: string | null;
  knowledgeText: string;
  diagnosticEvidence: string;
  treatmentGuidance: string;
  preventionGuidance: string;
};

/**
 * Only agronomy goes in: crop, disease, symptoms, stage, weather, evidence and
 * treatment. No farmer identity, no exact farm location, no contact details.
 */
export function buildKnowledgeDraft(
  kase: CaseLike,
  feedback: FeedbackLike,
  outcome: OutcomeLike,
): KnowledgeDraft {
  const diseaseName = resolvedDiseaseName(kase, outcome);
  const diag = kase.ai_diagnosis as
    | { observed_symptoms?: unknown; evidence?: unknown; top_diagnosis?: { name?: string } }
    | null;
  const symptoms = list(kase.symptoms).length ? list(kase.symptoms) : list(diag?.observed_symptoms);
  const visualFeatures = list(diag?.observed_symptoms);
  const affectedParts = kase.affected_part ? [kase.affected_part] : [];

  const evidenceBits: string[] = [];
  if (feedback?.diagnosis_rating === "correct") evidenceBits.push("Farmer confirmed the diagnosis.");
  if (outcome?.farmer_confirmed_disease)
    evidenceBits.push(`Farmer identified the disease as ${outcome.farmer_confirmed_disease}.`);
  if (outcome && GOOD_OUTCOMES.includes(outcome.outcome)) {
    evidenceBits.push(
      `The recommended treatment led to ${outcome.outcome === "fully_recovered" ? "full recovery" : "improvement"}${
        outcome.days_after_treatment ? ` within ${outcome.days_after_treatment} days` : ""
      }.`,
    );
  }
  const diagnosticEvidence = evidenceBits.join(" ") || "Case validated by review.";

  const treatments = treatmentLines(kase.recommended_treatment);
  const treatmentGuidance = treatments.length
    ? treatments.join("\n")
    : "No treatment plan recorded for this case.";
  const preventionGuidance = treatmentLines(
    (kase.recommended_treatment as Record<string, unknown> | null)
      ? { preventive: (kase.recommended_treatment as Record<string, unknown>)["preventive"] }
      : null,
  ).join("\n");

  const knowledgeText = [
    `Crop: ${kase.crop_name}`,
    `Disease: ${diseaseName}`,
    `Affected parts: ${affectedParts.join(", ") || "not recorded"}`,
    `Crop stage: ${kase.crop_stage ?? "not recorded"}`,
    `Symptoms:\n${symptoms.map((s) => `- ${s}`).join("\n") || "- not recorded"}`,
    `Weather at the time: ${weatherLine(kase.weather_context)}`,
    `Evidence: ${diagnosticEvidence}`,
    `Treatment used:\n${treatmentGuidance}`,
  ].join("\n\n");

  return {
    cropName: kase.crop_name,
    diseaseName,
    symptoms,
    visualFeatures,
    affectedParts,
    cropStage: kase.crop_stage,
    knowledgeText,
    diagnosticEvidence,
    treatmentGuidance,
    preventionGuidance,
  };
}

/** Same crop + disease + stage is treated as the same knowledge record. */
export function duplicateKey(draft: KnowledgeDraft): {
  crop: string;
  disease: string;
  stage: string | null;
} {
  return {
    crop: draft.cropName.trim().toLowerCase(),
    disease: draft.diseaseName.trim().toLowerCase(),
    stage: draft.cropStage?.trim().toLowerCase() ?? null,
  };
}

/** Confidence rises slowly and only with genuinely new validated evidence. */
export function mergedConfidence(existing: number, sourceCount: number): number {
  return Math.min(95, Math.round(existing + Math.max(0, 8 - sourceCount)));
}

export function successRate(outcomes: string[]): number | null {
  const known = outcomes.filter((o) => o && o !== "unknown");
  if (!known.length) return null;
  const good = known.filter((o) => GOOD_OUTCOMES.includes(o)).length;
  return Math.round((good / known.length) * 100);
}
