import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { InvestorOrderRow, InvestorTradingWorkspace, TradableInstrument, TradingAccount } from "@/lib/trading.types";

function nearlyIntegerMultiple(value: number, step: number): boolean {
  if (step <= 0) return true;
  const n = value / step;
  return Math.abs(n - Math.round(n)) < 1e-7;
}

function nearlyTickAligned(price: number, tick: number): boolean {
  if (tick <= 0) return true;
  const n = price / tick;
  return Math.abs(n - Math.round(n)) < 1e-7;
}

const placeOrderInput = z
  .object({
    accountId: z.string().uuid(),
    instrumentId: z.string().uuid(),
    side: z.enum(["buy", "sell"]),
    orderType: z.enum(["market", "limit", "stop", "stop_limit"]),
    quantity: z.number().positive().max(1e12),
    timeInForce: z.enum(["day", "gtc", "ioc", "fok"]).default("day"),
    limitPrice: z.number().positive().optional().nullable(),
    stopPrice: z.number().positive().optional().nullable(),
    clientOrderId: z.string().trim().max(64).optional().nullable(),
  })
  .superRefine((d, ctx) => {
    if (d.orderType === "market") {
      if (d.limitPrice != null) ctx.addIssue({ code: "custom", message: "Limit price must be empty for market orders", path: ["limitPrice"] });
      if (d.stopPrice != null) ctx.addIssue({ code: "custom", message: "Stop price must be empty for market orders", path: ["stopPrice"] });
    }
    if (d.orderType === "limit") {
      if (d.limitPrice == null || d.limitPrice <= 0)
        ctx.addIssue({ code: "custom", message: "Limit price is required", path: ["limitPrice"] });
      if (d.stopPrice != null) ctx.addIssue({ code: "custom", message: "Stop price must be empty for limit orders", path: ["stopPrice"] });
    }
    if (d.orderType === "stop") {
      if (d.stopPrice == null || d.stopPrice <= 0)
        ctx.addIssue({ code: "custom", message: "Stop price is required", path: ["stopPrice"] });
      if (d.limitPrice != null) ctx.addIssue({ code: "custom", message: "Limit price must be empty for stop orders", path: ["limitPrice"] });
    }
    if (d.orderType === "stop_limit") {
      if (d.limitPrice == null || d.limitPrice <= 0)
        ctx.addIssue({ code: "custom", message: "Limit price is required for stop-limit orders", path: ["limitPrice"] });
      if (d.stopPrice == null || d.stopPrice <= 0)
        ctx.addIssue({ code: "custom", message: "Stop price is required for stop-limit orders", path: ["stopPrice"] });
    }
  });

const cancelOrderInput = z.object({ orderId: z.string().uuid() });

const executionScopeInput = z
  .object({
    accountId: z.string().uuid().optional(),
    statuses: z.array(z.string()).optional(),
    limit: z.number().int().min(10).max(500).optional().default(200),
  })
  .default({ limit: 200 });

const markWorkingInput = z.object({ orderId: z.string().uuid() });

const rejectOrderInput = z.object({
  orderId: z.string().uuid(),
  reason: z.string().trim().min(3).max(500),
});

const expireOrderInput = z.object({
  orderId: z.string().uuid(),
  reason: z.string().trim().max(500).optional(),
});

const manualFillInput = z.object({
  orderId: z.string().uuid(),
  quantity: z.number().positive().max(1e12),
  price: z.number().positive().max(1e12),
  fees: z.number().min(0).max(1e9).optional().default(0),
  commission: z.number().min(0).max(1e9).optional().default(0),
  brokerExecutionId: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
});

type OrderExecutionRow = {
  id: string;
  account_id: string;
  account_number: string | null;
  user_id: string | null;
  client_email: string | null;
  instrument_id: string;
  symbol: string;
  instrument_name: string;
  side: string;
  order_type: string;
  time_in_force: string;
  quantity: number;
  filled_quantity: number;
  remaining_quantity: number;
  avg_fill_price: number | null;
  limit_price: number | null;
  stop_price: number | null;
  status: string;
  rejection_reason: string | null;
  placed_at: string;
  filled_at: string | null;
};

type ExecutionWorkspace = {
  orders: OrderExecutionRow[];
  statusCounts: Record<string, number>;
};

function isFinalOrderStatus(status: string): boolean {
  return ["filled", "cancelled", "rejected", "expired"].includes(status);
}

function isOpenOrderStatus(status: string): boolean {
  return ["pending", "working", "partially_filled"].includes(status);
}

function computeWeightedAverage(
  prevQty: number,
  prevAvg: number | null,
  fillQty: number,
  fillPrice: number,
): number {
  const oldAvg = Number(prevAvg ?? 0);
  const totalQty = prevQty + fillQty;
  if (totalQty <= 0) return 0;
  return (prevQty * oldAvg + fillQty * fillPrice) / totalQty;
}

async function getCurrentCashBalance(accountId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("cash_ledger")
    .select("balance_after")
    .eq("account_id", accountId)
    .order("posted_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Number(data?.balance_after ?? 0);
}

async function resolveAdminEmails(userIds: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(userIds)].filter(Boolean);
  const out: Record<string, string> = {};
  if (unique.length === 0) return out;
  const chunk = 25;
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

export async function loadInvestorTradingWorkspaceForApi(userId: string): Promise<InvestorTradingWorkspace> {
  const [instQ, accQ] = await Promise.all([
    supabaseAdmin
      .from("instruments")
      .select("id, symbol, name, asset_class, currency, exchange, tick_size, lot_size, is_tradable")
      .eq("is_tradable", true)
      .order("symbol", { ascending: true }),
    supabaseAdmin
      .from("accounts")
      .select("id, account_number, status, base_currency, account_type")
      .eq("user_id", userId)
      .eq("status", "active"),
  ]);

  if (instQ.error) throw new Error(instQ.error.message);
  if (accQ.error) throw new Error(accQ.error.message);

  const instruments: TradableInstrument[] = (instQ.data ?? []).map((r: any) => ({
    id: r.id,
    symbol: r.symbol,
    name: r.name,
    asset_class: r.asset_class,
    currency: r.currency,
    exchange: r.exchange,
    tick_size: Number(r.tick_size),
    lot_size: Number(r.lot_size),
  }));

  const accounts: TradingAccount[] = (accQ.data ?? []).map((r: any) => ({
    id: r.id,
    account_number: r.account_number,
    status: r.status,
    base_currency: r.base_currency,
    account_type: r.account_type,
  }));

  const accountIds = accounts.map((a) => a.id);
  let orders: InvestorOrderRow[] = [];
  if (accountIds.length > 0) {
    const ordQ = await supabaseAdmin
      .from("orders")
      .select(
        "id, account_id, instrument_id, side, order_type, time_in_force, quantity, limit_price, stop_price, status, filled_quantity, avg_fill_price, rejection_reason, placed_at, cancelled_at, filled_at, client_order_id",
      )
      .in("account_id", accountIds)
      .order("placed_at", { ascending: false })
      .limit(150);
    if (ordQ.error) throw new Error(ordQ.error.message);
    const raw = ordQ.data ?? [];
    const instIds = [...new Set(raw.map((o: any) => o.instrument_id as string))];
    const { data: instRows, error: iErr } = await supabaseAdmin
      .from("instruments")
      .select("id, symbol, name")
      .in("id", instIds);
    if (iErr) throw new Error(iErr.message);
    const instById = Object.fromEntries((instRows ?? []).map((i: any) => [i.id as string, i]));
    const acctById = Object.fromEntries(accounts.map((a) => [a.id, a]));

    orders = raw.map((o: any) => {
      const inst = instById[o.instrument_id as string];
      const acct = acctById[o.account_id as string];
      return {
        id: o.id,
        account_id: o.account_id,
        account_number: acct?.account_number ?? null,
        instrument_id: o.instrument_id,
        symbol: inst?.symbol ?? "—",
        instrument_name: inst?.name ?? "—",
        side: o.side,
        order_type: o.order_type,
        time_in_force: o.time_in_force,
        quantity: Number(o.quantity),
        limit_price: o.limit_price != null ? Number(o.limit_price) : null,
        stop_price: o.stop_price != null ? Number(o.stop_price) : null,
        status: o.status,
        filled_quantity: Number(o.filled_quantity ?? 0),
        avg_fill_price: o.avg_fill_price != null ? Number(o.avg_fill_price) : null,
        rejection_reason: o.rejection_reason,
        placed_at: o.placed_at,
        cancelled_at: o.cancelled_at,
        filled_at: o.filled_at,
        client_order_id: o.client_order_id,
      };
    });
  }

  let account_snapshots:
    | {
        account_id: string;
        account_number: string;
        base_currency: string;
        cash_balance: number;
        open_position_count: number;
        realized_pnl: number;
      }[]
    | undefined;

  if (accountIds.length > 0) {
    const [posQ, ...cashBalances] = await Promise.all([
      supabaseAdmin
        .from("positions")
        .select("account_id, quantity, realized_pnl")
        .in("account_id", accountIds),
      ...accountIds.map((id) =>
        getCurrentCashBalance(id).then((cash) => ({ accountId: id, cash })),
      ),
    ]);
    if (posQ.error) throw new Error(posQ.error.message);

    const cashById = Object.fromEntries(
      (cashBalances as { accountId: string; cash: number }[]).map((x) => [x.accountId, x.cash]),
    );
    const posAgg: Record<
      string,
      { openCount: number; realized: number }
    > = {};
    for (const id of accountIds) posAgg[id] = { openCount: 0, realized: 0 };
    for (const row of posQ.data ?? []) {
      const aid = row.account_id as string;
      if (!posAgg[aid]) continue;
      const q = Number(row.quantity ?? 0);
      if (Math.abs(q) > 1e-8) posAgg[aid].openCount += 1;
      posAgg[aid].realized += Number(row.realized_pnl ?? 0);
    }

    account_snapshots = accounts.map((a) => ({
      account_id: a.id,
      account_number: a.account_number,
      base_currency: a.base_currency,
      cash_balance: cashById[a.id] ?? 0,
      open_position_count: posAgg[a.id]?.openCount ?? 0,
      realized_pnl: posAgg[a.id]?.realized ?? 0,
    }));
  }

  return { instruments, accounts, orders, account_snapshots };
}

export async function placeInvestorOrderForApi(userId: string, raw: unknown) {
  const data = placeOrderInput.parse(raw);
  const { audit } = await import("./_shared.server");

  const { data: acct, error: aErr } = await supabaseAdmin
    .from("accounts")
    .select("id, user_id, status, base_currency")
    .eq("id", data.accountId)
    .single();
  if (aErr || !acct) throw new Error("Account not found");
  if (acct.user_id !== userId) throw new Error("Account not found");
  if (acct.status !== "active") throw new Error("Account must be active to trade");

  const { data: inst, error: iErr } = await supabaseAdmin
    .from("instruments")
    .select("id, symbol, is_tradable, tick_size, lot_size, currency")
    .eq("id", data.instrumentId)
    .single();
  if (iErr || !inst) throw new Error("Instrument not found");
  if (!inst.is_tradable) throw new Error("Instrument is not tradable");

  const tick = Number(inst.tick_size);
  const lot = Number(inst.lot_size);
  if (!nearlyIntegerMultiple(data.quantity, lot)) {
    throw new Error(`Quantity must be a whole-number multiple of lot size (${lot}).`);
  }
  const minQty = lot > 0 ? lot : 1e-8;
  if (data.quantity < minQty) throw new Error(`Minimum quantity is ${minQty}.`);

  let limitPrice: number | null = null;
  let stopPrice: number | null = null;

  if (data.orderType === "limit" || data.orderType === "stop_limit") {
    limitPrice = data.limitPrice!;
    if (!nearlyTickAligned(limitPrice, tick)) {
      throw new Error(`Limit price must align to tick size (${tick}).`);
    }
  }
  if (data.orderType === "stop" || data.orderType === "stop_limit") {
    stopPrice = data.stopPrice!;
    if (!nearlyTickAligned(stopPrice, tick)) {
      throw new Error(`Stop price must align to tick size (${tick}).`);
    }
  }

  const insertRow: Record<string, unknown> = {
    account_id: data.accountId,
    instrument_id: data.instrumentId,
    side: data.side,
    order_type: data.orderType,
    time_in_force: data.timeInForce,
    quantity: data.quantity,
    limit_price: limitPrice,
    stop_price: stopPrice,
    status: "pending",
    filled_quantity: 0,
    placed_by: userId,
    client_order_id: data.clientOrderId?.trim() || null,
  };

  const { data: row, error: insErr } = await supabaseAdmin
    .from("orders")
    .insert(insertRow as any)
    .select("id")
    .single();
  if (insErr) throw new Error(insErr.message);

  await audit({
    actorId: userId,
    action: "order.place",
    targetType: "order",
    targetId: row.id,
    targetUserId: userId,
    payload: {
      symbol: inst.symbol,
      side: data.side,
      orderType: data.orderType,
      quantity: data.quantity,
      timeInForce: data.timeInForce,
    },
  });

  return { ok: true as const, orderId: row.id as string };
}

export async function cancelInvestorOrderForApi(userId: string, raw: unknown) {
  const data = cancelOrderInput.parse(raw);
  const { audit } = await import("./_shared.server");

  const { data: ord, error: oErr } = await supabaseAdmin
    .from("orders")
    .select("id, account_id, status")
    .eq("id", data.orderId)
    .single();
  if (oErr || !ord) throw new Error("Order not found");

  const { data: acct } = await supabaseAdmin
    .from("accounts")
    .select("user_id")
    .eq("id", ord.account_id)
    .single();
  if (!acct || acct.user_id !== userId) throw new Error("Order not found");

  const st = ord.status as string;
  if (!isOpenOrderStatus(st)) {
    throw new Error("This order can no longer be cancelled.");
  }

  const { error: uErr } = await supabaseAdmin
    .from("orders")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    } as any)
    .eq("id", data.orderId);
  if (uErr) throw new Error(uErr.message);

  await audit({
    actorId: userId,
    action: "order.cancel.request",
    targetType: "order",
    targetId: data.orderId,
    targetUserId: userId,
    payload: { previousStatus: st },
  });

  return { ok: true as const };
}

export async function loadExecutionWorkspaceForApi(actorUserId: string, raw: unknown): Promise<ExecutionWorkspace> {
  const { requireMinRole } = await import("./_shared.server");
  await requireMinRole(actorUserId, "support");
  const input = executionScopeInput.parse(raw ?? {});
  const statuses = input.statuses?.length
    ? input.statuses
    : ["pending", "working", "partially_filled", "filled", "cancelled", "rejected", "expired"];

  let q = supabaseAdmin
    .from("orders")
    .select(
      "id, account_id, instrument_id, side, order_type, time_in_force, quantity, filled_quantity, avg_fill_price, limit_price, stop_price, status, rejection_reason, placed_at, filled_at",
    )
    .in("status", statuses as any)
    .order("placed_at", { ascending: false })
    .limit(input.limit);
  if (input.accountId) q = q.eq("account_id", input.accountId);

  const { data: ordersRaw, error: oErr } = await q;
  if (oErr) throw new Error(oErr.message);
  const orders = ordersRaw ?? [];
  if (orders.length === 0) {
    return { orders: [], statusCounts: {} };
  }

  const accountIds = [...new Set(orders.map((o: any) => o.account_id as string))];
  const instrumentIds = [...new Set(orders.map((o: any) => o.instrument_id as string))];
  const [acctQ, instQ] = await Promise.all([
    supabaseAdmin.from("accounts").select("id, user_id, account_number").in("id", accountIds),
    supabaseAdmin.from("instruments").select("id, symbol, name").in("id", instrumentIds),
  ]);
  if (acctQ.error) throw new Error(acctQ.error.message);
  if (instQ.error) throw new Error(instQ.error.message);

  const accountById = Object.fromEntries((acctQ.data ?? []).map((a: any) => [a.id as string, a]));
  const instById = Object.fromEntries((instQ.data ?? []).map((i: any) => [i.id as string, i]));
  const userIds = [...new Set((acctQ.data ?? []).map((a: any) => a.user_id as string).filter(Boolean))];
  const emails = await resolveAdminEmails(userIds);

  const statusCounts: Record<string, number> = {};
  const mapped: OrderExecutionRow[] = orders.map((o: any) => {
    const acct = accountById[o.account_id as string];
    const inst = instById[o.instrument_id as string];
    const qty = Number(o.quantity ?? 0);
    const filledQty = Number(o.filled_quantity ?? 0);
    statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
    return {
      id: o.id,
      account_id: o.account_id,
      account_number: acct?.account_number ?? null,
      user_id: acct?.user_id ?? null,
      client_email: acct?.user_id ? emails[acct.user_id] ?? null : null,
      instrument_id: o.instrument_id,
      symbol: inst?.symbol ?? "—",
      instrument_name: inst?.name ?? "—",
      side: o.side,
      order_type: o.order_type,
      time_in_force: o.time_in_force,
      quantity: qty,
      filled_quantity: filledQty,
      remaining_quantity: Math.max(0, qty - filledQty),
      avg_fill_price: o.avg_fill_price != null ? Number(o.avg_fill_price) : null,
      limit_price: o.limit_price != null ? Number(o.limit_price) : null,
      stop_price: o.stop_price != null ? Number(o.stop_price) : null,
      status: o.status,
      rejection_reason: o.rejection_reason ?? null,
      placed_at: o.placed_at,
      filled_at: o.filled_at ?? null,
    };
  });

  return { orders: mapped, statusCounts };
}

export async function markOrderWorkingForApi(actorUserId: string, raw: unknown) {
  const { requireMinRole, audit } = await import("./_shared.server");
  const data = markWorkingInput.parse(raw);
  const roles = await requireMinRole(actorUserId, "support");

  const { data: row, error } = await supabaseAdmin
    .from("orders")
    .select("id, status")
    .eq("id", data.orderId)
    .single();
  if (error || !row) throw new Error("Order not found");
  if (isFinalOrderStatus(row.status)) throw new Error("Order is already in a final state");

  if (row.status !== "working") {
    const { error: uErr } = await supabaseAdmin
      .from("orders")
      .update({ status: "working" } as any)
      .eq("id", data.orderId);
    if (uErr) throw new Error(uErr.message);
  }

  await audit({
    actorId: actorUserId,
    actorRoles: roles as any,
    action: "order.status.working",
    targetType: "order",
    targetId: data.orderId,
  });
  return { ok: true as const };
}

export async function rejectOrderForApi(actorUserId: string, raw: unknown) {
  const { requireMinRole, audit } = await import("./_shared.server");
  const data = rejectOrderInput.parse(raw);
  const roles = await requireMinRole(actorUserId, "support");

  const { data: row, error } = await supabaseAdmin
    .from("orders")
    .select("id, status")
    .eq("id", data.orderId)
    .single();
  if (error || !row) throw new Error("Order not found");
  if (isFinalOrderStatus(row.status)) throw new Error("Order is already in a final state");

  const { error: uErr } = await supabaseAdmin
    .from("orders")
    .update({
      status: "rejected",
      rejection_reason: data.reason,
      filled_at: null,
    } as any)
    .eq("id", data.orderId);
  if (uErr) throw new Error(uErr.message);

  await audit({
    actorId: actorUserId,
    actorRoles: roles as any,
    action: "order.status.rejected",
    targetType: "order",
    targetId: data.orderId,
    payload: { reason: data.reason },
  });
  return { ok: true as const };
}

export async function expireOrderForApi(actorUserId: string, raw: unknown) {
  const { requireMinRole, audit } = await import("./_shared.server");
  const data = expireOrderInput.parse(raw);
  const roles = await requireMinRole(actorUserId, "support");

  const { data: row, error } = await supabaseAdmin
    .from("orders")
    .select("id, status")
    .eq("id", data.orderId)
    .single();
  if (error || !row) throw new Error("Order not found");
  if (isFinalOrderStatus(row.status)) throw new Error("Order is already in a final state");

  const { error: uErr } = await supabaseAdmin
    .from("orders")
    .update({
      status: "expired",
      rejection_reason: data.reason ?? null,
      filled_at: null,
    } as any)
    .eq("id", data.orderId);
  if (uErr) throw new Error(uErr.message);

  await audit({
    actorId: actorUserId,
    actorRoles: roles as any,
    action: "order.status.expired",
    targetType: "order",
    targetId: data.orderId,
    payload: { reason: data.reason ?? null },
  });
  return { ok: true as const };
}

export async function fillOrderForApi(actorUserId: string, raw: unknown) {
  const { requireMinRole, audit } = await import("./_shared.server");
  const data = manualFillInput.parse(raw);
  const roles = await requireMinRole(actorUserId, "support");

  const { data: order, error: orderErr } = await supabaseAdmin
    .from("orders")
    .select(
      "id, account_id, instrument_id, side, quantity, status, filled_quantity, avg_fill_price, limit_price, stop_price",
    )
    .eq("id", data.orderId)
    .single();
  if (orderErr || !order) throw new Error("Order not found");
  if (isFinalOrderStatus(order.status)) throw new Error("Order is already in a final state");

  const [acctQ, instQ] = await Promise.all([
    supabaseAdmin
      .from("accounts")
      .select("id, user_id, base_currency, status")
      .eq("id", order.account_id)
      .single(),
    supabaseAdmin
      .from("instruments")
      .select("id, symbol, name, tick_size, lot_size")
      .eq("id", order.instrument_id)
      .single(),
  ]);
  if (acctQ.error || !acctQ.data) throw new Error("Account not found");
  if (instQ.error || !instQ.data) throw new Error("Instrument not found");
  if (acctQ.data.status !== "active") throw new Error("Cannot execute orders on inactive accounts");

  const lot = Number(instQ.data.lot_size ?? 1);
  const tick = Number(instQ.data.tick_size ?? 0.01);
  if (!nearlyIntegerMultiple(data.quantity, lot)) {
    throw new Error(`Fill quantity must be a multiple of lot size (${lot}).`);
  }
  if (!nearlyTickAligned(data.price, tick)) {
    throw new Error(`Fill price must align to tick size (${tick}).`);
  }

  const orderQty = Number(order.quantity);
  const prevFilledQty = Number(order.filled_quantity ?? 0);
  const remaining = orderQty - prevFilledQty;
  if (remaining <= 0) throw new Error("Order already fully filled");
  if (data.quantity > remaining + 1e-8) {
    throw new Error(`Fill quantity exceeds remaining amount (${remaining}).`);
  }

  const fillQty = data.quantity;
  const fillPrice = data.price;
  const gross = fillQty * fillPrice;
  const fees = Number(data.fees ?? 0);
  const commission = Number(data.commission ?? 0);
  const totalCosts = fees + commission;
  const newFilledQty = prevFilledQty + fillQty;
  const newAvg = computeWeightedAverage(
    prevFilledQty,
    order.avg_fill_price != null ? Number(order.avg_fill_price) : null,
    fillQty,
    fillPrice,
  );
  const fullyFilled = newFilledQty >= orderQty - 1e-8;
  const nextStatus = fullyFilled ? "filled" : "partially_filled";
  const nowIso = new Date().toISOString();

  const { data: trade, error: tErr } = await supabaseAdmin
    .from("trades")
    .insert({
      order_id: order.id,
      account_id: order.account_id,
      instrument_id: order.instrument_id,
      side: order.side,
      quantity: fillQty,
      price: fillPrice,
      gross_amount: gross,
      fees,
      commission,
      currency: acctQ.data.base_currency,
      broker_execution_id: data.brokerExecutionId?.trim() || null,
      executed_at: nowIso,
    } as any)
    .select("id")
    .single();
  if (tErr) throw new Error(tErr.message);

  const { error: oErr } = await supabaseAdmin
    .from("orders")
    .update({
      status: nextStatus,
      filled_quantity: newFilledQty,
      avg_fill_price: newAvg,
      filled_at: fullyFilled ? nowIso : null,
      rejection_reason: null,
    } as any)
    .eq("id", order.id);
  if (oErr) throw new Error(oErr.message);

  const { data: pos, error: pErr } = await supabaseAdmin
    .from("positions")
    .select("id, quantity, avg_cost, realized_pnl, currency")
    .eq("account_id", order.account_id)
    .eq("instrument_id", order.instrument_id)
    .maybeSingle();
  if (pErr) throw new Error(pErr.message);

  const signedFillQty = order.side === "buy" ? fillQty : -fillQty;
  const oldQty = Number(pos?.quantity ?? 0);
  const oldAvg = Number(pos?.avg_cost ?? 0);
  const newQty = oldQty + signedFillQty;
  let newAvgCost = oldAvg;
  let realizedDelta = 0;

  if (oldQty === 0 || Math.sign(oldQty) === Math.sign(signedFillQty)) {
    const absOld = Math.abs(oldQty);
    const absFill = Math.abs(signedFillQty);
    const absNew = absOld + absFill;
    newAvgCost = absNew > 0 ? (absOld * oldAvg + absFill * fillPrice) / absNew : 0;
  } else {
    const closedQty = Math.min(Math.abs(oldQty), Math.abs(signedFillQty));
    if (oldQty > 0) {
      realizedDelta = (fillPrice - oldAvg) * closedQty;
    } else {
      realizedDelta = (oldAvg - fillPrice) * closedQty;
    }
    if (Math.abs(newQty) < 1e-8) {
      newAvgCost = 0;
    } else if (Math.sign(newQty) !== Math.sign(oldQty)) {
      newAvgCost = fillPrice;
    } else {
      newAvgCost = oldAvg;
    }
  }

  if (!pos) {
    const { error: insPosErr } = await supabaseAdmin.from("positions").insert({
      account_id: order.account_id,
      instrument_id: order.instrument_id,
      quantity: newQty,
      avg_cost: Math.abs(newQty) < 1e-8 ? 0 : fillPrice,
      realized_pnl: realizedDelta,
      currency: acctQ.data.base_currency,
      opened_at: nowIso,
      last_trade_at: nowIso,
    } as any);
    if (insPosErr) throw new Error(insPosErr.message);
  } else {
    const { error: updPosErr } = await supabaseAdmin
      .from("positions")
      .update({
        quantity: newQty,
        avg_cost: Math.abs(newQty) < 1e-8 ? 0 : newAvgCost,
        realized_pnl: Number(pos.realized_pnl ?? 0) + realizedDelta,
        last_trade_at: nowIso,
      } as any)
      .eq("id", pos.id);
    if (updPosErr) throw new Error(updPosErr.message);
  }

  const prevCash = await getCurrentCashBalance(order.account_id);
  const signedCash =
    order.side === "buy" ? -(gross + totalCosts) : gross - totalCosts;
  const newCash = prevCash + signedCash;

  const { error: cashErr } = await supabaseAdmin.from("cash_ledger").insert({
    account_id: order.account_id,
    currency: acctQ.data.base_currency,
    entry_type: order.side === "buy" ? "trade_buy" : "trade_sell",
    amount: signedCash,
    balance_after: newCash,
    reference_type: "trade",
    reference_id: trade.id,
    description: data.note?.trim() || `Manual ${order.side} fill ${instQ.data.symbol}`,
    posted_by: actorUserId,
  } as any);
  if (cashErr) throw new Error(cashErr.message);

  await audit({
    actorId: actorUserId,
    actorRoles: roles as any,
    action: "order.fill.manual",
    targetType: "order",
    targetId: order.id,
    targetUserId: acctQ.data.user_id,
    payload: {
      tradeId: trade.id,
      symbol: instQ.data.symbol,
      quantity: fillQty,
      price: fillPrice,
      gross,
      fees,
      commission,
      statusAfter: nextStatus,
    },
  });

  return {
    ok: true as const,
    orderId: order.id,
    tradeId: trade.id,
    status: nextStatus,
    filledQuantity: newFilledQty,
    remainingQuantity: Math.max(0, orderQty - newFilledQty),
  };
}

export const loadInvestorTradingWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(({ context }) => loadInvestorTradingWorkspaceForApi(context.userId));

export const placeInvestorOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => placeOrderInput.parse(d))
  .handler(({ context, data }) => placeInvestorOrderForApi(context.userId, data));

export const cancelInvestorOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => cancelOrderInput.parse(d))
  .handler(({ context, data }) => cancelInvestorOrderForApi(context.userId, data));
