import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Tractor,
  CloudSun,
  CalendarDays,
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
  BookOpen,
  User as UserIcon,
  CreditCard,
  LifeBuoy,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { signOut } from "@/services/authService";

const nav = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/farms", label: "My Farms", icon: Tractor },
  { to: "/app/crop-health", label: "Crop Health", icon: Stethoscope },
  { to: "/app/weather", label: "Weather", icon: CloudSun },
  { to: "/app/calendar", label: "Crop Calendar", icon: CalendarDays },
  { to: "/app/reports", label: "Reports", icon: FileBarChart2 },
  { to: "/app/assistant", label: "AI Assistant", icon: Sparkles },
  { to: "/app/knowledge", label: "Farm Knowledge", icon: BookOpen },
  { to: "/app/settings", label: "Settings", icon: Settings },
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const displayName =
    profile?.full_name ||
    (user?.user_metadata as { full_name?: string; name?: string } | undefined)?.full_name ||
    (user?.user_metadata as { name?: string } | undefined)?.name ||
    user?.email?.split("@")[0] ||
    "there";
  const email = user?.email ?? "";
  const avatarUrl =
    profile?.avatar_url ||
    (user?.user_metadata as { avatar_url?: string } | undefined)?.avatar_url ||
    "";
  const initial = displayName.slice(0, 1).toUpperCase();

  async function handleLogout() {
    setMenuOpen(false);
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
        <SidebarContent pathname={pathname} onLogout={handleLogout} />
      </aside>

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
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur sm:px-6">
          <button
            className="grid h-10 w-10 place-items-center rounded-lg border border-border lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="relative hidden max-w-md flex-1 md:block">
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
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-7 w-7 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {initial}
                  </span>
                )}
                <span className="hidden font-medium sm:inline">{displayName}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-popover shadow-card"
                  onMouseLeave={() => setMenuOpen(false)}
                  role="menu"
                >
                  <div className="flex items-center gap-3 border-b border-border p-3">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                        {initial}
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{displayName}</div>
                      <div className="truncate text-xs text-muted-foreground">{email}</div>
                    </div>
                  </div>
                  <MenuItem to="/app/settings" icon={UserIcon} label="My Profile" />
                  <MenuItem to="/app/settings" icon={Settings} label="Settings" />
                  <MenuItem to="/app/settings" icon={CreditCard} label="Subscription" />
                  <MenuItem to="/contact" icon={LifeBuoy} label="Help center" />
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-left text-sm text-destructive hover:bg-muted"
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

function MenuItem({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link to={to} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted">
      <Icon className="h-4 w-4 text-muted-foreground" />
      {label}
    </Link>
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
