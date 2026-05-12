import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Clock3,
  LayoutGrid,
  LogOut,
  Mail,
  PanelLeft,
  Settings2,
  LifeBuoy,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMarketingWebsiteHomeUrl } from "@/lib/site-origin";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

export type Dashboard2Tab =
  | "profile"
  | "trading-buy"
  | "trading-sell"
  | "trade-order"
  | "funding-record"
  | "funding-transfer"
  | "help-desk";

const NAV: { tab: Dashboard2Tab; label: string }[] = [
  { tab: "profile", label: "Account profile" },
  { tab: "trading-buy", label: "Trading — buy" },
  { tab: "trading-sell", label: "Trading — sell" },
  { tab: "trade-order", label: "Trade order" },
  { tab: "funding-record", label: "Funding record" },
  { tab: "funding-transfer", label: "Funding transfer" },
  { tab: "help-desk", label: "Help desk" },
];

function initials(displayName: string, email: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
  if (parts.length === 1 && parts[0]!.length >= 2) return parts[0]!.slice(0, 2).toUpperCase();
  const e = email.trim();
  return e.length >= 2 ? e.slice(0, 2).toUpperCase() : "HC";
}

export function InvestorDashboard2Shell({
  displayName,
  email,
  children,
}: {
  displayName: string;
  email: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.search as Record<string, unknown> });
  const tab = useMemo(() => (search?.tab as string) || "profile", [search?.tab]);
  const onDashboard2 = pathname.replace(/\/+$/, "") === "/portal/investor/dashboard2";

  const [clock, setClock] = useState(() => new Date().toLocaleString());
  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date().toLocaleString()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/portal/login/investor" });
  };

  const av = initials(displayName, email);

  return (
    <div className="relative min-h-screen bg-background flex flex-col">
      {/* Ambient depth */}
      <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-b from-brand/12 via-brand/[0.04] to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-surface/30 via-transparent to-background" />
      </div>

      <header className="sticky top-0 z-40 border-b border-border/60 bg-card/85 backdrop-blur-xl shadow-sm shadow-black/5">
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-brand/70 to-transparent opacity-90" />

        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <a
              href={getMarketingWebsiteHomeUrl()}
              className="group shrink-0 rounded-lg p-1 ring-1 ring-border/50 transition-shadow hover:ring-brand/25"
              rel="noreferrer"
            >
              <img src={logo} alt="Hudson Crest Capital" className="h-9 w-auto" />
            </a>

            <div className="hidden h-10 w-px bg-border/70 sm:block" aria-hidden />

            <div className="flex min-w-0 items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand/25 to-brand/5 text-sm font-bold tracking-tight text-brand ring-1 ring-brand/20"
                aria-hidden
              >
                {av}
              </div>
              <div className="min-w-0 hidden sm:block">
                <p className="truncate text-sm font-semibold text-foreground">
                  {displayName?.trim() || "Investor"}
                </p>
                <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                  <Mail className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                  <span className="truncate">{email}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-surface/50 px-3 py-2 text-right tabular-nums shadow-inner">
            <Clock3 className="h-4 w-4 shrink-0 text-brand/80" aria-hidden />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Session time
              </p>
              <p className="text-xs font-medium text-foreground">{clock}</p>
            </div>
          </div>
        </div>

        <nav className="border-t border-border/40 bg-gradient-to-b from-muted/25 to-muted/[0.07]">
          <div className="mx-auto max-w-6xl px-3 pb-3 pt-2 sm:px-5">
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border/50 bg-card/60 p-1.5 shadow-inner ring-1 ring-black/[0.02] dark:ring-white/[0.04]">
              <span className="hidden items-center gap-1 px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground sm:inline-flex">
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
                Desk
              </span>
              <div className="hidden h-6 w-px bg-border/80 sm:block" aria-hidden />

              {NAV.map((n) => (
                <Link
                  key={n.tab}
                  to="/portal/investor/dashboard2"
                  search={{ tab: n.tab }}
                  className={cn(
                    "shrink-0 rounded-lg px-3 py-2 text-xs font-semibold tracking-wide transition-all duration-200",
                    onDashboard2 && tab === n.tab
                      ? "bg-gradient-brand text-brand-foreground shadow-md shadow-brand/20 ring-1 ring-brand/30"
                      : "text-muted-foreground hover:bg-background/90 hover:text-foreground hover:shadow-sm",
                  )}
                >
                  {n.label}
                </Link>
              ))}

              <div className="mx-1 hidden h-6 w-px bg-border/80 md:block" aria-hidden />

              <Link
                to="/portal/investor/settings"
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-background/90 hover:text-foreground",
                )}
              >
                <Settings2 className="h-3.5 w-3.5 opacity-80" aria-hidden />
                <span className="hidden lg:inline">Password</span>
                <span className="lg:hidden">Settings</span>
              </Link>
              <Link
                to="/portal/investor/support"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-background/90 hover:text-foreground"
              >
                <LifeBuoy className="h-3.5 w-3.5 opacity-80" aria-hidden />
                <span className="hidden sm:inline">Support</span>
              </Link>
              <Link
                to="/portal/investor"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-background/90 hover:text-foreground"
              >
                <PanelLeft className="h-3.5 w-3.5 opacity-80" aria-hidden />
                <span className="hidden sm:inline">Classic view</span>
                <span className="sm:hidden">V1</span>
              </Link>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="ml-auto shrink-0 gap-1.5 border-destructive/25 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => void signOut()}
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </Button>
            </div>
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>

      <footer className="mt-auto border-t border-border/50 bg-card/40 py-4 text-center">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground">
          © {new Date().getFullYear()}{" "}
          <span className="text-foreground/80">Hudson Crest Capital</span>
          <span className="mx-2 text-border">·</span>
          <span className="opacity-90">Investor services desk</span>
        </p>
      </footer>
    </div>
  );
}
