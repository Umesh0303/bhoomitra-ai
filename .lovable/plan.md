# Disease Intelligence Knowledge Base

A closed learning loop for crop health: every scan becomes a raw case, farmers report
what actually happened, and only confirmed cases become trusted knowledge that helps
future diagnoses. Existing Disease Detection, Farm Knowledge, Weather, Calendar, Farms
and Assistant stay exactly as they are — this is purely additive.

## The loop

```text
Scan  ->  Diagnosis  ->  Raw case saved  ->  Farmer feedback
                                                  |
                                            Treatment outcome
                                                  |
                                              Validation
                                                  |
                                      Trusted disease knowledge
                                                  |
                                     Similar-case retrieval in future scans
```

Unverified AI answers never enter the trusted layer, so the system cannot learn from
its own mistakes.

## Phase 1 — Capture (raw cases)

New tables, each private to its owner:

- `disease_cases` — full snapshot of one scan: crop, variety, stage, days after sowing/
  transplant, affected part, symptoms, location, weather/soil/irrigation context,
  the complete AI diagnosis (top diagnosis, alternatives, evidence, severity), model and
  prompt versions, follow-up questions and answers, recommended treatment, image count,
  case status, validation status (starts `unverified`).
- `disease_case_images` — references to images already in the private `crop-scans`
  bucket (no duplicate uploads): path, part type, order, quality score.

A case is written automatically right after the final diagnosis is saved. If this write
fails, the farmer still gets their diagnosis — capture never blocks the scan.

## Phase 2 — Feedback and outcome

On the scan report page, below the existing report (nothing existing is redesigned):

- "Was this diagnosis helpful?" — Correct / Partially correct / Incorrect / Not sure.
- "Did the treatment help?" — Fully recovered / Improved / No change / Worse / Not sure,
  with days since treatment, optional notes, optional follow-up photos, and an optional
  "the real disease was ..." correction.

Stored in `disease_feedback` and `disease_case_outcomes`. History and case list show a
"Tell us how it went" prompt for cases older than a few days with no outcome yet.

## Phase 3 — Validation and promotion

Validation states: `unverified`, `farmer_confirmed`, `expert_verified`,
`system_validated`, `rejected`.

A case becomes a promotion candidate only when: the diagnosis is well supported, the
farmer confirmed it or a reviewer verified it, the outcome is consistent, images are
usable, and enough agricultural context exists. Promotion is explicit — never silent.

## Phase 4 — Trusted knowledge base

- `disease_knowledge` — crop, disease, symptoms, visual features, affected parts, stage,
  weather/soil/regional context, diagnostic evidence, treatment and prevention guidance,
  treatment success rate, confidence, validation status, a clean readable
  `knowledge_text`, an embedding, plus `knowledge_version`, `model_version`,
  `source_case_count`, `last_validated_at`.
- `disease_knowledge_sources` — which cases back each knowledge record.

Promotion writes a clean agronomy document (crop, disease, symptoms, stage, weather,
evidence, treatment) and embeds it. No farmer name, email, phone, exact farm location or
other personal detail ever reaches this layer — region-level context only.

Duplicate handling: before inserting, search for near-identical knowledge (same crop,
disease, symptoms, context). If found, attach the case as another source, update the
success rate and evidence count, and raise confidence only on genuinely new evidence.

If embedding fails, the record is stored with indexing marked pending and retried later.

## Phase 5 — Retrieval into diagnosis

Before the final diagnosis, retrieve the top 5 similar validated cases (crop, symptoms,
affected part, stage, weather, region), preferring expert-verified, then
system-validated, then farmer-confirmed. Rejected knowledge is never retrieved.

These are passed to the diagnosis as supporting evidence in a clearly separate section
from Farm Knowledge — current photos and current farmer answers still lead. Historical
knowledge can raise or lower confidence but cannot override strong current visual
evidence. If retrieval fails, the diagnosis runs exactly as it does today.

Confidence is tracked at four points: initial, after follow-up answers, after historical
retrieval, and final — so we can tell whether the loop is actually helping.

## Phase 6 — Internal dashboard and review

New page `/app/disease-intelligence`, visible only to authorised reviewers (a new
admin/reviewer role table, not a flag on the profile):

- Totals: cases, validated, pending, rejected, treatment success rate.
- Top diseases, top crops, crop-wise and region-wise frequency.
- Recent cases, cases needing review.
- Model performance: average confidence, farmer-confirmed vs corrected, treatment
  success. Accuracy is only shown where confirmed outcomes exist — never estimated.

Review screen shows images, context, AI diagnosis, alternatives, questions, answers,
treatment, outcome and similar cases, and lets the reviewer mark Verified / Incorrect /
Needs review with notes, stored in `disease_review`.

## Technical notes

- Tables: `disease_cases`, `disease_case_images`, `disease_case_outcomes`,
  `disease_feedback`, `disease_knowledge`, `disease_knowledge_sources`,
  `disease_review`, plus a `user_roles` table with a `has_role` security-definer
  function for reviewer access.
- RLS: farmers can insert and read only their own cases, images, feedback and outcomes;
  they can never read or modify another farmer's rows. Trusted knowledge is read-only to
  authenticated users and written only by server-side privileged code. Review tables are
  reviewer-only via `has_role`.
- Indexes on `crop_name`, `disease_name`, `validation_status`, `farm_id`, `user_id`,
  `created_at`; HNSW vector index on `disease_knowledge.embedding` using the same
  embedding model and dimension as the existing Farm Knowledge chunks so both stacks stay
  consistent.
- New code lives under `src/features/disease-intelligence/` with server functions for
  capture, feedback, outcome, promotion, retrieval and analytics. Crop Health only gains
  two small call sites: a non-blocking capture after diagnosis, and an optional
  similar-case block added to the fusion context.
- Capture, embedding, promotion and analytics run after the farmer's response is
  returned; every one of them is wrapped so a failure is logged, not surfaced.
- Existing Farm Knowledge RAG is untouched and remains a separate source.

## Suggested order

Phases 1–2 first (capture + feedback) since nothing else has data without them, then 3–4
(validation + knowledge), then 5 (retrieval), then 6 (dashboard). Each phase is usable on
its own.
