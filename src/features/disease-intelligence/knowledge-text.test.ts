import { describe, expect, it } from "vitest";
import {
  buildKnowledgeDraft,
  duplicateKey,
  evaluatePromotion,
  resolvedDiseaseName,
  successRate,
  type CaseLike,
} from "./knowledge-text";

const baseCase: CaseLike = {
  crop_name: "Chilli",
  crop_stage: "Flowering",
  affected_part: "leaf",
  symptoms: ["yellow halos", "brown spots"],
  weather_context: { tempC: 31, humidity: 82, conditionLabel: "Humid" },
  soil_context: { soilType: "Red" },
  ai_diagnosis: { top_diagnosis: { name: "Bacterial Leaf Spot" }, observed_symptoms: ["spots"] },
  recommended_treatment: {
    organic: [{ name: "Neem oil", how: "5ml/L weekly" }],
    chemical: [],
    cultural: [],
    preventive: [{ name: "Avoid overhead irrigation" }],
  },
  confidence_final: 78,
  validation_status: "unverified",
  location_name: "Guntur, Andhra Pradesh",
};

describe("evaluatePromotion", () => {
  it("never promotes an unverified AI diagnosis", () => {
    const v = evaluatePromotion(baseCase, null, null);
    expect(v.eligible).toBe(false);
  });

  it("promotes when the farmer confirms and the treatment worked", () => {
    const v = evaluatePromotion(
      baseCase,
      { diagnosis_rating: "correct" },
      {
        outcome: "improved",
        treatment_followed: true,
        days_after_treatment: 7,
        farmer_confirmed_disease: null,
      },
    );
    expect(v.eligible).toBe(true);
  });

  it("does not promote when the treatment made things worse", () => {
    const v = evaluatePromotion(
      baseCase,
      { diagnosis_rating: "correct" },
      {
        outcome: "worse",
        treatment_followed: true,
        days_after_treatment: 7,
        farmer_confirmed_disease: null,
      },
    );
    expect(v.eligible).toBe(false);
  });

  it("accepts a farmer correction as the validated disease", () => {
    const outcome = {
      outcome: "fully_recovered",
      treatment_followed: true,
      days_after_treatment: 10,
      farmer_confirmed_disease: "Cercospora Leaf Spot",
    };
    expect(evaluatePromotion(baseCase, { diagnosis_rating: "incorrect" }, outcome).eligible).toBe(
      true,
    );
    expect(resolvedDiseaseName(baseCase, outcome)).toBe("Cercospora Leaf Spot");
  });

  it("promotes on expert review without farmer outcome", () => {
    expect(evaluatePromotion(baseCase, null, null, true).eligible).toBe(true);
  });
});

describe("buildKnowledgeDraft", () => {
  const draft = buildKnowledgeDraft(baseCase, { diagnosis_rating: "correct" }, {
    outcome: "improved",
    treatment_followed: true,
    days_after_treatment: 6,
    farmer_confirmed_disease: null,
  });

  it("keeps only agronomy, never the farmer or exact farm", () => {
    expect(draft.knowledgeText).toContain("Chilli");
    expect(draft.knowledgeText).toContain("Bacterial Leaf Spot");
    expect(draft.knowledgeText).toContain("Neem oil");
    expect(draft.knowledgeText).not.toContain("Guntur");
  });

  it("builds a stable duplicate key", () => {
    expect(duplicateKey(draft)).toEqual({
      crop: "chilli",
      disease: "bacterial leaf spot",
      stage: "flowering",
    });
  });
});

describe("successRate", () => {
  it("ignores unknown outcomes", () => {
    expect(successRate(["improved", "worse", "unknown"])).toBe(50);
    expect(successRate(["unknown"])).toBeNull();
  });
});
