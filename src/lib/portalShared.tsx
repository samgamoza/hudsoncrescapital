import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Globe, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

const LANGS = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
  { code: "ar", label: "العربية" },
];

function LanguageSwitcher() {
  const [lang, setLang] = useState<string>(
    () => (typeof window !== "undefined" && window.localStorage.getItem("portal:lang")) || "en",
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("portal:lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);
  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded-md px-2 py-1.5">
      <Globe className="h-3.5 w-3.5" />
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        className="bg-transparent text-foreground focus:outline-none"
        aria-label="Language"
      >
        {LANGS.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export type NavItem = {
  to: string;
  label: string;
  openInNewWindow?: boolean;
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

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/portal/login" });
  };

  return (
    <div className="min-h-screen bg-background grid grid-cols-1 md:grid-cols-[260px_1fr]">
      <aside className="border-r border-border bg-surface/40 p-5 flex flex-col gap-2">
        <Link to="/" className="flex items-center gap-2 mb-6">
          <img src={logo} alt="Hudson Crest" className="h-9 w-auto" />
        </Link>
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{title}</div>
        {nav.map((item) => {
          const isRoot = item.to === "/portal/investor" || item.to === "/portal/admin";
          if (item.openInNewWindow) {
            return (
              <Link
                key={item.to}
                to={item.to}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-lg text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-surface-elevated"
              >
                {item.label}
              </Link>
            );
          }
          const active = pathname === item.to || (!isRoot && pathname.startsWith(item.to + "/"));
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-brand/15 text-foreground border border-brand/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-elevated"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
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
            <LanguageSwitcher />
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

export function DataTable<T extends Record<string, any>>({
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
  { to: "/portal/investor", label: "Dashboard" },
  { to: "/portal/trade-workspace", label: "Trade", openInNewWindow: true },
  { to: "/portal/investor/portfolio", label: "Portfolio" },
  { to: "/portal/investor/performance", label: "Performance" },
  { to: "/portal/investor/trade-history", label: "Trade history" },
  { to: "/portal/investor/wallet", label: "Wallet" },
  { to: "/portal/investor/transactions", label: "Transactions" },
  { to: "/portal/investor/kyc", label: "KYC" },
  { to: "/portal/investor/profile", label: "Profile" },
  { to: "/portal/investor/support", label: "Support" },
  { to: "/portal/investor/settings", label: "Settings" },
];

export const NAV_ADMIN: NavItem[] = [
  { to: "/portal/admin", label: "Trading" },
  { to: "/portal/admin/clients", label: "Clients" },
  { to: "/portal/admin/trade-history", label: "Trade history" },
  { to: "/portal/admin/onboarding", label: "Open Account" },
  { to: "/portal/admin/funding", label: "Funding Review" },
  { to: "/portal/admin/strategies", label: "Strategies" },
  { to: "/portal/admin/risk", label: "Risk" },
  { to: "/portal/admin/global-desk", label: "Global Desk" },
  { to: "/portal/admin/admins", label: "Admins" },
  { to: "/portal/admin/audit", label: "Audit Log" },
];
