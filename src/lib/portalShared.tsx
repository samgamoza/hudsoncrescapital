import { useEffect, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowLeftRight,
  Banknote,
  ChartCandlestick,
  ClipboardList,
  ExternalLink,
  Globe2,
  History,
  LayoutDashboard,
  LifeBuoy,
  LineChart,
  LogOut,
  PieChart,
  ScrollText,
  Settings,
  Shield,
  ShieldCheck,
  Target,
  UserCircle,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";
import { getMarketingWebsiteHomeUrl } from "@/lib/site-origin";

export type NavItem = {
  to: string;
  label: string;
  /** Optional icon (IG-style rail) — shown before the label when set. */
  icon?: LucideIcon;
  openInNewWindow?: boolean;
  /** Render below other links with CTA styling (e.g. Open Platform). */
  pinBelow?: boolean;
};

export function PortalShell({
  title,
  nav,
  badge,
  children,
}: {
  title: string;
  nav: NavItem[];
  badge: { label: string; tone: "investor" | "admin" };
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (typeof window === "undefined") return;
    document.documentElement.lang = "en";
    try {
      window.localStorage.removeItem("portal:lang");
    } catch {
      /* ignore */
    }
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/portal/login" });
  };

  return (
    <div className="min-h-screen bg-background grid grid-cols-1 md:grid-cols-[260px_1fr]">
      <aside className="border-r border-border bg-surface/40 p-5 flex flex-col gap-2 md:min-h-screen">
        <a href={getMarketingWebsiteHomeUrl()} className="flex items-center gap-2 mb-6" rel="noreferrer">
          <img src={logo} alt="Hudson Crest" className="h-9 w-auto" />
        </a>
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{title}</div>
        {nav
          .filter((item) => !item.pinBelow)
          .map((item) => {
            const isRoot = item.to === "/portal/investor" || item.to === "/portal/admin";
            const Icon = item.icon;
            const rowClass = Icon ? "flex w-full min-w-0 items-center gap-2.5" : "";
            if (item.openInNewWindow) {
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-3 py-2 rounded-lg text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-surface-elevated ${rowClass}`}
                >
                  {Icon ? <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden /> : null}
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            }
            const active = pathname === item.to || (!isRoot && pathname.startsWith(item.to + "/"));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${rowClass} ${
                  active
                    ? "bg-brand/15 text-foreground border border-brand/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-elevated"
                }`}
              >
                {Icon ? (
                  <Icon
                    className={`h-4 w-4 shrink-0 ${active ? "text-brand opacity-95" : "opacity-80"}`}
                    aria-hidden
                  />
                ) : null}
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        {nav.some((i) => i.pinBelow) ? (
          <div className="mt-auto pt-6 border-t border-border space-y-2">
            {nav
              .filter((item) => item.pinBelow)
              .map((item) => {
                const PinIcon = item.icon ?? ExternalLink;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    target={item.openInNewWindow ? "_blank" : undefined}
                    rel={item.openInNewWindow ? "noopener noreferrer" : undefined}
                    className="flex min-w-0 items-center justify-center gap-2 rounded-xl bg-gradient-brand px-4 py-3 text-sm font-semibold text-brand-foreground shadow-glow transition-opacity hover:opacity-95 border border-brand/30"
                  >
                    <PinIcon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
          </div>
        ) : null}
      </aside>

      <div className="flex flex-col">
        <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-background/60 backdrop-blur">
          <span
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${
              badge.tone === "admin"
                ? "border-destructive/40 text-destructive bg-destructive/10"
                : "border-brand/40 text-brand bg-brand/10"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {badge.label}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-md px-3 py-1.5"
            >
              <LogOut className="h-3.5 w-3.5" /> Logout
            </button>
          </div>
        </header>
        <main className="p-6 lg:p-8 flex flex-col gap-6">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h1 className="text-2xl lg:text-3xl font-semibold text-foreground">{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}

export function MetricCard({
  title,
  value,
  helper,
  tone,
}: {
  title: string;
  value: string;
  helper?: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  const toneClass =
    tone === "positive" ? "text-success" : tone === "negative" ? "text-danger" : "text-foreground";
  return (
    <div className="surface-card p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</div>
      {helper && <div className="mt-1 text-xs text-muted-foreground">{helper}</div>}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  right,
  children,
}: {
  title: string;
  description?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="surface-card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </div>
        {right && <div className="flex-shrink-0">{right}</div>}
      </div>
      {children}
    </div>
  );
}

export function DataTable<T extends Record<string, unknown>>({
  rows,
  columns,
}: {
  rows: T[];
  columns: { key: string; label: string; render?: (row: T) => ReactNode }[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
            {columns.map((c) => (
              <th key={c.key} className="py-2 pr-4 font-medium">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border/50 hover:bg-surface-elevated/40">
              {columns.map((c) => (
                <td key={c.key} className="py-3 pr-4 text-foreground">
                  {c.render ? c.render(row) : (row[c.key] as ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const NAV_INVESTOR: NavItem[] = [
  { to: "/portal/investor", label: "Dashboard", icon: LayoutDashboard },
  { to: "/portal/investor/portfolio", label: "Portfolio", icon: PieChart },
  { to: "/portal/investor/performance", label: "Performance", icon: LineChart },
  { to: "/portal/investor/trade-history", label: "Trade history", icon: History },
  { to: "/portal/investor/wallet", label: "Wallet", icon: Wallet },
  { to: "/portal/investor/apply", label: "Open account", icon: ClipboardList },
  { to: "/portal/investor/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/portal/investor/kyc", label: "KYC", icon: ShieldCheck },
  { to: "/portal/investor/profile", label: "Profile", icon: UserCircle },
  { to: "/portal/investor/support", label: "Support", icon: LifeBuoy },
  { to: "/portal/investor/settings", label: "Settings", icon: Settings },
  {
    to: "/portal/trade-workspace",
    label: "Open Platform",
    icon: ChartCandlestick,
    openInNewWindow: true,
    pinBelow: true,
  },
];

export const NAV_ADMIN: NavItem[] = [
  { to: "/portal/admin", label: "Trading", icon: LayoutDashboard },
  { to: "/portal/admin/settings", label: "Settings", icon: Settings },
  { to: "/portal/admin/clients", label: "Clients", icon: Users },
  { to: "/portal/admin/trade-history", label: "Trade history", icon: History },
  { to: "/portal/admin/onboarding", label: "Open Account", icon: UserPlus },
  { to: "/portal/admin/funding", label: "Funding Review", icon: Banknote },
  { to: "/portal/admin/strategies", label: "Strategies", icon: Target },
  { to: "/portal/admin/risk", label: "Risk", icon: AlertTriangle },
  { to: "/portal/admin/global-desk", label: "Global Desk", icon: Globe2 },
  { to: "/portal/admin/admins", label: "Admins", icon: Shield },
  { to: "/portal/admin/audit", label: "Audit Log", icon: ScrollText },
];
