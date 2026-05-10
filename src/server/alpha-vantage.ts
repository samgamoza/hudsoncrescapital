const AV_BASE = "https://www.alphavantage.co/query";

/** Spacing between AV calls (free tier warns on bursts). */
const AV_MIN_MS = 1200;

let avChain: Promise<unknown> = Promise.resolve();

function scheduleAlphaVantage<T>(task: () => Promise<T>): Promise<T> {
  const run = avChain.then(() => task());
  avChain = run.then(() => new Promise((r) => setTimeout(r, AV_MIN_MS))).catch(() => undefined);
  return run;
}

export function resolveAlphaVantageApiKey(): string | undefined {
  const candidates = [process.env.ALPHA_VANTAGE_API_KEY, process.env.ALPHAVANTAGE_API_KEY];
  for (const raw of candidates) {
    if (typeof raw !== "string") continue;
    const v = raw.trim().replace(/^["']|["']$/g, "");
    if (v.length > 0) return v;
  }
  return undefined;
}

function isAvLimitOrEmpty(data: unknown): boolean {
  if (!data || typeof data !== "object") return true;
  const o = data as Record<string, unknown>;
  return typeof o.Note === "string" || typeof o.Information === "string";
}

function parseFinnhubCryptoSymbol(finnhub: string): string | null {
  const m = finnhub.trim().match(/^BINANCE:(\w+)USDT$/i);
  if (!m) return null;
  return m[1].toUpperCase();
}

function parseFinnhubFxPair(finnhub: string): { from: string; to: string } | null {
  if (!finnhub.startsWith("OANDA:")) return null;
  const body = finnhub.slice("OANDA:".length);
  const [from, to] = body.split("_");
  if (!from || !to) return null;
  return { from: from.toUpperCase(), to: to.toUpperCase() };
}

async function avJson(params: Record<string, string>, apiKey: string): Promise<unknown> {
  return scheduleAlphaVantage(async () => {
    const u = new URL(AV_BASE);
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
    u.searchParams.set("apikey", apiKey);
    const res = await fetch(u.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    try {
      return await res.json();
    } catch {
      return null;
    }
  });
}

function dailyCryptoClose(day: Record<string, string>): number {
  const a = day["4a. close (USD)"];
  const b = day["4. close"];
  const v = Number(a ?? b);
  return Number.isFinite(v) ? v : NaN;
}

export async function fetchAlphaVantageQuote(
  finnhubSymbol: string,
  type: "stock" | "fx" | "crypto",
  apiKey: string,
): Promise<{ c: number; d: number; dp: number } | null> {
  const sym = finnhubSymbol.trim();

  if (type === "crypto") {
    const coin = parseFinnhubCryptoSymbol(sym);
    if (!coin) return null;
    const data = (await avJson(
      { function: "DIGITAL_CURRENCY_DAILY", symbol: coin, market: "USD" },
      apiKey,
    )) as Record<string, Record<string, Record<string, string>>> | null;
    if (!data || isAvLimitOrEmpty(data)) return null;
    const series = data["Time Series (Digital Currency Daily)"];
    if (!series) return null;
    const dates = Object.keys(series).sort().reverse();
    if (dates.length < 2) return null;
    const c = dailyCryptoClose(series[dates[0]] ?? {});
    const prev = dailyCryptoClose(series[dates[1]] ?? {});
    if (!Number.isFinite(c) || !Number.isFinite(prev) || prev === 0) return null;
    const d = c - prev;
    const dp = (d / prev) * 100;
    return { c, d, dp };
  }

  if (type === "fx") {
    const pair = parseFinnhubFxPair(sym);
    if (!pair) return null;
    const data = (await avJson(
      {
        function: "FX_DAILY",
        from_symbol: pair.from,
        to_symbol: pair.to,
      },
      apiKey,
    )) as Record<string, Record<string, Record<string, string>>> | null;
    if (!data || isAvLimitOrEmpty(data)) return null;
    const series = data["Time Series FX (Daily)"];
    if (!series) return null;
    const dates = Object.keys(series).sort().reverse();
    if (dates.length < 2) return null;
    const c = Number(series[dates[0]]?.["4. close"]);
    const prev = Number(series[dates[1]]?.["4. close"]);
    if (!Number.isFinite(c) || !Number.isFinite(prev) || prev === 0) return null;
    const d = c - prev;
    const dp = (d / prev) * 100;
    return { c, d, dp };
  }

  let ticker = sym;
  if (ticker.includes(":")) ticker = ticker.split(":").pop()!.trim();
  if (!ticker) return null;

  const data = (await avJson({ function: "GLOBAL_QUOTE", symbol: ticker }, apiKey)) as Record<
    string,
    Record<string, string>
  > | null;
  if (!data || isAvLimitOrEmpty(data)) return null;
  const q = data["Global Quote"];
  if (!q || Object.keys(q).length === 0) return null;
  const c = Number(q["05. price"]);
  if (!Number.isFinite(c)) return null;
  const d = Number(q["09. change"] ?? 0);
  const dpRaw = String(q["10. change percent"] ?? "0").replace(/%/g, "");
  const dp = Number(dpRaw);
  return {
    c,
    d,
    dp: Number.isFinite(dp) ? dp : 0,
  };
}

export type AlphaVantageNewsItem = { title: string; url: string };

export async function fetchAlphaVantageNews(
  apiKey: string,
  limit: number,
): Promise<AlphaVantageNewsItem[]> {
  const data = (await avJson(
    {
      function: "NEWS_SENTIMENT",
      tickers: "SPY,QQQ,DIA,JPM,AAPL,COIN,MSFT",
      limit: String(Math.min(Math.max(limit, 1), 50)),
    },
    apiKey,
  )) as { feed?: { title?: string; url?: string }[] } | null;
  if (!data || isAvLimitOrEmpty(data) || !Array.isArray(data.feed)) return [];
  return data.feed
    .slice(0, limit)
    .map((x) => ({ title: String(x.title ?? ""), url: String(x.url ?? "") }))
    .filter((x) => x.title.length > 0);
}
