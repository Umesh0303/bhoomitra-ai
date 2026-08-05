import { Check, Loader2 } from "lucide-react";

export function AnalysisProgress({
  steps,
  activeIndex,
}: {
  steps: readonly string[];
  activeIndex: number;
}) {
  return (
    <ol className="space-y-2">
      {steps.map((step, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <li
            key={step}
            className={[
              "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors",
              active
                ? "border-primary/40 bg-primary/5 font-medium"
                : done
                  ? "border-border text-muted-foreground"
                  : "border-transparent text-muted-foreground/60",
            ].join(" ")}
          >
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-current">
              {done ? (
                <Check className="h-3.5 w-3.5" />
              ) : active ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <span className="text-[10px]">{i + 1}</span>
              )}
            </span>
            {step}
          </li>
        );
      })}
    </ol>
  );
}
