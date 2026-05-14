import { supabase } from "@/integrations/supabase/client";

/**
 * Legacy key used by the pre-split signup wizard, kept solely so old
 * sessionStorage payloads get cleaned up rather than re-submitted to the
 * removed `/api/portal/account-application` POST endpoint.
 */
export const PENDING_ACCOUNT_APPLICATION_STORAGE_KEY = "hcc_pending_account_application_v1";

/**
 * Same purpose as the legacy key but for the new minimal signup flow: holds
 * the bootstrap payload while the user confirms their email.
 */
export const PENDING_SIGNUP_BOOTSTRAP_KEY = "hcc_pending_signup_bootstrap_v1";

export type FlushPendingSignupBootstrapResult =
  | "none"
  | "skipped_mismatch"
  | "flushed"
  | "failed";

/**
 * If the user finished `InvestorSignupForm` before their email was confirmed,
 * the bootstrap payload (name / country / phone / acknowledgements) lives in
 * sessionStorage. After their first authenticated portal load with a matching
 * email, post it once and clear storage so the dashboard/modal/banner all see
 * the correct profile state. Idempotent on the server side.
 */
export async function flushPendingSignupBootstrap(): Promise<FlushPendingSignupBootstrapResult> {
  if (typeof window === "undefined") return "none";

  // Best-effort cleanup of the legacy storage key so it never re-fires after
  // an upgrade.
  try {
    sessionStorage.removeItem(PENDING_ACCOUNT_APPLICATION_STORAGE_KEY);
  } catch {
    /* ignore */
  }

  const raw = sessionStorage.getItem(PENDING_SIGNUP_BOOTSTRAP_KEY);
  if (!raw) return "none";

  let parsed: { email?: string; payload?: unknown };
  try {
    parsed = JSON.parse(raw) as { email?: string; payload?: unknown };
  } catch {
    sessionStorage.removeItem(PENDING_SIGNUP_BOOTSTRAP_KEY);
    return "none";
  }

  const pendingEmail = typeof parsed.email === "string" ? parsed.email.toLowerCase().trim() : "";
  if (!pendingEmail || !parsed.payload || typeof parsed.payload !== "object") {
    sessionStorage.removeItem(PENDING_SIGNUP_BOOTSTRAP_KEY);
    return "none";
  }

  const { data } = await supabase.auth.getSession();
  const sessionEmail = data.session?.user?.email?.toLowerCase().trim();
  if (!sessionEmail || sessionEmail !== pendingEmail) return "skipped_mismatch";

  const res = await fetch("/api/portal/signup-bootstrap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed.payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("flushPendingSignupBootstrap", body);
    return "failed";
  }

  sessionStorage.removeItem(PENDING_SIGNUP_BOOTSTRAP_KEY);
  return "flushed";
}

/**
 * Backwards-compatible alias. The portal layout previously called
 * `flushPendingAccountApplication()`; we keep the export name so a single
 * import update isn't required everywhere.
 */
export const flushPendingAccountApplication = flushPendingSignupBootstrap;
