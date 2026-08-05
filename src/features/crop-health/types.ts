// Domain types for the Crop Health / AI Disease Detection module.
// Media is stored generically (path + kind) so video, drone, satellite or
// sensor evidence can be added later without a schema change.

import type { Tables } from "@/integrations/supabase/types";

export type CropScanRow = Tables<"crop_scans">;
export type CropScanImageRow = Tables<"crop_scan_images">;
export type CropScanQuestionRow = Tables<"crop_scan_questions">;

export const PLANT_PARTS = [
  "leaf",
  "fruit",
  "stem",
  "flower",
  "root",
  "whole_plant",
] as const;
export type PlantPart = (typeof PLANT_PARTS)[number];

export const PLANT_PART_LABEL: Record<PlantPart, string> = {
  leaf: "Leaf",
  fruit: "Fruit",
  stem: "Stem",
  flower: "Flower",
  root: "Root",
  whole_plant: "Whole plant",
};

export const DISEASE_TYPES = [
  "fungal",
  "bacterial",
  "viral",
  "pest",
  "nutrient",
  "water_stress",
  "heat_damage",
  "cold_damage",
  "physical_injury",
  "healthy",
  "unknown",
] as const;
export type DiseaseType = (typeof DISEASE_TYPES)[number];

export const DISEASE_TYPE_LABEL: Record<DiseaseType, string> = {
  fungal: "Fungal",
  bacterial: "Bacterial",
  viral: "Viral",
  pest: "Pest",
  nutrient: "Nutrient deficiency",
  water_stress: "Water stress",
  heat_damage: "Heat damage",
  cold_damage: "Cold damage",
  physical_injury: "Physical injury",
  healthy: "Healthy",
  unknown: "Unknown",
};

export type Severity = "none" | "low" | "moderate" | "high" | "severe";
export type RiskLevel = "low" | "medium" | "high";

export type Candidate = {
  name: string;
  scientificName?: string;
  type: DiseaseType;
  confidence: number; // 0-100 (raw model belief, before calibration)
  rationale: string;
};

export type ImageQuality = {
  usable: boolean;
  issues: string[];
};

export type ImageAnalysis = {
  crop: string;
  plantParts: string[];
  symptoms: string[];
  severity: Severity;
  affectedAreaPct: number;
  imageQuality: ImageQuality;
  candidates: Candidate[];
  missingEvidence: string[];
};

export type ScanQuestion = {
  id?: string;
  question: string;
  helpText?: string;
  category: string;
  inputType: "single" | "multi";
  options: Array<{ label: string; value: string }>;
  targets: string[];
  answer?: string | null;
};

export type EvidenceItem = {
  text: string;
  supports?: string;
  weight?: "weak" | "moderate" | "strong";
};

export type EvidenceBundle = {
  image: EvidenceItem[];
  answers: EvidenceItem[];
  weather: EvidenceItem[];
  farm: EvidenceItem[];
  knowledge: EvidenceItem[];
};

export type Diagnosis = {
  name: string;
  scientificName?: string;
  type: DiseaseType;
  severity: Severity;
  affectedParts: string[];
  symptoms: string[];
  cause: string;
  estimatedSpread: string;
  yieldImpact: string;
  riskLevel: RiskLevel;
  recoveryProbability: number; // 0-100
};

export type Differential = {
  alsoConsider: Array<{ name: string; confidence: number; note: string }>;
  ruledOut: Array<{ name: string; reason: string }>;
};

export type Progression = {
  stage: "early" | "developing" | "advanced" | "late" | "unknown";
  affectedAreaPct: number;
  progressionRisk: RiskLevel;
  timeSinceInfection: string;
};

export type Treatment = {
  name: string;
  how: string;
  dosage?: string;
  interval?: string;
  safetyNotes?: string;
  expectedSuccess: number; // 0-100
};

export type TreatmentPlan = {
  organic: Treatment[];
  chemical: Treatment[];
  cultural: Treatment[];
  preventive: Treatment[];
  sprayInterval?: string;
  safetySummary?: string;
};

export type WeatherRisk = {
  level: RiskLevel;
  futureRisk: RiskLevel;
  factors: string[];
  explanation: string;
};

export type HealthScore = {
  overall: number; // 0-100
  leafHealth: number;
  diseaseRisk: RiskLevel;
  waterStress: RiskLevel;
  nutrientStatus: "good" | "fair" | "poor";
  growthStatus: string;
};

export type ScanAlert = {
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  action?: string;
};

export type Citation = {
  filename: string;
  page?: number | null;
  snippet: string;
};

export type FusionResult = {
  diagnosis: Diagnosis;
  confidence: number;
  uncertain: boolean;
  evidence: EvidenceBundle;
  reasoning: string;
  differential: Differential;
  missingEvidence: string[];
  progression: Progression;
  treatmentPlan: TreatmentPlan;
  weatherRisk: WeatherRisk;
  healthScore: HealthScore;
  alerts: ScanAlert[];
  citations: Citation[];
  followUpDays: number;
};

export type FarmSnapshot = {
  farmId: string;
  farmName: string;
  crop: string | null;
  soilType: string | null;
  irrigation: string | null;
  waterSources: string[];
  area: string;
  location: string;
  stage: string | null;
  stageId: string | null;
  daysAfterSowing: number | null;
  sowingDate: string | null;
};

export type WeatherSnapshot = {
  available: boolean;
  tempC?: number;
  humidity?: number;
  rainLast3DaysMm?: number;
  rainNext3DaysMm?: number;
  maxHumidityNext3Days?: number;
  windKph?: number;
  conditionLabel?: string;
  summary: string;
};

export type RecoveryComparison = {
  status: "improved" | "no_change" | "worsened" | "unknown";
  recoveryPct: number;
  notes: string[];
};

export const CAMERA_TIPS = [
  "Take photos in natural daylight",
  "Let one leaf fill the frame",
  "Keep your hand off the symptoms",
  "Hold steady — avoid blurry photos",
  "Capture both sides of the leaf",
  "Include one full-plant photo",
] as const;

export const ANALYSIS_STEPS = [
  "Analyzing images",
  "Checking symptoms",
  "Comparing diseases",
  "Reviewing weather",
  "Generating questions",
  "Fusing evidence",
  "Calculating diagnosis",
  "Preparing treatment",
] as const;
