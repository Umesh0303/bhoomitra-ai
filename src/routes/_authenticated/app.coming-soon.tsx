import { createFileRoute } from "@tanstack/react-router";
import { Sprout, Bug, FlaskConical, LineChart, TrendingUp, Mic, MessageCircle, BarChart3, Bell } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/coming-soon")({
  head: () => ({ meta: [{ title: "Coming Soon — Bhoomitra AI" }] }),
  component: ComingSoonPage,
});

const modules = [
  { icon: Sprout, title: "Crop Recommendation", desc: "AI suggestions tailored to your soil and climate." },
  { icon: Bug, title: "Disease Detection", desc: "Spot crop diseases early from a single photo." },
  { icon: FlaskConical, title: "Fertilizer Advisor", desc: "Optimize nutrients with precision guidance." },
  { icon: LineChart, title: "Yield Prediction", desc: "Forecast harvest outcomes with confidence." },
  { icon: TrendingUp, title: "Market Prediction", desc: "Sell at the right moment with price trends." },
  { icon: Mic, title: "Voice Assistant", desc: "Hands-free help while you're in the field." },
  { icon: MessageCircle, title: "AI Chat", desc: "Ask anything about your farm and get clear answers." },
  { icon: BarChart3, title: "Analytics", desc: "Track productivity over seasons and farms." },
  { icon: Bell, title: "Smart Notifications", desc: "Timely alerts before problems become costly." },
];

function ComingSoonPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold">AI Modules — Coming soon</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Previews of upcoming intelligence built right into Bhoomitra AI.
          These modules will activate in future versions.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => (
          <article
            key={m.title}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card"
          >
            <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-primary-soft/60 blur-2xl transition-transform group-hover:scale-110" />
            <span className="relative grid h-12 w-12 place-items-center rounded-xl bg-primary-soft text-primary">
              <m.icon className="h-6 w-6" />
            </span>
            <h3 className="relative mt-5 font-display text-lg font-semibold">{m.title}</h3>
            <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">{m.desc}</p>
            <div className="relative mt-5 flex items-center justify-between">
              <span className="rounded-full bg-highlight/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-highlight-foreground/80">
                Coming Soon
              </span>
              <button
                className="text-sm font-medium text-muted-foreground"
                disabled
              >
                Preview
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
