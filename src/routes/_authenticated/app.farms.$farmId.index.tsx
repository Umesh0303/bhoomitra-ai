import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Pencil,
  MapPin,
  Layers,
  Droplet,
  Sprout,
  StickyNote,
  Bug,
  FlaskConical,
  CloudSun,
  LineChart,
  Loader2,
} from "lucide-react";
import { getFarm, formatArea, signImages } from "@/lib/farms";

export const Route = createFileRoute("/_authenticated/app/farms/$farmId/")({
  head: () => ({ meta: [{ title: "Farm details — Bhoomitra AI" }] }),
  component: FarmDetailPage,
});

function FarmDetailPage() {
  const { farmId } = useParams({ from: "/_authenticated/app/farms/$farmId/" });
  const { data: farm, isLoading } = useQuery({
    queryKey: ["farm", farmId],
    queryFn: () => getFarm(farmId),
  });
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!farm?.farm_images.length) return;
    signImages(farm.farm_images.map((i) => i.image_url)).then(setUrls);
  }, [farm]);

  if (isLoading) {
    return (
      <div className="grid place-items-center py-24 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!farm) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <p className="text-muted-foreground">This farm doesn't exist or was deleted.</p>
        <Link to="/app/farms" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Back to farms
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/app/farms" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to farms
        </Link>
        <Link
          to="/app/farms/$farmId/edit"
          params={{ farmId: farm.id }}
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-medium hover:bg-muted"
        >
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Link>
      </div>

      <header className="rounded-2xl border border-border bg-gradient-to-br from-primary to-primary/85 p-8 text-primary-foreground shadow-card">
        <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider">
          {farm.farm_type || "Farm"}
        </span>
        <h1 className="mt-3 font-display text-3xl font-bold">{farm.farm_name}</h1>
        <div className="mt-2 flex items-center gap-2 text-sm text-primary-foreground/85">
          <MapPin className="h-4 w-4" /> {farm.village}, {farm.district}, {farm.state}
        </div>
        {farm.description && (
          <p className="mt-3 max-w-2xl text-sm text-primary-foreground/85">{farm.description}</p>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <InfoCard title="Location" icon={MapPin}>
            <Grid>
              <Row label="State" value={farm.state} />
              <Row label="District" value={farm.district} />
              <Row label="Village" value={farm.village} />
              <Row label="Pincode" value={farm.pincode || "—"} />
              <Row label="Address" value={farm.address || "—"} full />
            </Grid>
          </InfoCard>

          <InfoCard title="Land details" icon={Layers}>
            <Grid>
              <Row label="Total area" value={formatArea(farm.total_area, farm.area_unit)} />
              <Row label="Soil type" value={farm.soil_type || "—"} />
              <Row label="Irrigation" value={farm.irrigation_method || "—"} />
              <Row label="Current crop" value={farm.current_crop || "—"} />
            </Grid>
          </InfoCard>

          <InfoCard title="Water resources" icon={Droplet}>
            {farm.farm_water_sources.length ? (
              <div className="flex flex-wrap gap-2">
                {farm.farm_water_sources.map((w) => (
                  <span
                    key={w.id}
                    className="rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary"
                  >
                    {w.water_source}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No water sources listed.</p>
            )}
          </InfoCard>

          <InfoCard title="Images" icon={Sprout}>
            {farm.farm_images.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {farm.farm_images.map((img) => (
                  <div key={img.id} className="overflow-hidden rounded-xl border border-border">
                    {urls[img.image_url] ? (
                      <img src={urls[img.image_url]} alt="" className="h-40 w-full object-cover" />
                    ) : (
                      <div className="h-40 w-full animate-pulse bg-muted" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No images uploaded.</p>
            )}
          </InfoCard>

          {farm.notes && (
            <InfoCard title="Notes" icon={StickyNote}>
              <p className="whitespace-pre-wrap text-sm text-foreground/90">{farm.notes}</p>
            </InfoCard>
          )}
        </div>

        <aside className="space-y-3">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            AI insights
          </h2>
          {[
            { icon: Sprout, title: "Crop Recommendation" },
            { icon: Bug, title: "Disease Detection" },
            { icon: CloudSun, title: "Weather Analysis" },
            { icon: FlaskConical, title: "Fertilizer Advisor" },
            { icon: LineChart, title: "Yield Prediction" },
          ].map((m) => (
            <div
              key={m.title}
              className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-soft"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
                  <m.icon className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium">{m.title}</span>
              </div>
              <span className="rounded-full bg-highlight/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-highlight-foreground/80">
                Soon
              </span>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <header className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="font-display text-base font-semibold">{title}</h2>
      </header>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <dl className="grid gap-4 sm:grid-cols-2">{children}</dl>;
}

function Row({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value}</dd>
    </div>
  );
}
