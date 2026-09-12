// Single normalization + validation layer for the FINAL diagnosis stage.
//
//   Gemini raw text → extractFinalJson() → normalizeFinalDiagnosisResponse()
//   → FusionSchema (Zod) → FusionResult → confidence calibration → DB
//
// All shape-compatibility logic lives here: nested `diagnosis.most_likely`,
// snake_case aliases (confidence_score / disease_progression / treatment_plan /
// weather_impact / crop_health_score), a plain-number health score and loose
// severity / type wording. Nothing else in the app knows about those variants.
//
// The layer repairs STRUCTURE only. It never invents agricultural facts:
// no disease names, scientific names, causes, percentages or chemical dosages.

import { z } from "zod";

export const SEVERITY = z.enum(["none", "low", "moderate", "high", "severe"]);
export const RISK = z.enum(["low", "medium", "high"]);
export const DTYPE = z.enum([
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
]);

export const EvidenceItemSchema = z.object({
  text: z.string(),
  supports: z.string().optional().default(""),
  weight: z.enum(["weak", "moderate", "strong"]).optional().default("moderate"),
});

export const TreatmentSchema = z.object({
  name: z.string(),
  how: z.string(),
  dosage: z.string().optional().default(""),
  interval: z.string().optional().default(""),
  safetyNotes: z.string().optional().default(""),
  expectedSuccess: z.number().min(0).max(100),
});

/** Canonical internal contract — the single definition used by the app. */
export const FusionSchema = z.object({
  diagnosis: z.object({
    name: z.string(),
    scientificName: z.string().optional().default(""),
    type: DTYPE,
    severity: SEVERITY,
    affectedParts: z.array(z.string()).default([]),
    symptoms: z.array(z.string()).default([]),
    cause: z.string(),
    estimatedSpread: z.string(),
    yieldImpact: z.string(),
    riskLevel: RISK,
    recoveryProbability: z.number().min(0).max(100),
  }),
  confidence: z.number().min(0).max(100),
  uncertain: z.boolean(),
  evidence: z.object({
    image: z.array(EvidenceItemSchema).default([]),
    answers: z.array(EvidenceItemSchema).default([]),
    weather: z.array(EvidenceItemSchema).default([]),
    farm: z.array(EvidenceItemSchema).default([]),
    knowledge: z.array(EvidenceItemSchema).default([]),
  }),
  reasoning: z.string(),
  differential: z.object({
    alsoConsider: z
      .array(z.object({ name: z.string(), confidence: z.number(), note: z.string() }))
      .default([]),
    ruledOut: z.array(z.object({ name: z.string(), reason: z.string() })).default([]),
  }),
  missingEvidence: z.array(z.string()).default([]),
  progression: z.object({
    stage: z.enum(["early", "developing", "advanced", "late", "unknown"]),
    affectedAreaPct: z.number().min(0).max(100),
    progressionRisk: RISK,
    timeSinceInfection: z.string(),
  }),
  treatmentPlan: z.object({
    organic: z.array(TreatmentSchema).default([]),
    chemical: z.array(TreatmentSchema).default([]),
    cultural: z.array(TreatmentSchema).default([]),
    preventive: z.array(TreatmentSchema).default([]),
    sprayInterval: z.string().optional().default(""),
    safetySummary: z.string().optional().default(""),
  }),
  weatherRisk: z.object({
    level: RISK,
    futureRisk: RISK,
    factors: z.array(z.string()).default([]),
    explanation: z.string(),
  }),
  healthScore: z.object({
    overall: z.number().min(0).max(100),
    leafHealth: z.number().min(0).max(100),
    diseaseRisk: RISK,
    waterStress: RISK,
    nutrientStatus: z.enum(["good", "fair", "poor"]),
    growthStatus: z.string(),
  }),
  alerts: z
    .array(
      z.object({
        severity: z.enum(["info", "warning", "critical"]),
        title: z.string(),
        message: z.string(),
        action: z.string().optional().default(""),
      }),
    )
    .default([]),
  followUpDays: z.number().min(1).max(30).default(6),
});

export type FusionObject = z.infer<typeof FusionSchema>;

/** Canonical contract advertised to the model and shown in diagnostics. */
export const CANONICAL_FUSION_JSON = `{
  "diagnosis": {
    "name": "string", "scientificName": "string",
    "type": "fungal|bacterial|viral|pest|nutrient|water_stress|heat_damage|cold_damage|physical_injury|healthy|unknown",
    "severity": "none|low|moderate|high|severe",
    "affectedParts": ["string"], "symptoms": ["string"],
    "cause": "string", "estimatedSpread": "string", "yieldImpact": "string",
    "riskLevel": "low|medium|high", "recoveryProbability": 0
  },
  "confidence": 0, "uncertain": false,
  "evidence": { "image": [{"text":"","supports":"","weight":"weak|moderate|strong"}], "answers": [], "weather": [], "farm": [], "knowledge": [] },
  "reasoning": "string",
  "differential": { "alsoConsider": [{"name":"","confidence":0,"note":""}], "ruledOut": [{"name":"","reason":""}] },
  "missingEvidence": ["string"],
  "progression": { "stage": "early|developing|advanced|late|unknown", "affectedAreaPct": 0, "progressionRisk": "low|medium|high", "timeSinceInfection": "string" },
  "treatmentPlan": { "organic": [{"name":"","how":"","dosage":"","interval":"","safetyNotes":"","expectedSuccess":0}], "chemical": [], "cultural": [], "preventive": [], "sprayInterval": "", "safetySummary": "" },
  "weatherRisk": { "level": "low|medium|high", "futureRisk": "low|medium|high", "factors": ["string"], "explanation": "string" },
  "healthScore": { "overall": 0, "leafHealth": 0, "diseaseRisk": "low|medium|high", "waterStress": "low|medium|high", "nutrientStatus": "good|fair|poor", "growthStatus": "string" },
  "alerts": [{"severity":"info|warning|critical","title":"","message":"","action":""}],
  "followUpDays": 6
}`;

export const LABEL_FIRST_DOSAGE =
  "Use only according to the product label approved for this crop, pest/disease and region.";

// ------------------------------------------------------------------ helpers

type Row = Record<string, unknown>;

const isRow = (v: unknown): v is Row => Boolean(v) && typeof v === "object" && !Array.isArray(v);

const str = (v: unknown): string =>
  typeof v === "string" ? v.trim() : v == null || typeof v === "object" ? "" : String(v);

const pick = (row: Row, keys: string[]): unknown => {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
};

const strArray = (v: unknown): string[] => {
  if (Array.isArray(v))
    return v
      .map((x) => (isRow(x) ? str(pick(x, ["text", "name", "value", "label"])) : str(x)))
      .filter(Boolean);
  const s = str(v);
  return s ? [s] : [];
};

const num = (v: unknown, fallback: number, min = 0, max = 100): number => {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v.replace(/[^0-9.-]/g, "")) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
};

const enumOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T => {
  const s = str(v).toLowerCase().replace(/[\s-]+/g, "_");
  return (allowed as readonly string[]).includes(s) ? (s as T) : fallback;
};

/** Keyword classification from the disease NAME + CAUSE only. Never confidence. */
export function normalizeDiseaseType(explicit: unknown, text: string): z.infer<typeof DTYPE> {
  const direct = enumOf(explicit, DTYPE.options, "" as never);
  if (direct) return direct;
  const t = `${str(explicit)} ${text}`.toLowerCase();
  const rules: Array<[RegExp, z.infer<typeof DTYPE>]> = [
    [/\b(healthy|no disease|no issue)\b/, "healthy"],
    [/thrip|mite|aphid|whitefly|borer|caterpillar|insect|pest|infestation|jassid|mealybug/, "pest"],
    [/virus|viral|mosaic|leaf curl/, "viral"],
    [/fung|mildew|blight|anthracnose|cercospora|rust|rot|wilt|damping|spot/, "fungal"],
    [/bacteri|canker|soft rot/, "bacterial"],
    [/nutrient|deficien|chlorosis|nitrogen|iron|zinc|magnesium|potassium/, "nutrient"],
    [/water stress|drought|overwater|waterlog|moisture stress/, "water_stress"],
    [/heat|sun ?scald|sunburn/, "heat_damage"],
    [/cold|frost|chill/, "cold_damage"],
    [/mechanical|physical|injur|wound|hail|wind damage/, "physical_injury"],
  ];
  for (const [re, type] of rules) if (re.test(t)) return type;
  return "unknown";
}

/** Parses model text into JSON — tolerates fences, prose and trailing text. */
export function extractFinalJson(text: string): unknown {
  const cleaned = String(text ?? "")
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    /* scan for an embedded object */
  }
  const start = cleaned.indexOf("{");
  if (start >= 0) {
    for (let end = cleaned.lastIndexOf("}"); end > start; end = cleaned.lastIndexOf("}", end - 1)) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        /* try a shorter slice */
      }
    }
  }
  throw new Error("Model reply contained no JSON object");
}

function evidenceList(v: unknown): Array<{ text: string; supports: string; weight: string }> {
  const items = Array.isArray(v) ? v : v == null || v === "" ? [] : [v];
  return items
    .map((item) => {
      if (isRow(item)) {
        const text = str(pick(item, ["text", "finding", "observation", "statement", "note"]));
        if (!text) return null;
        return {
          text,
          supports: str(pick(item, ["supports", "candidate", "diagnosis"])),
          weight: enumOf(
            pick(item, ["weight", "strength"]),
            ["weak", "moderate", "strong"] as const,
            "moderate",
          ),
        };
      }
      const text = str(item);
      return text ? { text, supports: "", weight: "moderate" } : null;
    })
    .filter((x): x is { text: string; supports: string; weight: string } => Boolean(x));
}

function normalizeEvidence(raw: unknown) {
  const row = isRow(raw) ? raw : {};
  return {
    image: evidenceList(pick(row, ["image", "imageFindings", "image_findings", "images"])),
    answers: evidenceList(
      pick(row, ["answers", "farmerAnswers", "farmer_answers", "questions", "farmer_responses"]),
    ),
    weather: evidenceList(pick(row, ["weather", "weatherEvidence", "weather_context"])),
    farm: evidenceList(pick(row, ["farm", "farmContext", "farm_context"])),
    knowledge: evidenceList(
      pick(row, ["knowledge", "knowledgeBase", "knowledge_base", "references"]),
    ),
  };
}

function normalizeTreatments(v: unknown, chemical: boolean) {
  const items = Array.isArray(v) ? v : [];
  return items
    .map((item) => {
      if (!isRow(item)) {
        const name = str(item);
        return name
          ? {
              name,
              how: "",
              dosage: chemical ? LABEL_FIRST_DOSAGE : "",
              interval: "",
              safetyNotes: chemical ? CHEM_SAFETY : "",
              expectedSuccess: 50,
            }
          : null;
      }
      const name = str(pick(item, ["name", "product", "treatment", "title"]));
      if (!name) return null;
      const dosage = str(pick(item, ["dosage", "dose", "rate", "quantity"]));
      const safety = str(pick(item, ["safetyNotes", "safety_notes", "safety", "precautions"]));
      return {
        name,
        how: str(pick(item, ["how", "method", "application", "instructions", "description"])),
        // Never fabricate a rate: fall back to label-first guidance.
        dosage: dosage || (chemical ? LABEL_FIRST_DOSAGE : ""),
        interval: str(pick(item, ["interval", "frequency", "repeat"])),
        safetyNotes: chemical ? [safety, CHEM_SAFETY].filter(Boolean).join(" ") : safety,
        expectedSuccess: num(pick(item, ["expectedSuccess", "expected_success", "efficacy"]), 50),
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));
}

const CHEM_SAFETY =
  "Advisory only — follow the product label, wear PPE, respect the pre-harvest and re-entry intervals, rotate modes of action, and consult your local agriculture department (KVK) if unsure.";

function normalizeHealthScore(raw: unknown) {
  const row = isRow(raw) ? raw : {};
  const overall = typeof raw === "number" || typeof raw === "string" ? num(raw, 50) : num(pick(row, ["overall", "score", "value"]), 50);
  return {
    overall,
    leafHealth: num(pick(row, ["leafHealth", "leaf_health"]), overall),
    diseaseRisk: enumOf(pick(row, ["diseaseRisk", "disease_risk"]), RISK.options, "medium"),
    waterStress: enumOf(pick(row, ["waterStress", "water_stress"]), RISK.options, "low"),
    nutrientStatus: enumOf(
      pick(row, ["nutrientStatus", "nutrient_status"]),
      ["good", "fair", "poor"] as const,
      "fair",
    ),
    growthStatus: str(pick(row, ["growthStatus", "growth_status", "growth"])) || "Unknown",
  };
}

/**
 * Accepts the canonical object, the nested `diagnosis.most_likely` shape and
 * snake_case variants, and always returns the canonical object BEFORE Zod runs.
 */
export function normalizeFinalDiagnosisResponse(raw: unknown): unknown {
  if (!isRow(raw)) throw new Error("Final diagnosis reply was not a JSON object");

  const root = raw;
  const diagRaw = isRow(root["diagnosis"]) ? (root["diagnosis"] as Row) : {};
  const likely = isRow(pick(diagRaw, ["most_likely", "mostLikely", "primary"]))
    ? (pick(diagRaw, ["most_likely", "mostLikely", "primary"]) as Row)
    : {};
  const d: Row = { ...diagRaw, ...likely };

  const name = str(pick(d, ["name", "disease", "diagnosis", "title", "label"]));
  if (!name) throw new Error("Final diagnosis reply contained no diagnosis name");

  const cause = str(pick(d, ["cause", "causal_agent", "causalAgent", "pathogen"])) || "Unknown";

  const reasoning =
    str(pick(d, ["reasoning", "explanation", "why", "rationale"])) ||
    str(pick(root, ["reasoning", "explanation", "why"]));

  const evidenceSource =
    pick(d, ["evidence", "supporting_evidence", "supportingEvidence"]) ??
    pick(root, ["evidence", "supporting_evidence", "supportingEvidence"]);

  const diffRaw = isRow(root["differential"]) ? (root["differential"] as Row) : {};
  const alsoRaw =
    pick(diffRaw, ["alsoConsider", "also_consider"]) ??
    pick(root, ["also_consider", "alsoConsider"]) ??
    pick(diagRaw, ["also_consider", "alsoConsider"]);
  const ruledRaw =
    pick(diffRaw, ["ruledOut", "ruled_out"]) ??
    pick(root, ["ruled_out", "ruledOut"]) ??
    pick(diagRaw, ["ruled_out", "ruledOut"]);

  const progRaw = pick(root, ["progression", "disease_progression", "diseaseProgression"]);
  const prog = isRow(progRaw) ? progRaw : {};

  const planRaw = pick(root, ["treatmentPlan", "treatment_plan", "treatments"]);
  const plan = isRow(planRaw) ? planRaw : {};

  const weatherRaw = pick(root, ["weatherRisk", "weather_impact", "weatherImpact", "weather"]);
  const weather = isRow(weatherRaw) ? weatherRaw : {};

  return {
    diagnosis: {
      name,
      scientificName:
        str(pick(d, ["scientificName", "scientific_name", "latinName"])) || "Unknown",
      type: normalizeDiseaseType(pick(d, ["type", "diseaseType", "disease_type", "category"]), `${name} ${cause}`),
      severity: enumOf(
        pick(d, ["severity", "severity_level"]) ?? pick(root, ["severity"]),
        SEVERITY.options,
        "none",
      ),
      affectedParts: strArray(pick(d, ["affectedParts", "affected_parts", "parts"])),
      symptoms: strArray(pick(d, ["symptoms", "signs"])),
      cause,
      estimatedSpread:
        str(pick(d, ["estimatedSpread", "estimated_spread", "spread"])) || "Unknown",
      yieldImpact: str(pick(d, ["yieldImpact", "yield_impact", "yield_loss"])) || "Unknown",
      riskLevel: enumOf(
        pick(d, ["riskLevel", "risk_level", "risk"]) ?? pick(root, ["risk_level"]),
        RISK.options,
        "medium",
      ),
      recoveryProbability: num(
        pick(d, ["recoveryProbability", "recovery_probability", "recovery"]),
        50,
      ),
    },
    confidence: num(
      pick(root, ["confidence", "confidence_score", "confidenceScore"]) ??
        pick(diagRaw, ["confidence", "confidence_score"]) ??
        pick(d, ["confidence", "confidence_score"]),
      50,
    ),
    uncertain: Boolean(
      pick(root, ["uncertain", "uncertainty"]) ?? pick(diagRaw, ["uncertain", "uncertainty"]),
    ),
    evidence: normalizeEvidence(evidenceSource),
    reasoning,
    differential: {
      alsoConsider: (Array.isArray(alsoRaw) ? alsoRaw : [])
        .map((c) => {
          const row = isRow(c) ? c : { name: str(c) };
          const n = str(pick(row, ["name", "diagnosis", "disease"]));
          return n
            ? {
                name: n,
                confidence: num(pick(row, ["confidence", "confidence_score", "likelihood"]), 0),
                note: str(pick(row, ["note", "reason", "reasoning", "why", "evidence"])),
              }
            : null;
        })
        .filter((x): x is { name: string; confidence: number; note: string } => Boolean(x)),
      ruledOut: (Array.isArray(ruledRaw) ? ruledRaw : [])
        .map((c) => {
          const row = isRow(c) ? c : { name: str(c) };
          const n = str(pick(row, ["name", "diagnosis", "disease"]));
          return n
            ? { name: n, reason: str(pick(row, ["reason", "why", "note", "reasoning"])) }
            : null;
        })
        .filter((x): x is { name: string; reason: string } => Boolean(x)),
    },
    missingEvidence: strArray(
      pick(root, ["missingEvidence", "missing_evidence", "additional_photos_needed"]),
    ),
    progression: {
      stage: enumOf(
        pick(prog, ["stage", "progression_stage"]),
        ["early", "developing", "advanced", "late", "unknown"] as const,
        "unknown",
      ),
      affectedAreaPct: num(
        pick(prog, ["affectedAreaPct", "affected_area_pct", "affectedArea", "affected_area"]),
        0,
      ),
      progressionRisk: enumOf(
        pick(prog, ["progressionRisk", "progression_risk", "risk"]),
        RISK.options,
        "medium",
      ),
      timeSinceInfection:
        str(pick(prog, ["timeSinceInfection", "time_since_infection", "onset"])) || "Unknown",
    },
    treatmentPlan: {
      organic: normalizeTreatments(pick(plan, ["organic", "organic_options"]), false),
      chemical: normalizeTreatments(pick(plan, ["chemical", "chemical_options"]), true),
      cultural: normalizeTreatments(pick(plan, ["cultural", "cultural_options"]), false),
      preventive: normalizeTreatments(pick(plan, ["preventive", "prevention", "preventive_options"]), false),
      sprayInterval: str(pick(plan, ["sprayInterval", "spray_interval"])),
      safetySummary: str(pick(plan, ["safetySummary", "safety_summary", "safety"])),
    },
    weatherRisk: {
      level: enumOf(
        pick(weather, ["level", "risk", "risk_level", "current_risk", "risk_change"]),
        RISK.options,
        "medium",
      ),
      futureRisk: enumOf(
        pick(weather, ["futureRisk", "future_risk", "forecast_risk", "risk_change"]),
        RISK.options,
        "medium",
      ),
      factors: strArray(pick(weather, ["factors", "drivers", "conditions"])),
      explanation:
        str(pick(weather, ["explanation", "reasoning", "impact", "note"])) || "Unknown",
    },
    healthScore: normalizeHealthScore(
      pick(root, ["healthScore", "crop_health_score", "cropHealthScore", "health_score"]),
    ),
    alerts: (Array.isArray(root["alerts"]) ? (root["alerts"] as unknown[]) : [])
      .map((a) => {
        const row = isRow(a) ? a : { title: str(a) };
        const title = str(pick(row, ["title", "name"]));
        return title
          ? {
              severity: enumOf(
                pick(row, ["severity", "level"]),
                ["info", "warning", "critical"] as const,
                "info",
              ),
              title,
              message: str(pick(row, ["message", "text", "detail"])),
              action: str(pick(row, ["action", "next_step"])),
            }
          : null;
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x)),
    followUpDays: num(pick(root, ["followUpDays", "follow_up_days", "rescan_days"]), 6, 1, 30),
  };
}

/** Zod validation with field-level errors — runs AFTER normalization. */
export function validateFinalDiagnosis(normalized: unknown): FusionObject {
  const parsed = FusionSchema.safeParse(normalized);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new Error(`Final diagnosis schema validation failed — ${detail}`);
  }
  return parsed.data;
}
