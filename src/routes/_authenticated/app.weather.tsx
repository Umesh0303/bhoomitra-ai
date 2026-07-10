import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CloudSun, Droplets, Wind, Sun, Thermometer, AlertTriangle, RefreshCw, Star } from "lucide-react";
import { listFarms } from "@/lib/farms";
import { useFarmWeather } from "@/hooks/useWeather";
import { computeCropProgress } from "@/lib/calendar/calendar-utils";

export const Route = createFileRoute("/_authenticated/app/weather")({
  head: () => ({ meta: [{ title: "Weather — Bhoomitra AI" }] }),
  component: WeatherPage,
});

function WeatherPage() {
  const { data: farms = [] } = useQuery({ queryKey: ["farms"], queryFn: listFarms });
  const [farmId, setFarmId] = useState<string | null>(null);
  const activeFarm = useMemo(() => farms.find((f) => f.id === farmId) ?? farms[0], [farms, farmId]);
  const progress = activeFarm ? computeCropProgress(activeFarm.current_crop, activeFarm.sowing_date) : null;
  const { data: weather, isLoading, error, refetch, isRefetching, advice } = useFarmWeather(
    activeFarm?.id ?? null,
    progress?.stageId,
    activeFarm?.soil_type,
    activeFarm?.current_crop,
  );

  if (farms.length === 0) {
    return (
      <div className="mx-auto max-w-3xl py-20 text-center">
        <h1 className="font-display text-2xl font-bold">No farms yet</h1>
        <p className="mt-2 text-muted-foreground">Add a farm with a GPS location to see hyper-local weather intelligence.</p>
      </div>
    );
  }

  const current = weather?.current;
  const score = advice?.score;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Smart Weather Intelligence</h1>
          <p className="mt-1 text-sm text-muted-foreground">Actionable farming advice from real-time weather at each farm.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
            value={activeFarm?.id ?? ""}
            onChange={(e) => setFarmId(e.target.value)}
          >
            {farms.map((f) => (
              <option key={f.id} value={f.id}>{f.farm_name} — {f.village}</option>
            ))}
          </select>
          <button
            onClick={() => refetch()}
            className="grid h-10 w-10 place-items-center rounded-xl border border-border hover:bg-muted"
            aria-label="Refresh weather"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Couldn't load weather: {(error as Error).message}
        </div>
      )}

      {isLoading && <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading weather…</div>}

      {current && score && advice && (
        <>
          {/* Score + Next best action */}
          <section className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-gradient-to-br from-primary to-primary/85 p-6 text-primary-foreground shadow-card">
              <div className="text-xs uppercase tracking-[0.15em] opacity-80">Today's farming score</div>
              <div className="mt-2 flex items-baseline gap-3">
                <div className="font-display text-5xl font-bold">{score.score}</div>
                <div className="text-sm opacity-90">/ 100 · {score.label}</div>
              </div>
              <div className="mt-1 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < score.stars ? "fill-current" : "opacity-40"}`} />
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="font-semibold opacity-90">Good day for</div>
                  <ul className="mt-1 space-y-0.5 opacity-95">
                    {score.goodFor.length === 0 && <li>—</li>}
                    {score.goodFor.map((g) => <li key={g}>✓ {g}</li>)}
                  </ul>
                </div>
                <div>
                  <div className="font-semibold opacity-90">Avoid</div>
                  <ul className="mt-1 space-y-0.5 opacity-95">
                    {score.avoid.length === 0 && <li>—</li>}
                    {score.avoid.map((g) => <li key={g}>✗ {g}</li>)}
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft lg:col-span-2">
              <div className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Next best action</div>
              {advice.nextBestAction ? (
                <>
                  <h3 className="mt-2 font-display text-xl font-semibold">{advice.nextBestAction.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{advice.nextBestAction.reason}</p>
                </>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No urgent action — enjoy the day.</p>
              )}
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <RiskCell label="Today" level={advice.risk.today.level} reasons={advice.risk.today.reasons} />
                <RiskCell label="Tomorrow" level={advice.risk.tomorrow.level} reasons={advice.risk.tomorrow.reasons} />
                {progress && (
                  <div className="rounded-xl border border-border bg-background p-3">
                    <div className="text-xs text-muted-foreground">Crop progress</div>
                    <div className="mt-1 font-semibold">Day {progress.currentDay} / {progress.cycleDays}</div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${progress.percent}%` }} />
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{progress.stageLabel}</div>
                  </div>
                )}
                <div className="rounded-xl border border-border bg-background p-3">
                  <div className="text-xs text-muted-foreground">Sun</div>
                  <div className="mt-1 text-sm">
                    ↑ {current.sunriseIso ? new Date(current.sunriseIso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}<br/>
                    ↓ {current.sunsetIso ? new Date(current.sunsetIso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Current + top cards */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <Stat icon={Thermometer} label="Temperature" value={`${Math.round(current.tempC)}°C`} hint={`Feels ${Math.round(current.feelsLikeC)}°`} />
            <Stat icon={CloudSun} label="Condition" value={current.conditionLabel} />
            <Stat icon={Droplets} label="Rain chance" value={`${current.rainProbability}%`} />
            <Stat icon={Droplets} label="Humidity" value={`${current.humidity}%`} />
            <Stat icon={Wind} label="Wind" value={`${Math.round(current.windKph)} km/h`} hint={current.windDirection} />
            <Stat icon={Sun} label="UV Index" value={String(current.uvIndex)} />
          </section>

          {/* 7-day timeline */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h3 className="font-display text-lg font-semibold">7-day outlook</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-7">
              {weather.daily.map((d) => (
                <div key={d.dateIso} className="rounded-xl border border-border bg-background p-3 text-center">
                  <div className="text-xs text-muted-foreground">{new Date(d.dateIso).toLocaleDateString([], { weekday: "short" })}</div>
                  <div className="mt-1 text-sm font-semibold">{d.conditionLabel}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{Math.round(d.tempMaxC)}° / {Math.round(d.tempMinC)}°</div>
                  <div className="mt-1 text-xs text-primary">💧 {d.rainProbability}%</div>
                </div>
              ))}
            </div>
          </section>

          {/* Alerts */}
          {advice.alerts.length > 0 && (
            <section className="space-y-3">
              {advice.alerts.map((a) => (
                <div
                  key={a.id}
                  className={`flex items-start gap-3 rounded-2xl border p-4 ${
                    a.severity === "critical" ? "border-destructive/40 bg-destructive/5" : "border-amber-500/40 bg-amber-500/5"
                  }`}
                >
                  <AlertTriangle className={`mt-0.5 h-5 w-5 ${a.severity === "critical" ? "text-destructive" : "text-amber-600"}`} />
                  <div>
                    <div className="font-semibold">{a.title} <span className="text-xs font-normal text-muted-foreground">· {a.timing}</span></div>
                    <div className="text-sm text-muted-foreground">{a.message}</div>
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* Recommendations */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h3 className="font-display text-lg font-semibold">AI farming recommendations</h3>
            {advice.recommendations.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No special recommendations today.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {advice.recommendations.map((r) => (
                  <li key={r.id} className="rounded-xl border border-border bg-background p-4">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        r.severity === "high" ? "bg-destructive/10 text-destructive" : r.severity === "medium" ? "bg-amber-500/10 text-amber-700" : "bg-primary-soft text-primary"
                      }`}>
                        {r.severity}
                      </span>
                      <div className="font-semibold">{r.title}</div>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{r.reason}</p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {r.actions.map((a, i) => <li key={i}>• {a}</li>)}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function RiskCell({ label, level, reasons }: { label: string; level: "low" | "medium" | "high"; reasons: string[] }) {
  const color = level === "high" ? "text-destructive" : level === "medium" ? "text-amber-600" : "text-emerald-600";
  const emoji = level === "high" ? "🔴" : level === "medium" ? "🟠" : "🟢";
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-sm font-semibold ${color}`}>{emoji} {level[0].toUpperCase() + level.slice(1)}</div>
      <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{reasons[0]}</div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, hint }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
