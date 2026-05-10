// Shared symbol catalog used by ticker tape + symbol detail page.
export type SymbolType = "stock" | "fx" | "crypto";

export type SymbolMeta = {
  slug: string; // URL-safe id
  sym: string; // display label, e.g. "S&P 500"
  finnhub: string; // Finnhub query symbol
  type: SymbolType;
  name: string; // long descriptive name
  category: "Index" | "Stock" | "Crypto" | "FX" | "Commodity";
};

export const SYMBOL_CATALOG: SymbolMeta[] = [
  { slug: "spy", sym: "S&P 500", finnhub: "SPY", type: "stock", name: "S&P 500 Index (SPY ETF)", category: "Index" },
  { slug: "qqq", sym: "NASDAQ", finnhub: "QQQ", type: "stock", name: "NASDAQ 100 (QQQ ETF)", category: "Index" },
  { slug: "dia", sym: "DOW", finnhub: "DIA", type: "stock", name: "Dow Jones Industrial Avg (DIA ETF)", category: "Index" },
  { slug: "iwm", sym: "RUSSELL", finnhub: "IWM", type: "stock", name: "Russell 2000 (IWM ETF)", category: "Index" },
  { slug: "aapl", sym: "AAPL", finnhub: "AAPL", type: "stock", name: "Apple Inc.", category: "Stock" },
  { slug: "msft", sym: "MSFT", finnhub: "MSFT", type: "stock", name: "Microsoft Corporation", category: "Stock" },
  { slug: "nvda", sym: "NVDA", finnhub: "NVDA", type: "stock", name: "NVIDIA Corporation", category: "Stock" },
  { slug: "googl", sym: "GOOGL", finnhub: "GOOGL", type: "stock", name: "Alphabet Inc. Class A", category: "Stock" },
  { slug: "amzn", sym: "AMZN", finnhub: "AMZN", type: "stock", name: "Amazon.com Inc.", category: "Stock" },
  { slug: "meta", sym: "META", finnhub: "META", type: "stock", name: "Meta Platforms Inc.", category: "Stock" },
  { slug: "tsla", sym: "TSLA", finnhub: "TSLA", type: "stock", name: "Tesla Inc.", category: "Stock" },
  { slug: "jpm", sym: "JPM", finnhub: "JPM", type: "stock", name: "JPMorgan Chase & Co.", category: "Stock" },
  { slug: "btc-usd", sym: "BTC/USD", finnhub: "BINANCE:BTCUSDT", type: "crypto", name: "Bitcoin / US Dollar", category: "Crypto" },
  { slug: "eth-usd", sym: "ETH/USD", finnhub: "BINANCE:ETHUSDT", type: "crypto", name: "Ethereum / US Dollar", category: "Crypto" },
  { slug: "sol-usd", sym: "SOL/USD", finnhub: "BINANCE:SOLUSDT", type: "crypto", name: "Solana / US Dollar", category: "Crypto" },
  { slug: "eur-usd", sym: "EUR/USD", finnhub: "OANDA:EUR_USD", type: "fx", name: "Euro / US Dollar", category: "FX" },
  { slug: "gbp-usd", sym: "GBP/USD", finnhub: "OANDA:GBP_USD", type: "fx", name: "British Pound / US Dollar", category: "FX" },
  { slug: "usd-jpy", sym: "USD/JPY", finnhub: "OANDA:USD_JPY", type: "fx", name: "US Dollar / Japanese Yen", category: "FX" },
  { slug: "gold", sym: "GOLD", finnhub: "GLD", type: "stock", name: "Gold (GLD ETF)", category: "Commodity" },
  { slug: "oil", sym: "OIL", finnhub: "USO", type: "stock", name: "Crude Oil (USO ETF)", category: "Commodity" },
];

export function symbolToSlug(sym: string): string {
  const found = SYMBOL_CATALOG.find((s) => s.sym === sym);
  return found?.slug ?? sym.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function getSymbolBySlug(slug: string): SymbolMeta | undefined {
  return SYMBOL_CATALOG.find((s) => s.slug === slug);
}
