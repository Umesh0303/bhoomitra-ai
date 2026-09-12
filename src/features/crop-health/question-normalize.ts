// Single normalization + validation layer for the confirmation-question stage.
//
//   Gemini raw text → extractQuestionJson() → normalizeQuestionResponse()
//   → validateQuestions() (Zod) → toScanQuestions() → DB + question UI
//
// ALL shape-compatibility logic lives here: bare arrays, `questions` wrappers,
// snake_case aliases (helps_confirm / helps_rule_out / input_type) and yes/no
// questions that arrive without options. Nothing else in the app should know
// about those variants.

import { z } from "zod";
import type { ImageAnalysis, ScanQuestion } from "./types";

/** Canonical contract advertised to the model and to diagnostics. */
export const CANONICAL_QUESTIONS_JSON = `{
  "questions": [
    {
      "question": "string — short, village-level language",
      "helpText": "string — optional one-line hint ('' if none)",
      "category": "symptom | spread | history | environment | management",
      "type": "yes_no | multiple_choice",
      "options": ["only for multiple_choice — 2 to 5 short choices"],
      "confirms": ["candidate names this answer would confirm"],
      "rulesOut": ["candidate names this answer would rule out"]
    }
  ]
}`;

const YES_NO_OPTIONS = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
  { label: "Not sure", value: "not_sure" },
];

const QuestionOptionSchema = z.object({ label: z.string().min(1), value: z.string().min(1) });

export const CanonicalQuestionSchema = z.object({
  question: z.string().min(3),
  helpText: z.string().default(""),
  category: z.string().default("symptom"),
  inputType: z.enum(["single", "multi"]).default("single"),
  type: z.enum(["yes_no", "multiple_choice"]).default("multiple_choice"),
  options: z.array(QuestionOptionSchema).min(2),
  confirms: z.array(z.string()).default([]),
  rulesOut: z.array(z.string()).default([]),
});

export const CanonicalQuestionsSchema = z.object({
  questions: z.array(CanonicalQuestionSchema).min(1).max(6),
});

export type CanonicalQuestions = z.infer<typeof CanonicalQuestionsSchema>;

// ------------------------------------------------------------------- helpers

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : v == null ? "" : String(v));

const strArray = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map(str).filter(Boolean);
  const s = str(v);
  return s ? [s] : [];
};

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48) || "option";

const pick = (row: Record<string, unknown>, keys: string[]): unknown => {
  for (const k of keys) if (row[k] != null && row[k] !== "") return row[k];
  return undefined;
};

/** Parses model text into JSON — tolerates fences, a bare array or an object. */
export function extractQuestionJson(text: string): unknown {
  const cleaned = text
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    /* fall through to bracket scanning */
  }
  const candidates: Array<[number, number]> = [
    [cleaned.indexOf("{"), cleaned.lastIndexOf("}")],
    [cleaned.indexOf("["), cleaned.lastIndexOf("]")],
  ]
    .filter(([a, b]) => a >= 0 && b > a)
    .sort((a, b) => a[0] - b[0]) as Array<[number, number]>;
  for (const [a, b] of candidates) {
    try {
      return JSON.parse(cleaned.slice(a, b + 1));
    } catch {
      /* try the next shape */
    }
  }
  throw new Error("Model reply contained no JSON object or array");
}

function normalizeOptions(raw: unknown, isYesNo: boolean) {
  const list = Array.isArray(raw) ? raw : [];
  const mapped = list
    .map((o) => {
      if (typeof o === "string") return { label: o.trim(), value: slug(o) };
      if (o && typeof o === "object") {
        const row = o as Record<string, unknown>;
        const label = str(pick(row, ["label", "text", "title", "name", "option"]));
        const value = str(pick(row, ["value", "id", "key"])) || slug(label);
        return label ? { label, value } : null;
      }
      return null;
    })
    .filter((o): o is { label: string; value: string } => Boolean(o));

  // De-duplicate values so the UI toggle keys stay unique.
  const seen = new Set<string>();
  const unique = mapped.filter((o) => (seen.has(o.value) ? false : (seen.add(o.value), true)));
  if (isYesNo || unique.length < 2) return YES_NO_OPTIONS;
  return unique.slice(0, 6);
}

function normalizeOne(raw: unknown) {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;

  const question = str(pick(row, ["question", "text", "prompt", "title", "q"]));
  if (!question) return null;

  const rawType = str(pick(row, ["type", "questionType", "question_type", "answerType"]))
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const rawInput = str(pick(row, ["inputType", "input_type"]))
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  const isYesNo = /^(yes_no|yesno|boolean|bool|confirm)$/.test(rawType) || rawInput === "yes_no";
  const isMulti = rawInput === "multi" || /multi_select|multiple_select|checkbox/.test(rawType);

  const options = normalizeOptions(pick(row, ["options", "choices", "answers", "values"]), isYesNo);

  return {
    question,
    helpText: str(pick(row, ["helpText", "help_text", "hint", "help", "description"])),
    category: str(pick(row, ["category", "group", "topic"])).toLowerCase() || "symptom",
    inputType: (isMulti ? "multi" : "single") as "single" | "multi",
    type: (isYesNo ? "yes_no" : "multiple_choice") as "yes_no" | "multiple_choice",
    options,
    confirms: strArray(
      pick(row, ["confirms", "helps_confirm", "helpsConfirm", "confirmCandidates", "supports"]),
    ),
    rulesOut: strArray(
      pick(row, ["rulesOut", "helps_rule_out", "helpsRuleOut", "rule_out", "ruleOut", "excludes"]),
    ),
  };
}

/**
 * Ranks by diagnostic value, then keeps the best `max`.
 * Score rewards questions that separate the top candidates (naming several of
 * them, and both confirming AND ruling out), that reference real candidate
 * names from the vision stage, and that offer meaningful choices.
 */
export function rankQuestions<
  T extends { question: string; confirms: string[]; rulesOut: string[]; options: unknown[] },
>(list: T[], candidateNames: string[] = [], max = 6): T[] {
  const known = candidateNames.map((n) => n.toLowerCase());
  const matches = (names: string[]) =>
    names.filter((n) =>
      known.some((k) => k.includes(n.toLowerCase()) || n.toLowerCase().includes(k)),
    ).length;

  const score = (q: T) => {
    const confirmHits = matches(q.confirms);
    const ruleOutHits = matches(q.rulesOut);
    const targeted = new Set([...q.confirms, ...q.rulesOut].map((n) => n.toLowerCase())).size;
    let s = 0;
    s += targeted * 3; // separates more candidates
    s += (confirmHits + ruleOutHits) * 4; // references real vision candidates
    if (confirmHits > 0 && ruleOutHits > 0) s += 6; // discriminates both ways
    if (q.options.length >= 3) s += 2; // richer answer resolution
    if (q.question.length > 140) s -= 2; // long, rambling questions
    return s;
  };

  return list
    .map((q, i) => ({ q, i, s: score(q) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, max)
    .map((x) => x.q);
}

/**
 * Accepts a bare array, `{ questions: [...] }`, or common wrappers, and always
 * returns the canonical object shape BEFORE any Zod validation runs.
 */
export function normalizeQuestionResponse(
  raw: unknown,
  opts: { candidateNames?: string[]; max?: number } = {},
): { questions: ReturnType<typeof normalizeOne>[] } {
  let list: unknown[] = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (raw && typeof raw === "object") {
    const row = raw as Record<string, unknown>;
    const found = pick(row, [
      "questions",
      "confirmationQuestions",
      "confirmation_questions",
      "items",
      "data",
      "result",
    ]);
    if (Array.isArray(found)) list = found;
    else if (found && typeof found === "object") list = [found];
    else if (row["question"]) list = [row];
  }
  if (!list.length) throw new Error("Model reply contained no questions");

  const normalized = list
    .map(normalizeOne)
    .filter((q): q is NonNullable<ReturnType<typeof normalizeOne>> => Boolean(q));
  if (!normalized.length) throw new Error("No usable questions after normalization");

  // De-duplicate near-identical questions before ranking.
  const seen = new Set<string>();
  const unique = normalized.filter((q) => {
    const key = q.question.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { questions: rankQuestions(unique, opts.candidateNames ?? [], opts.max ?? 6) };
}

/** Zod validation with field-level errors — runs AFTER normalization. */
export function validateQuestions(normalized: unknown): CanonicalQuestions {
  const parsed = CanonicalQuestionsSchema.safeParse(normalized);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new Error(`Question schema validation failed — ${detail}`);
  }
  return parsed.data;
}

/** Maps the canonical object onto the internal application type. */
export function toScanQuestions(canonical: CanonicalQuestions): ScanQuestion[] {
  return canonical.questions.map((q) => ({
    question: q.question,
    helpText: q.helpText,
    category: q.category,
    inputType: q.inputType,
    options: q.options,
    targets: Array.from(new Set([...q.confirms, ...q.rulesOut])).filter(Boolean),
  }));
}

/** Candidate names from the vision stage, used to rank questions. */
export function candidateNames(analysis: ImageAnalysis | null | undefined): string[] {
  return (analysis?.candidates ?? []).map((c) => c.name).filter(Boolean);
}
