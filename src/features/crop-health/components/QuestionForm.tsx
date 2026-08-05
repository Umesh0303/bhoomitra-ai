import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { CropScanQuestionRow } from "../types";

export function QuestionForm({
  questions,
  onSubmit,
  submitting,
}: {
  questions: CropScanQuestionRow[];
  onSubmit: (answers: Array<{ id: string; answer: string }>) => void;
  submitting?: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, string[]>>({});

  function toggle(q: CropScanQuestionRow, value: string) {
    setAnswers((prev) => {
      const current = prev[q.id] ?? [];
      if (q.input_type === "multi") {
        return {
          ...prev,
          [q.id]: current.includes(value)
            ? current.filter((v) => v !== value)
            : [...current, value],
        };
      }
      return { ...prev, [q.id]: [value] };
    });
  }

  const answeredCount = questions.filter((q) => (answers[q.id] ?? []).length > 0).length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {answeredCount} of {questions.length} answered — answer what you know, skip the rest.
      </p>
      {questions.map((q) => {
        const options = (q.options as Array<{ label: string; value: string }>) ?? [];
        const selected = answers[q.id] ?? [];
        return (
          <fieldset key={q.id} className="rounded-2xl border border-border bg-card p-4">
            <legend className="px-1 text-sm font-semibold">{q.question}</legend>
            {q.help_text && <p className="text-xs text-muted-foreground">{q.help_text}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {options.map((opt) => {
                const active = selected.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggle(q, opt.value)}
                    className={[
                      "min-h-11 rounded-xl border px-4 text-sm font-medium transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-muted",
                    ].join(" ")}
                    aria-pressed={active}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
      <button
        type="button"
        disabled={submitting}
        onClick={() =>
          onSubmit(
            questions
              .filter((q) => (answers[q.id] ?? []).length > 0)
              .map((q) => ({ id: q.id, answer: (answers[q.id] ?? []).join(", ") })),
          )
        }
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Continue to diagnosis
      </button>
    </div>
  );
}
