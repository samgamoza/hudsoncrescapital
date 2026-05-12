/**
 * Live market headlines for Discover-style workspace panels.
 * Uses Finnhub market news when configured; Alpha Vantage NEWS_SENTIMENT as fallback.
 */
import { fetchAlphaVantageNews, resolveAlphaVantageApiKey } from "@/server/alpha-vantage";
import {
  MARKET_FINNHUB_API_BASE,
  quoteProviderError,
  resolveFinnhubApiKey,
} from "@/server/market-quotes-fetch";

export type DiscoverFeedCategory = "general" | "forex" | "crypto" | "merger";

export type DiscoverFeedItem = {
  headline: string;
  url: string;
  source: string;
  datetime: string | null;
  /** Simple headline heuristic for UI sparkline direction (not investment advice). */
  bullish: boolean | null;
};

type FinnhubNewsArticle = {
  headline?: string;
  url?: string;
  source?: string;
  datetime?: number;
  summary?: string;
};

function headlineSentimentHint(headline: string): boolean | null {
  const h = headline.toLowerCase();
  if (
    /\b(surge|surges|surged|jump|jumps|jumped|rally|rallies|rallied|highs?|record|gains?|gain|soar|soars|rose|ris(es|ing)|beat|beats|upgrade|upgrades|strong|positive)\b/.test(
      h,
    )
  ) {
    return true;
  }
  if (
    /\b(fall|falls|fell|drop|drops|dropped|plunge|plunges|plunged|crash|crashes|loss|losses|stall|stalled|fear|decline|slump|cut|cuts|downgrade|weak|negative|lawsuit|probe)\b/.test(
      h,
    )
  ) {
    return false;
  }
  return null;
}

function normalizeCategory(raw: string | null | undefined): DiscoverFeedCategory {
  const c = (raw ?? "general").toLowerCase();
  if (c === "forex" || c === "crypto" || c === "merger") return c;
  return "general";
}

export async function fetchDiscoverAiFeed(categoryRaw?: string | null): Promise<{
  items: DiscoverFeedItem[];
  dataSource: "finnhub" | "alphavantage" | null;
  error: string | null;
}> {
  const category = normalizeCategory(categoryRaw);
  const fhKey = resolveFinnhubApiKey();

  if (fhKey) {
    try {
      const url = `${MARKET_FINNHUB_API_BASE}/news?category=${encodeURIComponent(category)}&token=${encodeURIComponent(fhKey)}`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) {
        return { items: [], dataSource: null, error: `Finnhub news error (${res.status})` };
      }
      const articles = (await res.json()) as FinnhubNewsArticle[];
      if (!Array.isArray(articles)) {
        return { items: [], dataSource: null, error: "Unexpected Finnhub news response" };
      }
      const items: DiscoverFeedItem[] = articles.slice(0, 14).map((a) => {
        const headline = String(a.headline ?? "").trim();
        const urlStr = String(a.url ?? "").trim();
        const source = String(a.source ?? "Finnhub").trim() || "Finnhub";
        const dt =
          typeof a.datetime === "number" && Number.isFinite(a.datetime)
            ? new Date(a.datetime * 1000).toISOString()
            : null;
        return {
          headline,
          url: urlStr,
          source,
          datetime: dt,
          bullish: headline ? headlineSentimentHint(headline) : null,
        };
      });
      const usable = items.filter((x) => x.headline.length > 0 && x.url.length > 0);
      return {
        items: usable,
        dataSource: "finnhub",
        error: usable.length ? null : "No headlines returned for this category",
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "News fetch failed";
      return { items: [], dataSource: null, error: msg };
    }
  }

  const avKey = resolveAlphaVantageApiKey();
  if (avKey) {
    const top = await fetchAlphaVantageNews(avKey, 14);
    if (!top.length) {
      return {
        items: [],
        dataSource: "alphavantage",
        error: "No news returned (Alpha Vantage rate limit or NEWS_SENTIMENT unavailable)",
      };
    }
    const items: DiscoverFeedItem[] = top.map((n) => ({
      headline: n.title,
      url: n.url,
      source: "Alpha Vantage",
      datetime: null,
      bullish: headlineSentimentHint(n.title),
    }));
    return { items, dataSource: "alphavantage", error: null };
  }

  return {
    items: [],
    dataSource: null,
    error: quoteProviderError(),
  };
}
