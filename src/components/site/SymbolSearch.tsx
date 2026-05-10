import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { SYMBOL_CATALOG, type SymbolMeta } from "@/lib/symbols";

const FILTERS: { label: string; value: SymbolMeta["category"] | "All" }[] = [
  { label: "All", value: "All" },
  { label: "Stocks", value: "Stock" },
  { label: "Crypto", value: "Crypto" },
  { label: "FX", value: "FX" },
  { label: "Commodities", value: "Commodity" },
  { label: "Indices", value: "Index" },
];

export function SymbolSearch({
  className = "",
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("All");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base =
      filter === "All" ? SYMBOL_CATALOG : SYMBOL_CATALOG.filter((s) => s.category === filter);
    const list = q
      ? base.filter(
          (s) =>
            s.sym.toLowerCase().includes(q) ||
            s.name.toLowerCase().includes(q) ||
            s.slug.includes(q),
        )
      : base;
    return list.slice(0, 10);
  }, [query, filter]);

  useEffect(() => setActive(0), [query, filter]);

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Keyboard shortcut: "/" to focus
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const go = (slug: string) => {
    setOpen(false);
    setQuery("");
    onNavigate?.();
    navigate({ to: "/symbol/$slug", params: { slug } });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = results[active];
      if (pick) go(pick.slug);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 transition-colors focus-within:border-brand/50">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search symbols…"
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          aria-label="Search symbols"
        />
        {query ? (
          <button
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <kbd className="hidden md:inline rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
            /
          </kbd>
        )}
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[28rem] overflow-auto rounded-lg border border-border bg-background shadow-glow">
          <div className="flex flex-wrap gap-1.5 border-b border-border bg-surface/50 px-3 py-2">
            {FILTERS.map((f) => {
              const count =
                f.value === "All"
                  ? SYMBOL_CATALOG.length
                  : SYMBOL_CATALOG.filter((s) => s.category === f.value).length;
              const selected = filter === f.value;
              return (
                <button
                  key={f.value}
                  onClick={() => {
                    setFilter(f.value);
                    inputRef.current?.focus();
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    selected
                      ? "border-brand/50 bg-brand/10 text-brand"
                      : "border-border text-muted-foreground hover:border-brand/30 hover:text-foreground"
                  }`}
                >
                  {f.label}
                  <span
                    className={`text-[10px] ${selected ? "text-brand/80" : "text-muted-foreground/70"}`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
              No symbols match{query ? ` “${query}”` : ""} in{" "}
              {filter === "All" ? "any category" : filter}.
            </div>
          ) : (
            <ul className="py-1">
              {results.map((s, i) => (
                <li key={s.slug}>
                  <button
                    onClick={() => go(s.slug)}
                    onMouseEnter={() => setActive(i)}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                      i === active
                        ? "bg-surface text-foreground"
                        : "text-muted-foreground hover:bg-surface"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="font-bold text-foreground">{s.sym}</span>
                      <span className="truncate text-xs text-muted-foreground">{s.name}</span>
                    </div>
                    <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {s.category}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
