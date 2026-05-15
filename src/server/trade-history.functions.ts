import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import type { StaffTradeHistoryRow, TradeHistoryRow } from "@/lib/trade-history.types";

type TradeQueryRow = {
  id: string;
  side: string;
  quantity: number | string | null;
  price: number | string | null;
  gross_amount: number | string | null;
  fees: number | string | null;
  commission: number | string | null;
  currency: string;
  executed_at: string;
  account_id: string;
  order_id: string;
  instrument_id: string;
  broker_execution_id: string | null;
};

type InstrumentLookupRow = {
  id: string;
  symbol: string | null;
  name: string | null;
  exchange: string | null;
  asset_class: string | null;
  metadata: Json | null;
};

type AccountLookupRow = {
  id: string;
  user_id: string | null;
  account_number: string | null;
};

type HoldingLookupRow = {
  account_id: string;
  symbol: string;
  details: Json | null;
  display_name: string | null;
  updated_at: string;
  sub_portfolios: { asset_class: string } | { asset_class: string }[] | null;
};

function normSym(s: string | null | undefined) {
  return (s ?? "").trim().toUpperCase();
}

function jsonToRecord(j: Json | null): Record<string, unknown> | null {
  if (j && typeof j === "object" && !Array.isArray(j)) return j as Record<string, unknown>;
  return null;
}

function subPortfolioAssetClass(
  sp: HoldingLookupRow["sub_portfolios"],
): string | null {
  if (!sp) return null;
  const row = Array.isArray(sp) ? sp[0] : sp;
  return row?.asset_class ?? null;
}

type HoldingPick = {
  details: Record<string, unknown> | null;
  display_name: string | null;
  updated_at: string;
  pool_asset_class: string | null;
};

async function assembleTradeHistoryRows(tradeRows: TradeQueryRow[]): Promise<TradeHistoryRow[]> {
  const instIds = [...new Set(tradeRows.map((t) => t.instrument_id))];
  const { data: insts, error: iErr } = await supabaseAdmin
    .from("instruments")
    .select("id, symbol, name, exchange, asset_class, metadata")
    .in("id", instIds);
  if (iErr) throw new Error(iErr.message);

  const byInst = Object.fromEntries(((insts ?? []) as InstrumentLookupRow[]).map((i) => [i.id, i]));

  const orderIds = [...new Set(tradeRows.map((t) => t.order_id).filter(Boolean))];
  const orderStatusById: Record<string, string> = {};
  if (orderIds.length > 0) {
    const { data: ords, error: oErr } = await supabaseAdmin.from("orders").select("id, status").in("id", orderIds);
    if (oErr) throw new Error(oErr.message);
    for (const o of ords ?? []) {
      const row = o as { id: string; status: string };
      orderStatusById[row.id] = row.status;
    }
  }

  const holdAccountIds = [...new Set(tradeRows.map((t) => t.account_id))];
  const holdingByAccountSymbol = new Map<string, HoldingPick>();
  if (holdAccountIds.length > 0) {
    const { data: holds, error: hErr } = await supabaseAdmin
      .from("sub_portfolio_holdings")
      .select("account_id, symbol, details, display_name, updated_at, sub_portfolios(asset_class)")
      .in("account_id", holdAccountIds);
    if (hErr) throw new Error(hErr.message);

    for (const raw of (holds ?? []) as HoldingLookupRow[]) {
      const key = `${raw.account_id}:${normSym(raw.symbol)}`;
      const next: HoldingPick = {
        details: jsonToRecord(raw.details),
        display_name: raw.display_name,
        updated_at: raw.updated_at ?? "",
        pool_asset_class: subPortfolioAssetClass(raw.sub_portfolios),
      };
      const prev = holdingByAccountSymbol.get(key);
      if (!prev || next.updated_at > prev.updated_at) holdingByAccountSymbol.set(key, next);
    }
  }

  return tradeRows.map((t) => {
    const inst = byInst[t.instrument_id];
    const sym = inst?.symbol ?? "";
    const hold = holdingByAccountSymbol.get(`${t.account_id}:${normSym(sym)}`);
    return {
      id: t.id,
      side: t.side,
      quantity: Number(t.quantity),
      price: Number(t.price),
      gross_amount: Number(t.gross_amount),
      fees: Number(t.fees),
      commission: Number(t.commission),
      currency: t.currency,
      executed_at: t.executed_at,
      account_id: t.account_id,
      order_id: t.order_id,
      instrument_id: t.instrument_id,
      symbol: sym || "—",
      instrument_name: inst?.name ?? "—",
      broker_execution_id: t.broker_execution_id ?? null,
      instrument_exchange: inst?.exchange ?? null,
      instrument_asset_class: inst?.asset_class ?? null,
      instrument_metadata: jsonToRecord(inst?.metadata ?? null),
      order_status: t.order_id ? (orderStatusById[t.order_id] ?? null) : null,
      position_details: hold?.details ?? null,
      position_display_name: hold?.display_name ?? null,
      holding_pool_asset_class: hold?.pool_asset_class ?? null,
    };
  });
}

/** Investor: executions for all accounts owned by the signed-in user. */
export async function getMyTradeHistoryForApi(userId: string): Promise<TradeHistoryRow[]> {
  const { data: accounts, error: accErr } = await supabaseAdmin
    .from("accounts")
    .select("id")
    .eq("user_id", userId);
  if (accErr) throw new Error(accErr.message);

  const accountIds = (accounts ?? []).map((a) => a.id);
  if (accountIds.length === 0) return [];

  const { data: trades, error: tErr } = await supabaseAdmin
    .from("trades")
    .select(
      "id, side, quantity, price, gross_amount, fees, commission, currency, executed_at, account_id, order_id, instrument_id, broker_execution_id",
    )
    .in("account_id", accountIds)
    .order("executed_at", { ascending: false })
    .limit(500);
  if (tErr) throw new Error(tErr.message);
  if (!trades?.length) return [];

  return assembleTradeHistoryRows(trades as TradeQueryRow[]);
}

/** TanStack server-fn surface — delegates to the plain helper above. */
export const getMyTradeHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(({ context }) => getMyTradeHistoryForApi(context.userId));

async function emailsForUserIds(userIds: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(userIds)].filter(Boolean);
  const out: Record<string, string> = {};
  const chunk = 20;
  for (let i = 0; i < unique.length; i += chunk) {
    const slice = unique.slice(i, i + chunk);
    const results = await Promise.all(slice.map((id) => supabaseAdmin.auth.admin.getUserById(id)));
    results.forEach((res, j) => {
      const email = res.data.user?.email;
      if (email) out[slice[j]] = email;
    });
  }
  return out;
}

/** Staff: recent executions across all accounts (newest first). */
export async function getStaffTradeHistoryForApi(
  actorUserId: string,
): Promise<StaffTradeHistoryRow[]> {
  const { requireMinRole } = await import("./_shared.server");
  await requireMinRole(actorUserId, "support");

  const { data: trades, error: tErr } = await supabaseAdmin
    .from("trades")
    .select(
      "id, side, quantity, price, gross_amount, fees, commission, currency, executed_at, account_id, order_id, instrument_id, broker_execution_id",
    )
    .order("executed_at", { ascending: false })
    .limit(500);
  if (tErr) throw new Error(tErr.message);
  if (!trades?.length) return [];

  const tradeRows = trades as TradeQueryRow[];
  const accountIds = [...new Set(tradeRows.map((t) => t.account_id))];
  const { data: accounts, error: aErr } = await supabaseAdmin
    .from("accounts")
    .select("id, user_id, account_number")
    .in("id", accountIds);
  if (aErr) throw new Error(aErr.message);

  const accountRows = (accounts ?? []) as AccountLookupRow[];
  const accountById = Object.fromEntries(accountRows.map((a) => [a.id, a]));
  const investorIds = [
    ...new Set(accountRows.map((a) => a.user_id).filter((id): id is string => Boolean(id))),
  ];
  const emails = await emailsForUserIds(investorIds);

  const baseRows = await assembleTradeHistoryRows(tradeRows);

  return baseRows.map((row) => {
    const acct = accountById[row.account_id];
    const uid = acct?.user_id ?? "";
    return {
      ...row,
      investor_user_id: uid,
      client_email: uid ? (emails[uid] ?? null) : null,
      account_number: acct?.account_number ?? null,
    };
  });
}

/** TanStack server-fn surface — delegates to the plain helper above. */
export const getStaffTradeHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(({ context }) => getStaffTradeHistoryForApi(context.userId));
