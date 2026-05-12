import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Loader2, Minus, Share2, Sparkles, TrendingDown, TrendingUp, X } from "lucide-react";
import { toast } from "sonner";
import type { DiscoverFeedCategory, DiscoverFeedItem } from "@/server/discover-ai-feed";

type ThemeChip = {
  label: string;
  /** When set, fetches this Finnhub news category (live). */
  category?: DiscoverFeedCategory;
  /** When set (without category), filters the general feed client-side. */
  keywords?: RegExp;
};

const THEME_CHIPS: ThemeChip[] = [
  { label: "Gold producers and bullion", keywords: /\b(gold|silver|bullion|mining|miner|precious)\b/i },
  { label: "Ageing population", keywords: /\b(health|healthcare|biotech|medicare|senior|retirement|ageing)\b/i },
  { label: "Weight loss and health revolution", keywords: /\b(weight|obesity|glp|wegovy|ozempic|wellness|health)\b/i },
  { label: "Nuclear energy renaissance", keywords: /\b(nuclear|uranium|reactor|smr|atomic)\b/i },
  { label: "Robots in every home", keywords: /\b(robot|automation|humanoid|nvidia|semiconductor|chip)\b/i },
  { label: "Streaming and entertainment dominance", keywords: /\b(stream|netflix|disney|media|entertainment|spotify)\b/i },
  { label: "Medical devices and diagnostics", keywords: /\b(medical|device|diagnostic|medtech|fda)\b/i },
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

export function DiscoverAIPanel({ onClose }: { onClose: () => void }) {
  const [idea, setIdea] = useState("");
  const [submittedIdea, setSubmittedIdea] = useState("");
  const [feedCategory, setFeedCategory] = useState<DiscoverFeedCategory>("general");
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const [rawItems, setRawItems] = useState<DiscoverFeedItem[]>([]);
  const [chipKeyword, setChipKeyword] = useState<RegExp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<"finnhub" | "alphavantage" | null>(null);

  const load = useCallback(async (category: DiscoverFeedCategory) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/discover-ai-feed?category=${encodeURIComponent(category)}`);
      const body = (await res.json().catch(() => ({}))) as {
        items?: DiscoverFeedItem[];
        dataSource?: "finnhub" | "alphavantage" | null;
        error?: string | null;
      };
      if (!res.ok) {
        setRawItems([]);
        setDataSource(null);
        setError(typeof body.error === "string" ? body.error : `Request failed (${res.status})`);
        return;
      }
      setRawItems(Array.isArray(body.items) ? body.items : []);
      setDataSource(body.dataSource ?? null);
      if (body.error && (!body.items || body.items.length === 0)) {
        setError(body.error);
      } else {
        setError(typeof body.error === "string" && body.items?.length === 0 ? body.error : null);
      }
    } catch (e: unknown) {
      setRawItems([]);
      setDataSource(null);
      setError(e instanceof Error ? e.message : "Could not load news");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(feedCategory);
  }, [feedCategory, load]);

  useEffect(() => {
    const id = window.setInterval(() => void load(feedCategory), 180_000);
    return () => window.clearInterval(id);
  }, [feedCategory, load]);

  const displayed = useMemo(() => {
    let list = rawItems;
    if (chipKeyword) {
      list = list.filter((x) => chipKeyword.test(x.headline));
    }
    if (submittedIdea.trim()) {
      list = list.filter((x) => tokenFilter(x.headline, submittedIdea));
    }
    return list;
  }, [rawItems, chipKeyword, submittedIdea]);

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
      if (!chip.keywords) void load("general");
    }
  };

  const clearThemes = () => {
    setActiveChip(null);
    setChipKeyword(null);
    setFeedCategory("general");
  };

  const runIdeaSearch = () => {
    setSubmittedIdea(idea);
    setActiveChip(null);
    setChipKeyword(null);
    setFeedCategory("general");
    if (feedCategory !== "general") {
      setFeedCategory("general");
    } else {
      void load("general");
    }
  };

  const addToWorkspace = async () => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/portal/trade-workspace` : "";
    const text = [idea.trim() && `Idea: ${idea.trim()}`, url].filter(Boolean).join("\n");
    try {
      await navigator.clipboard.writeText(text || url);
      toast.success("Copied workspace link to clipboard.");
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3 md:px-6">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-5 w-5 shrink-0 text-violet-500" aria-hidden />
          <h1 className="text-base font-semibold tracking-tight text-foreground md:text-lg">DiscoverAI</h1>
        </div>
        <div className="flex items-center gap-1 shrink-0">
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

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-10">
        <div className="mx-auto max-w-2xl text-center space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            AI-powered market discovery
          </p>
          <p className="text-sm text-muted-foreground md:text-base">
            Discover relevant markets through ideas that matter to you. Headlines are sourced live from market
            data providers; theme chips narrow the feed — they are not personalized investment advice.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-2xl">
          <div className="flex rounded-full border border-border bg-surface/60 shadow-sm focus-within:border-brand/40 focus-within:ring-1 focus-within:ring-brand/20">
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
              aria-label="Search ideas"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            {dataSource === "finnhub" && "Headlines: live market news (Finnhub)."}
            {dataSource === "alphavantage" && "Headlines: Alpha Vantage news sentiment feed."}
            {!dataSource && !loading && "Configure FINNHUB_API_KEY or ALPHA_VANTAGE_API_KEY for live headlines."}
          </p>
        </div>

        <div className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-2">
          {THEME_CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => onChip(chip)}
              className={`rounded-full border px-3 py-1.5 text-left text-xs transition-colors md:text-sm ${
                activeChip === chip.label
                  ? "border-violet-500/50 bg-violet-500/10 text-foreground"
                  : "border-border bg-muted/30 text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground"
              }`}
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

        <section className="mx-auto mt-10 max-w-3xl">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              From the news
            </h2>
            <span className="text-[10px] text-muted-foreground capitalize">
              {feedCategory.replace("_", " ")}
            </span>
          </div>

          {loading && rawItems.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading live headlines…
            </div>
          ) : error && displayed.length === 0 ? (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-4 text-sm text-amber-800 dark:text-amber-200">
              {error}
            </p>
          ) : displayed.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No headlines match this filter. Try another theme, clear filters, or broaden your idea.
            </p>
          ) : (
            <ul className="space-y-0 divide-y divide-border/60 border border-border rounded-lg bg-surface/20">
              {displayed.map((item, idx) => (
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
                      <span className="text-sm font-medium leading-snug text-foreground">{item.headline}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                        <span>{item.source}</span>
                        {item.datetime ? (
                          <time dateTime={item.datetime}>{new Date(item.datetime).toLocaleString()}</time>
                        ) : null}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="mx-auto mt-10 max-w-3xl border-t border-border pt-6 text-[11px] leading-relaxed text-muted-foreground">
          <p>
            This view surfaces <strong className="text-foreground/90">factual third-party headlines</strong> for
            exploration. Sentiment icons use simple keyword heuristics only — not a recommendation model. Headlines may
            lag real-time markets and do not reflect your objectives or risk tolerance.
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
            {" · "}
            <a
              className="text-brand underline underline-offset-2 hover:no-underline"
              href="https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins/technology-and-digital-finance-world-investor-week-2024-investor-bulletin"
              target="_blank"
              rel="noopener noreferrer"
            >
              Investor.gov — Technology & digital finance bulletin
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
            <a className="text-brand underline underline-offset-2 hover:no-underline" href="/disclosures">
              View full disclosures
            </a>{" "}
            for Hudson Crest Capital services.
          </p>
        </footer>
      </div>
    </div>
  );
}
