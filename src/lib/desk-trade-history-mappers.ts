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

export function mapTradeToBuyDisplay(t: TradeHistoryRow): DeskBuyTradeDisplay {
  const d = new Date(t.executed_at);
  const gross = Number(t.gross_amount);
  const fees = Number(t.fees);
  const comm = Number(t.commission);
  const total = Number.isFinite(gross) ? gross - fees - comm : NaN;
  const side = String(t.side).toLowerCase();
  const isBuy = side.includes("buy");
  return {
    tradeDate: d.toLocaleDateString(),
    tradeTime: d.toLocaleTimeString(),
    tradeRefNo: t.order_id?.slice(0, 12) ?? "—",
    subscription: t.instrument_name || "—",
    index: "—",
    assetClass: t.symbol?.length <= 5 ? "Listed equity / ADR" : "Derivative / other",
    cusipOrSymbol: t.symbol || "—",
    quantity: fmtNum(Number(t.quantity)),
    bidPrice: isBuy ? fmtNum(Number(t.price), 6) : "—",
    strikePrice: "—",
    tradeAmount: fmtMoney(gross, t.currency),
    tradeFees: fmtMoney(fees, t.currency),
    tradeTotal: fmtMoney(total, t.currency),
    status: "Filled",
  };
}

export function mapTradeToSellDisplay(t: TradeHistoryRow): DeskSellTradeDisplay {
  const d = new Date(t.executed_at);
  return {
    sellTxnNo: t.id?.slice(0, 12) ?? "—",
    sellDate: d.toLocaleDateString(),
    productSymbol: t.symbol || "—",
    sellPricePerUnit: fmtNum(Number(t.price), 6),
    quantity: fmtNum(Number(t.quantity)),
    totalSellAmount: fmtMoney(Number(t.gross_amount), t.currency),
    status: "Filled",
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
