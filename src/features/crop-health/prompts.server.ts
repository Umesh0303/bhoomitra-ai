// Server-only prompt construction for the Crop Health diagnostic pipeline.
// Never imported at module scope from client-reachable files.

import { CANONICAL_VISION_JSON } from "./vision-normalize";
import type {
  Candidate,
  FarmSnapshot,
  ImageAnalysis,
  ScanQuestion,
  WeatherSnapshot,
} from "./types";

const SAFETY_RULES = `
SAFETY AND HONESTY RULES (mandatory):
DO
- Always explain WHY a diagnosis was chosen.
- Show supporting evidence from every available source.
- Mention uncertainty explicitly when confidence is low.
- Recommend additional photos when the evidence is insufficient.
- Clearly distinguish diseases from nutrient deficiencies and environmental stress.
- Prefer asking clarifying questions over making assumptions.
- Cite retrieved knowledge-base sources when, and only when, they were provided.
DON'T
- Never diagnose confidently from a single blurry or unusable image.
- Never invent symptoms that are not visible in the images or reported by the farmer.
- Never hide uncertainty.
- Never recommend pesticides that are banned or restricted in India.
- Never ignore farmer answers that contradict the image reading — revise the diagnosis instead.
- Never fabricate knowledge-base citations.
- Never claim 100% certainty.
`.trim();

export const BASE_EXPERT_PROMPT = `
You are an experienced agricultural extension officer performing a field
inspection for an Indian smallholder farmer. You reason from evidence, not from
pattern-matching a single photo. You speak in simple, practical language.

${SAFETY_RULES}
`.trim();

function farmBlock(farm: FarmSnapshot): string {
  return `<farm_context>
Farm: ${farm.farmName}
Crop: ${farm.crop ?? "unknown"}
Growth stage: ${farm.stage ?? "unknown"}${farm.daysAfterSowing != null ? ` (day ${farm.daysAfterSowing} after sowing)` : ""}
Soil: ${farm.soilType ?? "unknown"}
Irrigation: ${farm.irrigation ?? "unknown"}
Water sources: ${farm.waterSources.join(", ") || "unknown"}
Area: ${farm.area}
Location: ${farm.location}
</farm_context>`;
}

function weatherBlock(weather: WeatherSnapshot): string {
  if (!weather.available) return `<weather>No weather data available for this farm.</weather>`;
  return `<weather>
${weather.summary}
Temperature: ${weather.tempC ?? "?"}°C
Humidity now: ${weather.humidity ?? "?"}%
Rain in last 3 days: ${weather.rainLast3DaysMm ?? 0} mm
Rain expected next 3 days: ${weather.rainNext3DaysMm ?? 0} mm
Peak humidity next 3 days: ${weather.maxHumidityNext3Days ?? "?"}%
Wind: ${weather.windKph ?? "?"} kph
Conditions: ${weather.conditionLabel ?? "unknown"}
</weather>`;
}

export function buildImageAnalysisPrompt(farm: FarmSnapshot, weather: WeatherSnapshot): string {
  return `${BASE_EXPERT_PROMPT}

STEP: IMAGE ANALYSIS ONLY.
Look at every image provided. Identify the crop, the plant parts shown, and the
visible symptoms. Consider diseases, pest damage, nutrient deficiency, water
stress and environmental damage as possibilities.

Return up to 3 DIFFERENTIAL candidate explanations with a preliminary
confidence for each. This step NEVER produces a final diagnosis — the final
diagnosis is decided later from farmer answers, weather, farm context and the
knowledge base. Do not force three candidates when the evidence does not
support them. Set specificDisease to null when the evidence cannot name a
specific disease. If image quality is poor (blurry, dark, too far away,
symptoms obscured), set imageQuality.usable to false, explain the issues, and
list the additional photos needed.

severity must be one of: none, low, moderate, high, severe — estimated only
from visible evidence, never invented. affectedAreaPct is a number 0-100 based
only on visible affected tissue. confidence is a number between 0 and 1 (for
example 0.82) — never a word like "high".

OUTPUT FORMAT (mandatory):
Return ONLY the following JSON object. No markdown, no code fences, no text
before or after it, no extra or renamed keys, no nesting inside any wrapper.

${CANONICAL_VISION_JSON}

${farmBlock(farm)}
${weatherBlock(weather)}`;
}

export function buildQuestionsPrompt(
  farm: FarmSnapshot,
  weather: WeatherSnapshot,
  analysis: ImageAnalysis,
): string {
  return `${BASE_EXPERT_PROMPT}

STEP: DYNAMIC CONFIRMATION QUESTIONS.
Generate at most 6 short questions that best separate the candidate diagnoses
below. Every question must be disease-specific and discriminating — never
generic filler. Prefer yes/no or multiple choice so the farmer does not type.

Rules:
- NEVER ask for information already present in the farm context or weather data.
- If weather data already shows recent rainfall or high humidity, CONFIRM it
  ("We detected 42 mm of rain in the last 3 days — is that correct?") rather
  than asking whether it rained.
- Each question must name which candidates it helps confirm or rule out, using
  the EXACT candidate names listed below — never invent or rename a candidate.
- Use simple village-level language.

OUTPUT CONTRACT — return EXACTLY ONE JSON object, nothing else:
{
  "questions": [
    {
      "question": "string",
      "helpText": "string ('' if none)",
      "category": "symptom | spread | history | environment | management",
      "type": "yes_no | multiple_choice",
      "options": ["2-5 short choices — use [] for yes_no questions"],
      "confirms": ["exact candidate names this answer would confirm"],
      "rulesOut": ["exact candidate names this answer would rule out"]
    }
  ]
}
- The top-level property MUST be "questions". NEVER return a bare array.
- No markdown, no code fences, no text before or after the JSON.
- For "yes_no" leave "options" empty — the app renders Yes / No / Not sure.
- For "multiple_choice" give meaningful, mutually distinct choices.

<candidates>
${analysis.candidates.map((c, i) => `${i + 1}. ${c.name} (${c.type}) — raw ${c.confidence}% — ${c.rationale}`).join("\n")}
</candidates>
<observed_symptoms>
${analysis.symptoms.join("; ") || "none recorded"}
</observed_symptoms>
${farmBlock(farm)}
${weatherBlock(weather)}`;
}

export function buildFusionPrompt(args: {
  farm: FarmSnapshot;
  weather: WeatherSnapshot;
  analysis: ImageAnalysis;
  questions: ScanQuestion[];
  knowledge: string;
  historical?: string;
  previous?: { diagnosis: string; date: string; severity: string } | null;
}): string {
  const { farm, weather, analysis, questions, knowledge, historical, previous } = args;
  const answers = questions
    .map((q) => `- ${q.question} → ${q.answer ?? "not answered"}`)
    .join("\n");

  return `${BASE_EXPERT_PROMPT}

STEP: EVIDENCE FUSION.
Weigh ALL evidence sources together — image findings, farmer answers, weather,
farm context and the knowledge base — and produce one calibrated diagnosis.

Fusion rules:
- Farmer answers can and should override the image reading when they conflict.
  If they do, pick the better-supported diagnosis and say so in the reasoning.
- Separate the most likely diagnosis from "also consider" and "ruled out".
  Every ruled-out item needs a concrete reason.
- Populate the evidence bundle with specific, checkable statements for each
  source you actually used. Leave a source's list empty if it gave you nothing.
- Only cite knowledge-base documents that appear in <knowledge_base>. If it is
  empty, return no citations.
- <historical_cases> are validated past cases from other farms. Treat them as
  supporting evidence only: they may raise or lower your confidence and inform
  treatment choice, but they must NEVER override this scan's images or the
  farmer's answers, and they are not citations.
- If the evidence is thin or contradictory, keep confidence low, set uncertain
  to true, and list exactly which extra photos would resolve it.
- Estimate disease progression stage, affected area and time since infection.
- Rank treatments by expected success. Organic, chemical, cultural and
  preventive options are separate lists. Never recommend chemicals banned or
  restricted in India; when unsure, tell the farmer to consult the local
  agriculture department (Krishi Vigyan Kendra).
- Explain how the coming weather changes the risk.
- Return an overall crop health score, not just a disease label.
- confidence is your raw belief 0-100; the application applies its own caps.

OUTPUT CONTRACT — return ONE JSON object with exactly these top-level keys and
nothing else (no markdown fences, no prose, no wrapper):
diagnosis{name, scientificName, type, severity, affectedParts[], symptoms[],
cause, estimatedSpread, yieldImpact, riskLevel, recoveryProbability},
confidence, uncertain, evidence{image[],answers[],weather[],farm[],knowledge[]},
reasoning, differential{alsoConsider[],ruledOut[]}, missingEvidence[],
progression{stage,affectedAreaPct,progressionRisk,timeSinceInfection},
treatmentPlan{organic[],chemical[],cultural[],preventive[],sprayInterval,safetySummary},
weatherRisk{level,futureRisk,factors[],explanation},
healthScore{overall,leafHealth,diseaseRisk,waterStress,nutrientStatus,growthStatus},
alerts[], followUpDays.
Do NOT nest the diagnosis under "most_likely" and do NOT use snake_case keys.
type must be one of: fungal, bacterial, viral, pest, nutrient, water_stress,
heat_damage, cold_damage, physical_injury, healthy, unknown.
Never invent a chemical dosage: if you cannot state a label-verified rate, say
to follow the product label instead.

<image_findings>
Crop: ${analysis.crop}
Parts: ${analysis.plantParts.join(", ")}
Symptoms: ${analysis.symptoms.join("; ")}
Severity: ${analysis.severity}; affected area ~${analysis.affectedAreaPct}%
Image quality usable: ${analysis.imageQuality.usable ? "yes" : "no"}${analysis.imageQuality.issues.length ? ` (${analysis.imageQuality.issues.join(", ")})` : ""}
Candidates: ${analysis.candidates.map((c: Candidate) => `${c.name} ${c.confidence}%`).join(", ")}
</image_findings>
<farmer_answers>
${answers || "none"}
</farmer_answers>
${farmBlock(farm)}
${weatherBlock(weather)}
<knowledge_base>
${knowledge || "(no documents matched)"}
</knowledge_base>
${previous ? `<previous_scan>\n${previous.date}: ${previous.diagnosis} (severity ${previous.severity})\n</previous_scan>` : ""}`;
}

export function buildComparisonPrompt(): string {
  return `${BASE_EXPERT_PROMPT}

STEP: RECOVERY COMPARISON.
Compare the previous scan with the current scan for the same farm and crop.
Decide whether the plant has improved, stayed the same or worsened, estimate a
recovery percentage (0-100), and give short factual notes about what changed.`;
}
