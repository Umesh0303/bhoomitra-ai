// Domain types for the Disease Intelligence layer: raw cases → farmer
// feedback → treatment outcome → validation → trusted knowledge.

import type { Tables } from "@/integrations/supabase/types";

export type DiseaseCaseRow = Tables<"disease_cases">;
export type DiseaseCaseImageRow = Tables<"disease_case_images">;
export type DiseaseFeedbackRow = Tables<"disease_feedback">;
export type DiseaseOutcomeRow = Tables<"disease_case_outcomes">;
export type DiseaseKnowledgeRow = Tables<"disease_knowledge">;
export type DiseaseReviewRow = Tables<"disease_review">;

export const VALIDATION_STATUSES = [
  "unverified",
  "farmer_confirmed",
  "expert_verified",
  "system_validated",
  "rejected",
] as const;
export type ValidationStatus = (typeof VALIDATION_STATUSES)[number];

/** Never used as trusted knowledge. */
export const TRUSTED_STATUSES: ValidationStatus[] = [
  "farmer_confirmed",
  "expert_verified",
  "system_validated",
];

export const DIAGNOSIS_RATINGS = [
  { value: "correct", label: "Correct" },
  { value: "partially_correct", label: "Partially correct" },
  { value: "incorrect", label: "Incorrect" },
  { value: "not_sure", label: "Not sure" },
] as const;
export type DiagnosisRating = (typeof DIAGNOSIS_RATINGS)[number]["value"];

export const OUTCOMES = [
  { value: "fully_recovered", label: "Fully recovered" },
  { value: "improved", label: "Improved" },
  { value: "no_change", label: "No improvement" },
  { value: "worse", label: "Became worse" },
  { value: "unknown", label: "Not sure" },
] as const;
export type OutcomeValue = (typeof OUTCOMES)[number]["value"];

export const REVIEW_DECISIONS = [
  { value: "verified", label: "Verified" },
  { value: "incorrect", label: "Incorrect" },
  { value: "needs_review", label: "Needs review" },
] as const;
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number]["value"];

export type SimilarCase = {
  id: string;
  cropName: string;
  diseaseName: string;
  symptoms: string[];
  affectedParts: string[];
  cropStage: string | null;
  knowledgeText: string;
  treatmentSuccessRate: number | null;
  confidenceScore: number;
  validationStatus: string;
  sourceCaseCount: number;
  similarity: number;
};

export type DiseaseAnalytics = {
  totalCases: number;
  validatedCases: number;
  pendingValidation: number;
  rejectedCases: number;
  casesWithOutcome: number;
  treatmentSuccessRate: number | null;
  averageConfidence: number | null;
  farmerConfirmed: number;
  farmerCorrected: number;
  knowledgeEntries: number;
  topDiseases: Array<{ name: string; count: number }>;
  topCrops: Array<{ name: string; count: number }>;
  regions: Array<{ name: string; count: number }>;
};
