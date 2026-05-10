import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { audit, getRolesForUser, isStaff, requireMinRole, topRole } from "./_shared.server";

const TICKET_CATEGORIES = ["account", "funding", "trading", "kyc", "technical", "other"] as const;
const TICKET_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
const TICKET_STATUSES = ["open", "pending_user", "pending_staff", "resolved", "closed"] as const;

const createTicketSchema = z.object({
  subject: z.string().trim().min(3, "Subject too short").max(200),
  body: z.string().trim().min(5, "Message too short").max(5000),
  category: z.enum(TICKET_CATEGORIES).default("other"),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  account_id: z.string().uuid().optional().nullable(),
});

const replySchema = z.object({
  ticket_id: z.string().uuid(),
  body: z.string().trim().min(1).max(5000),
  is_internal: z.boolean().default(false),
});

const updateStatusSchema = z.object({
  ticket_id: z.string().uuid(),
  status: z.enum(TICKET_STATUSES),
});

const updatePrioritySchema = z.object({
  ticket_id: z.string().uuid(),
  priority: z.enum(TICKET_PRIORITIES),
});

const assignSchema = z.object({
  ticket_id: z.string().uuid(),
  assigned_to: z.string().uuid().nullable(),
});

// ---------- INVESTOR ----------

export const listMyTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (supabaseAdmin.from("tickets") as any)
      .select("id, subject, category, priority, status, last_activity_at, created_at")
      .eq("user_id", context.userId)
      .order("last_activity_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => createTicketSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { userId } = context;

    const { data: ticket, error: tErr } = await (supabaseAdmin.from("tickets") as any)
      .insert({
        user_id: userId,
        account_id: data.account_id ?? null,
        subject: data.subject,
        category: data.category,
        priority: data.priority,
        status: "open",
      })
      .select()
      .single();
    if (tErr || !ticket) throw new Error(tErr?.message ?? "Failed to create ticket");

    const { error: mErr } = await (supabaseAdmin.from("ticket_messages") as any).insert({
      ticket_id: ticket.id,
      author_id: userId,
      author_role: "investor",
      body: data.body,
      is_internal: false,
    });
    if (mErr) throw new Error(mErr.message);

    await audit({
      actorId: userId,
      action: "ticket.create",
      targetType: "ticket",
      targetId: ticket.id,
      targetUserId: userId,
      payload: { subject: data.subject, category: data.category },
    });

    return { id: ticket.id };
  });

// ---------- SHARED (investor or staff) ----------

export const getTicket = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { userId } = context;
    const roles = await getRolesForUser(userId);
    const staff = isStaff(roles);

    const { data: ticket, error } = await (supabaseAdmin.from("tickets") as any)
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!ticket) throw new Error("Ticket not found");
    if (!staff && ticket.user_id !== userId) throw new Error("Forbidden");

    let messageQuery = (supabaseAdmin.from("ticket_messages") as any)
      .select("id, author_id, author_role, body, is_internal, created_at")
      .eq("ticket_id", data.id)
      .order("created_at", { ascending: true });
    if (!staff) messageQuery = messageQuery.eq("is_internal", false);

    const { data: messages, error: mErr } = await messageQuery;
    if (mErr) throw new Error(mErr.message);

    return { ticket, messages: messages ?? [], viewerIsStaff: staff };
  });

export const replyTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => replySchema.parse(d))
  .handler(async ({ context, data }) => {
    const { userId } = context;
    const roles = await getRolesForUser(userId);
    const staff = isStaff(roles);
    if (data.is_internal && !staff) throw new Error("Only staff can post internal notes");

    // Load ticket for ownership / status check
    const { data: ticket, error: tErr } = await (supabaseAdmin.from("tickets") as any)
      .select("id, user_id, status")
      .eq("id", data.ticket_id)
      .maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!ticket) throw new Error("Ticket not found");
    if (!staff && ticket.user_id !== userId) throw new Error("Forbidden");
    if (ticket.status === "closed") throw new Error("Ticket is closed");

    const authorRole = staff ? (topRole(roles) ?? "support") : "investor";

    const { error: mErr } = await (supabaseAdmin.from("ticket_messages") as any).insert({
      ticket_id: ticket.id,
      author_id: userId,
      author_role: authorRole,
      body: data.body,
      is_internal: data.is_internal,
    });
    if (mErr) throw new Error(mErr.message);

    // Auto-flip status if not internal
    if (!data.is_internal) {
      const newStatus = staff ? "pending_user" : "pending_staff";
      await (supabaseAdmin.from("tickets") as any)
        .update({ status: newStatus })
        .eq("id", ticket.id);
    }

    return { ok: true };
  });

// ---------- STAFF ----------

export const listAllTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      status: z.enum([...TICKET_STATUSES, "all"]).default("all"),
    }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    await requireMinRole(context.userId, "support");

    let q = (supabaseAdmin.from("tickets") as any)
      .select("id, user_id, subject, category, priority, status, assigned_to, last_activity_at, created_at")
      .order("last_activity_at", { ascending: false })
      .limit(500);
    if (data.status !== "all") q = q.eq("status", data.status);

    const { data: tickets, error } = await q;
    if (error) throw new Error(error.message);

    // Fetch profile names for involved users
    const userIds = Array.from(new Set((tickets ?? []).map((t: any) => t.user_id)));
    let nameMap: Record<string, string> = {};
    if (userIds.length) {
      const { data: profs } = await (supabaseAdmin.from("profiles") as any)
        .select("user_id, legal_first_name, legal_last_name, display_name")
        .in("user_id", userIds);
      nameMap = Object.fromEntries(
        (profs ?? []).map((p: any) => [
          p.user_id,
          [p.legal_first_name, p.legal_last_name].filter(Boolean).join(" ") ||
            p.display_name ||
            "—",
        ]),
      );
    }

    return (tickets ?? []).map((t: any) => ({ ...t, user_name: nameMap[t.user_id] ?? "—" }));
  });

export const updateTicketStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => updateStatusSchema.parse(d))
  .handler(async ({ context, data }) => {
    await requireMinRole(context.userId, "support");
    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === "resolved") patch.resolved_at = new Date().toISOString();
    if (data.status === "closed") patch.closed_at = new Date().toISOString();
    const { error } = await (supabaseAdmin.from("tickets") as any)
      .update(patch)
      .eq("id", data.ticket_id);
    if (error) throw new Error(error.message);
    await audit({
      actorId: context.userId,
      action: "ticket.status.update",
      targetType: "ticket",
      targetId: data.ticket_id,
      payload: { status: data.status },
    });
    return { ok: true };
  });

export const updateTicketPriority = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => updatePrioritySchema.parse(d))
  .handler(async ({ context, data }) => {
    await requireMinRole(context.userId, "support");
    const { error } = await (supabaseAdmin.from("tickets") as any)
      .update({ priority: data.priority })
      .eq("id", data.ticket_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const assignTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => assignSchema.parse(d))
  .handler(async ({ context, data }) => {
    await requireMinRole(context.userId, "support");
    const { error } = await (supabaseAdmin.from("tickets") as any)
      .update({ assigned_to: data.assigned_to })
      .eq("id", data.ticket_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
