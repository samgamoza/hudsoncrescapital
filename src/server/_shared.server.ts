// Server-only shared helpers for portal logic.
// Never import this file from client/component code.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type StaffRole = "super_admin" | "admin" | "support";
export type AppRole = StaffRole | "investor";

/** Fetch all roles a user holds. Uses admin client to bypass RLS for staff lookups. */
export async function getRolesForUser(userId: string): Promise<AppRole[]> {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => r.role as AppRole);
}

/** Highest-priority role from a role list. */
export function topRole(roles: AppRole[]): AppRole | null {
  if (roles.includes("super_admin")) return "super_admin";
  if (roles.includes("admin")) return "admin";
  if (roles.includes("support")) return "support";
  if (roles.includes("investor")) return "investor";
  return null;
}

export function isStaff(roles: AppRole[]): boolean {
  return roles.some((r) => r === "super_admin" || r === "admin" || r === "support");
}

export function isAdminOrHigher(roles: AppRole[]): boolean {
  return roles.some((r) => r === "super_admin" || r === "admin");
}

export function isSuperAdmin(roles: AppRole[]): boolean {
  return roles.includes("super_admin");
}

/** Throw if caller does not satisfy minimum role. */
export async function requireMinRole(
  userId: string,
  min: "support" | "admin" | "super_admin",
): Promise<AppRole[]> {
  const roles = await getRolesForUser(userId);
  if (min === "support" && !isStaff(roles)) throw new Error("Forbidden: staff access required");
  if (min === "admin" && !isAdminOrHigher(roles)) throw new Error("Forbidden: admin access required");
  if (min === "super_admin" && !isSuperAdmin(roles))
    throw new Error("Forbidden: super admin access required");
  return roles;
}

/** Append an entry to the audit log using the admin client. */
export async function audit(opts: {
  actorId: string;
  actorRoles?: AppRole[];
  action: string;
  targetType?: string;
  targetId?: string | null;
  targetUserId?: string | null;
  payload?: Record<string, unknown> | null;
}) {
  const actorRole = opts.actorRoles ? (topRole(opts.actorRoles) ?? "unknown") : null;
  const { error } = await (supabaseAdmin.from("audit_logs") as any).insert({
    actor_id: opts.actorId,
    actor_role: actorRole,
    action: opts.action,
    target_type: opts.targetType ?? null,
    target_id: opts.targetId ?? null,
    target_user_id: opts.targetUserId ?? null,
    payload: opts.payload ?? null,
  });
  if (error) console.error("[audit]", error.message);
}

/** Atomic-ish wallet posting (admin only). Reads current balance, computes new, writes both. */
export async function postWalletTransaction(opts: {
  walletId: string;
  userId: string;
  txnType: "deposit" | "withdrawal" | "adjustment" | "fee" | "transfer_in" | "transfer_out";
  amount: number; // positive = credit, negative = debit
  description?: string;
  referenceId?: string | null;
  referenceType?: string | null;
  postedBy: string;
}) {
  const { data: wallet, error: wErr } = await (supabaseAdmin.from("wallets") as any)
    .select("id, available_balance, currency, user_id")
    .eq("id", opts.walletId)
    .single();
  if (wErr || !wallet) throw new Error(wErr?.message ?? "Wallet not found");
  if (opts.userId && wallet.user_id !== opts.userId) {
    throw new Error("Forbidden: wallet does not belong to user");
  }

  const newBalance = Number(wallet.available_balance) + opts.amount;
  if (newBalance < 0) throw new Error("Insufficient funds");

  const { error: txnErr } = await (supabaseAdmin.from("wallet_transactions") as any).insert({
    wallet_id: wallet.id,
    user_id: wallet.user_id,
    txn_type: opts.txnType,
    amount: opts.amount,
    currency: wallet.currency,
    balance_after: newBalance,
    description: opts.description ?? null,
    reference_id: opts.referenceId ?? null,
    reference_type: opts.referenceType ?? null,
    posted_by: opts.postedBy,
  });
  if (txnErr) throw new Error(txnErr.message);

  const { error: balErr } = await (supabaseAdmin.from("wallets") as any)
    .update({ available_balance: newBalance })
    .eq("id", wallet.id);
  if (balErr) throw new Error(balErr.message);

  return { walletId: wallet.id, newBalance, currency: wallet.currency };
}
