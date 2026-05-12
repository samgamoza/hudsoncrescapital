// Single source of truth for the four supported asset classes.
// Used by the onboarding wizard, admin holdings editor, and investor portfolio.

import type { ReactNode } from "react";

export type AssetClass = "equities" | "crypto" | "commodities" | "managed_strategy";

export type HoldingRow = {
  id: string;
  symbol: string;
  display_name: string | null;
  quantity: number;
  avg_cost: number;
  mark_price: number | null;
  unit_label: string | null;
  currency: string;
  details: Record<string, any> | null;
};

export type AssetClassMeta = {
  key: AssetClass;
  label: string;
  description: string;
  defaultUnit: string; // e.g. "shares", "coins", "oz"
  symbolHint: string; // placeholder for the symbol field
  /** Columns to render in the holdings table for this asset class. */
  columns: ReadonlyArray<{
    key: string;
    label: string;
    render: (h: HoldingRow) => ReactNode;
  }>;
  /** Extra editable fields stored under holdings.details (admin holdings editor). */
  detailFields: ReadonlyArray<DetailField>;
};

export type DetailField =
  | { key: string; label: string; type: "text"; placeholder?: string; help?: string }
  | {
      key: string;
      label: string;
      type: "number";
      placeholder?: string;
      help?: string;
      min?: number;
      max?: number;
      step?: number;
    }
  | {
      key: string;
      label: string;
      type: "select";
      options: ReadonlyArray<{ value: string; label: string }>;
      help?: string;
    };

const fmtMoney = (n: number, ccy = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: ccy,
    maximumFractionDigits: 2,
  }).format(n);

const fmtNum = (n: number, dp = 4) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: dp }).format(n);

function pnl(h: HoldingRow) {
  if (h.mark_price == null) return null;
  return (h.mark_price - h.avg_cost) * h.quantity;
}

const baseCols = [
  {
    key: "symbol",
    label: "Asset",
    render: (h: HoldingRow) => {
      const title = (h.display_name ?? "").trim() || h.symbol;
      const sym = (h.symbol ?? "").trim();
      const showSym =
        sym.length > 0 && sym.toUpperCase() !== title.toUpperCase() && !title.toUpperCase().startsWith(sym);
      return (
        <div>
          <div className="font-medium text-foreground">{title}</div>
          {showSym ? <div className="text-xs text-muted-foreground">{sym}</div> : null}
        </div>
      );
    },
  },
] as const;

const pnlCol = {
  key: "pnl",
  label: "Unrealized P&L",
  render: (h: HoldingRow) => {
    const p = pnl(h);
    if (p == null) return <span className="text-muted-foreground">—</span>;
    return (
      <span className={p >= 0 ? "text-success" : "text-danger"}>{fmtMoney(p, h.currency)}</span>
    );
  },
};

export const ASSET_CLASSES: Record<AssetClass, AssetClassMeta> = {
  equities: {
    key: "equities",
    label: "Equities & ETFs",
    description: "Stocks and exchange traded funds.",
    defaultUnit: "shares",
    symbolHint: "AAPL, MSFT, SPY…",
    columns: [
      ...baseCols,
      { key: "quantity", label: "Shares", render: (h) => fmtNum(h.quantity, 2) },
      { key: "avg_cost", label: "Avg Cost", render: (h) => fmtMoney(h.avg_cost, h.currency) },
      {
        key: "mark_price",
        label: "Mark",
        render: (h) => (h.mark_price != null ? fmtMoney(h.mark_price, h.currency) : "—"),
      },
      { key: "exchange", label: "Exchange", render: (h) => h.details?.exchange ?? "—" },
      pnlCol,
    ],
    detailFields: [
      {
        key: "exchange",
        label: "Exchange",
        type: "select",
        options: [
          { value: "", label: "Select exchange…" },
          { value: "NASDAQ", label: "NASDAQ" },
          { value: "NYSE", label: "NYSE" },
          { value: "NYSE ARCA", label: "NYSE ARCA" },
          { value: "LSE", label: "LSE" },
          { value: "TSX", label: "TSX (Toronto)" },
          { value: "HKEX", label: "HKEX" },
          { value: "TSE", label: "TSE (Tokyo)" },
          { value: "ASX", label: "ASX" },
          { value: "Euronext", label: "Euronext" },
          { value: "OTHER", label: "Other" },
        ],
      },
      { key: "isin", label: "ISIN", type: "text", placeholder: "US0378331005" },
      { key: "sector", label: "Sector", type: "text", placeholder: "Technology" },
      { key: "lot_date", label: "Lot acquired", type: "text", placeholder: "YYYY-MM-DD" },
      {
        key: "broker",
        label: "Custodian / Broker",
        type: "text",
        placeholder: "Interactive Brokers",
      },
    ],
  },
  crypto: {
    key: "crypto",
    label: "Crypto",
    description: "Digital assets held in custody or on chain.",
    defaultUnit: "coins",
    symbolHint: "BTC, ETH, SOL…",
    columns: [
      ...baseCols,
      { key: "quantity", label: "Units", render: (h) => fmtNum(h.quantity, 8) },
      { key: "avg_cost", label: "Avg Cost", render: (h) => fmtMoney(h.avg_cost, h.currency) },
      {
        key: "mark_price",
        label: "Mark",
        render: (h) => (h.mark_price != null ? fmtMoney(h.mark_price, h.currency) : "—"),
      },
      { key: "network", label: "Network", render: (h) => h.details?.network ?? "—" },
      {
        key: "wallet",
        label: "Custody",
        render: (h) => {
          const w = h.details?.wallet_address as string | undefined;
          if (h.details?.custody === "exchange")
            return <span className="text-xs">Exchange · {h.details?.custodian ?? "—"}</span>;
          if (h.details?.custody === "cold")
            return <span className="text-xs">Cold · {h.details?.custodian ?? "—"}</span>;
          if (!w) return "—";
          return (
            <span className="text-xs font-mono">
              {w.slice(0, 6)}…{w.slice(-4)}
            </span>
          );
        },
      },
      pnlCol,
    ],
    detailFields: [
      {
        key: "network",
        label: "Network",
        type: "select",
        options: [
          { value: "", label: "Select network…" },
          { value: "Bitcoin", label: "Bitcoin" },
          { value: "Ethereum", label: "Ethereum" },
          { value: "Solana", label: "Solana" },
          { value: "Polygon", label: "Polygon" },
          { value: "Arbitrum", label: "Arbitrum" },
          { value: "Optimism", label: "Optimism" },
          { value: "Base", label: "Base" },
          { value: "BNB Chain", label: "BNB Chain" },
          { value: "Avalanche", label: "Avalanche" },
          { value: "Tron", label: "Tron" },
          { value: "Other", label: "Other" },
        ],
      },
      {
        key: "custody",
        label: "Custody type",
        type: "select",
        options: [
          { value: "", label: "Select custody…" },
          { value: "self", label: "Self custody (hot)" },
          { value: "cold", label: "Cold storage / hardware" },
          { value: "exchange", label: "Exchange / custodian" },
          { value: "qualified", label: "Qualified custodian" },
        ],
      },
      {
        key: "custodian",
        label: "Custodian / Exchange",
        type: "text",
        placeholder: "Coinbase, Fireblocks, Ledger…",
      },
      { key: "wallet_address", label: "Wallet address", type: "text", placeholder: "0x… or bc1…" },
      { key: "tx_hash", label: "Acquisition tx hash", type: "text", placeholder: "0x… (optional)" },
    ],
  },
  commodities: {
    key: "commodities",
    label: "Commodities (Options & Futures)",
    description:
      "Commodity options and futures contracts (Gold, Silver, Crude, etc.), modeled after Barchart style contract listings.",
    defaultUnit: "contracts",
    symbolHint: "GCZ25, SIH26, CLG26…",
    columns: [
      ...baseCols,
      { key: "commodity", label: "Commodity", render: (h) => h.details?.commodity ?? "—" },
      { key: "exchange", label: "Exchange", render: (h) => h.details?.exchange ?? "—" },
      { key: "contract", label: "Contract", render: (h) => h.details?.contract_name ?? h.symbol },
      { key: "quantity", label: "# Contracts", render: (h) => fmtNum(h.quantity, 0) },
      {
        key: "avg_cost",
        label: "Premium / Price",
        render: (h) => fmtMoney(h.avg_cost, h.currency),
      },
      {
        key: "mark_price",
        label: "Mark",
        render: (h) => (h.mark_price != null ? fmtMoney(h.mark_price, h.currency) : "—"),
      },
      {
        key: "strike",
        label: "Strike",
        render: (h) => {
          const s = h.details?.strike;
          const t = h.details?.option_type;
          if (!s && !t) return "—";
          return (
            <span className="text-xs">
              {s ? fmtMoney(Number(s), h.currency) : "—"}
              {t ? ` ${String(t).toUpperCase()}` : ""}
            </span>
          );
        },
      },
      { key: "expiry", label: "Expiry", render: (h) => h.details?.expiry ?? "—" },
      pnlCol,
    ],
    detailFields: [
      {
        key: "commodity",
        label: "Commodity",
        type: "select",
        options: [
          { value: "", label: "Select commodity…" },
          { value: "Gold", label: "Gold" },
          { value: "Silver", label: "Silver" },
          { value: "Platinum", label: "Platinum" },
          { value: "Palladium", label: "Palladium" },
          { value: "Copper", label: "Copper" },
          { value: "Crude Oil (WTI)", label: "Crude Oil (WTI)" },
          { value: "Brent Crude", label: "Brent Crude" },
          { value: "Natural Gas", label: "Natural Gas" },
          { value: "Gasoline (RBOB)", label: "Gasoline (RBOB)" },
          { value: "Heating Oil", label: "Heating Oil" },
          { value: "Corn", label: "Corn" },
          { value: "Wheat", label: "Wheat" },
          { value: "Soybeans", label: "Soybeans" },
          { value: "Coffee", label: "Coffee" },
          { value: "Sugar", label: "Sugar" },
          { value: "Cocoa", label: "Cocoa" },
          { value: "Cotton", label: "Cotton" },
        ],
      },
      {
        key: "exchange",
        label: "Exchange",
        type: "select",
        options: [
          { value: "", label: "Select exchange…" },
          { value: "COMEX", label: "COMEX (metals)" },
          { value: "NYMEX", label: "NYMEX (energy)" },
          { value: "CBOT", label: "CBOT (grains)" },
          { value: "CME", label: "CME" },
          { value: "ICE US", label: "ICE US (softs)" },
          { value: "ICE Europe", label: "ICE Europe (Brent)" },
          { value: "LME", label: "LME (metals)" },
          { value: "SHFE", label: "SHFE (Shanghai)" },
          { value: "TOCOM", label: "TOCOM (Tokyo)" },
          { value: "Other", label: "Other" },
        ],
      },
      {
        key: "instrument_kind",
        label: "Instrument",
        type: "select",
        options: [
          { value: "", label: "Select instrument…" },
          { value: "future", label: "Future" },
          { value: "option", label: "Option" },
          { value: "spot", label: "Spot / Physical" },
          { value: "etf", label: "ETF / ETC" },
        ],
      },
      {
        key: "option_type",
        label: "Option type",
        type: "select",
        options: [
          { value: "", label: "N/A" },
          { value: "call", label: "Call" },
          { value: "put", label: "Put" },
        ],
      },
      {
        key: "side",
        label: "Side",
        type: "select",
        options: [
          { value: "", label: "Select side…" },
          { value: "long", label: "Long (Buy)" },
          { value: "short", label: "Short (Sell / Write)" },
        ],
      },
      { key: "strike", label: "Strike price", type: "number", placeholder: "2050.00", step: 0.01 },
      { key: "expiry", label: "Expiry (YYYY-MM-DD)", type: "text", placeholder: "2025-12-26" },
      {
        key: "broker",
        label: "Broker / Clearer",
        type: "text",
        placeholder: "Interactive Brokers, ADM…",
      },
    ],
  },
  managed_strategy: {
    key: "managed_strategy",
    label: "Managed Strategy",
    description: "Allocation to an in-house Hudson Crest strategy. No instrument-level rows.",
    defaultUnit: "units",
    symbolHint: "HCC-ALPHA, HCC-INCOME…",
    columns: [
      ...baseCols,
      { key: "quantity", label: "Units", render: (h) => fmtNum(h.quantity, 4) },
      {
        key: "avg_cost",
        label: "Subscription NAV",
        render: (h) => fmtMoney(h.avg_cost, h.currency),
      },
      {
        key: "mark_price",
        label: "Latest NAV",
        render: (h) => (h.mark_price != null ? fmtMoney(h.mark_price, h.currency) : "—"),
      },
      { key: "strategy", label: "Strategy", render: (h) => h.details?.strategy_name ?? h.symbol },
      { key: "benchmark", label: "Benchmark", render: (h) => h.details?.benchmark ?? "—" },
      pnlCol,
    ],
    detailFields: [
      {
        key: "strategy_name",
        label: "Strategy name",
        type: "text",
        placeholder: "Hudson Alpha Equity",
      },
      {
        key: "mandate",
        label: "Mandate",
        type: "select",
        options: [
          { value: "", label: "Select mandate…" },
          { value: "Long-only growth", label: "Long only growth" },
          { value: "Long/short equity", label: "Long/short equity" },
          { value: "Income / yield", label: "Income / yield" },
          { value: "Multi-asset", label: "Multi asset" },
          { value: "Macro", label: "Macro" },
          { value: "Market neutral", label: "Market neutral" },
        ],
      },
      { key: "benchmark", label: "Benchmark", type: "text", placeholder: "S&P 500 TR" },
      {
        key: "inception_date",
        label: "Inception (your subscription)",
        type: "text",
        placeholder: "YYYY-MM-DD",
      },
      {
        key: "mgmt_fee_pct",
        label: "Mgmt fee (% / yr)",
        type: "number",
        placeholder: "1.50",
        min: 0,
        max: 10,
        step: 0.01,
      },
      {
        key: "perf_fee_pct",
        label: "Performance fee (%)",
        type: "number",
        placeholder: "20",
        min: 0,
        max: 50,
        step: 0.5,
      },
      {
        key: "lockup_months",
        label: "Lock-up (months)",
        type: "number",
        placeholder: "0",
        min: 0,
        max: 120,
        step: 1,
      },
    ],
  },
};

export const ASSET_CLASS_LIST = Object.values(ASSET_CLASSES);
