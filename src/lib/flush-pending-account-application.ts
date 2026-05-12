import { supabase } from "@/integrations/supabase/client";

/** Must match key used in `FullAccountApplicationWizard` signup flow. */
export const PENDING_ACCOUNT_APPLICATION_STORAGE_KEY = "hcc_pending_account_application_v1";

export type FlushPendingAccountApplicationResult = "none" | "skipped_mismatch" | "flushed" | "failed";

/**
 * If the user completed signup while email confirmation blocked a session, we stash the
 * account-application payload in sessionStorage. After first login with a matching email,
 * POST it once and clear storage.
 */
export async function flushPendingAccountApplication(): Promise<FlushPendingAccountApplicationResult> {
  if (typeof window === "undefined") return "none";
  const raw = sessionStorage.getItem(PENDING_ACCOUNT_APPLICATION_STORAGE_KEY);
  if (!raw) return "none";

  let parsed: { email?: string; payload?: unknown };
  try {
    parsed = JSON.parse(raw) as { email?: string; payload?: unknown };
  } catch {
    sessionStorage.removeItem(PENDING_ACCOUNT_APPLICATION_STORAGE_KEY);
    return "none";
  }

  const pendingEmail = typeof parsed.email === "string" ? parsed.email.toLowerCase().trim() : "";
  if (!pendingEmail || !parsed.payload || typeof parsed.payload !== "object") {
    sessionStorage.removeItem(PENDING_ACCOUNT_APPLICATION_STORAGE_KEY);
    return "none";
  }

  const { data } = await supabase.auth.getSession();
  const sessionEmail = data.session?.user?.email?.toLowerCase().trim();
  if (!sessionEmail || sessionEmail !== pendingEmail) return "skipped_mismatch";

  const res = await fetch("/api/portal/account-application", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed.payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("flushPendingAccountApplication", body);
    return "failed";
  }

  sessionStorage.removeItem(PENDING_ACCOUNT_APPLICATION_STORAGE_KEY);
  return "flushed";
}
