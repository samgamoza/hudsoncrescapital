import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSymbolBySlug, type SymbolType } from "@/lib/symbols";
import { fetchAlphaVantageNews, resolveAlphaVantageApiKey } from "@/server/alpha-vantage";
import {
  MARKET_FINNHUB_API_BASE,
  fetchAssetListingQuotes,
  fetchLiveMarketQuotes,
  fetchQuoteUniversal,
  fetchTickerTapeQuotes,
  fmtPrice,
  quoteProviderError,
  resolveFinnhubApiKey,
} from "@/server/market-quotes-fetch";

export type { AssetListingQuote, Quote } from "@/server/market-quotes-fetch";

export const getLiveQuotes = createServerFn({ method: "GET" }).handler(fetchLiveMarketQuotes);

export const getAssetListingQuotes = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ symbols: z.array(z.string().trim().min(1)).min(1).max(80) }).parse(d),
  )
  .handler(async ({ data }) => fetchAssetListingQuotes(data.symbols));

export const getTickerQuotes = createServerFn({ method: "GET" }).handler(fetchTickerTapeQuotes);

export type SentimentItem = {
  txt: string;
  tag: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  up: boolean | null;
  url?: string;
};

async function classifySentiment(
  headlines: string[],
): Promise<("POSITIVE" | "NEGATIVE" | "NEUTRAL")[]> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey || headlines.length === 0) return headlines.map(() => "NEUTRAL");

  const prompt = `Classify each financial news headline as POSITIVE, NEGATIVE, or NEUTRAL for global markets. Respond ONLY with a JSON array of strings in the same order, e.g. ["POSITIVE","NEUTRAL"].\n\nHeadlines:\n${headlines.map((h, i) => `${i + 1}. ${h}`).join("\n")}`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a financial sentiment classifier. Reply with only a JSON array.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) return headlines.map(() => "NEUTRAL");
    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "[]";
    const match = text.match(/\[[\s\S]*\]/);
    const arr = match ? JSON.parse(match[0]) : [];
    return headlines.map((_, i) => {
      const v = String(arr[i] ?? "NEUTRAL").toUpperCase();
      if (v === "POSITIVE" || v === "NEGATIVE" || v === "NEUTRAL") return v;
      return "NEUTRAL";
    });
  } catch {
    return headlines.map(() => "NEUTRAL");
  }
}

export const getLiveNewsSentiment = createServerFn({ method: "GET" }).handler(async () => {
  const fhKey = resolveFinnhubApiKey();
  const avKey = resolveAlphaVantageApiKey();

  if (fhKey) {
    try {
      const res = await fetch(`${MARKET_FINNHUB_API_BASE}/news?category=general&token=${fhKey}`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return { items: [], error: `Finnhub ${res.status}` };
      const news = (await res.json()) as { headline: string; url: string }[];
      const top = news.slice(0, 4).map((n) => ({ headline: n.headline, url: n.url }));
      const tags = await classifySentiment(top.map((n) => n.headline));
      const items: SentimentItem[] = top.map((n, i) => ({
        txt: n.headline,
        tag: tags[i],
        up: tags[i] === "POSITIVE" ? true : tags[i] === "NEGATIVE" ? false : null,
        url: n.url,
      }));
      return { items, error: null };
    } catch {
      return { items: [], error: "News fetch failed" };
    }
  }

  if (avKey) {
    const top = await fetchAlphaVantageNews(avKey, 4);
    if (top.length === 0) {
      return {
        items: [] as SentimentItem[],
        error: "No news returned (Alpha Vantage rate limit or NEWS_SENTIMENT unavailable)",
      };
    }
    const tags = await classifySentiment(top.map((n) => n.title));
    const items: SentimentItem[] = top.map((n, i) => ({
      txt: n.title,
      tag: tags[i],
      up: tags[i] === "POSITIVE" ? true : tags[i] === "NEGATIVE" ? false : null,
      url: n.url,
    }));
    return { items, error: null };
  }

  return {
    items: [] as SentimentItem[],
    error: "Missing FINNHUB_API_KEY or ALPHA_VANTAGE_API_KEY for news",
  };
});

export type SymbolDetail = {
  slug: string;
  sym: string;
  name: string;
  category: string;
  type: SymbolType;
  current: number | null;
  change: number | null;
  changePct: number | null;
  high: number | null;
  low: number | null;
  open: number | null;
  prevClose: number | null;
  valFmt: string;
  chgFmt: string;
  up: boolean;
};

export const getSymbolDetail = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const meta = getSymbolBySlug(data.slug);
    if (!meta) return { detail: null as SymbolDetail | null, error: "Unknown symbol" };
    if (!resolveAlphaVantageApiKey() && !resolveFinnhubApiKey()) {
      return { detail: null, error: quoteProviderError() };
    }

    const q = await fetchQuoteUniversal(meta.finnhub, meta.type);
    if (!q) return { detail: null, error: "No quote available" };

    const up = (q.dp ?? 0) >= 0;
    const detail: SymbolDetail = {
      slug: meta.slug,
      sym: meta.sym,
      name: meta.name,
      category: meta.category,
      type: meta.type,
      current: q.c ?? null,
      change: q.d ?? null,
      changePct: q.dp ?? null,
      high: null,
      low: null,
      open: null,
      prevClose: null,
      valFmt: fmtPrice(q.c, meta.type),
      chgFmt: `${up ? "+" : ""}${(q.dp ?? 0).toFixed(2)}%`,
      up,
    };
    return { detail, error: null };
  });
