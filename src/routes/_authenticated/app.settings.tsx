import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  User,
  KeyRound,
  Bell,
  Globe,
  ShieldCheck,
  CreditCard,
  Palette,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/settings")({
  head: () => ({ meta: [{ title: "Settings — Bhoomitra AI" }] }),
  component: SettingsPage,
});

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "account", label: "Account", icon: KeyRound },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "language", label: "Language", icon: Globe },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "subscription", label: "Subscription", icon: CreditCard },
  { id: "appearance", label: "Appearance", icon: Palette },
] as const;

function SettingsPage() {
  const [active, setActive] = useState<(typeof tabs)[number]["id"]>("profile");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account, preferences, and security.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <nav className="rounded-2xl border border-border bg-card p-2 shadow-soft">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={[
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active === t.id
                  ? "bg-primary-soft text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              ].join(" ")}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </nav>

        <section className="rounded-2xl border border-border bg-card p-8 shadow-soft">
          <h2 className="font-display text-lg font-semibold capitalize">{active}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This section is a placeholder. Full settings arrive in a future version.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl border border-dashed border-border bg-background p-5">
                <div className="text-sm font-medium">Setting option {i}</div>
                <p className="mt-1 text-xs text-muted-foreground">Configurable in v2.</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
