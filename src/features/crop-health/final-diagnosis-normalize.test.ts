import { describe, expect, it } from "vitest";
import {
  LABEL_FIRST_DOSAGE,
  extractFinalJson,
  normalizeDiseaseType,
  normalizeFinalDiagnosisResponse,
  validateFinalDiagnosis,
} from "./final-diagnosis-normalize";

const canonical = {
  diagnosis: {
    name: "Cercospora Leaf Spot",
    scientificName: "Cercospora capsici",
    type: "fungal",
    severity: "moderate",
    affectedParts: ["leaf"],
    symptoms: ["brown spots"],
    cause: "Fungal infection",
    estimatedSpread: "Slow",
    yieldImpact: "Minor",
    riskLevel: "medium",
    recoveryProbability: 70,
  },
  confidence: 80,
  uncertain: false,
  evidence: { image: [{ text: "spots" }], answers: [], weather: [], farm: [], knowledge: [] },
  reasoning: "Spots match cercospora.",
  differential: { alsoConsider: [], ruledOut: [] },
  missingEvidence: [],
  progression: {
    stage: "developing",
    affectedAreaPct: 20,
    progressionRisk: "medium",
    timeSinceInfection: "1 week",
  },
  treatmentPlan: { organic: [], chemical: [], cultural: [], preventive: [] },
  weatherRisk: { level: "medium", futureRisk: "high", factors: ["rain"], explanation: "Wet" },
  healthScore: {
    overall: 60,
    leafHealth: 55,
    diseaseRisk: "medium",
    waterStress: "low",
    nutrientStatus: "fair",
    growthStatus: "Fair",
  },
  alerts: [],
  followUpDays: 6,
};

const nested = {
  diagnosis: {
    most_likely: {
      name: "Thrips/Mite Infestation (Pest)",
      reasoning: "Tiny insects reported on new growth.",
      supporting_evidence: {
        image_findings: ["curled leaves"],
        farmer_answers: ["insects seen"],
        farm_context: [],
      },
    },
    also_consider: [{ name: "Chilli Leaf Curl Virus", confidence: 30, reason: "similar curl" }],
    ruled_out: [{ name: "Iron Deficiency", reason: "no interveinal chlorosis" }],
    uncertainty: true,
    confidence_score: 75,
  },
  disease_progression: { stage: "early", affected_area: 15, time_since_infection: "few days" },
  crop_health_score: 60,
  treatment_plan: {
    chemical: [{ name: "Spinosad", how: "Foliar spray" }],
    organic: [{ name: "Neem oil", how: "Spray weekly", dosage: "5 ml/L" }],
  },
  weather_impact: { risk_change: "high", reasoning: "Dry spell favours thrips" },
  citations: [],
};

const norm = (raw: unknown) => normalizeFinalDiagnosisResponse(raw) as Record<string, never>;
const parse = (raw: unknown) => validateFinalDiagnosis(normalizeFinalDiagnosisResponse(raw));

describe("final diagnosis normalization", () => {
  it("accepts the canonical response", () => {
    const out = parse(canonical);
    expect(out.diagnosis.name).toBe("Cercospora Leaf Spot");
    expect(out.confidence).toBe(80);
  });

  it("maps the nested most_likely + snake_case response", () => {
    const out = parse(nested);
    expect(out.diagnosis.name).toBe("Thrips/Mite Infestation (Pest)");
    expect(out.reasoning).toContain("Tiny insects");
    expect(out.evidence.image[0]?.text).toBe("curled leaves");
    expect(out.evidence.answers[0]?.text).toBe("insects seen");
    expect(out.confidence).toBe(75);
    expect(out.uncertain).toBe(true);
    expect(out.progression.stage).toBe("early");
    expect(out.progression.affectedAreaPct).toBe(15);
    expect(out.healthScore.overall).toBe(60);
    expect(out.treatmentPlan.organic[0]?.dosage).toBe("5 ml/L");
    expect(out.weatherRisk.level).toBe("high");
    expect(out.weatherRisk.explanation).toContain("thrips");
    expect(out.differential.alsoConsider[0]?.name).toBe("Chilli Leaf Curl Virus");
    expect(out.differential.ruledOut[0]?.reason).toContain("chlorosis");
  });

  it("keeps a full health score object when provided", () => {
    expect(parse(canonical).healthScore.leafHealth).toBe(55);
  });

  it("derives the disease type from the name, never from confidence", () => {
    expect(normalizeDiseaseType(undefined, "Thrips/Mite Infestation")).toBe("pest");
    expect(normalizeDiseaseType(undefined, "Chilli Leaf Curl Virus")).toBe("viral");
    expect(normalizeDiseaseType(undefined, "Cercospora Leaf Spot")).toBe("fungal");
    expect(normalizeDiseaseType(undefined, "Iron Deficiency")).toBe("nutrient");
    expect(normalizeDiseaseType("not-a-type", "Something odd")).toBe("unknown");
  });

  it("uses safe fallbacks for missing optional fields", () => {
    const out = parse({ diagnosis: { name: "Unknown leaf issue" } });
    expect(out.diagnosis.scientificName).toBe("Unknown");
    expect(out.diagnosis.estimatedSpread).toBe("Unknown");
    expect(out.diagnosis.yieldImpact).toBe("Unknown");
    expect(out.diagnosis.symptoms).toEqual([]);
    expect(out.diagnosis.severity).toBe("none");
  });

  it("never fabricates a chemical dosage", () => {
    const out = parse(nested);
    expect(out.treatmentPlan.chemical[0]?.dosage).toBe(LABEL_FIRST_DOSAGE);
    expect(out.treatmentPlan.chemical[0]?.safetyNotes).toContain("label");
  });

  it("clamps an out-of-range confidence into the schema range", () => {
    expect(parse({ diagnosis: { name: "X" }, confidence: 120 }).confidence).toBe(100);
  });

  it("reads markdown-fenced JSON", () => {
    const obj = extractFinalJson('```json\n{"diagnosis":{"name":"X"}}\n```');
    expect(norm(obj)).toBeTruthy();
  });

  it("reads JSON surrounded by prose", () => {
    const obj = extractFinalJson('Sure! Here it is:\n{"diagnosis":{"name":"X"}}\nHope that helps.');
    expect((obj as { diagnosis: { name: string } }).diagnosis.name).toBe("X");
  });

  it("throws on malformed JSON", () => {
    expect(() => extractFinalJson("not json at all")).toThrow();
  });

  it("throws when there is no diagnosis name", () => {
    expect(() => normalizeFinalDiagnosisResponse({ foo: 1 })).toThrow();
  });

  it("reports field-level schema errors", () => {
    expect(() => validateFinalDiagnosis({ diagnosis: {} })).toThrow(/schema validation failed/);
  });
});
