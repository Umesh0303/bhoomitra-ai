// Confidence calibration. Caps are enforced in code, never left to the model.
//
//   image only ...................... 85
//   image + answers ................. 95
//   image + answers + weather + farm  99
//
// 100% is never produced — agricultural diagnosis is probabilistic.

export type EvidenceSources = {
  hasImages: boolean;
  answeredQuestions: number;
  hasWeather: boolean;
  hasFarmContext: boolean;
  hasKnowledge: boolean;
  imageQualityOk: boolean;
};

export const UNCERTAIN_THRESHOLD = 70;

export function confidenceCap(s: EvidenceSources): number {
  if (!s.hasImages) return 60;
  if (s.answeredQuestions === 0) return 85;
  if (s.hasWeather && s.hasFarmContext) return 99;
  return 95;
}

/** Clamp a raw model confidence to the cap allowed by available evidence. */
export function calibrateConfidence(raw: number, s: EvidenceSources): number {
  const cap = confidenceCap(s);
  let value = Number.isFinite(raw) ? Math.round(raw) : 0;
  if (!s.imageQualityOk) value -= 10;
  if (s.hasKnowledge) value += 2;
  value = Math.max(1, Math.min(value, cap));
  return Math.min(value, 99);
}

export function confidenceLabel(confidence: number): string {
  if (confidence >= 90) return "Very high confidence";
  if (confidence >= 75) return "High confidence";
  if (confidence >= UNCERTAIN_THRESHOLD) return "Moderate confidence";
  if (confidence >= 50) return "Low confidence";
  return "Very low confidence";
}

export function isUncertain(confidence: number): boolean {
  return confidence < UNCERTAIN_THRESHOLD;
}

export function stars(expectedSuccess: number): number {
  if (expectedSuccess >= 90) return 5;
  if (expectedSuccess >= 78) return 4;
  if (expectedSuccess >= 65) return 3;
  if (expectedSuccess >= 50) return 2;
  return 1;
}
