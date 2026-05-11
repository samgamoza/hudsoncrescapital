/**
 * Pure helpers for portal authentication & role resolution.
 * Kept free of React + free of direct supabase imports so they
 * are easy to unit-test with a mock client.
 */

export type StaffRole = "super_admin" | "admin" | "support";
export type PortalResolvedRole = StaffRole | "investor";
export type PortalRole = PortalResolvedRole | null;

export const STAFF_ROLES: StaffRole[] = ["super_admin", "admin", "support"];

export function isStaffRole(role: PortalRole): role is StaffRole {
  return role === "super_admin" || role === "admin" || role === "support";
}

export function isAdminOrHigher(role: PortalRole): boolean {
  return role === "super_admin" || role === "admin";
}

// Minimal structural type of the supabase client surface we use.
export interface RoleClient {
  from: (table: "user_roles") => {
    select: (cols: string) => {
      eq: (
        col: "user_id",
        val: string,
      ) => Promise<{ data: Array<{ role: string }> | null; error: { message: string } | null }>;
    };
    insert: (row: { user_id: string; role: "investor" }) => Promise<{
      error: { code?: string; message: string } | null;
    }>;
  };
}

function isMissingUserRolesTableError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("public.user_roles") ||
    (m.includes("schema cache") && m.includes("user_roles")) ||
    (m.includes("relation") && m.includes("user_roles") && m.includes("does not exist"))
  );
}

/**
 * Resolve the highest-priority role for a user. If none exists,
 * self-provision a default `investor` role (RLS allows this).
 *
 * Priority: super_admin > admin > support > investor.
 */
export async function ensurePortalRole(
  client: RoleClient,
  userId: string,
): Promise<PortalResolvedRole> {
  const { data: roles, error: rolesError } = await client
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (rolesError) {
    // During fresh environment migrations, role tables may not exist yet.
    // Fall back to investor so non-admin users can still access the portal.
    if (isMissingUserRolesTableError(rolesError.message)) return "investor";
    throw new Error(rolesError.message);
  }

  const roleNames = (roles ?? []).map((row) => row.role);
  if (roleNames.includes("super_admin")) return "super_admin";
  if (roleNames.includes("admin")) return "admin";
  if (roleNames.includes("support")) return "support";
  if (roleNames.includes("investor")) return "investor";

  const { error: insertError } = await client
    .from("user_roles")
    .insert({ user_id: userId, role: "investor" });

  if (insertError && insertError.code !== "23505") {
    throw new Error(insertError.message);
  }

  return "investor";
}

/**
 * Compute the post-login redirect path for a resolved role.
 */
export function resolvePortalRedirect(
  role: PortalResolvedRole,
  redirect?: string | null,
): string {
  if (redirect && isSafeInternalPath(redirect)) return redirect;
  if (role === "investor") return "/portal/investor";
  return "/portal/admin";
}

/** Only allow same-origin, root-relative paths to prevent open redirects. */
export function isSafeInternalPath(path: string): boolean {
  if (typeof path !== "string" || path.length === 0) return false;
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  return true;
}

/** Convert backend auth errors into clear portal-facing guidance. */
export function formatPortalAuthError(message?: string | null): string {
  const fallback = "Authentication failed. Please try again.";
  if (!message) return fallback;

  const normalized = message.toLowerCase();
  if (normalized.includes("email not confirmed") || normalized.includes("email_not_confirmed")) {
    return "Please verify your email address first, then sign in again.";
  }
  if (normalized.includes("invalid login credentials")) {
    return "The email or password is incorrect. Please check your details and try again.";
  }
  if (normalized.includes("user already registered") || normalized.includes("already registered")) {
    return "This email is already registered. Please sign in instead, or use Forgot password.";
  }
  if (normalized.includes("rate limit") && normalized.includes("email")) {
    return "Too many emails were sent to this address in a short time (provider rate limit). Wait about an hour, then use “Forgot password” or try signing up again. Avoid double-clicking submit.";
  }
  if (normalized.includes("permission denied for function has_role")) {
    return "Portal access is being updated. Please try signing in again.";
  }
  if (
    normalized.includes("public.user_roles") ||
    (normalized.includes("schema cache") && normalized.includes("user_roles")) ||
    (normalized.includes("relation") && normalized.includes("user_roles") && normalized.includes("does not exist"))
  ) {
    return "Authentication schema is incomplete in this environment (missing user_roles table). Run database migrations in the new Supabase project, then try again.";
  }

  return message;
}
