import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { StaffTradeHistoryRow, TradeHistoryRow } from "@/lib/trade-history.types";

/** Investor: executions for all accounts owned by the signed-in user. */
export const getMyTradeHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TradeHistoryRow[]> => {
    const { userId } = context;

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
        "id, side, quantity, price, gross_amount, fees, commission, currency, executed_at, account_id, order_id, instrument_id"
      )
      .in("account_id", accountIds)
      .order("executed_at", { ascending: false })
      .limit(500);
    if (tErr) throw new Error(tErr.message);
    if (!trades?.length) return [];

    const instIds = [...new Set(trades.map((t: any) => t.instrument_id as string))];
    const { data: insts, error: iErr } = await supabaseAdmin
      .from("instruments")
      .select("id, symbol, name")
      .in("id", instIds);
    if (iErr) throw new Error(iErr.message);

    const byInst = Object.fromEntries((insts ?? []).map((i: any) => [i.id as string, i]));

    return trades.map((t: any) => {
      const inst = byInst[t.instrument_id as string];
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
  });

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
export const getStaffTradeHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StaffTradeHistoryRow[]> => {
    const { getRolesForUser, isStaff } = await import("./_shared.server");
    const roles = await getRolesForUser(context.userId);
    if (!isStaff(roles)) throw new Error("Forbidden: staff access required");

    const { data: trades, error: tErr } = await supabaseAdmin
      .from("trades")
      .select(
        "id, side, quantity, price, gross_amount, fees, commission, currency, executed_at, account_id, order_id, instrument_id",
      )
      .order("executed_at", { ascending: false })
      .limit(500);
    if (tErr) throw new Error(tErr.message);
    if (!trades?.length) return [];

    const accountIds = [...new Set(trades.map((t: any) => t.account_id as string))];
    const { data: accounts, error: aErr } = await supabaseAdmin
      .from("accounts")
      .select("id, user_id, account_number")
      .in("id", accountIds);
    if (aErr) throw new Error(aErr.message);

    const accountById = Object.fromEntries((accounts ?? []).map((a: any) => [a.id as string, a]));
    const investorIds = [...new Set((accounts ?? []).map((a: any) => a.user_id as string))];
    const emails = await emailsForUserIds(investorIds);

    const instIds = [...new Set(trades.map((t: any) => t.instrument_id as string))];
    const { data: insts, error: iErr } = await supabaseAdmin
      .from("instruments")
      .select("id, symbol, name")
      .in("id", instIds);
    if (iErr) throw new Error(iErr.message);

    const byInst = Object.fromEntries((insts ?? []).map((i: any) => [i.id as string, i]));

    return trades.map((t: any) => {
      const inst = byInst[t.instrument_id as string];
      const acct = accountById[t.account_id as string];
      const uid = (acct?.user_id as string) ?? "";
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
        client_email: uid ? emails[uid] ?? null : null,
        account_number: acct?.account_number ?? null,
      };
    });
  });
