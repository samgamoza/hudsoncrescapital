import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Menu, X, Lock, ChevronDown, UserPlus } from "lucide-react";
import logo from "@/assets/logo.png";
import { SymbolSearch } from "./SymbolSearch";

type NavItem = { to: string; label: string };

const PRIMARY_NAV: NavItem[] = [
  { to: "/about", label: "About" },
  { to: "/approach", label: "Approach" },
  { to: "/strategies", label: "Strategies" },
  { to: "/technology", label: "Technology" },
  { to: "/contact", label: "Contact" },
];

const MORE_NAV: NavItem[] = [
  { to: "/global-desks", label: "Global Desks" },
  { to: "/markets", label: "Live Markets" },
  { to: "/performance", label: "Performance" },
  { to: "/insights", label: "Insights" },
  { to: "/careers", label: "Careers" },
];

const ALL_NAV: NavItem[] = [...PRIMARY_NAV, ...MORE_NAV];

export function Header() {
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const onClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMoreOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  return (
    <header className="relative z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-24 max-w-7xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
        <Link
          to="/"
          className="flex min-w-0 max-w-[min(100%,11rem)] items-center gap-2 sm:max-w-none"
        >
          <img
            src={logo}
            alt="Hudson Crest Capital"
            className="h-10 w-full max-h-12 object-contain object-left sm:h-12 sm:w-auto md:h-14"
          />
        </Link>

        <nav className="hidden lg:flex items-center gap-6 xl:gap-7">
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-brand" }}
            >
              {item.label}
            </Link>
          ))}

          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={moreOpen}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              More
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${moreOpen ? "rotate-180" : ""}`}
              />
            </button>
            {moreOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-3 w-52 overflow-hidden rounded-lg border border-border bg-surface shadow-elevated"
              >
                {MORE_NAV.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMoreOpen(false)}
                    className="block px-4 py-2.5 text-sm text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
                    activeProps={{ className: "text-brand" }}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 md:gap-3">
          <SymbolSearch className="hidden xl:block w-56 xl:w-64" />
          <Link
            to="/portal/signup/investor"
            aria-label="Sign up"
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-background px-2 py-2 text-xs font-medium text-foreground transition-colors hover:bg-surface-elevated sm:gap-1.5 sm:px-2.5 sm:text-sm md:px-3"
          >
            <UserPlus className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="whitespace-nowrap">Signup</span>
          </Link>
          <Link
            to="/portal/login/investor"
            aria-label="Login"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-surface-elevated sm:gap-2 sm:px-3 sm:text-sm md:px-4"
          >
            <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="whitespace-nowrap">Login</span>
          </Link>
          <button
            className="shrink-0 lg:hidden rounded-md border border-border p-2 text-foreground"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border bg-background">
          <nav className="mx-auto flex max-w-7xl flex-col px-6 py-4">
            <SymbolSearch className="mb-3 md:hidden" onNavigate={() => setOpen(false)} />
            <div className="mb-2 flex flex-col gap-2">
              <Link
                to="/portal/signup/investor"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground hover:bg-surface-elevated"
              >
                <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
                Signup
              </Link>
              <Link
                to="/portal/login/investor"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-medium text-foreground hover:bg-surface-elevated"
              >
                <Lock className="h-4 w-4 shrink-0" aria-hidden />
                Login
              </Link>
            </div>
            {ALL_NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="py-3 text-sm text-muted-foreground hover:text-foreground"
                activeProps={{ className: "text-brand" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
