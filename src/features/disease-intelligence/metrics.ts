// Pure aggregation for the evaluation dashboard. Every rate is returned with
// its sample size so nothing can be presented as reliable when it isn't.

import { CONFIDENCE_BUCKETS, MIN_REGION_SAMPLE, isReliable } from "./config";

export type Rate = { value: number | null; n: number; reliable: boolean };

export function rate(numerator: number, denominator: number): Rate {
  return {
    value: denominator ? Math.round((numerator / denominator) * 100) : null,
    n: denominator,
    reliable: isReliable(denominator),
  };
}

export function mean(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export const GOOD_OUTCOMES = ["fully_recovered", "improved"];
export const BAD_OUTCOMES = ["no_change", "worse"];
export const TRUSTED = ["farmer_confirmed", "expert_verified", "system_validated"];

export type CaseRecord = {
  id: string;
  crop_name: string;
  crop_stage: string | null;
  affected_part: string | null;
  validation_status: string;
  confidence_final: number | null;
  image_count: number | null;
  location_name: string | null;
  created_at: string;
  diseaseName: string | null;
  correctedDisease: string | null;
  rating: string | null;
  outcome: string | null;
  reviewDecision: string | null;
  historyUsed: boolean;
};

// ------------------------------------------------------------- core metrics

export type CoreMetrics = {
  confirmationRate: Rate;
  farmerAgreementRate: Rate;
  reviewerAgreementRate: Rate;
  treatmentSuccessRate: Rate;
  averageConfidence: number | null;
};

export function coreMetrics(cases: CaseRecord[]): CoreMetrics {
  const withConfirmation = cases.filter((c) => c.rating || c.reviewDecision);
  const confirmed = withConfirmation.filter(
    (c) => c.rating === "correct" || c.reviewDecision === "verified",
  );

  const withFeedback = cases.filter((c) => c.rating && c.rating !== "not_sure");
  const feedbackCorrect = withFeedback.filter(
    (c) => c.rating === "correct" || c.rating === "partially_correct",
  );

  const reviewed = cases.filter((c) => c.reviewDecision);
  const reviewerAgreed = reviewed.filter((c) => c.reviewDecision === "verified");

  const knownOutcomes = cases.filter(
    (c) => c.outcome && [...GOOD_OUTCOMES, ...BAD_OUTCOMES].includes(c.outcome),
  );
  const goodOutcomes = knownOutcomes.filter((c) => GOOD_OUTCOMES.includes(c.outcome!));

  return {
    confirmationRate: rate(confirmed.length, withConfirmation.length),
    farmerAgreementRate: rate(feedbackCorrect.length, withFeedback.length),
    reviewerAgreementRate: rate(reviewerAgreed.length, reviewed.length),
    treatmentSuccessRate: rate(goodOutcomes.length, knownOutcomes.length),
    averageConfidence: mean(
      cases.map((c) => c.confidence_final).filter((c): c is number => typeof c === "number"),
    ),
  };
}

// ------------------------------------------------------ confidence calibration

export type CalibrationBucket = {
  label: string;
  predictions: number;
  confirmed: number;
  incorrect: number;
  confirmationRate: Rate;
};

export function calibration(cases: CaseRecord[]): CalibrationBucket[] {
  return CONFIDENCE_BUCKETS.map((b) => {
    const inBucket = cases.filter(
      (c) => typeof c.confidence_final === "number" && c.confidence_final >= b.min && c.confidence_final <= b.max,
    );
    const judged = inBucket.filter((c) => c.rating || c.reviewDecision);
    const confirmed = judged.filter(
      (c) => c.rating === "correct" || c.reviewDecision === "verified",
    );
    const incorrect = judged.filter(
      (c) => c.rating === "incorrect" || c.reviewDecision === "incorrect",
    );
    return {
      label: b.label,
      predictions: inBucket.length,
      confirmed: confirmed.length,
      incorrect: incorrect.length,
      confirmationRate: rate(confirmed.length, judged.length),
    };
  });
}

// ------------------------------------------------------------ group analytics

export type GroupRow = {
  name: string;
  cases: number;
  confirmed: number;
  rejected: number;
  pending: number;
  expertVerified: number;
  averageConfidence: number | null;
  confirmationRate: Rate;
  treatmentSuccessRate: Rate;
  lastValidatedAt: string | null;
  topDisease?: string | null;
};

function groupRow(name: string, rows: CaseRecord[]): GroupRow {
  const judged = rows.filter((c) => c.rating || c.reviewDecision);
  const confirmed = judged.filter((c) => c.rating === "correct" || c.reviewDecision === "verified");
  const known = rows.filter(
    (c) => c.outcome && [...GOOD_OUTCOMES, ...BAD_OUTCOMES].includes(c.outcome),
  );
  const good = known.filter((c) => GOOD_OUTCOMES.includes(c.outcome!));
  const validated = rows
    .filter((c) => TRUSTED.includes(c.validation_status))
    .map((c) => c.created_at)
    .sort();

  return {
    name,
    cases: rows.length,
    confirmed: confirmed.length,
    rejected: rows.filter((c) => c.validation_status === "rejected").length,
    pending: rows.filter((c) => c.validation_status === "unverified").length,
    expertVerified: rows.filter((c) => c.validation_status === "expert_verified").length,
    averageConfidence: mean(
      rows.map((c) => c.confidence_final).filter((c): c is number => typeof c === "number"),
    ),
    confirmationRate: rate(confirmed.length, judged.length),
    treatmentSuccessRate: rate(good.length, known.length),
    lastValidatedAt: validated.length ? validated[validated.length - 1]! : null,
  };
}

function groupBy(cases: CaseRecord[], key: (c: CaseRecord) => string | null): Map<string, CaseRecord[]> {
  const map = new Map<string, CaseRecord[]>();
  for (const c of cases) {
    const k = (key(c) ?? "").trim();
    if (!k) continue;
    map.set(k, [...(map.get(k) ?? []), c]);
  }
  return map;
}

export function diseaseAnalytics(cases: CaseRecord[]): GroupRow[] {
  return [...groupBy(cases, (c) => c.correctedDisease ?? c.diseaseName).entries()]
    .map(([name, rows]) => groupRow(name, rows))
    .sort((a, b) => b.cases - a.cases);
}

export function cropAnalytics(cases: CaseRecord[]): GroupRow[] {
  return [...groupBy(cases, (c) => c.crop_name).entries()]
    .map(([name, rows]) => {
      const row = groupRow(name, rows);
      const diseases = diseaseAnalytics(rows);
      row.topDisease = diseases[0]?.name ?? null;
      return row;
    })
    .sort((a, b) => b.cases - a.cases);
}

/** Region is aggregated to the broadest recorded part and suppressed when small. */
export function regionAnalytics(cases: CaseRecord[]): GroupRow[] {
  return [...groupBy(cases, (c) => broadRegion(c.location_name)).entries()]
    .map(([name, rows]) => {
      const row = groupRow(name, rows);
      row.topDisease = diseaseAnalytics(rows)[0]?.name ?? null;
      return row;
    })
    .filter((r) => r.cases >= MIN_REGION_SAMPLE)
    .sort((a, b) => b.cases - a.cases);
}

/** "Village, District, State" → "State"; never an exact place. */
export function broadRegion(location: string | null): string | null {
  if (!location) return null;
  const parts = location
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length ? parts[parts.length - 1]! : null;
}

// ----------------------------------------------------------- treatment stats

export type TreatmentStats = {
  recorded: number;
  fullRecovery: number;
  improved: number;
  noChange: number;
  worse: number;
  unknown: number;
  improvementRate: Rate;
};

export function treatmentStats(outcomes: string[]): TreatmentStats {
  const count = (v: string) => outcomes.filter((o) => o === v).length;
  const known = outcomes.filter((o) => [...GOOD_OUTCOMES, ...BAD_OUTCOMES].includes(o));
  const good = known.filter((o) => GOOD_OUTCOMES.includes(o));
  return {
    recorded: outcomes.length,
    fullRecovery: count("fully_recovered"),
    improved: count("improved"),
    noChange: count("no_change"),
    worse: count("worse"),
    unknown: count("unknown"),
    improvementRate: rate(good.length, known.length),
  };
}

// ---------------------------------------------------------- confusion matrix

export type ConfusionRow = { predicted: string; actual: string; count: number };

export function confusionMatrix(cases: CaseRecord[]): ConfusionRow[] {
  const map = new Map<string, number>();
  for (const c of cases) {
    if (!c.diseaseName || !c.correctedDisease) continue;
    if (c.diseaseName.trim().toLowerCase() === c.correctedDisease.trim().toLowerCase()) continue;
    const key = `${c.diseaseName}→${c.correctedDisease}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([key, count]) => {
      const [predicted, actual] = key.split("→");
      return { predicted: predicted!, actual: actual!, count };
    })
    .sort((a, b) => b.count - a.count);
}

// ------------------------------------------------------------ error analysis

export type ErrorPattern = { pattern: string; count: number; hint: string };

export function errorPatterns(cases: CaseRecord[]): ErrorPattern[] {
  const wrong = cases.filter((c) => c.rating === "incorrect" || c.reviewDecision === "incorrect");
  const patterns: ErrorPattern[] = [
    {
      pattern: "High-confidence diagnoses later found wrong",
      count: wrong.filter((c) => (c.confidence_final ?? 0) >= 80).length,
      hint: "Review the fusion prompt's confidence caps.",
    },
    {
      pattern: "Low-confidence diagnoses (below 50%)",
      count: cases.filter((c) => (c.confidence_final ?? 100) < 50).length,
      hint: "Often caused by thin photo or symptom evidence.",
    },
    {
      pattern: "Wrong disease with a farmer correction",
      count: cases.filter((c) => c.rating === "incorrect" && c.correctedDisease).length,
      hint: "Feeds the disease confusion table.",
    },
    {
      pattern: "Cases without photos",
      count: cases.filter((c) => (c.image_count ?? 0) === 0).length,
      hint: "Image evidence is missing for these scans.",
    },
    {
      pattern: "Cases with no recorded symptoms",
      count: cases.filter((c) => !c.diseaseName).length,
      hint: "The vision step produced no named candidate.",
    },
    {
      pattern: "Cases missing crop stage",
      count: cases.filter((c) => !c.crop_stage).length,
      hint: "Stage improves both diagnosis and knowledge quality.",
    },
  ];
  return patterns.filter((p) => p.count > 0).sort((a, b) => b.count - a.count);
}

// ----------------------------------------------------------- learning impact

export type ImpactGroup = {
  label: string;
  cases: number;
  confirmationRate: Rate;
  averageConfidence: number | null;
  treatmentSuccessRate: Rate;
};

export function learningImpact(cases: CaseRecord[]): ImpactGroup[] {
  const build = (label: string, rows: CaseRecord[]): ImpactGroup => {
    const m = coreMetrics(rows);
    return {
      label,
      cases: rows.length,
      confirmationRate: m.confirmationRate,
      averageConfidence: m.averageConfidence,
      treatmentSuccessRate: m.treatmentSuccessRate,
    };
  };
  return [
    build("With historical cases", cases.filter((c) => c.historyUsed)),
    build("Without historical cases", cases.filter((c) => !c.historyUsed)),
  ];
}

// -------------------------------------------------------- data-quality issues

export type DataIssue = { issue: string; count: number; action: string };

export function dataQualityIssues(cases: CaseRecord[]): DataIssue[] {
  const issues: DataIssue[] = [
    {
      issue: "Cases with no images",
      count: cases.filter((c) => (c.image_count ?? 0) === 0).length,
      action: "Check the upload step for these scans.",
    },
    {
      issue: "Cases with an unknown crop",
      count: cases.filter((c) => !c.crop_name || c.crop_name.toLowerCase() === "unknown").length,
      action: "Ask farmers to set the crop on their farm profile.",
    },
    {
      issue: "Cases with no named diagnosis",
      count: cases.filter((c) => !c.diseaseName).length,
      action: "Inspect the diagnosis pipeline for these scans.",
    },
    {
      issue: "Cases with no confidence recorded",
      count: cases.filter((c) => c.confidence_final == null).length,
      action: "Confidence calibration skips these.",
    },
    {
      issue: "Cases awaiting any validation",
      count: cases.filter((c) => c.validation_status === "unverified").length,
      action: "Request farmer feedback or review them.",
    },
    {
      issue: "Validated cases with no treatment outcome",
      count: cases.filter((c) => TRUSTED.includes(c.validation_status) && !c.outcome).length,
      action: "Follow up for a treatment result.",
    },
  ];
  return issues.filter((i) => i.count > 0);
}
