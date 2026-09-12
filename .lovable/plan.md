# Fix: confirmation questions fail before reaching the farmer

The photo analysis now works. The step that writes the follow-up questions still fails, so the scan stops there.

## What is actually happening (confirmed by reading the code)

The question step does **not** use any normalization layer. It calls the AI with a strict structured-output request (`generateObject` with `QuestionsSchema` in `crop-health.functions.ts`, lines 560-565), so the model's answer is validated the instant it arrives. The model replies with a plain list of questions instead of an object wrapping a `questions` list, and validation rejects it with "Expected object, received array". The earlier normalization work was done for the image step only (`vision-normalize.ts`); nothing equivalent exists for questions.

The diagnostics console also reuses the image step's labels, which is why the failure is shown as a generic "JSON validation" and looks like a vision problem.

## The fix

1. **New shared layer** `src/features/crop-health/question-normalize.ts`, mirroring the existing vision layer:
   - `normalizeQuestionResponse(raw)` accepts a bare list, an object with `questions`, or common wrappers, and always returns one canonical object.
   - Field aliasing: `helps_confirm` → confirms/targets, `helps_rule_out` → rules-out/targets, `type`/`input_type` → `inputType` (`single`/`multi`), `help_text` → `helpText`, `question`/`text` → `question`.
   - Yes/no questions arrive with no options; the layer fills in Yes / No / Not sure so the existing question screen and database columns stay unchanged.
   - Multiple-choice questions keep their real choices; entries with fewer than two usable choices are dropped.
   - Caps the list at 6, keeping the ones that discriminate between the most candidates.
   - Candidate names are passed through untouched.
   - Canonical Zod schema lives here and runs **after** normalization; it returns field-level errors.

2. **Wire it into the real path** in `crop-health.functions.ts` (`generateScanQuestions`): switch that one call from `generateObject` to `generateText` + extract JSON → normalize → validate → map to the internal `ScanQuestion[]`, exactly the pattern the image step already uses. Nothing downstream (database insert, question screen, evidence fusion) changes.

3. **Prompt** (`prompts.server.ts`, `buildQuestionsPrompt` only): state the exact object shape to return, one JSON object with a top-level `questions` property, no markdown, no prose. The normalization layer stays regardless, since model output still varies.

4. **Diagnostics**: add four dedicated stages — Question AI response, Question normalization, Question JSON validation, Question database save — with their own failure codes `QUESTION_NORMALIZATION_FAILED` and `QUESTION_SCHEMA_FAILED`, plus recovery hints. Question failures stop being labelled as vision failures. Raw and normalized responses are recorded for development only.

5. **What the farmer sees**: on failure, "Couldn't generate confirmation questions. Please retry." with a retry button. Raw payloads and stack traces stay inside the developer diagnostics console.

## Untouched

Image analysis, evidence fusion, farms, weather, calendar, knowledge base, assistant, the AI model, and all database tables.

## Verification

Type check and production build, then a fresh Chilli scan through to the question screen: the console should show Question normalization and Question JSON validation succeeding with 4-6 questions saved.
