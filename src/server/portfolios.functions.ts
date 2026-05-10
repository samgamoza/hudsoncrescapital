import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireMinRole, audit } from "./_shared.server";

const ASSET_CLASS = z.enum(["equities", "crypto", "commodities", "managed_strategy"]);

async function assertAdmin(userId: string) {
  await requireMinRole(userId, "admin");
}

// ---- list sub-portfolios (admin: by user OR account; investor: own only) ----
export const listSubPortfolios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      userId: z.string().uuid().optional(),
      accountId: z.string().uuid().optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    let query = supabaseAdmin
      .from("sub_portfolios")
      .select("*, sub_portfolio_holdings(*)")
      .order("created_at", { ascending: true });

    // Admin can scope by user/account; investors are always scoped to themselves.
    const { data: rolesData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const isAdmin = (rolesData ?? []).some((r: any) => r.role === "admin" || r.role === "super_admin");

    if (!isAdmin) {
      query = query.eq("user_id", context.userId);
    } else {
      if (data.userId) query = query.eq("user_id", data.userId);
      if (data.accountId) query = query.eq("account_id", data.accountId);
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ---- create sub-portfolio ----
const createSchema = z.object({
  account_id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  asset_class: ASSET_CLASS,
  base_currency: z.string().trim().length(3).default("USD"),
  target_allocation_pct: z.number().min(0).max(100).default(0),
  risk_band: z.enum(["conservative", "moderate", "aggressive"]).optional(),
});

export const createSubPortfolio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => createSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: row, error } = await (supabaseAdmin.from("sub_portfolios") as any)
      .insert({
        account_id: data.account_id,
        user_id: data.user_id,
        name: data.name,
        asset_class: data.asset_class,
        base_currency: data.base_currency.toUpperCase(),
        target_allocation_pct: data.target_allocation_pct,
        risk_band: data.risk_band ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await audit({
      actorId: context.userId, action: "sub_portfolio.create",
      targetType: "sub_portfolio", targetId: row.id, targetUserId: data.user_id,
      payload: { name: data.name, asset_class: data.asset_class },
    });
    return row;
  });

// ---- update sub-portfolio ----
export const updateSubPortfolio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      patch: z.object({
        name: z.string().trim().min(1).max(120).optional(),
        target_allocation_pct: z.number().min(0).max(100).optional(),
        risk_band: z.enum(["conservative", "moderate", "aggressive"]).optional(),
        status: z.enum(["active", "paused", "closed"]).optional(),
      }),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await (supabaseAdmin.from("sub_portfolios") as any)
      .update(data.patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSubPortfolio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("sub_portfolios").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- holdings ----
const holdingSchema = z.object({
  sub_portfolio_id: z.string().uuid(),
  symbol: z.string().trim().min(1).max(40),
  display_name: z.string().trim().max(200).optional(),
  quantity: z.number().min(0),
  avg_cost: z.number().min(0),
  mark_price: z.number().min(0).optional(),
  unit_label: z.string().trim().max(20).optional(),
  currency: z.string().trim().length(3).default("USD"),
  details: z.record(z.any()).default({}),
});

export const addHolding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => holdingSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);

    // Resolve account/user from parent sub-portfolio.
    const { data: parent, error: pErr } = await supabaseAdmin
      .from("sub_portfolios").select("account_id, user_id")
      .eq("id", data.sub_portfolio_id).single();
    if (pErr) throw new Error(pErr.message);

    const { data: row, error } = await (supabaseAdmin.from("sub_portfolio_holdings") as any)
      .insert({
        sub_portfolio_id: data.sub_portfolio_id,
        account_id: (parent as any).account_id,
        user_id: (parent as any).user_id,
        symbol: data.symbol.toUpperCase(),
        display_name: data.display_name ?? null,
        quantity: data.quantity,
        avg_cost: data.avg_cost,
        mark_price: data.mark_price ?? null,
        unit_label: data.unit_label ?? "shares",
        currency: data.currency.toUpperCase(),
        details: data.details,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateHolding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      patch: z.object({
        symbol: z.string().trim().min(1).max(40).optional(),
        display_name: z.string().trim().max(200).optional(),
        quantity: z.number().min(0).optional(),
        avg_cost: z.number().min(0).optional(),
        mark_price: z.number().min(0).optional(),
        unit_label: z.string().trim().max(20).optional(),
        currency: z.string().trim().length(3).optional(),
        details: z.record(z.any()).optional(),
      }),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const patch: any = { ...data.patch };
    if (patch.symbol) patch.symbol = patch.symbol.toUpperCase();
    if (patch.currency) patch.currency = patch.currency.toUpperCase();
    const { error } = await (supabaseAdmin.from("sub_portfolio_holdings") as any)
      .update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteHolding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("sub_portfolio_holdings").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
