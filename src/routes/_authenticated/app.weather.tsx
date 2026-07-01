import { createFileRoute } from "@tanstack/react-router";
import { CloudSun, Wind, Droplets, Thermometer } from "lucide-react";
import { PagePlaceholder } from "@/components/app/PagePlaceholder";

export const Route = createFileRoute("/_authenticated/app/weather")({
  head: () => ({ meta: [{ title: "Weather — Bhoomitra AI" }] }),
  component: WeatherPage,
});

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function WeatherPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold">Weather</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hyper-local forecasts for your farms — full intelligence coming soon.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-gradient-to-br from-accent/15 to-card p-6 shadow-soft lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Mysuru, Karnataka</div>
              <div className="mt-1 font-display text-5xl font-bold">28°C</div>
              <div className="mt-1 text-sm text-muted-foreground">Partly cloudy · Feels like 30°</div>
            </div>
            <CloudSun className="h-20 w-20 text-accent" />
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4 text-sm">
            <Stat icon={Wind} label="Wind" value="8 km/h" />
            <Stat icon={Droplets} label="Humidity" value="62%" />
            <Stat icon={Thermometer} label="High / Low" value="31° / 22°" />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h3 className="font-display text-base font-semibold">7-day outlook</h3>
          <ul className="mt-4 space-y-3 text-sm">
            {days.map((d, i) => (
              <li key={d} className="flex items-center justify-between">
                <span className="font-medium">{d}</span>
                <CloudSun className="h-4 w-4 text-accent" />
                <span className="text-muted-foreground">{27 + i}° / {21 + (i % 3)}°</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <PagePlaceholder
        title="AI-driven weather intelligence"
        body="Field-specific advisories, rainfall risk, and irrigation suggestions are coming soon."
      />
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}
