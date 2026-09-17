// Transparent knowledge-quality scoring. Every component is computed from
// recorded evidence and returned alongside the total, so a score can always be
// explained. Pure functions only — no database, no network.

import {
  EVIDENCE_FIELDS,
  PROMOTION_RULES,
  QUALITY_WEIGHTS,
  VALIDATION_STRENGTH,
  qualityLevel,
  type EvidenceField,
  type KnowledgeStatus,
} from "./config";

export type QualityInput = {
  /** Strongest validation state across the entry's source cases. */
  validationStatus: string;
  /** Which evidence fields were present, averaged across source cases. */
  evidence: Record<EvidenceField, boolean>[];
  /** Farmer/reviewer confirmations vs. total source cases. */
  confirmedCount: number;
  contradictedCount: number;
  sourceCaseCount: number;
  /** Recorded treatment outcomes for the entry's source cases. */
  outcomes: string[];
  /** Distinct farms behind the entry — repeats from one farm are not independent. */
  independentSourceCount: number;
  /** Whether context (crop stage, affected part, symptoms) is consistent. */
  consistentContext: boolean;
};

export type QualityBreakdown = {
  score: number;
  level: string;
  validationScore: number;
  evidenceScore: number;
  confirmationScore: number;
  outcomeScore: number;
  supportingCasesScore: number;
  consistencyScore: number;
  evidenceCompleteness: number;
  goodOutcomeShare: number | null;
  notes: string[];
};

const GOOD = ["fully_recovered", "improved"];
const BAD = ["no_change", "worse"];

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function evidenceCompleteness(sets: Record<EvidenceField, boolean>[]): number {
  if (!sets.length) return 0;
  const total = sets.reduce(
    (sum, set) => sum + EVIDENCE_FIELDS.filter((f) => set[f]).length / EVIDENCE_FIELDS.length,
    0,
  );
  return total / sets.length;
}

export function computeQuality(input: QualityInput): QualityBreakdown {
  const notes: string[] = [];

  const strength = VALIDATION_STRENGTH[input.validationStatus] ?? 0;
  const validationScore = round1(strength * QUALITY_WEIGHTS.validation);
  if (strength === 0) notes.push("No trusted validation on this entry.");

  const completeness = evidenceCompleteness(input.evidence);
  const evidenceScore = round1(completeness * QUALITY_WEIGHTS.evidence);
  if (completeness < PROMOTION_RULES.minEvidenceCompleteness) {
    notes.push("Case evidence is incomplete.");
  }

  const confirmable = input.confirmedCount + input.contradictedCount;
  const confirmShare = confirmable ? input.confirmedCount / confirmable : 0;
  const confirmationScore = round1(confirmShare * QUALITY_WEIGHTS.confirmation);
  if (input.contradictedCount > 0) {
    notes.push(`${input.contradictedCount} contradicting confirmation(s) recorded.`);
  }

  const known = input.outcomes.filter((o) => GOOD.includes(o) || BAD.includes(o));
  const goodOutcomeShare = known.length
    ? known.filter((o) => GOOD.includes(o)).length / known.length
    : null;
  const outcomeScore = round1((goodOutcomeShare ?? 0) * QUALITY_WEIGHTS.outcome);
  if (goodOutcomeShare == null) notes.push("No treatment outcome recorded yet.");

  // Independent sources saturate: one farmer scanning repeatedly adds little.
  const independent = Math.max(0, input.independentSourceCount);
  const supportingCasesScore = round1(
    Math.min(1, Math.log2(independent + 1) / Math.log2(5)) * QUALITY_WEIGHTS.supportingCases,
  );
  if (independent <= 1) notes.push("Only one independent source so far.");

  const consistencyScore = input.consistentContext ? QUALITY_WEIGHTS.consistency : 0;
  if (!input.consistentContext) notes.push("Context across source cases is inconsistent.");

  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        validationScore +
          evidenceScore +
          confirmationScore +
          outcomeScore +
          supportingCasesScore +
          consistencyScore,
      ),
    ),
  );

  return {
    score,
    level: qualityLevel(score),
    validationScore,
    evidenceScore,
    confirmationScore,
    outcomeScore,
    supportingCasesScore,
    consistencyScore,
    evidenceCompleteness: round1(completeness * 100) / 100,
    goodOutcomeShare,
    notes,
  };
}

export type StatusInput = {
  quality: QualityBreakdown;
  validationStatus: string;
  independentSourceCount: number;
  contradictedCount: number;
  outcomes: string[];
  lastValidatedAt: string | null;
  now?: Date;
};

export type StatusDecision = {
  status: KnowledgeStatus;
  reason: string;
  conflicting: boolean;
  stale: boolean;
};

/**
 * Promotion is rule-based and reversible: contradicting evidence sends a
 * trusted entry back to review rather than deleting it.
 */
export function decideKnowledgeStatus(input: StatusInput): StatusDecision {
  const now = input.now ?? new Date();
  const known = input.outcomes.filter((o) => GOOD.includes(o) || BAD.includes(o));
  const badShare = known.length ? known.filter((o) => BAD.includes(o)).length / known.length : 0;
  const conflicting =
    input.contradictedCount > 0 ||
    (known.length > 0 && badShare >= PROMOTION_RULES.conflictOutcomeShare);

  const stale = input.lastValidatedAt
    ? (now.getTime() - new Date(input.lastValidatedAt).getTime()) / 86_400_000 >
      PROMOTION_RULES.staleAfterDays
    : false;

  if (input.validationStatus === "rejected") {
    return { status: "rejected", reason: "Diagnosis was rejected on review.", conflicting, stale };
  }
  if (conflicting) {
    return {
      status: "needs_review",
      reason: "Later evidence contradicts this entry.",
      conflicting,
      stale,
    };
  }
  if (stale) {
    return {
      status: "needs_review",
      reason: "Not validated recently — review recommended.",
      conflicting,
      stale,
    };
  }
  if (
    input.quality.score >= PROMOTION_RULES.trustedQualityThreshold &&
    input.independentSourceCount >= PROMOTION_RULES.minIndependentSources &&
    input.quality.evidenceCompleteness >= PROMOTION_RULES.minEvidenceCompleteness &&
    VALIDATION_STRENGTH[input.validationStatus]
  ) {
    return {
      status: "trusted",
      reason: `Quality ${input.quality.score} meets the trusted threshold.`,
      conflicting,
      stale,
    };
  }
  return {
    status: "candidate",
    reason: `Quality ${input.quality.score} is below the trusted threshold of ${PROMOTION_RULES.trustedQualityThreshold}.`,
    conflicting,
    stale,
  };
}

/** Evidence checklist for one raw case. */
export function caseEvidence(kase: {
  image_count?: number | null;
  symptoms?: string[] | null;
  crop_name?: string | null;
  crop_stage?: string | null;
  weather_context?: unknown;
  followup_answers?: unknown;
  hasOutcome?: boolean;
}): Record<EvidenceField, boolean> {
  const weather = kase.weather_context as Record<string, unknown> | null;
  const answers = kase.followup_answers;
  return {
    images: (kase.image_count ?? 0) > 0,
    symptoms: (kase.symptoms?.length ?? 0) > 0,
    crop: Boolean(kase.crop_name && kase.crop_name.toLowerCase() !== "unknown"),
    cropStage: Boolean(kase.crop_stage),
    weather: Boolean(weather && Object.keys(weather).length > 0),
    answers: Array.isArray(answers) ? answers.length > 0 : Boolean(answers),
    outcome: Boolean(kase.hasOutcome),
  };
}
