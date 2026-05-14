import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowLeftRight,
  Banknote,
  ChevronDown,
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
import { cn } from "@/lib/utils";

function deriveInitials(displayName: string, email: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
  }
  if (parts.length === 1 && parts[0]!.length >= 2) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  const e = email.trim();
  return e.length >= 2 ? e.slice(0, 2).toUpperCase() : "HC";
}

/**
 * IG-style account dropdown shown in the top-right of every portal page.
 * Trigger: avatar + display name + role subtitle + chevron.
 * Menu: identity header, role pill, sign-out action.
 */
function AccountMenu({
  displayName,
  email,
  roleLabel,
  roleTone,
  onLogout,
}: {
  displayName: string;
  email: string;
  roleLabel: string;
  roleTone: "investor" | "admin";
  onLogout: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initials = deriveInitials(displayName, email);
  const pretty = displayName.trim() || email.split("@")[0] || "Account";
  const subtitle = email || roleLabel;
  const roleClass =
    roleTone === "admin"
      ? "border-destructive/40 text-destructive bg-destructive/10"
      : "border-brand/40 text-brand bg-brand/10";

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-2 rounded-md border border-border bg-surface/60 px-2.5 py-1.5 text-sm transition-colors",
          "hover:bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-brand/40",
        )}
      >
        <span
          aria-hidden
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand/30 to-brand/10 text-[11px] font-bold tracking-tight text-brand ring-1 ring-brand/20"
        >
          {initials}
        </span>
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block max-w-[160px] truncate text-xs font-semibold leading-tight text-foreground">
            {pretty}
          </span>
          <span className="block max-w-[160px] truncate text-[10px] leading-tight text-muted-foreground">
            {subtitle}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-lg border border-border bg-card shadow-xl"
        >
          <div className="border-b border-border bg-surface/40 px-4 py-3">
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand/30 to-brand/10 text-sm font-bold tracking-tight text-brand ring-1 ring-brand/20"
              >
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{pretty}</p>
                <p className="truncate text-xs text-muted-foreground">{email || "—"}</p>
              </div>
            </div>
            <span
              className={cn(
                "mt-3 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                roleClass,
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {roleLabel}
            </span>
          </div>
          <div className="p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void onLogout();
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>Log out</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export type NavItem = {
  to: string;
  label: string;
  /** Optional icon (IG-style rail) — shown before the label when set. */
  icon?: LucideIcon;
  openInNewWindow?: boolean;
  /**
   * Render at the bottom of the sidebar using regular nav styling. Used today
   * for Support + Settings so they sit underneath the main navigation list
   * (with a divider) without changing visual treatment.
   */
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
  const [who, setWho] = useState<{ displayName: string; email: string }>({
    displayName: "",
    email: "",
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    document.documentElement.lang = "en";
    try {
      window.localStorage.removeItem("portal:lang");
    } catch {
      /* ignore */
    }
  }, []);

  // Resolve the current user once per mount so the account menu can show
  // a display name and email without callers having to plumb props.
  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const u = data.session?.user;
      const meta = u?.user_metadata as Record<string, string | undefined> | undefined;
      const dn =
        meta?.full_name?.trim() ||
        meta?.display_name?.trim() ||
        [meta?.first_name, meta?.last_name].filter(Boolean).join(" ").trim() ||
        [meta?.legal_first_name, meta?.legal_last_name].filter(Boolean).join(" ").trim() ||
        u?.email?.split("@")[0] ||
        "";
      setWho({ displayName: dn, email: u?.email ?? "" });
    });
    return () => {
      cancelled = true;
    };
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
                const Icon = item.icon;
                const rowClass = Icon ? "flex w-full min-w-0 items-center gap-2.5" : "";
                const active =
                  pathname === item.to || pathname.startsWith(item.to + "/");
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    target={item.openInNewWindow ? "_blank" : undefined}
                    rel={item.openInNewWindow ? "noopener noreferrer" : undefined}
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
          </div>
        ) : null}
      </aside>

      <div className="flex flex-col">
        <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-background/60 backdrop-blur">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <AccountMenu
            displayName={who.displayName}
            email={who.email}
            roleLabel={badge.label}
            roleTone={badge.tone}
            onLogout={logout}
          />
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
  className,
}: {
  title: string;
  description?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("surface-card p-5 sm:p-6", className)}>
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
  { to: "/portal/investor/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/portal/investor/kyc", label: "KYC", icon: ShieldCheck },
  { to: "/portal/investor/profile", label: "Profile", icon: UserCircle },
  { to: "/portal/investor/support", label: "Support", icon: LifeBuoy, pinBelow: true },
  { to: "/portal/investor/settings", label: "Settings", icon: Settings, pinBelow: true },
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
