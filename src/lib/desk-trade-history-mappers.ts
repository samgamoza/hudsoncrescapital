import { ASSET_CLASSES, type AssetClass } from "@/lib/assetClasses";
import type { TradeHistoryRow } from "@/lib/trade-history.types";

/** Display row for “Trading record — Buy” (14 columns, CrossOcean-style). */
export type DeskBuyTradeDisplay = {
  tradeDate: string;
  tradeTime: string;
  tradeRefNo: string;
  subscription: string;
  index: string;
  assetClass: string;
  cusipOrSymbol: string;
  quantity: string;
  bidPrice: string;
  strikePrice: string;
  tradeAmount: string;
  tradeFees: string;
  tradeTotal: string;
  status: string;
};

/** Display row for “Trading record — Sell” (7 columns). */
export type DeskSellTradeDisplay = {
  sellTxnNo: string;
  sellDate: string;
  productSymbol: string;
  sellPricePerUnit: string;
  quantity: string;
  totalSellAmount: string;
  status: string;
};

function fmtNum(n: number, maxFrac = 6) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: maxFrac });
}

function fmtMoney(n: number, currency: string) {
  if (!Number.isFinite(n)) return "—";
  try {
    return n.toLocaleString(undefined, { style: "currency", currency: currency || "USD" });
  } catch {
    return fmtNum(n, 2);
  }
}

function strVal(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s.length ? s : undefined;
}

function tradeRefNo(t: TradeHistoryRow): string {
  const b = t.broker_execution_id?.trim();
  if (b) return b;
  const o = t.order_id?.trim();
  if (o) return o.length > 14 ? `${o.slice(0, 14)}…` : o;
  return t.id.length > 14 ? `${t.id.slice(0, 14)}…` : t.id;
}

function pickIndex(t: TradeHistoryRow): string {
  const d = t.position_details;
  const m = t.instrument_metadata;
  return (
    strVal(d?.index) ??
    strVal(m?.index) ??
    strVal(d?.benchmark) ??
    strVal(m?.benchmark) ??
    strVal(d?.exchange) ??
    strVal(t.instrument_exchange) ??
    "—"
  );
}

function subscriptionLine(t: TradeHistoryRow): string {
  const name = (t.position_display_name ?? "").trim() || t.instrument_name || "—";
  const d = t.position_details;
  const contract = strVal(d?.contract_name);
  const sym = (t.symbol ?? "").trim();
  if (contract && contract.toUpperCase() !== sym.toUpperCase() && !name.toUpperCase().includes(contract.toUpperCase())) {
    return `${name} · ${contract}`;
  }
  return name;
}

const INSTRUMENT_DB_CLASS_LABELS: Record<string, string> = {
  equity: "Listed equity",
  etf: "ETF",
  crypto: "Crypto",
  fx: "FX",
  commodity: "Commodity",
  bond: "Bond",
  option: "Option",
  future: "Future",
};

function instrumentClassLabel(ac: string | null): string {
  if (!ac) return "—";
  return INSTRUMENT_DB_CLASS_LABELS[ac] ?? ac.replace(/_/g, " ");
}

function resolveClass(t: TradeHistoryRow): string {
  if (t.holding_pool_asset_class) {
    const k = t.holding_pool_asset_class as AssetClass;
    const lbl = ASSET_CLASSES[k]?.label;
    if (lbl) return lbl;
  }
  return instrumentClassLabel(t.instrument_asset_class);
}

function cusipColumn(t: TradeHistoryRow): string {
  const d = t.position_details;
  return strVal(d?.cusip) ?? strVal(d?.isin) ?? t.symbol ?? "—";
}

function formatStrikeColumn(t: TradeHistoryRow): string {
  const d = t.position_details;
  const m = t.instrument_metadata;
  const rawStrike = d?.strike ?? m?.strike;
  const optRaw = (d?.option_type ?? m?.option_type) as string | undefined;
  if (rawStrike == null && !strVal(optRaw)) return "—";

  let strikePart = "—";
  if (rawStrike != null) {
    const n = Number(rawStrike);
    strikePart = Number.isFinite(n) ? fmtMoney(n, t.currency) : String(rawStrike);
  }

  const o = strVal(optRaw)?.toLowerCase();
  const optLabel = o === "call" || o === "put" ? o.toUpperCase() : strVal(optRaw)?.toUpperCase();
  return optLabel ? `${strikePart} ${optLabel}` : strikePart;
}

function orderStatusLabel(status: string | null): string {
  if (!status) return "Filled";
  return status
    .split("_")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function mapTradeToBuyDisplay(t: TradeHistoryRow): DeskBuyTradeDisplay {
  const d = new Date(t.executed_at);
  const gross = Number(t.gross_amount);
  const fees = Number(t.fees);
  const comm = Number(t.commission);
  const feeTotal = (Number.isFinite(fees) ? fees : 0) + (Number.isFinite(comm) ? comm : 0);
  const total = Number.isFinite(gross) ? gross - feeTotal : NaN;
  const side = String(t.side).toLowerCase();
  const isBuy = side.includes("buy");
  return {
    tradeDate: d.toLocaleDateString(),
    tradeTime: d.toLocaleTimeString(),
    tradeRefNo: tradeRefNo(t),
    subscription: subscriptionLine(t),
    index: pickIndex(t),
    assetClass: resolveClass(t),
    cusipOrSymbol: cusipColumn(t),
    quantity: fmtNum(Number(t.quantity)),
    bidPrice: isBuy ? fmtNum(Number(t.price), 6) : "—",
    strikePrice: formatStrikeColumn(t),
    tradeAmount: fmtMoney(gross, t.currency),
    tradeFees: fmtMoney(feeTotal, t.currency),
    tradeTotal: fmtMoney(total, t.currency),
    status: orderStatusLabel(t.order_status),
  };
}

export function mapTradeToSellDisplay(t: TradeHistoryRow): DeskSellTradeDisplay {
  const d = new Date(t.executed_at);
  const sub = (t.position_display_name ?? "").trim();
  const sym = t.symbol || "—";
  const product = sub && sub.toUpperCase() !== sym.toUpperCase() ? `${sub} (${sym})` : sym;
  return {
    sellTxnNo: t.id?.slice(0, 12) ?? "—",
    sellDate: d.toLocaleDateString(),
    productSymbol: product,
    sellPricePerUnit: fmtNum(Number(t.price), 6),
    quantity: fmtNum(Number(t.quantity)),
    totalSellAmount: fmtMoney(Number(t.gross_amount), t.currency),
    status: orderStatusLabel(t.order_status),
  };
}

export const DESK_BUY_COLUMN_HEADERS = [
  "Trade Date",
  "Trade Time",
  "Trade Ref.No.",
  "Subscription",
  "Index",
  "Class",
  "Cusip No.",
  "Quantity",
  "Bid Price",
  "Strike Price",
  "Trade Amount",
  "Trade Fees",
  "Trade Total",
  "Status",
] as const;

export const DESK_SELL_COLUMN_HEADERS = [
  "Sell Transaction Number",
  "Sell Date",
  "Product/Ticker Symbol",
  "Sell Price per Unit",
  "Quantity",
  "Total Sell Amount",
  "Status",
] as const;
