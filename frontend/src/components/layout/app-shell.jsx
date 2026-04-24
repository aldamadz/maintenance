import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Activity,
  ChevronRight,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  MoonStar,
  SunMedium,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { LoginDialog } from "@/components/auth/login-dialog";
import { useAuth } from "@/components/auth/auth-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme/theme-provider";

const navigation = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Data Maintenance",
    href: "/maintenance",
    icon: Wrench,
  },
];

export function AppShell({ children }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { user, isAuthenticated, signOut } = useAuth();

  const activeItem = useMemo(
    () => navigation.find((item) => item.href === location.pathname),
    [location.pathname],
  );

  return (
    <div className="min-h-screen">
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-80 border-r border-border/70 bg-card/90 p-6 backdrop-blur xl:static xl:block",
            mobileOpen ? "block" : "hidden xl:block",
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                IT Support
              </p>
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
                Maintenance Hub
              </h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="xl:hidden"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="mt-8 rounded-3xl bg-secondary/70 p-5 text-secondary-foreground">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary p-3 text-primary-foreground">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Operasional Harian</p>
                <p className="text-xs opacity-80">
                  Pantau maintenance perangkat dan distribusi beban kerja tim.
                </p>
              </div>
            </div>
          </div>

          <nav className="mt-8 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto hidden xl:block" />

          <div className="mt-10 rounded-3xl border border-border/70 bg-muted/40 p-5">
            <p className="text-sm font-semibold">Tema tampilan</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {["light", "dark", "system"].map((value) => (
                <Button
                  key={value}
                  variant={theme === value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme(value)}
                >
                  {value === "light" ? (
                    <SunMedium className="h-4 w-4" />
                  ) : value === "dark" ? (
                    <MoonStar className="h-4 w-4" />
                  ) : (
                    <Activity className="h-4 w-4" />
                  )}
                  {value}
                </Button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Mode aktif: <span className="font-medium">{resolvedTheme}</span>
            </p>
          </div>
        </aside>

        {mobileOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-slate-950/50 xl:hidden"
            onClick={() => setMobileOpen(false)}
          />
        ) : null}

        <main className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur">
            <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="xl:hidden"
                  onClick={() => setMobileOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                    Sistem Maintenance
                  </p>
                  <h2 className="text-lg font-bold tracking-tight">
                    {activeItem?.label || "Dashboard"}
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">
                  React + Supabase
                </div>
                {isAuthenticated ? (
                  <>
                    <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm md:inline-flex">
                      <UserRound className="h-4 w-4 text-primary" />
                      <span className="max-w-52 truncate">{user?.email}</span>
                    </div>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        const { error } = await signOut();
                        if (error) {
                          console.error(error);
                        }
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setLoginOpen(true)}>
                    <LogIn className="h-4 w-4" />
                    Login
                  </Button>
                )}
              </div>
            </div>
          </header>

          <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
