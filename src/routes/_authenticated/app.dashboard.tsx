import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Tractor,
  Sprout,
  CloudSun,
  Activity,
  Plus,
  FileBarChart2,
  User,
  ArrowUpRight,
  Megaphone,
  Sparkles,
  Bug,
  FlaskConical,
  LineChart,
  Mic,
  Layers,
} from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { listFarms, formatArea } from "@/lib/farms";

export const Route = createFileRoute("/_authenticated/app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Bhoomitra AI" }] }),
  component: DashboardPage,
});

const actions = [
  { label: "Add Farm", icon: Plus, to: "/app/farms/new" as const },
  { label: "View Reports", icon: FileBarChart2, to: "/app/reports" as const },
  { label: "Weather", icon: CloudSun, to: "/app/weather" as const },
  { label: "Profile", icon: User, to: "/app/settings" as const },
];

const futureModules = [
  { icon: Sprout, title: "Crop Recommendation" },
  { icon: Bug, title: "Disease Detection" },
  { icon: FlaskConical, title: "Fertilizer Advisor" },
  { icon: LineChart, title: "Yield Prediction" },
  { icon: LineChart, title: "Market Prediction" },
  { icon: Mic, title: "Voice Assistant" },
];

function DashboardPage() {
  const { user, profile } = useUser();
  const { data: farms = [] } = useQuery({ queryKey: ["farms"], queryFn: listFarms });

  const fullName =
    profile?.full_name ||
    (user?.user_metadata as { full_name?: string; name?: string } | undefined)?.full_name ||
    (user?.user_metadata as { name?: string } | undefined)?.name ||
    user?.email?.split("@")[0] ||
    "there";
  const name = fullName.split(" ")[0];

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Normalize area to acres for display total (1 ha = 2.471 ac; 1 sqm ~= 0.000247 ac).
  const totalAcres = farms.reduce((sum, f) => {
    const a = Number(f.total_area) || 0;
    if (f.area_unit === "hectares") return sum + a * 2.471;
    if (f.area_unit === "sqm") return sum + a * 0.000247;
    return sum + a;
  }, 0);
  const activeCrops = farms.filter((f) => f.current_crop && f.current_crop !== "Empty Field").length;
  const lastUpdated = farms
    .map((f) => new Date(f.updated_at).getTime())
    .sort((a, b) => b - a)[0];

  const stats = [
    { label: "Total farms", value: String(farms.length), icon: Tractor, hint: farms.length ? "Across your account" : "None yet" },
    { label: "Total area", value: totalAcres ? `${totalAcres.toFixed(1)} ac` : "0", icon: Layers, hint: "Normalized to acres" },
    { label: "Active crops", value: String(activeCrops), icon: Sprout, hint: activeCrops ? "Tracked in farms" : "Set a current crop" },
    {
      label: "Last updated",
      value: lastUpdated ? new Date(lastUpdated).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—",
      icon: Activity,
      hint: "Most recent change",
    },
  ];

  const recent = [...farms].slice(0, 5);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary to-primary/85 p-6 text-primary-foreground shadow-card sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-primary-foreground/80">{today}</p>
            <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">
              Welcome back, {name} 👋
            </h1>
            <p className="mt-2 max-w-xl text-sm text-primary-foreground/85">
              Here's a quick snapshot of your farms today. AI insights are arriving soon.
            </p>
          </div>
          <Link
            to="/app/farms/new"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-card px-4 text-sm font-semibold text-primary shadow-soft hover:bg-card/90"
          >
            <Plus className="h-4 w-4" /> Add Farm
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary">
                <s.icon className="h-[1.125rem] w-[1.125rem]" />
              </span>
            </div>
            <div className="mt-3 font-display text-3xl font-bold">{s.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{s.hint}</div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">Quick actions</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {actions.map((a) => (
            <Link
              key={a.label}
              to={a.to}
              className="group flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-card"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                  <a.icon className="h-5 w-5" />
                </span>
                <span className="font-medium">{a.label}</span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Recent farms</h2>
            <Link to="/app/farms" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No farms yet.{" "}
              <Link to="/app/farms/new" className="font-medium text-primary hover:underline">
                Add your first farm
              </Link>
              .
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-3 pr-4 font-medium">Farm name</th>
                    <th className="py-3 pr-4 font-medium">Location</th>
                    <th className="py-3 pr-4 font-medium">Area</th>
                    <th className="py-3 pr-4 font-medium">Crop</th>
                    <th className="py-3 pr-0 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((f) => (
                    <tr key={f.id} className="border-b border-border last:border-0">
                      <td className="py-3 pr-4 font-medium">{f.farm_name}</td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {f.village}, {f.district}
                      </td>
                      <td className="py-3 pr-4">{formatArea(f.total_area, f.area_unit)}</td>
                      <td className="py-3 pr-4">{f.current_crop || "—"}</td>
                      <td className="py-3 pr-0 text-right">
                        <Link
                          to="/app/farms/$farmId"
                          params={{ farmId: f.id }}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
              <Megaphone className="h-5 w-5" />
            </span>
            <h2 className="font-display text-lg font-semibold">Announcements</h2>
          </div>
          <ul className="mt-4 space-y-4 text-sm">
            <li>
              <div className="font-medium">Welcome to Bhoomitra AI</div>
              <p className="mt-1 text-muted-foreground">
                Add your farms now — AI recommendations arrive in v2.
              </p>
            </li>
            <li>
              <div className="font-medium">Roadmap preview</div>
              <p className="mt-1 text-muted-foreground">
                Crop recommendation and disease detection are first in line.
              </p>
            </li>
          </ul>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-semibold">Coming soon</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {futureModules.map((m) => (
            <div
              key={m.title}
              className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-soft"
            >
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary-soft/60 blur-2xl" />
              <span className="relative grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
                <m.icon className="h-5 w-5" />
              </span>
              <h3 className="relative mt-4 font-display text-base font-semibold">{m.title}</h3>
              <p className="relative mt-1 text-sm text-muted-foreground">
                Premium AI module arriving in a future version.
              </p>
              <span className="relative mt-4 inline-block rounded-full bg-highlight/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-highlight-foreground/80">
                Coming Soon
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
