import { Sparkles } from "lucide-react";

export function PagePlaceholder({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
        <Sparkles className="h-6 w-6" />
      </span>
      <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{body}</p>
      <span className="mt-4 inline-block rounded-full bg-highlight/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-highlight-foreground/80">
        Coming Soon
      </span>
    </div>
  );
}
