// src/components/site/TickerTape.tsx
import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

type TickerQuote = {
  sym: string;
  val: string;
  chg: string;
  up: boolean;
  raw: number;
};

const REFRESH_MS = 15_000;

const scrollEnabled = import.meta.env.VITE_SITE_TICKER_SCROLL !== "false";

function TickerItems({ quotes, idSuffix }: { quotes: TickerQuote[]; idSuffix: string }) {
  return (
    <>
      {quotes.map((q) => (
        <li
          key={`${q.sym}-${idSuffix}`}
          className="flex shrink-0 items-center gap-2 whitespace-nowrap"
        >
          {q.up ? (
            <TrendingUp className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 shrink-0 text-danger" aria-hidden />
          )}
          <span className="font-semibold text-foreground">{q.sym}</span>
          <span className="font-mono text-sm text-muted-foreground">{q.val}</span>
          <span
            className={`font-mono text-[11px] tabular-nums ${q.up ? "text-success" : "text-danger"}`}
          >
            {q.chg}
          </span>
        </li>
      ))}
    </>
  );
}

export const TickerTape = () => {
  const [quotes, setQuotes] = useState<TickerQuote[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchQuotes = async () => {
      try {
        const res = await fetch("/api/public/ticker-quotes", { cache: "no-store" });
        if (!res.ok) throw new Error(`Ticker API failed: ${res.status}`);
        const data = (await res.json()) as { quotes: TickerQuote[]; error?: string | null };
        if (!isMounted) return;
        setQuotes(Array.isArray(data.quotes) ? data.quotes : []);
        setApiError(data.error ?? null);
      } catch (error) {
        console.error("Failed to fetch quotes", error);
        if (isMounted) {
          setQuotes([]);
          setApiError(error instanceof Error ? error.message : "Request failed");
        }
      } finally {
        if (isMounted) setLoaded(true);
      }
    };

    void fetchQuotes();
    const interval = setInterval(() => void fetchQuotes(), REFRESH_MS);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const showLoading = !loaded && quotes.length === 0;
  const showEmpty = loaded && quotes.length === 0;

  return (
    <div
      role="region"
      aria-label="Live market ticker"
      className="group relative w-full overflow-hidden border-b border-border/60 bg-surface/90 backdrop-blur-md"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-background to-transparent" />

      {showLoading ? (
        <div className="flex items-center justify-center gap-2 py-2.5 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
          Loading live quotes…
        </div>
      ) : showEmpty ? (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-2.5 text-center text-xs text-muted-foreground">
          <span>Market ticker unavailable.</span>
          {apiError ? (
            <span className="opacity-80">({apiError})</span>
          ) : (
            <span className="opacity-80">Check FINNHUB_API_KEY on the server environment.</span>
          )}
        </div>
      ) : scrollEnabled ? (
        <div className="flex w-max max-w-none animate-ticker group-hover:[animation-play-state:paused]">
          <ul className="flex shrink-0 list-none items-center gap-x-10 py-2.5 pl-8 pr-10 text-xs sm:gap-x-12 sm:text-sm">
            <TickerItems quotes={quotes} idSuffix="a" />
          </ul>
          <ul
            className="flex shrink-0 list-none items-center gap-x-10 py-2.5 pl-8 pr-10 text-xs sm:gap-x-12 sm:text-sm"
            aria-hidden
          >
            <TickerItems quotes={quotes} idSuffix="b" />
          </ul>
        </div>
      ) : (
        <ul className="flex flex-wrap list-none items-center justify-center gap-x-10 gap-y-2 px-4 py-2.5 text-xs sm:text-sm">
          <TickerItems quotes={quotes} idSuffix="static" />
        </ul>
      )}
    </div>
  );
};
