/**
 * Pure quote fetch logic for API routes — no `@tanstack/react-start` imports.
 * Bundling quote handlers with `createServerFn()` modules breaks SSR imports of exported functions.
 */
import { fetchAlphaVantageQuote, resolveAlphaVantageApiKey } from "@/server/alpha-vantage";

const FINNHUB = "https://finnhub.io/api/v1";

/** Resolve API token from env (Vercel injects at runtime — trim whitespace/newlines from dashboard paste). */
export function resolveFinnhubApiKey(): string | undefined {
  const candidates = [
    process.env.FINNHUB_API_KEY,
    process.env.FINNHUB_API_KEY_,
    process.env.FINNHUB_TOKEN,
    process.env.FINNHUB_API_TOKEN,
    process.env.VITE_MARKET_API_KEY,
    process.env.VITE_MARKET_API_KEY_,
    process.env.NEXT_PUBLIC_FINNHUB_API_KEY,
    process.env.PUBLIC_FINNHUB_API_KEY,
  ];
  for (const raw of candidates) {
    if (typeof raw !== "string") continue;
    const v = raw.trim().replace(/^["']|["']$/g, "");
    if (v.length > 0) return v;
  }
  return undefined;
}

// Finnhub symbol mapping. Indices use ETF proxies for free-tier access.
const SYMBOLS: { sym: string; finnhub: string; type: "stock" | "fx" | "crypto" }[] = [
  { sym: "S&P 500", finnhub: "SPY", type: "stock" },
  { sym: "NASDAQ 100", finnhub: "QQQ", type: "stock" },
  { sym: "DOW JONES", finnhub: "DIA", type: "stock" },
  { sym: "EUR / USD", finnhub: "OANDA:EUR_USD", type: "fx" },
  { sym: "BTC / USD", finnhub: "BINANCE:BTCUSDT", type: "crypto" },
  { sym: "VIX", finnhub: "VIXY", type: "stock" },
];

export type Quote = {
  sym: string;
  val: string;
  chg: string;
  up: boolean;
  raw: number;
};

export type AssetListingQuote = {
  symbol: string;
  last: number;
  change: number;
  changePct: number;
  buy: number;
  sell: number;
  up: boolean;
  sourceSymbol?: string;
};

type FinnhubQuoteJson = { c?: unknown; d?: unknown; dp?: unknown; error?: unknown };

export function quoteProviderError(): string {
  return "Missing ALPHA_VANTAGE_API_KEY or FINNHUB_API_KEY";
}

async function fetchQuoteFinnhub(
  symbol: string,
  apiKey: string,
): Promise<{ c: number; d: number; dp: number } | null> {
  const url = `${FINNHUB}/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const body = data as FinnhubQuoteJson;
  if (body?.error != null) return null;
  const c = Number(body.c);
  if (!Number.isFinite(c)) return null;
  return {
    c,
    d: Number(body.d ?? 0),
    dp: Number(body.dp ?? 0),
  };
}

export async function fetchQuoteUniversal(
  finnhubSymbol: string,
  type: "stock" | "fx" | "crypto",
): Promise<{ c: number; d: number; dp: number } | null> {
  const fh = resolveFinnhubApiKey();
  if (fh) return fetchQuoteFinnhub(finnhubSymbol, fh);
  const av = resolveAlphaVantageApiKey();
  if (av) return fetchAlphaVantageQuote(finnhubSymbol, type, av);
  return null;
}

const ASSET_LISTING_SYMBOL_MAP: Record<string, string[]> = {
  CMDTY_COPPER: ["CPER"],
  CMDTY_ALUMINIUM: ["DBB"],
  CMDTY_IRON_ORE: ["XME"],
  CMDTY_LEAD: ["DBB"],
  CMDTY_ZINC: ["DBB"],
  CMDTY_SOYBEANS: ["SOYB"],
  CMDTY_WHEAT_CHICAGO: ["WEAT"],
  CMDTY_WHEAT_LONDON: ["WEAT"],
  CMDTY_COFFEE_NY_ARABICA: ["JO"],
  CMDTY_COFFEE_LONDON_ROBUSTA: ["JO"],
  CMDTY_COCOA_NEW_YORK: ["NIB"],
  CMDTY_COCOA_LONDON: ["NIB"],
  CMDTY_COTTON: ["BAL"],
  CMDTY_CORN: ["CORN"],
  CMDTY_SUGAR_NY_11: ["CANE"],
  CMDTY_SUGAR_LONDON_5: ["CANE"],
  CMDTY_SOYBEAN_OIL: ["DBA"],
  CMDTY_SOYBEAN_MEAL: ["DBA"],
  CMDTY_ORANGE_JUICE: ["DBA"],
  CMDTY_LIVE_CATTLE: ["COW"],
  CMDTY_LEAN_HOGS: ["COW"],
  CMDTY_LUMBER: ["WOOD"],
  CMDTY_OATS: ["DBA"],
  CMDTY_ROUGH_RICE: ["RJA"],
};

function resolveAssetListingQuoteSymbols(symbol: string): string[] {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) return [];
  const mapped = ASSET_LISTING_SYMBOL_MAP[normalized] ?? [];
  const candidates = [...mapped, normalized];
  return [...new Set(candidates)];
}

export function fmtPrice(v: number, type: "stock" | "fx" | "crypto") {
  if (type === "fx") return v.toFixed(4);
  if (v >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return v.toFixed(2);
}

/** Live strip (homepage / dashboard widgets). */
export async function fetchLiveMarketQuotes(): Promise<{ quotes: Quote[]; error: string | null }> {
  if (!resolveAlphaVantageApiKey() && !resolveFinnhubApiKey()) {
    return { quotes: [] as Quote[], error: quoteProviderError() };
  }

  const results = await Promise.all(
    SYMBOLS.map(async (s) => {
      try {
        const q = await fetchQuoteUniversal(s.finnhub, s.type);
        if (!q) return null;
        const up = (q.dp ?? 0) >= 0;
        return {
          sym: s.sym,
          val: fmtPrice(q.c, s.type),
          chg: `${up ? "+" : ""}${(q.dp ?? 0).toFixed(2)}%`,
          up,
          raw: q.c,
        } as Quote;
      } catch {
        return null;
      }
    }),
  );

  return { quotes: results.filter((x): x is Quote => x !== null), error: null };
}

/** Asset listings table (portal). */
export async function fetchAssetListingQuotes(
  symbols: string[],
): Promise<{ quotes: AssetListingQuote[]; error: string | null }> {
  if (!resolveAlphaVantageApiKey() && !resolveFinnhubApiKey()) {
    return { quotes: [], error: quoteProviderError() };
  }

  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))];
  const results = await Promise.all(
    unique.map(async (sym) => {
      try {
        const quoteSymbols = resolveAssetListingQuoteSymbols(sym);
        let q: { c: number; d: number; dp: number } | null = null;
        let sourceSymbol: string | undefined;
        for (const candidate of quoteSymbols) {
          const next = await fetchQuoteUniversal(candidate, "stock");
          if (next) {
            q = next;
            sourceSymbol = candidate;
            break;
          }
        }
        if (!q) return null;
        const change = Number(q.d ?? 0);
        const changePct = Number(q.dp ?? 0);
        const spread = Math.max(Math.abs(q.c) * 0.0006, q.c >= 100 ? 0.05 : 0.01);
        const sell = Number((q.c - spread / 2).toFixed(4));
        const buy = Number((q.c + spread / 2).toFixed(4));
        return {
          symbol: sym,
          last: Number(q.c),
          change,
          changePct,
          buy,
          sell,
          up: changePct >= 0,
          sourceSymbol,
        } as AssetListingQuote;
      } catch {
        return null;
      }
    }),
  );

  const quotes = results.filter((x): x is AssetListingQuote => x !== null);
  return { quotes, error: quotes.length ? null : "No quote data returned" };
}

export const TICKER_SYMBOLS: { sym: string; finnhub: string; type: "stock" | "fx" | "crypto" }[] = [
  { sym: "S&P 500", finnhub: "SPY", type: "stock" },
  { sym: "NASDAQ", finnhub: "QQQ", type: "stock" },
  { sym: "DOW", finnhub: "DIA", type: "stock" },
  { sym: "RUSSELL", finnhub: "IWM", type: "stock" },
  { sym: "AAPL", finnhub: "AAPL", type: "stock" },
  { sym: "MSFT", finnhub: "MSFT", type: "stock" },
  { sym: "NVDA", finnhub: "NVDA", type: "stock" },
  { sym: "GOOGL", finnhub: "GOOGL", type: "stock" },
  { sym: "AMZN", finnhub: "AMZN", type: "stock" },
  { sym: "META", finnhub: "META", type: "stock" },
  { sym: "TSLA", finnhub: "TSLA", type: "stock" },
  { sym: "JPM", finnhub: "JPM", type: "stock" },
  { sym: "BTC/USD", finnhub: "BINANCE:BTCUSDT", type: "crypto" },
  { sym: "ETH/USD", finnhub: "BINANCE:ETHUSDT", type: "crypto" },
  { sym: "SOL/USD", finnhub: "BINANCE:SOLUSDT", type: "crypto" },
  { sym: "EUR/USD", finnhub: "OANDA:EUR_USD", type: "fx" },
  { sym: "GBP/USD", finnhub: "OANDA:GBP_USD", type: "fx" },
  { sym: "USD/JPY", finnhub: "OANDA:USD_JPY", type: "fx" },
  { sym: "GOLD", finnhub: "GLD", type: "stock" },
  { sym: "OIL", finnhub: "USO", type: "stock" },
];

/** Ticker tape for `/api/public/ticker-quotes`. */
export async function fetchTickerTapeQuotes(): Promise<{ quotes: Quote[]; error: string | null }> {
  if (!resolveAlphaVantageApiKey() && !resolveFinnhubApiKey()) {
    return { quotes: [] as Quote[], error: quoteProviderError() };
  }

  const chunkSize = 6;
  const results: Array<Quote | null> = [];
  for (let i = 0; i < TICKER_SYMBOLS.length; i += chunkSize) {
    const chunk = TICKER_SYMBOLS.slice(i, i + chunkSize);
    const part = await Promise.all(
      chunk.map(async (s) => {
        try {
          const q = await fetchQuoteUniversal(s.finnhub, s.type);
          if (!q) return null;
          const up = (q.dp ?? 0) >= 0;
          return {
            sym: s.sym,
            val: fmtPrice(q.c, s.type),
            chg: `${up ? "+" : ""}${(q.dp ?? 0).toFixed(2)}%`,
            up,
            raw: q.c,
          } as Quote;
        } catch {
          return null;
        }
      }),
    );
    results.push(...part);
    if (i + chunkSize < TICKER_SYMBOLS.length) {
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  const quotes = results.filter((x): x is Quote => x !== null);
  return {
    quotes,
    error:
      quotes.length === 0
        ? "No quotes returned (check ALPHA_VANTAGE_API_KEY rate limits / FINNHUB_API_KEY and symbol limits)"
        : null,
  };
}

export { FINNHUB as MARKET_FINNHUB_API_BASE };
