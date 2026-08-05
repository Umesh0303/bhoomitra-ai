import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/app/crop-health")({
  component: CropHealthLayout,
});

const tabs = [
  { to: "/app/crop-health", label: "Overview", exact: true },
  { to: "/app/crop-health/scan", label: "Disease Detection" },
  { to: "/app/crop-health/history", label: "Scan History" },
];

function CropHealthLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold">Crop Health</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Evidence-based disease detection using your photos, farm details, weather and knowledge base.
        </p>
      </header>
      <nav className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={[
                "min-h-11 rounded-xl border px-4 py-2.5 text-sm font-medium",
                active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted",
              ].join(" ")}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      <Outlet />
    </div>
  );
}
