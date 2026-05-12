import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut, Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMarketingWebsiteHomeUrl } from "@/lib/site-origin";
import { cn } from "@/lib/utils";
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
  { tab: "trading-buy", label: "Trading record — buy" },
  { tab: "trading-sell", label: "Trading record — sell" },
  { tab: "trade-order", label: "Trade order" },
  { tab: "funding-record", label: "Funding record" },
  { tab: "funding-transfer", label: "Funding transfer" },
  { tab: "help-desk", label: "Help desk" },
];

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

  return (
    <div className="min-h-screen bg-background grid-bg flex flex-col">
      <header className="border-b border-border bg-card/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <a href={getMarketingWebsiteHomeUrl()} className="shrink-0" rel="noreferrer">
              <img src={logo} alt="Hudson Crest Capital" className="h-9 w-auto" />
            </a>
            <div className="min-w-0 text-xs text-muted-foreground hidden sm:block">
              <div className="font-medium text-foreground truncate">{displayName || "Investor"}</div>
              <div className="truncate">{email}</div>
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground text-right tabular-nums">
            <div>{clock}</div>
            <div className="text-foreground/90 mt-0.5 sm:hidden truncate max-w-[200px]">{email}</div>
          </div>
        </div>
        <nav className="border-t border-border bg-surface/95">
          <div className="mx-auto max-w-6xl px-2">
            <div className="flex items-center gap-1 overflow-x-auto py-1.5 text-xs font-medium no-scrollbar">
              <Menu className="h-4 w-4 shrink-0 text-muted-foreground mx-1 sm:hidden" aria-hidden />
              {NAV.map((n) => (
                <Link
                  key={n.tab}
                  to="/portal/investor/dashboard2"
                  search={{ tab: n.tab }}
                  className={cn(
                    "shrink-0 rounded-md px-3 py-2 whitespace-nowrap transition-colors",
                    onDashboard2 && tab === n.tab
                      ? "bg-brand text-brand-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-surface-elevated",
                  )}
                >
                  {n.label}
                </Link>
              ))}
              <Link
                to="/portal/investor/settings"
                className="shrink-0 rounded-md px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-surface-elevated whitespace-nowrap"
              >
                Change password
              </Link>
              <Link
                to="/portal/investor/support"
                className="shrink-0 rounded-md px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-surface-elevated whitespace-nowrap"
              >
                Support inbox
              </Link>
              <Link
                to="/portal/investor"
                className="shrink-0 rounded-md px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-surface-elevated whitespace-nowrap"
              >
                Dashboard 1
              </Link>
              <button
                type="button"
                onClick={() => void signOut()}
                className="shrink-0 ml-auto inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-destructive hover:bg-destructive/10 whitespace-nowrap"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </div>
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>

      <footer className="border-t border-border bg-card/80 py-3 text-center text-[11px] text-muted-foreground">
        © {new Date().getFullYear()} Hudson Crest Capital. All rights reserved.
      </footer>
    </div>
  );
}
