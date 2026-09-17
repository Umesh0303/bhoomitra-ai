// Single source of truth for every Disease Intelligence threshold and weight.
// Nothing in the UI or server code may hardcode these values.

export const DI_CONFIG_VERSION = "v1";

/** Quality-score weights. Must total 100. */
export const QUALITY_WEIGHTS = {
  validation: 30,
  evidence: 20,
  confirmation: 20,
  outcome: 15,
  supportingCases: 10,
  consistency: 5,
} as const;

/** How much each validation state is worth, as a share of the validation weight. */
export const VALIDATION_STRENGTH: Record<string, number> = {
  expert_verified: 1,
  farmer_confirmed: 0.7,
  system_validated: 0.6,
  unverified: 0,
  rejected: 0,
};

/** Evidence-completeness checklist — each item contributes equally. */
export const EVIDENCE_FIELDS = [
  "images",
  "symptoms",
  "crop",
  "cropStage",
  "weather",
  "answers",
  "outcome",
] as const;
export type EvidenceField = (typeof EVIDENCE_FIELDS)[number];

export const QUALITY_LEVELS = [
  { min: 80, label: "High evidence", tone: "high" },
  { min: 60, label: "Strong evidence", tone: "strong" },
  { min: 40, label: "Moderate evidence", tone: "moderate" },
  { min: 0, label: "Low evidence", tone: "low" },
] as const;

export const KNOWLEDGE_STATUSES = [
  "candidate",
  "trusted",
  "needs_review",
  "deprecated",
  "rejected",
] as const;
export type KnowledgeStatus = (typeof KNOWLEDGE_STATUSES)[number];

export const PROMOTION_RULES = {
  /** Quality score a knowledge entry must reach to be trusted. */
  trustedQualityThreshold: 60,
  /** Independent sources (distinct farms) required for trusted status. */
  minIndependentSources: 1,
  /** Evidence-completeness share required for trusted status. */
  minEvidenceCompleteness: 0.5,
  /** Days without validation before a review is recommended. */
  staleAfterDays: 365,
  /** Share of poor treatment outcomes that flags conflicting evidence. */
  conflictOutcomeShare: 0.5,
} as const;

/** Below this many observations a rate is shown but never called reliable. */
export const MIN_SAMPLE_SIZE = 10;
/** Regional and confusion breakdowns are suppressed below this, for privacy. */
export const MIN_REGION_SAMPLE = 5;

export const CONFIDENCE_BUCKETS = [
  { min: 0, max: 20, label: "0–20%" },
  { min: 21, max: 40, label: "21–40%" },
  { min: 41, max: 60, label: "41–60%" },
  { min: 61, max: 80, label: "61–80%" },
  { min: 81, max: 100, label: "81–100%" },
] as const;

export const REVIEW_EVIDENCE_OPTIONS = [
  { value: "visual_symptoms", label: "Visual symptoms" },
  { value: "farmer_answers", label: "Farmer answers" },
  { value: "crop_stage", label: "Crop stage" },
  { value: "weather", label: "Weather conditions" },
  { value: "historical_cases", label: "Historical cases" },
  { value: "treatment_response", label: "Treatment response" },
  { value: "other", label: "Other evidence" },
] as const;

export const REVIEW_ACTIONS = [
  { value: "verified", label: "Verify diagnosis" },
  { value: "incorrect", label: "Reject diagnosis" },
  { value: "needs_evidence", label: "Needs more evidence" },
  { value: "duplicate", label: "Mark duplicate" },
  { value: "corrected", label: "Correct disease" },
] as const;
export type ReviewAction = (typeof REVIEW_ACTIONS)[number]["value"];

export function qualityLevel(score: number): string {
  return QUALITY_LEVELS.find((l) => score >= l.min)?.label ?? "Low evidence";
}

/** True when a rate is backed by enough observations to be worth acting on. */
export function isReliable(n: number): boolean {
  return n >= MIN_SAMPLE_SIZE;
}
