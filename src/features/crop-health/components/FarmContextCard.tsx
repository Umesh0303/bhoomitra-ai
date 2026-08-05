import { Droplets, Leaf, MapPin, Ruler, Sprout, CloudSun, Layers } from "lucide-react";
import type { FarmSnapshot, WeatherSnapshot } from "../types";

export function FarmContextCard({
  farm,
  weather,
}: {
  farm: FarmSnapshot;
  weather: WeatherSnapshot;
}) {
  const items = [
    { icon: Leaf, label: "Crop", value: farm.crop ?? "Not set" },
    { icon: Sprout, label: "Growth stage", value: farm.stage ?? "Unknown" },
    { icon: Layers, label: "Soil", value: farm.soilType ?? "Unknown" },
    { icon: Ruler, label: "Area", value: farm.area },
    { icon: Droplets, label: "Water", value: farm.waterSources.join(", ") || farm.irrigation || "Unknown" },
    { icon: MapPin, label: "Location", value: farm.location || "Unknown" },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-bold">{farm.farmName}</h3>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          Context loaded
        </span>
      </div>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => (
          <div key={i.label} className="flex items-start gap-2">
            <i.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">{i.label}</dt>
              <dd className="truncate text-sm font-medium">{i.value}</dd>
            </div>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex items-start gap-2 rounded-xl bg-muted/50 p-3">
        <CloudSun className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {weather.available
            ? `${weather.summary} Rain in the last 3 days: ${weather.rainLast3DaysMm ?? 0} mm.`
            : "No recent weather data — open the Weather page for this farm to load it."}
        </p>
      </div>
    </div>
  );
}
