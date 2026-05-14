import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { audit } from "./_shared.server";

/**
 * Plain async server helpers used by `/api/portal/profile`. We deliberately
 * avoid `createServerFn(...)` wrappers here because production builds can
 * lose the server-fn manifest mapping when those wrappers are invoked from
 * Nitro/API route handlers (TanStack resolves them by hashed ID), surfacing
 * as `"Server function info not found for …"` → HTTP 500s in the browser.
 *
 * The API route resolves the caller's id via `requireUserIdFromRequest` and
 * passes it explicitly into each function below.
 */

const updateProfileSchema = z.object({
  display_name: z.string().trim().max(200).optional(),
  legal_first_name: z.string().trim().max(100).optional(),
  legal_last_name: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(40).optional(),
  date_of_birth: z.string().optional(),
  country_of_residence: z.string().trim().max(2).optional(),
  nationality: z.string().trim().max(2).optional(),
  username: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_.-]{3,32}$/)
    .optional(),
  tax_id_last4: z.string().trim().max(4).optional(),
  address: z
    .object({
      line1: z.string().trim().max(200).optional().nullable(),
      line2: z.string().trim().max(200).optional().nullable(),
      city: z.string().trim().max(100).optional().nullable(),
      state_region: z.string().trim().max(100).optional().nullable(),
      postal_code: z.string().trim().max(40).optional().nullable(),
      country: z.string().trim().max(2).optional().nullable(),
    })
    .optional(),
});

const changePasswordSchema = z.object({
  newPassword: z.string().min(8).max(200),
});

const deleteSchema = z.object({ confirm: z.literal("DELETE") });

export async function getMyProfile(userId: string) {
  const [profileQ, userResp, mfaQ, accountsQ] = await Promise.all([
    supabaseAdmin.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabaseAdmin.auth.admin.getUserById(userId),
    (supabaseAdmin.from("user_mfa") as any)
      .select("enabled, enrolled_at")
      .eq("user_id", userId)
      .maybeSingle(),
    supabaseAdmin
      .from("accounts")
      .select(
        "id, account_number, account_type, base_currency, status, opened_at, created_at, metadata",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);
  return {
    profile: profileQ.data,
    email: userResp.data.user?.email ?? "",
    created_at: userResp.data.user?.created_at ?? null,
    mfa: mfaQ.data ?? { enabled: false, enrolled_at: null },
    accounts: accountsQ.data ?? [],
  };
}

export async function updateMyProfile(userId: string, raw: unknown) {
  const data = updateProfileSchema.parse(raw);
  const { address, username, ...profilePatch } = data;

  if (username) {
    const { data: dup } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .ilike("username", username)
      .maybeSingle();
    if (dup && (dup as any).user_id !== userId) {
      throw new Error(`Username "${username}" is already taken`);
    }
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .upsert(
      { user_id: userId, ...profilePatch, ...(username ? { username } : {}) },
      { onConflict: "user_id" },
    );
  if (error) throw new Error(error.message);

  if (address) {
    const { data: accts } = await supabaseAdmin
      .from("accounts")
      .select("id, status, metadata, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    const list = (accts ?? []) as any[];
    const target = list.find((a) => a.status === "active") ?? list[0];
    if (target) {
      const meta = (target.metadata ?? {}) as any;
      const newMeta = {
        ...meta,
        address: {
          line1: address.line1 ?? null,
          line2: address.line2 ?? null,
          city: address.city ?? null,
          state_region: address.state_region ?? null,
          postal_code: address.postal_code ?? null,
          country:
            (
              address.country ??
              profilePatch.country_of_residence ??
              meta.address?.country ??
              null
            )?.toUpperCase?.() ?? null,
        },
      };
      const { error: aerr } = await (supabaseAdmin.from("accounts") as any)
        .update({ metadata: newMeta })
        .eq("id", target.id);
      if (aerr) throw new Error(`Address sync failed: ${aerr.message}`);
    }
  }

  await audit({
    actorId: userId,
    action: "profile.update",
    targetType: "profile",
    targetUserId: userId,
  });
  return { ok: true };
}

export async function changeMyPassword(userId: string, raw: unknown) {
  const data = changePasswordSchema.parse(raw);
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: data.newPassword,
  });
  if (error) throw new Error(error.message);
  await audit({ actorId: userId, action: "password.change", targetUserId: userId });
  return { ok: true };
}

export async function deactivateMyAccount(userId: string) {
  const { error } = await (supabaseAdmin.from("profiles") as any)
    .update({ status: "inactive" })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  await audit({ actorId: userId, action: "account.deactivate", targetUserId: userId });
  return { ok: true };
}

export async function reactivateMyAccount(userId: string) {
  const { error } = await (supabaseAdmin.from("profiles") as any)
    .update({ status: "active" })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  await audit({ actorId: userId, action: "account.reactivate", targetUserId: userId });
  return { ok: true };
}

export async function deleteMyAccount(userId: string, raw: unknown) {
  deleteSchema.parse(raw);
  await audit({ actorId: userId, action: "account.delete", targetUserId: userId });
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
  return { ok: true };
}
