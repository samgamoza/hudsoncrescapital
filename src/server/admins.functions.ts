import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { audit, getRolesForUser, requireMinRole, type AppRole } from "./_shared.server";

const STAFF_ROLES = ["super_admin", "admin", "support"] as const;

export async function listAdminsForApi(actorUserId: string) {
  await requireMinRole(actorUserId, "admin");

  const { data: roles, error } = await (supabaseAdmin.from("user_roles") as any)
    .select("user_id, role")
    .in("role", STAFF_ROLES);
  if (error) throw new Error(error.message);

  const ids = Array.from(new Set((roles ?? []).map((r: any) => r.user_id)));
  if (!ids.length) return [];

  const { data: usersResp } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  const users = (usersResp.users ?? []).filter((u) => ids.includes(u.id));

  return users.map((u) => {
    const userRoles = (roles ?? [])
      .filter((r: any) => r.user_id === u.id)
      .map((r: any) => r.role as AppRole);
    return {
      id: u.id,
      email: u.email ?? "",
      roles: userRoles,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      banned_until: (u as any).banned_until ?? null,
    };
  });
}

export const listAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(({ context }) => listAdminsForApi(context.userId));

const grantStaffRoleInput = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "support"]),
  password: z.string().min(8).max(128).optional(),
  legal_first_name: z.string().trim().max(100).optional(),
  legal_last_name: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(40).optional(),
  country_of_residence: z.string().trim().length(2).optional(),
});

export async function grantStaffRoleForApi(actorUserId: string, raw: unknown) {
  const data = grantStaffRoleInput.parse(raw);
  const roles = await requireMinRole(actorUserId, "super_admin");

  const meta: Record<string, string> = {};
  if (data.legal_first_name) meta.legal_first_name = data.legal_first_name;
  if (data.legal_last_name) meta.legal_last_name = data.legal_last_name;
  if (data.legal_first_name || data.legal_last_name)
    meta.display_name = `${data.legal_first_name ?? ""} ${data.legal_last_name ?? ""}`.trim();
  if (data.phone) meta.phone = data.phone;
  if (data.country_of_residence) {
    meta.country_of_residence = data.country_of_residence.toUpperCase();
    meta.nationality = data.country_of_residence.toUpperCase();
  }

  const { data: existing } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  let user = (existing.users ?? []).find((u) => u.email === data.email);
  if (!user) {
    if (data.password) {
      const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: meta,
      });
      if (cErr) throw new Error(cErr.message);
      user = created.user!;
    } else {
      const { data: invited, error: invErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        data.email,
        { data: meta },
      );
      if (invErr) throw new Error(invErr.message);
      user = invited.user!;
    }
  } else if (data.password) {
    const { error: uErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: data.password,
      email_confirm: true,
      user_metadata: meta,
    });
    if (uErr) throw new Error(uErr.message);
  }

  if (Object.keys(meta).length) {
    await supabaseAdmin.from("profiles").upsert(
      {
        user_id: user.id,
        legal_first_name: data.legal_first_name ?? null,
        legal_last_name: data.legal_last_name ?? null,
        display_name: meta.display_name ?? null,
        phone: data.phone ?? null,
        country_of_residence: data.country_of_residence?.toUpperCase() ?? null,
        nationality: data.country_of_residence?.toUpperCase() ?? null,
      },
      { onConflict: "user_id" },
    );
  }

  const { error } = await supabaseAdmin
    .from("user_roles")
    .insert({ user_id: user.id, role: data.role as any })
    .select();
  if (error && error.code !== "23505") throw new Error(error.message);

  await audit({
    actorId: actorUserId,
    actorRoles: roles,
    action: "admin.grant_role",
    targetType: "user",
    targetUserId: user.id,
    payload: { role: data.role, email: data.email },
  });
  return { ok: true, userId: user.id };
}

export const grantStaffRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => grantStaffRoleInput.parse(d))
  .handler(({ context, data }) => grantStaffRoleForApi(context.userId, data));

const revokeStaffRoleInput = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "support", "super_admin"]),
});

export async function revokeStaffRoleForApi(actorUserId: string, raw: unknown) {
  const data = revokeStaffRoleInput.parse(raw);
  const roles = await requireMinRole(actorUserId, "super_admin");

  if (data.userId === actorUserId && data.role === "super_admin") {
    throw new Error("You cannot revoke your own super_admin role");
  }

  const { error } = await supabaseAdmin
    .from("user_roles")
    .delete()
    .eq("user_id", data.userId)
    .eq("role", data.role as any);
  if (error) throw new Error(error.message);

  await audit({
    actorId: actorUserId,
    actorRoles: roles,
    action: "admin.revoke_role",
    targetType: "user",
    targetUserId: data.userId,
    payload: { role: data.role },
  });
  return { ok: true };
}

export const revokeStaffRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => revokeStaffRoleInput.parse(d))
  .handler(({ context, data }) => revokeStaffRoleForApi(context.userId, data));

export const promoteToSuperAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const roles = await requireMinRole(context.userId, "super_admin");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: "super_admin" as any });
    if (error && error.code !== "23505") throw new Error(error.message);
    await audit({
      actorId: context.userId,
      actorRoles: roles,
      action: "admin.promote_super_admin",
      targetType: "user",
      targetUserId: data.userId,
    });
    return { ok: true };
  });

// Audit log query (paginated). Staff can read.
export const listAuditLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        limit: z.number().int().min(1).max(200).default(100),
        targetUserId: z.string().uuid().optional(),
        actorId: z.string().uuid().optional(),
        action: z.string().max(100).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const roles = await getRolesForUser(context.userId);
    if (!roles.some((r) => r === "super_admin" || r === "admin" || r === "support")) {
      throw new Error("Forbidden: staff access required");
    }
    let q = (supabaseAdmin.from("audit_logs") as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.targetUserId) q = q.eq("target_user_id", data.targetUserId);
    if (data.actorId) q = q.eq("actor_id", data.actorId);
    if (data.action) q = q.ilike("action", `%${data.action}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** For `/api/**` handlers — do not call `getMyRoles()` directly from route handlers (server-fn manifest). */
export async function getMyRolesForApi(actorUserId: string): Promise<AppRole[]> {
  return getRolesForUser(actorUserId);
}

// Get current user's effective role list (used in client to gate UI).
export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return getMyRolesForApi(context.userId);
  });
