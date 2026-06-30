import { createFileRoute, Link } from "@tanstack/react-router";
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
} from "lucide-react";
import { getUser } from "@/lib/auth";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Bhoomitra AI" }] }),
  component: DashboardPage,
});

const stats = [
  { label: "Farms", value: "3", icon: Tractor, hint: "+1 this month" },
  { label: "Active Crops", value: "7", icon: Sprout, hint: "2 nearing harvest" },
  { label: "Weather", value: "28°C", icon: CloudSun, hint: "Partly cloudy" },
  { label: "Recent Activity", value: "12", icon: Activity, hint: "Last 7 days" },
];

const actions = [
  { label: "Add Farm", icon: Plus, to: "/app/farms" },
  { label: "View Reports", icon: FileBarChart2, to: "/app/reports" },
  { label: "Weather", icon: CloudSun, to: "/app/weather" },
  { label: "Profile", icon: User, to: "/app/settings" },
] as const;

const farms = [
  { name: "Green Acres", location: "Mysuru, KA", area: "5.2 ha", status: "Active" },
  { name: "Sunrise Plot", location: "Pune, MH", area: "2.0 ha", status: "Planning" },
  { name: "Riverbend Field", location: "Coimbatore, TN", area: "8.4 ha", status: "Active" },
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
  const [name, setName] = useState("there");
  useEffect(() => {
    const u = getUser();
    if (u) setName(u.name.split(" ")[0]);
  }, []);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Welcome */}
      <section className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary to-primary/85 p-6 text-primary-foreground shadow-card sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-primary-foreground/80">
              {today}
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">
              Welcome back, {name} 👋
            </h1>
            <p className="mt-2 max-w-xl text-sm text-primary-foreground/85">
              Here's a quick snapshot of your farms today. AI insights are arriving soon.
            </p>
          </div>
          <Link
            to="/app/farms"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-card px-4 text-sm font-semibold text-primary shadow-soft hover:bg-card/90"
          >
            <Plus className="h-4 w-4" /> Add Farm
          </Link>
        </div>
      </section>

      {/* Stats */}
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

      {/* Quick actions */}
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

      {/* Recent farms + announcements */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Recent farms</h2>
            <Link to="/app/farms" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="py-3 pr-4 font-medium">Farm name</th>
                  <th className="py-3 pr-4 font-medium">Location</th>
                  <th className="py-3 pr-4 font-medium">Area</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-0 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {farms.map((f) => (
                  <tr key={f.name} className="border-b border-border last:border-0">
                    <td className="py-3 pr-4 font-medium">{f.name}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{f.location}</td>
                    <td className="py-3 pr-4">{f.area}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={[
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                          f.status === "Active"
                            ? "bg-primary-soft text-primary"
                            : "bg-highlight/15 text-highlight-foreground/80",
                        ].join(" ")}
                      >
                        {f.status}
                      </span>
                    </td>
                    <td className="py-3 pr-0 text-right">
                      <button className="text-sm font-medium text-primary hover:underline">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                You're on Version 1 — the foundation. AI modules are coming soon.
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

      {/* Coming soon AI modules */}
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
