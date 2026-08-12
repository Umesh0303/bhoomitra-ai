// Single normalization + validation layer for the vision (image analysis) stage.
//
//   Gemini raw text → extractJson() → normalizeVisionResponse() → Zod (Canonical)
//   → toImageAnalysis() → the rest of the pipeline (questions, fusion)
//
// Keep ALL shape-compatibility logic here. Nothing else in the app should know
// about legacy/nested model output such as `image_analysis` or snake_case keys.

import { z } from "zod";
import type { DiseaseType, ImageAnalysis, Severity } from "./types";

export const SEVERITY_VALUES = ["none", "low", "moderate", "high", "severe"] as const;

/** Candidate types the MODEL is allowed to use (short, farmer-friendly names). */
export const CANDIDATE_TYPES = [
  "fungal",
  "bacterial",
  "viral",
  "pest",
  "nutrient",
  "water",
  "heat",
  "cold",
  "physical",
  "unknown",
] as const;

/** Maps model candidate types onto the internal DiseaseType union. */
const TYPE_MAP: Record<string, DiseaseType> = {
  fungal: "fungal",
  fungus: "fungal",
  bacterial: "bacterial",
  bacteria: "bacterial",
  viral: "viral",
  virus: "viral",
  pest: "pest",
  insect: "pest",
  mite: "pest",
  nutrient: "nutrient",
  deficiency: "nutrient",
  water: "water_stress",
  water_stress: "water_stress",
  drought: "water_stress",
  heat: "heat_damage",
  heat_damage: "heat_damage",
  cold: "cold_damage",
  cold_damage: "cold_damage",
  physical: "physical_injury",
  physical_injury: "physical_injury",
  mechanical: "physical_injury",
  healthy: "healthy",
  unknown: "unknown",
};

// ------------------------------------------------------------- canonical schema

export const CanonicalCandidateSchema = z.object({
  name: z.string().min(1),
  specificDisease: z.string().nullable().default(null),
  type: z.enum(CANDIDATE_TYPES),
  /** Preliminary belief only — 0..1, never a final diagnosis. */
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string()).default([]),
});

export const CanonicalVisionSchema = z.object({
  crop: z.string().min(1),
  plantParts: z.array(z.string()).default([]),
  visibleSymptoms: z.array(z.string()).default([]),
  severity: z.enum(SEVERITY_VALUES),
  affectedAreaPct: z.number().min(0).max(100),
  imageQuality: z.object({
    usable: z.boolean(),
    score: z.number().min(0).max(100).default(0),
    issues: z.array(z.string()).default([]),
  }),
  candidates: z.array(CanonicalCandidateSchema).min(1).max(3),
  additionalPhotosNeeded: z.array(z.string()).default([]),
});

export type CanonicalVision = z.infer<typeof CanonicalVisionSchema>;

/** The exact JSON contract handed to the model — keep this the only copy. */
export const CANONICAL_VISION_JSON = `{
  "crop": "string",
  "plantParts": ["leaf" | "fruit" | "stem" | "flower" | "root" | "whole_plant"],
  "visibleSymptoms": ["short symptom phrases"],
  "severity": "none" | "low" | "moderate" | "high" | "severe",
  "affectedAreaPct": 0-100,
  "imageQuality": { "usable": true, "score": 0-100, "issues": ["..."] },
  "candidates": [
    {
      "name": "string",
      "specificDisease": "string or null",
      "type": ${CANDIDATE_TYPES.map((t) => `"${t}"`).join(" | ")},
      "confidence": 0.0-1.0,
      "evidence": ["visible observations that support this candidate"]
    }
  ],
  "additionalPhotosNeeded": ["..."]
}`;

// -------------------------------------------------------------------- helpers

/** Pulls the first JSON object out of a model reply (handles ```json fences). */
export function extractJson(text: string): unknown {
  const cleaned = text
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    /* fall through */
  }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(cleaned.slice(start, end + 1));
  }
  throw new Error("Model reply contained no JSON object");
}

const asArray = (v: unknown): string[] => {
  if (Array.isArray(v))
    return v.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean);
  if (typeof v === "string" && v.trim() && !/^none$/i.test(v.trim())) return [v.trim()];
  return [];
};

const WORD_CONFIDENCE: Record<string, number> = {
  "very high": 0.9,
  high: 0.8,
  "moderately high": 0.65,
  medium: 0.55,
  moderate: 0.55,
  low: 0.3,
  "very low": 0.15,
};

function toConfidence(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) {
    const n = v > 1 ? v / 100 : v;
    return Math.min(1, Math.max(0, n));
  }
  if (typeof v === "string") {
    const key = v.trim().toLowerCase();
    if (WORD_CONFIDENCE[key] != null) return WORD_CONFIDENCE[key]!;
    const num = Number.parseFloat(key.replace("%", ""));
    if (Number.isFinite(num)) return Math.min(1, Math.max(0, num > 1 ? num / 100 : num));
  }
  return 0.4;
}

/** Last-resort type guess from a candidate name (legacy payloads only). */
function inferType(name: string): string {
  const n = name.toLowerCase();
  if (/virus|viral|mosaic|curl/.test(n)) return "viral";
  if (/bacter|blight.*bacter/.test(n)) return "bacterial";
  if (/fung|mildew|rust|rot|anthracnose|wilt/.test(n)) return "fungal";
  if (/thrip|mite|aphid|borer|caterpillar|whitefly|pest|insect/.test(n)) return "pest";
  if (/deficien|nutrient|nitrogen|potassium|magnesium|zinc/.test(n)) return "nutrient";
  if (/water|drought|overwater/.test(n)) return "water";
  if (/heat|sunburn|scorch/.test(n)) return "heat";
  if (/cold|frost|chill/.test(n)) return "cold";
  if (/physical|mechanical|injury|damage from/.test(n)) return "physical";
  return "unknown";
}

function toType(v: unknown): (typeof CANDIDATE_TYPES)[number] {

  const key = String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  const mapped = TYPE_MAP[key];
  if (!mapped) return "unknown";
  const back: Record<DiseaseType, (typeof CANDIDATE_TYPES)[number]> = {
    fungal: "fungal",
    bacterial: "bacterial",
    viral: "viral",
    pest: "pest",
    nutrient: "nutrient",
    water_stress: "water",
    heat_damage: "heat",
    cold_damage: "cold",
    physical_injury: "physical",
    healthy: "unknown",
    unknown: "unknown",
  };
  return back[mapped];
}

function toSeverity(v: unknown, affectedPct: number): Severity {
  const key = String(v ?? "")
    .trim()
    .toLowerCase();
  if ((SEVERITY_VALUES as readonly string[]).includes(key)) return key as Severity;
  if (/mild|slight/.test(key)) return "low";
  if (/medium/.test(key)) return "moderate";
  if (/severe|critical/.test(key)) return "severe";
  // Never invent severity: derive conservatively from visible affected tissue.
  if (affectedPct >= 60) return "high";
  if (affectedPct >= 25) return "moderate";
  if (affectedPct > 0) return "low";
  return "none";
}

const pick = (o: Record<string, unknown>, ...keys: string[]) => {
  for (const k of keys) if (o[k] !== undefined && o[k] !== null) return o[k];
  return undefined;
};

/**
 * Reshapes any known model output variant (canonical, nested `image_analysis`,
 * snake_case legacy) into the canonical shape. Does NOT validate — Zod does.
 */
export function normalizeVisionResponse(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  let o = input as Record<string, unknown>;

  // Unwrap known nesting wrappers.
  for (const wrapper of ["image_analysis", "imageAnalysis", "analysis", "result", "data"]) {
    const inner = o[wrapper];
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      o = {
        ...(inner as Record<string, unknown>),
        ...Object.fromEntries(Object.entries(o).filter(([k]) => k !== wrapper)),
      };
    }
  }

  const rawCandidates = pick(
    o,
    "candidates",
    "candidate_explanations",
    "candidateExplanations",
    "possible_causes",
    "differential",
  );

  const candidates = (Array.isArray(rawCandidates) ? rawCandidates : [])
    .map((c) => {
      const r = (typeof c === "object" && c ? c : { name: String(c) }) as Record<string, unknown>;
      const name = pick(r, "name", "explanation", "candidate", "label", "cause", "disease");
      const specific = pick(
        r,
        "specificDisease",
        "specific_disease",
        "scientificName",
        "scientific_name",
      );
      return {
        name: String(name ?? "Unknown").trim(),
        specificDisease: specific == null || specific === "" ? null : String(specific),
        type: toType(pick(r, "type", "category", "kind") ?? inferType(String(name ?? ""))),
        confidence: toConfidence(pick(r, "confidence", "probability", "likelihood", "score")),
        evidence: asArray(pick(r, "evidence", "rationale", "reason", "supporting_evidence")),
      };
    })
    .filter((c) => c.name)
    .slice(0, 3);

  const affectedRaw = pick(
    o,
    "affectedAreaPct",
    "affected_area_pct",
    "affectedArea",
    "affected_area_percent",
  );
  const affectedAreaPct =
    typeof affectedRaw === "number"
      ? Math.min(100, Math.max(0, affectedRaw))
      : Number.isFinite(Number.parseFloat(String(affectedRaw)))
        ? Math.min(100, Math.max(0, Number.parseFloat(String(affectedRaw))))
        : 0;

  const qRaw = pick(o, "imageQuality", "image_quality");
  const qIssues = asArray(pick(o, "image_quality_issues", "imageQualityIssues"));
  const q = (typeof qRaw === "object" && qRaw ? qRaw : {}) as Record<string, unknown>;
  const issues = asArray(q["issues"]).concat(qIssues);
  const scoreRaw = q["score"];

  return {
    crop: String(pick(o, "crop", "crop_name", "cropName") ?? "unknown"),
    plantParts: asArray(pick(o, "plantParts", "plant_parts_shown", "plant_parts", "parts")),
    visibleSymptoms: asArray(pick(o, "visibleSymptoms", "visible_symptoms", "symptoms")),
    severity: toSeverity(pick(o, "severity"), affectedAreaPct),
    affectedAreaPct,
    imageQuality: {
      usable: typeof q["usable"] === "boolean" ? q["usable"] : issues.length === 0,
      score:
        typeof scoreRaw === "number"
          ? Math.min(100, Math.max(0, scoreRaw))
          : issues.length
            ? 50
            : 85,
      issues,
    },
    candidates,
    additionalPhotosNeeded: asArray(
      pick(
        o,
        "additionalPhotosNeeded",
        "additional_photos_needed",
        "missingEvidence",
        "missing_evidence",
      ),
    ),
  };
}

/** Human-readable Zod issues: field, expected, received. */
export function formatZodIssues(err: z.ZodError): string {
  return err.issues
    .map((i) => {
      const path = i.path.join(".") || "(root)";
      const received =
        "received" in i ? ` Received: ${String((i as { received?: unknown }).received)}` : "";
      return `${path} — ${i.message}.${received}`;
    })
    .join(" | ");
}

/**
 * Validates a normalized payload against the canonical contract.
 * Throws with precise field-level detail — never silently accepts bad JSON.
 */
export function validateVision(normalized: unknown): CanonicalVision {
  const parsed = CanonicalVisionSchema.safeParse(normalized);
  if (!parsed.success) {
    throw new Error(`JSON schema validation failed: ${formatZodIssues(parsed.error)}`);
  }
  return parsed.data;
}

/** Canonical vision output → the internal ImageAnalysis used downstream. */
export function toImageAnalysis(v: CanonicalVision): ImageAnalysis {
  return {
    crop: v.crop,
    plantParts: v.plantParts,
    symptoms: v.visibleSymptoms,
    severity: v.severity,
    affectedAreaPct: v.affectedAreaPct,
    imageQuality: { usable: v.imageQuality.usable, issues: v.imageQuality.issues },
    candidates: v.candidates.map((c) => ({
      name: c.name,
      ...(c.specificDisease ? { scientificName: c.specificDisease } : {}),
      type: TYPE_MAP[c.type] ?? "unknown",
      confidence: Math.round(c.confidence * 100),
      rationale: c.evidence.join("; "),
    })),
    missingEvidence: v.additionalPhotosNeeded,
  };
}
