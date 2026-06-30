import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Tractor,
  CloudSun,
  FileBarChart2,
  Settings,
  LogOut,
  Bell,
  Leaf,
  Menu,
  X,
  ChevronDown,
  Search,
  Sparkles,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { clearUser, getUser, type AuthUser } from "@/lib/auth";

const nav = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/farms", label: "My Farms", icon: Tractor },
  { to: "/app/weather", label: "Weather", icon: CloudSun },
  { to: "/app/reports", label: "Reports", icon: FileBarChart2 },
  { to: "/app/coming-soon", label: "AI Modules", icon: Sparkles },
  { to: "/app/settings", label: "Settings", icon: Settings },
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const u = getUser();
    if (!u) {
      navigate({ to: "/login" });
      return;
    }
    setUserState(u);
  }, [navigate]);

  useEffect(() => setMobileOpen(false), [pathname]);

  function handleLogout() {
    clearUser();
    navigate({ to: "/login" });
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
        <SidebarContent pathname={pathname} onLogout={handleLogout} />
      </aside>

      {/* Sidebar (mobile drawer) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-sidebar shadow-card">
            <SidebarContent pathname={pathname} onLogout={handleLogout} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur sm:px-6">
          <button
            className="grid h-10 w-10 place-items-center rounded-lg border border-border lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="relative hidden flex-1 max-w-md md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search…"
              className="h-10 w-full rounded-xl border border-input bg-muted/40 pl-9 pr-4 text-sm outline-none transition focus:bg-background focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              className="relative grid h-10 w-10 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-highlight" />
            </button>

            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5 text-sm hover:bg-muted"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {user.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden font-medium sm:inline">{user.name}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-popover shadow-card"
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  <div className="border-b border-border p-3">
                    <div className="text-sm font-semibold">{user.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                  </div>
                  <Link to="/app/settings" className="block px-3 py-2 text-sm hover:bg-muted">
                    Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-muted"
                  >
                    <LogOut className="h-4 w-4" /> Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({
  pathname,
  onLogout,
}: {
  pathname: string;
  onLogout: () => void;
}) {
  return (
    <>
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Leaf className="h-5 w-5" />
          </span>
          <span className="font-display text-base font-bold">Bhoomitra AI</span>
        </Link>
        <button
          className="grid h-8 w-8 place-items-center rounded-lg text-sidebar-foreground/60 lg:hidden"
          onClick={() => document.dispatchEvent(new CustomEvent("close-sidebar"))}
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {nav.map((item) => {
          const active = pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={[
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              ].join(" ")}
            >
              <item.icon className={["h-[1.125rem] w-[1.125rem]", active ? "text-primary" : ""].join(" ")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-destructive"
        >
          <LogOut className="h-[1.125rem] w-[1.125rem]" /> Logout
        </button>
      </div>
    </>
  );
}
