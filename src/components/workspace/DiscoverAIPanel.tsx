import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  ChevronRight,
  Loader2,
  Minus,
  Share2,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { DiscoverFeedCategory, DiscoverFeedItem } from "@/server/discover-ai-feed";
import type { AssetListing, AssetListingsResponse } from "@/lib/asset-listings.types";
import {
  displayNameOfAsset,
  displaySymbolOfAsset,
  isDirectlyTradableAsset,
} from "@/lib/asset-listings.types";
import { buildInsightPack, buildListingReason } from "@/lib/discover-theme-insights";
import { cn } from "@/lib/utils";

type ThemeChip = {
  label: string;
  category?: DiscoverFeedCategory;
  keywords?: RegExp;
};

const THEME_CHIPS: ThemeChip[] = [
  {
    label: "Gold producers and bullion",
    keywords: /\b(gold|silver|bullion|mining|miner|precious)\b/i,
  },
  {
    label: "Ageing population",
    keywords: /\b(health|healthcare|biotech|medicare|senior|retirement|ageing)\b/i,
  },
  {
    label: "Weight loss and health revolution",
    keywords: /\b(weight|obesity|glp|wegovy|ozempic|wellness|health)\b/i,
  },
  { label: "Nuclear energy renaissance", keywords: /\b(nuclear|uranium|reactor|smr|atomic)\b/i },
  {
    label: "Robots in every home",
    keywords: /\b(robot|automation|humanoid|nvidia|semiconductor|chip)\b/i,
  },
  {
    label: "Streaming and entertainment dominance",
    keywords: /\b(stream|netflix|disney|media|entertainment|spotify)\b/i,
  },
  {
    label: "Medical devices and diagnostics",
    keywords: /\b(medical|device|diagnostic|medtech|fda)\b/i,
  },
  { label: "Dollar, rates & FX", category: "forex" },
  { label: "Digital assets", category: "crypto" },
  { label: "M&A and deal flow", category: "merger" },
];

function tokenFilter(headline: string, idea: string): boolean {
  const q = idea.trim().toLowerCase();
  if (!q) return true;
  const tokens = q.split(/\s+/).filter((t) => t.length > 1);
  if (!tokens.length) return true;
  const h = headline.toLowerCase();
  return tokens.every((t) => h.includes(t));
}

function sortDiscoverListings(rows: AssetListing[], idea: string): AssetListing[] {
  const scored = rows.map((r) => {
    let s = 0;
    if (isDirectlyTradableAsset(r)) s += 4;
    if (["shares", "etfs"].includes(r.asset_class)) s += 2;
    const blob = `${displayNameOfAsset(r)} ${displaySymbolOfAsset(r)}`.toLowerCase();
    const words = idea
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 1);
    for (const w of words) {
      if (blob.includes(w)) s += 3;
    }
    return { r, s };
  });
  scored.sort((a, b) => b.s - a.s);
  return scored.map((x) => x.r);
}

export function DiscoverAIPanel({
  onClose,
  selectedListingId = null,
  onSelectListing,
}: {
  onClose: () => void;
  /** When embedded with a trading rail, highlights the active row. */
  selectedListingId?: number | null;
  onSelectListing?: (asset: AssetListing) => void;
}) {
  const [idea, setIdea] = useState("");
  const [submittedIdea, setSubmittedIdea] = useState("");
  const [feedCategory, setFeedCategory] = useState<DiscoverFeedCategory>("general");
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const [rawItems, setRawItems] = useState<DiscoverFeedItem[]>([]);
  const [chipKeyword, setChipKeyword] = useState<RegExp | null>(null);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<"finnhub" | "alphavantage" | null>(null);

  const [listingRows, setListingRows] = useState<AssetListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingsError, setListingsError] = useState<string | null>(null);

  const loadNews = useCallback(async (category: DiscoverFeedCategory) => {
    setNewsLoading(true);
    setNewsError(null);
    try {
      const res = await fetch(
        `/api/public/discover-ai-feed?category=${encodeURIComponent(category)}`,
      );
      const body = (await res.json().catch(() => ({}))) as {
        items?: DiscoverFeedItem[];
        dataSource?: "finnhub" | "alphavantage" | null;
        error?: string | null;
      };
      if (!res.ok) {
        setRawItems([]);
        setDataSource(null);
        setNewsError(
          typeof body.error === "string" ? body.error : `Request failed (${res.status})`,
        );
        return;
      }
      setRawItems(Array.isArray(body.items) ? body.items : []);
      setDataSource(body.dataSource ?? null);
      if (body.error && (!body.items || body.items.length === 0)) {
        setNewsError(body.error);
      } else {
        setNewsError(
          typeof body.error === "string" && body.items?.length === 0 ? body.error : null,
        );
      }
    } catch (e: unknown) {
      setRawItems([]);
      setDataSource(null);
      setNewsError(e instanceof Error ? e.message : "Could not load news");
    } finally {
      setNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNews(feedCategory);
  }, [feedCategory, loadNews]);

  useEffect(() => {
    const id = window.setInterval(() => void loadNews(feedCategory), 180_000);
    return () => window.clearInterval(id);
  }, [feedCategory, loadNews]);

  useEffect(() => {
    const q = submittedIdea.trim();
    if (!q) {
      setListingRows([]);
      setListingsError(null);
      return;
    }
    let cancelled = false;
    setListingsLoading(true);
    setListingsError(null);
    void (async () => {
      try {
        const res = await fetch("/api/portal/asset-listings", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: q,
            assetClass: "all",
            assetType: "",
            exchange: "",
            category: "",
            subCategory: "",
            issuer: "",
            settlementType: "",
            etfOnly: false,
            activeOnly: true,
            limit: 40,
          }),
        });
        const body = (await res.json().catch(() => ({}))) as Partial<AssetListingsResponse> & {
          error?: string;
        };
        if (!res.ok) {
          if (!cancelled) {
            setListingRows([]);
            setListingsError(body.error ?? `Listings failed (${res.status})`);
          }
          return;
        }
        const rows = Array.isArray(body.rows) ? body.rows : [];
        if (!cancelled) setListingRows(sortDiscoverListings(rows, q).slice(0, 14));
      } catch (e: unknown) {
        if (!cancelled) {
          setListingRows([]);
          setListingsError(e instanceof Error ? e.message : "Could not load listings");
        }
      } finally {
        if (!cancelled) setListingsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [submittedIdea]);

  const displayedNews = useMemo(() => {
    let list = rawItems;
    if (chipKeyword) list = list.filter((x) => chipKeyword.test(x.headline));
    if (submittedIdea.trim()) list = list.filter((x) => tokenFilter(x.headline, submittedIdea));
    return list;
  }, [rawItems, chipKeyword, submittedIdea]);

  const insightPack = useMemo(() => buildInsightPack(submittedIdea), [submittedIdea]);

  const quickPick = useMemo(() => {
    if (!listingRows.length) return null;
    const trad = listingRows.find((r) => isDirectlyTradableAsset(r));
    return trad ?? listingRows[0];
  }, [listingRows]);

  const onChip = (chip: ThemeChip) => {
    setActiveChip(chip.label);
    setSubmittedIdea("");
    setIdea("");
    if (chip.category) {
      setChipKeyword(null);
      setFeedCategory(chip.category);
    } else {
      setFeedCategory("general");
      setChipKeyword(chip.keywords ?? null);
      if (!chip.keywords) void loadNews("general");
    }
  };

  const clearThemes = () => {
    setActiveChip(null);
    setChipKeyword(null);
    setFeedCategory("general");
  };

  const runIdeaSearch = () => {
    const v = idea.trim();
    if (!v) {
      toast.error("Enter a market idea (for example Gold or AI chips).");
      return;
    }
    setSubmittedIdea(v);
    setActiveChip(null);
    setChipKeyword(null);
    setFeedCategory("general");
    void loadNews("general");
  };

  const addToWorkspace = async () => {
    const url =
      typeof window !== "undefined" ? `${window.location.origin}/portal/trade-workspace` : "";
    const text = [idea.trim() && `Idea: ${idea.trim()}`, url].filter(Boolean).join("\n");
    try {
      await navigator.clipboard.writeText(text || url);
      toast.success("Copied workspace link to clipboard.");
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const searchActive = submittedIdea.trim().length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className="h-5 w-5 shrink-0 text-violet-500" aria-hidden />
          <h1 className="text-base font-semibold tracking-tight text-foreground md:text-lg">
            DiscoverAI
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => void addToWorkspace()}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-surface-elevated"
          >
            <Share2 className="h-3.5 w-3.5" aria-hidden />
            Add to workspace
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
            aria-label="Close DiscoverAI"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-3xl space-y-8">
          <div className="mx-auto max-w-2xl text-center space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              AI-powered market discovery
            </p>
            <p className="text-sm text-muted-foreground md:text-base">
              Type a theme (for example <span className="text-foreground/90">Gold</span>). We
              combine live headlines with searchable listings — pick a row to open the deal ticket
              on wide screens.
            </p>
          </div>

          <div className="mx-auto max-w-2xl">
            <div
              className={cn(
                "flex rounded-full border bg-surface/60 shadow-sm transition-shadow",
                searchActive
                  ? "border-violet-500/60 ring-2 ring-violet-500/20"
                  : "border-border focus-within:border-brand/40 focus-within:ring-1 focus-within:ring-brand/20",
              )}
            >
              <input
                type="search"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") runIdeaSearch();
                }}
                placeholder="Type a market idea"
                className="min-w-0 flex-1 rounded-full bg-transparent px-5 py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                aria-label="Market idea search"
              />
              <button
                type="button"
                onClick={runIdeaSearch}
                className="m-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground hover:opacity-90"
                aria-label="Run discovery"
              >
                {listingsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              {dataSource === "finnhub" && "News: Finnhub market feed."}
              {dataSource === "alphavantage" && "News: Alpha Vantage."}
              {!dataSource &&
                !newsLoading &&
                "Add FINNHUB_API_KEY or ALPHA_VANTAGE_API_KEY for live headlines."}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {THEME_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => onChip(chip)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-left text-xs transition-colors md:text-sm",
                  activeChip === chip.label
                    ? "border-violet-500/50 bg-violet-500/10 text-foreground"
                    : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                {chip.label}
              </button>
            ))}
            {(activeChip || chipKeyword || feedCategory !== "general") && (
              <button
                type="button"
                onClick={clearThemes}
                className="rounded-full border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-surface-elevated md:text-sm"
              >
                Clear themes
              </button>
            )}
          </div>

          {searchActive ? (
            <>
              {quickPick ? (
                <section>
                  <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Quick link
                  </h2>
                  <button
                    type="button"
                    onClick={() => onSelectListing?.(quickPick)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3 text-left shadow-sm transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">
                        {displayNameOfAsset(quickPick)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {displaySymbolOfAsset(quickPick)}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  </button>
                </section>
              ) : null}

              {insightPack ? (
                <section className="rounded-xl border border-border bg-background p-4 shadow-sm md:p-5">
                  <div className="flex gap-2">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" aria-hidden />
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {insightPack.intro}
                    </p>
                  </div>
                  <h3 className="mt-4 text-base font-semibold tracking-tight text-foreground">
                    {insightPack.title}
                  </h3>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                    {insightPack.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Relevant markets
                  </h2>
                  {listingsLoading ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading…
                    </span>
                  ) : null}
                </div>
                {listingsError ? (
                  <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-3 text-sm text-amber-800 dark:text-amber-200">
                    {listingsError}
                  </p>
                ) : listingRows.length === 0 && !listingsLoading ? (
                  <p className="text-sm text-muted-foreground">
                    No listings matched this search. Try another keyword or browse the Search tab
                    catalog.
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-border bg-background shadow-sm">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          <th className="px-3 py-2.5">Market</th>
                          <th className="px-3 py-2.5">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {listingRows.map((row) => {
                          const active = selectedListingId != null && row.id === selectedListingId;
                          return (
                            <tr key={row.id} className="border-b border-border/60 last:border-0">
                              <td className="p-0">
                                <button
                                  type="button"
                                  onClick={() => onSelectListing?.(row)}
                                  className={cn(
                                    "flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors",
                                    active ? "bg-violet-500/10" : "hover:bg-muted/50",
                                  )}
                                >
                                  <Activity
                                    className="h-4 w-4 shrink-0 text-brand opacity-80"
                                    aria-hidden
                                  />
                                  <span className="min-w-0 flex-1">
                                    <span className="block font-medium text-foreground leading-tight">
                                      {displayNameOfAsset(row)}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {displaySymbolOfAsset(row)} · {row.asset_class}
                                    </span>
                                  </span>
                                  <ChevronRight
                                    className="h-4 w-4 shrink-0 text-muted-foreground"
                                    aria-hidden
                                  />
                                </button>
                              </td>
                              <td className="px-3 py-2.5 align-top text-xs leading-snug text-muted-foreground">
                                {buildListingReason(row, submittedIdea)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          ) : null}

          <section>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                From the news
              </h2>
              <span className="text-[10px] text-muted-foreground capitalize">
                {feedCategory.replace("_", " ")}
              </span>
            </div>

            {newsLoading && rawItems.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading live headlines…
              </div>
            ) : newsError && displayedNews.length === 0 ? (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-4 text-sm text-amber-800 dark:text-amber-200">
                {newsError}
              </p>
            ) : displayedNews.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {searchActive
                  ? "No headlines match this theme right now. Try another keyword or pick a news category chip."
                  : "Enter a market idea above to filter headlines and load matching listings."}
              </p>
            ) : (
              <ul className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border bg-surface/20">
                {displayedNews.map((item, idx) => (
                  <li key={`${item.url}-${idx}`}>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex gap-3 px-3 py-3.5 text-left transition-colors hover:bg-surface-elevated/50"
                    >
                      <span className="mt-0.5 shrink-0" aria-hidden>
                        {item.bullish === true ? (
                          <TrendingUp className="h-4 w-4 text-violet-500" />
                        ) : item.bullish === false ? (
                          <TrendingDown className="h-4 w-4 text-violet-400/80" />
                        ) : (
                          <Minus className="h-4 w-4 text-muted-foreground" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="text-sm font-medium leading-snug text-foreground">
                          {item.headline}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                          <span>{item.source}</span>
                          {item.datetime ? (
                            <time dateTime={item.datetime}>
                              {new Date(item.datetime).toLocaleString()}
                            </time>
                          ) : null}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {searchActive ? (
            <div className="flex items-center justify-center gap-3 border-t border-border pt-4">
              <span className="text-xs text-muted-foreground">Was this helpful?</span>
              <button
                type="button"
                className="rounded-md border border-border p-2 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                aria-label="Thumbs up"
                onClick={() => toast.success("Thanks — feedback noted.")}
              >
                <ThumbsUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="rounded-md border border-border p-2 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                aria-label="Thumbs down"
                onClick={() =>
                  toast.message("Thanks — we use feedback to improve copy and filters.")
                }
              >
                <ThumbsDown className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          <footer className="border-t border-border pt-6 text-[11px] leading-relaxed text-muted-foreground">
            <p>
              Theme copy is <strong className="text-foreground/90">template-based</strong>, not a
              personalised recommendation. Headlines are third-party and may lag prices. Listings
              come from your workspace catalog search.
            </p>
            <p className="mt-3">
              <strong className="text-foreground/90">Regulators on AI and investing:</strong>{" "}
              <a
                className="text-brand underline underline-offset-2 hover:no-underline"
                href="https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-alerts/artificial-intelligence-fraud"
                target="_blank"
                rel="noopener noreferrer"
              >
                SEC / Investor.gov — Artificial intelligence and investment fraud
              </a>
              {" · "}
              <a
                className="text-brand underline underline-offset-2 hover:no-underline"
                href="https://www.sec.gov/newsroom/press-releases/2024-36"
                target="_blank"
                rel="noopener noreferrer"
              >
                SEC (2024) — “AI washing” enforcement examples
              </a>
              .
            </p>
            <p className="mt-3">
              <strong className="text-foreground/90">Data:</strong>{" "}
              <a
                className="text-brand underline underline-offset-2 hover:no-underline"
                href="https://finnhub.io/terms"
                target="_blank"
                rel="noopener noreferrer"
              >
                Finnhub terms
              </a>
              {" · "}
              <a
                className="text-brand underline underline-offset-2 hover:no-underline"
                href="https://www.alphavantage.co/terms_of_service/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Alpha Vantage terms
              </a>
              .
            </p>
            <p className="mt-3">
              <a
                className="text-brand underline underline-offset-2 hover:no-underline"
                href="/disclosures"
              >
                View full disclosures
              </a>{" "}
              for Hudson Crest Capital services.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
