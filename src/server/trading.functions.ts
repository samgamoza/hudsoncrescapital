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

export const loadInvestorTradingWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<InvestorTradingWorkspace> => {
    const { userId } = context;

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
      const { data: instRows } = await supabaseAdmin.from("instruments").select("id, symbol, name").in("id", instIds);
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

    return { instruments, accounts, orders };
  });

export const placeInvestorOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => placeOrderInput.parse(d))
  .handler(async ({ context, data }) => {
    const { userId } = context;
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

    const { data: row, error: insErr } = await supabaseAdmin.from("orders").insert(insertRow as any).select("id").single();
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
  });

export const cancelInvestorOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { userId } = context;
    const { audit } = await import("./_shared.server");

    const { data: ord, error: oErr } = await supabaseAdmin
      .from("orders")
      .select("id, account_id, status")
      .eq("id", data.orderId)
      .single();
    if (oErr || !ord) throw new Error("Order not found");

    const { data: acct } = await supabaseAdmin.from("accounts").select("user_id").eq("id", ord.account_id).single();
    if (!acct || acct.user_id !== userId) throw new Error("Order not found");

    const st = ord.status as string;
    if (!["pending", "working", "partially_filled"].includes(st)) {
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
  });
