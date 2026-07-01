import { createFileRoute } from "@tanstack/react-router";
import { Tractor, Plus, MapPin } from "lucide-react";
import { PagePlaceholder } from "@/components/app/PagePlaceholder";

export const Route = createFileRoute("/_authenticated/app/farms")({
  head: () => ({ meta: [{ title: "My Farms — Bhoomitra AI" }] }),
  component: FarmsPage,
});

const farms = [
  { name: "Green Acres", location: "Mysuru, KA", area: "5.2 ha", crops: "Paddy, Tomato", status: "Active" },
  { name: "Sunrise Plot", location: "Pune, MH", area: "2.0 ha", crops: "Wheat", status: "Planning" },
  { name: "Riverbend Field", location: "Coimbatore, TN", area: "8.4 ha", crops: "Sugarcane", status: "Active" },
];

function FarmsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">My Farms</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your farm profiles. AI-driven insights coming soon.
          </p>
        </div>
        <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Add Farm
        </button>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {farms.map((f) => (
          <article key={f.name} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                <Tractor className="h-5 w-5" />
              </span>
              <span
                className={[
                  "rounded-full px-2.5 py-0.5 text-xs font-medium",
                  f.status === "Active"
                    ? "bg-primary-soft text-primary"
                    : "bg-highlight/15 text-highlight-foreground/80",
                ].join(" ")}
              >
                {f.status}
              </span>
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold">{f.name}</h3>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> {f.location}
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Area</dt>
                <dd className="font-medium">{f.area}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Crops</dt>
                <dd className="font-medium">{f.crops}</dd>
              </div>
            </dl>
            <button className="mt-5 w-full rounded-xl border border-border bg-background py-2 text-sm font-medium hover:bg-muted">
              View details
            </button>
          </article>
        ))}
      </div>

      <PagePlaceholder
        title="More farm tools arriving soon"
        body="Field mapping, soil profiles, and per-plot AI recommendations are on the way."
      />
    </div>
  );
}
