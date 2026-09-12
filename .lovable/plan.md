# Fix: final diagnosis step rejects the AI's answer shape

Photos, candidates, questions and answers all work. The last step — the full diagnosis — fails because the AI returns its answer in a different layout than the app expects, and the app checks the shape before adjusting it.

## What is actually happening (confirmed by reading the code)

`fuseScanEvidence` in `crop-health.functions.ts` (lines 757-762) calls the model with `generateObject` and `FusionSchema`, so the reply is validated the instant it arrives. The model nests the result under `diagnosis.most_likely` and uses snake_case names (`confidence_score`, `disease_progression`, `treatment_plan`, `weather_impact`, `crop_health_score`), so validation fails. No normalization layer exists for this step — only the image and question steps have one.

One extra mismatch to handle: the app stores the health score as an object (`overall`, `leafHealth`, `diseaseRisk`, `waterStress`, `nutrientStatus`, `growthStatus`), while the model returned a plain number. The layer will accept either and fill the object from the number without inventing sub-scores it cannot derive.

## The fix

1. **New shared layer** `src/features/crop-health/final-diagnosis-normalize.ts`, mirroring the vision and question layers:
   - `extractFinalJson` (fences, object scan) and `normalizeFinalDiagnosisResponse(raw)` returning one canonical object.
   - Mapping: `diagnosis.most_likely.name` → `diagnosis.name`, `most_likely.reasoning` → `reasoning`, `most_likely.supporting_evidence` → `evidence` (image_findings/farmer_answers/farm_context/weather/knowledge buckets), `confidence_score` → `confidence`, `uncertainty` → `uncertain`, `disease_progression` → `progression`, `treatment_plan` → `treatmentPlan`, `weather_impact` → `weatherRisk` (keeping `risk_change` and its reasoning), `crop_health_score` → `healthScore`, `also_consider`/`ruled_out` → `differential.alsoConsider`/`ruledOut`.
   - Disease type derived from an explicit type field first, then keyword matching on the name/cause ("Thrips/Mite Infestation (Pest)" → `pest`), never the raw name; falls back to `unknown`.
   - Severity taken only from the model's own severity wording; never derived from confidence. Unstated → `none`/`unknown`-safe default permitted by the existing schema.
   - Safe fallbacks only where the schema requires a value: `scientificName` "Unknown", `affectedParts` [], `symptoms` [], `estimatedSpread`/`yieldImpact` "Unknown". No invented names, causes, percentages or dosages.
   - Chemical treatments missing a verifiable dosage get the label-first wording instead of a fabricated rate, plus PPE / pre-harvest-interval / local-authority notes.
   - Citations pass through untouched; empty stays empty.
   - Canonical Zod schema (reusing the existing `FusionSchema` field definitions, no duplicate types) runs **after** normalization and returns field-level errors.

2. **Wire it into the real path** in `fuseScanEvidence`: switch that one call from `generateObject` to `generateText` → extract → normalize → validate → map to `FusionResult`. Everything downstream (confidence calibration, treatment count, database update, report screen) is unchanged. Evidence fusion reasoning, farmer answers and alternative diagnoses are preserved as returned.

3. **Confidence** stays enforced in code after normalization via the existing `calibrateConfidence` caps (85 / 95 / 99, never 100). Diagnostics record the value before and after the cap.

4. **Prompt** (`prompts.server.ts`, `buildFusionPrompt` only): state the exact canonical object to return, one JSON object, no markdown or prose. The normalization layer stays regardless.

5. **Diagnostics**: dedicated stages — Final diagnosis AI response, Final diagnosis normalization, Final diagnosis JSON validation, Confidence enforcement, Final diagnosis database save — with codes `FINAL_DIAGNOSIS_NORMALIZATION_FAILED`, `FINAL_DIAGNOSIS_SCHEMA_FAILED`, `FINAL_DIAGNOSIS_CONFIDENCE_FAILED`, `FINAL_DIAGNOSIS_SAVE_FAILED` and recovery hints. Raw and normalized payloads, validation errors, confidence before/after, candidate ranking and the farmer answers used are shown in the developer console only.

6. **What the farmer sees**: on failure, "Couldn't complete the disease assessment. Please retry." with a retry button; no raw payloads or internal field names. On success the existing report screen renders as today, including the uncertainty note when confidence is low.

## Untouched

Image analysis, question generation, farms, weather, calendar, knowledge base, assistant, the AI model, and all database tables.

## Verification

Type check and production build, then a fresh Chilli scan end to end: the console should show final diagnosis normalization, validation, confidence enforcement and save all succeeding, and the report should open.
