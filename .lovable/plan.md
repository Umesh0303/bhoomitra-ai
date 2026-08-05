# Crop Health — AI Disease Detection (additive module)

A new "Crop Health" section at `/app/crop-health` that diagnoses crop problems the way an extension officer would: image evidence + stored farm context + live weather + targeted follow-up questions + your uploaded knowledge base, ending in a confidence-scored diagnosis, treatment plan and recovery tracking.

Nothing existing changes except one new sidebar link. Auth, Farms, Assistant, RAG, Weather, Calendar, Voice and all current tables/routes stay exactly as they are.

## What the farmer sees

1. **Pick a farm** — the farm card auto-fills crop, location, soil, area, water sources, growth stage (from the crop calendar) and latest weather. No re-typing.
2. **Add photos** — camera or gallery, up to 5, each tagged (leaf / fruit / stem / flower / root / whole plant). Images are compressed in the browser before upload, with per-file progress.
3. **Analysis** — a staged progress strip (Analyzing images → Checking symptoms → Comparing diseases → Reviewing weather → Generating questions) while the AI works. UI never blocks.
4. **Top 3 possibilities** with confidence bars — not a final answer yet.
5. **Up to 6 smart questions** — generated from those possibilities, mostly yes/no, chips or radio buttons. Weather-aware phrasing ("We detected 38mm rain in the last 3 days — correct?"). Nothing already known is asked.
6. **Final diagnosis** — name, scientific name, type (fungal/bacterial/viral/pest/nutrient/water/heat/cold/physical/unknown), severity, affected parts, symptoms, cause, spread estimate, yield impact, risk level, recovery probability. Confidence can move up or down, and the diagnosis can change if answers contradict the images.
7. **Treatment plan** — organic, chemical, cultural, preventive; spray interval, dosage, safety notes; a standing instruction to avoid restricted chemicals and defer to local agricultural authorities when unsure.
8. **Weather risk panel** — how the coming week's humidity, rain, heat, wind affect this disease, with a Low/Medium/High forward risk.
9. **Sources** — knowledge-base citations when your documents contain something relevant; silently skipped when they don't.
10. **Ask AI** — opens the Assistant pre-seeded with the diagnosis, symptoms, answers, farm and weather context.
11. **Scan History** per farm — timeline with thumbnails, diagnosis, severity, treatment status.
12. **Follow-up scan** — links to a previous scan and reports Improved / No change / Worsened with an estimated recovery %.
13. **Crop Health dashboard** — total scans, healthy plants, diseases detected, pending treatments, average health score, recent alerts.

Reminders (spray tomorrow, follow-up scan, treatment complete) are written as tasks into the existing crop calendar so they show up where farmers already look — additive rows only, no calendar code changes.

## Confidence rules

Image only caps at 85%. Image + answers caps at 95%. Image + answers + weather + farm context caps at 99%. Never 100%. Caps are enforced in code after the model responds, not left to the model.

## Technical approach

**New tables** (migration, RLS owner-only + GRANTs, same pattern as `calendar_tasks`):
- `crop_scans` — farm_id, user_id, status, crop, plant parts, farm/weather snapshot (jsonb), stage 1 candidates (jsonb), final diagnosis (jsonb), treatment plan (jsonb), weather risk (jsonb), confidence, severity, health_score, treatment_status, parent_scan_id (follow-ups), recovery jsonb, citations jsonb, timestamps.
- `crop_scan_images` — scan_id, storage_path, plant_part, width/height/bytes, order.
- `crop_scan_questions` — scan_id, question text, options jsonb, answer, order, category.
- New private storage bucket `crop-scan-images`, policies scoped to `user_id/scan_id/...` paths, signed URLs on read (mirrors `farm-images`).

**Server functions** in `src/features/crop-health/` (all `requireSupabaseAuth`, so the routes live under `_authenticated/`):
- `createScan` / `listScans` / `getScan` / `deleteScan`
- `analyzeScan` — pulls farm + water sources + calendar stage + cached weather, sends signed image URLs to a vision model through the existing Lovable AI Gateway with a strict JSON schema, returns top-3 candidates.
- `generateQuestions` — candidate-driven, max 6, structured options, weather-aware phrasing.
- `finalizeScan` — re-reasons over candidates + answers + weather + farm context, runs a RAG retrieval (reusing `embedQuery` + `match_knowledge_chunks` + reranker), applies the confidence caps, persists diagnosis + treatment + risk + citations.
- `compareScans` — recovery delta against `parent_scan_id`.

All AI calls go through the existing gateway helper with the current models (Gemini flash for vision/reasoning, existing embedding model for retrieval). No new secrets, no new gateway config, no changes to `/api/chat` — the "Ask AI" button navigates to the Assistant with context passed via the existing `FarmContext` mechanism plus a prefilled first message.

**Routes** (new files only): `_authenticated/app.crop-health.tsx` (layout + tabs), `.index.tsx` (dashboard), `.scan.tsx` (wizard), `.history.tsx`, `.$scanId.tsx` (report). Sidebar gets one new entry in `AppLayout` — the only edit to an existing file.

**UI** — existing design tokens and shadcn components only; mobile-first, large tap targets, high contrast, TanStack Query caching for history, lazy-loaded wizard steps, retry on every failed AI step.

**Future-ready** — the scan record stores media generically (path + kind), so video, drone, satellite or sensor evidence slots in without schema churn; the diagnosis engine is split into analyze/question/finalize stages so an expert-review or outbreak-mapping layer can hook in later.

## Scope notes

- Push notifications are out of scope; reminders surface as calendar tasks and in-app alerts.
- Offline-friendly means graceful degradation and cached history, not a full offline sync engine.
