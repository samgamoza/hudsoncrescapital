import { useEffect, useState } from "react";
type Quote = {
  sym: string;
  val: string;
  chg: string;
  up: boolean;
  raw: number;
};

type SentimentItem = {
  txt: string;
  tag: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  up: boolean | null;
  url?: string;
};

const QUOTE_INTERVAL = 5000; // 5s — Finnhub free tier allows 60 req/min
const NEWS_INTERVAL = 120000; // 2 min — news + AI sentiment is heavier

export function LiveMarket() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [news, setNews] = useState<SentimentItem[]>([]);
  const [flash, setFlash] = useState<Record<string, "up" | "down">>({});
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    let alive = true;
    let prev: Record<string, number> = {};

    const tick = async () => {
      try {
        const res = await fetch("/api/public/live-market-quotes");
        if (!res.ok) throw new Error(`Quotes API failed: ${res.status}`);
        const r = (await res.json()) as { quotes: Quote[] };
        if (!alive) return;
        const next: Record<string, "up" | "down"> = {};
        for (const q of r.quotes) {
          const p = prev[q.sym];
          if (p !== undefined && p !== q.raw) next[q.sym] = q.raw > p ? "up" : "down";
          prev[q.sym] = q.raw;
        }
        setQuotes(r.quotes);
        setFlash(next);
        setLastUpdate(new Date());
        setTimeout(() => alive && setFlash({}), 600);
      } catch {
        /* noop */
      }
    };

    tick();
    const id = setInterval(tick, QUOTE_INTERVAL);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch("/api/public/live-market-news");
        if (!res.ok) throw new Error(`News API failed: ${res.status}`);
        const r = (await res.json()) as { items: SentimentItem[] };
        if (alive && r.items.length) setNews(r.items);
      } catch {
        /* noop */
      }
    };
    tick();
    const id = setInterval(tick, NEWS_INTERVAL);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="lg:col-span-5 space-y-4">
      <div className="surface-card overflow-hidden backdrop-blur">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground">
            Live Market Overview
          </h3>
          <span className="inline-flex items-center gap-1.5 text-[10px] text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            {lastUpdate ? `LIVE · ${lastUpdate.toLocaleTimeString()}` : "CONNECTING…"}
          </span>
        </div>
        <ul className="divide-y divide-border">
          {(quotes.length ? quotes : Array.from({ length: 6 })).map((t, i) => {
            if (!t) {
              return (
                <li key={i} className="flex items-center justify-between px-5 py-2.5 text-sm">
                  <span className="h-3 w-20 animate-pulse rounded bg-muted" />
                  <span className="h-3 w-24 animate-pulse rounded bg-muted" />
                </li>
              );
            }
            const q = t as Quote;
            const f = flash[q.sym];
            return (
              <li
                key={q.sym}
                className={`flex items-center justify-between px-5 py-2.5 text-sm transition-colors duration-500 ${
                  f === "up" ? "bg-success/10" : f === "down" ? "bg-danger/10" : ""
                }`}
              >
                <span className="font-medium text-foreground">{q.sym}</span>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-muted-foreground">{q.val}</span>
                  <span className={`font-mono text-xs ${q.up ? "text-success" : "text-danger"}`}>
                    {q.chg}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="surface-card overflow-hidden backdrop-blur">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground">
            AI News Sentiment
          </h3>
          <span className="inline-flex items-center gap-1.5 text-[10px] text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> LIVE
          </span>
        </div>
        <ul className="divide-y divide-border">
          {(news.length ? news : Array.from({ length: 4 })).map((n, i) => {
            if (!n) {
              return (
                <li key={i} className="flex items-center justify-between gap-3 px-5 py-2.5">
                  <span className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                  <span className="h-3 w-12 animate-pulse rounded bg-muted" />
                </li>
              );
            }
            const item = n as SentimentItem;
            const content = (
              <>
                <span className="text-muted-foreground line-clamp-1">{item.txt}</span>
                <span
                  className={`shrink-0 text-[10px] font-bold tracking-wider ${
                    item.up === true
                      ? "text-success"
                      : item.up === false
                        ? "text-danger"
                        : "text-muted-foreground"
                  }`}
                >
                  {item.tag}
                </span>
              </>
            );
            return (
              <li
                key={item.txt + i}
                className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm"
              >
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-between gap-3 hover:text-foreground"
                  >
                    {content}
                  </a>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
