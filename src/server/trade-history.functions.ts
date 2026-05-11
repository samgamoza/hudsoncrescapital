import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
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
};

type InstrumentLookupRow = {
  id: string;
  symbol: string | null;
  name: string | null;
};

type AccountLookupRow = {
  id: string;
  user_id: string | null;
  account_number: string | null;
};

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
      "id, side, quantity, price, gross_amount, fees, commission, currency, executed_at, account_id, order_id, instrument_id",
    )
    .in("account_id", accountIds)
    .order("executed_at", { ascending: false })
    .limit(500);
  if (tErr) throw new Error(tErr.message);
  if (!trades?.length) return [];

  const tradeRows = trades as TradeQueryRow[];
  const instIds = [...new Set(tradeRows.map((t) => t.instrument_id))];
  const { data: insts, error: iErr } = await supabaseAdmin
    .from("instruments")
    .select("id, symbol, name")
    .in("id", instIds);
  if (iErr) throw new Error(iErr.message);

  const byInst = Object.fromEntries(((insts ?? []) as InstrumentLookupRow[]).map((i) => [i.id, i]));

  return tradeRows.map((t) => {
    const inst = byInst[t.instrument_id];
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
      symbol: inst?.symbol ?? "—",
      instrument_name: inst?.name ?? "—",
    };
  });
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
      "id, side, quantity, price, gross_amount, fees, commission, currency, executed_at, account_id, order_id, instrument_id",
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

  const instIds = [...new Set(tradeRows.map((t) => t.instrument_id))];
  const { data: insts, error: iErr } = await supabaseAdmin
    .from("instruments")
    .select("id, symbol, name")
    .in("id", instIds);
  if (iErr) throw new Error(iErr.message);

  const byInst = Object.fromEntries(((insts ?? []) as InstrumentLookupRow[]).map((i) => [i.id, i]));

  return tradeRows.map((t) => {
    const inst = byInst[t.instrument_id];
    const acct = accountById[t.account_id];
    const uid = acct?.user_id ?? "";
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
      symbol: inst?.symbol ?? "—",
      instrument_name: inst?.name ?? "—",
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
