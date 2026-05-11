const LOOPBACK_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

function trimTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, "");
}

/**
 * Origin used in Supabase `emailRedirectTo` / `redirectTo` so confirmation links match the site
 * where the user actually signed up.
 *
 * - In the browser on a **non-loopback** host (e.g. production), always use `window.location.origin`
 *   so a misconfigured `VITE_PUBLIC_SITE_URL` (e.g. still set to localhost) cannot break email links.
 * - On **localhost**, use `VITE_PUBLIC_SITE_URL` when it points at a public URL (e.g. ngrok) so
 *   links in email can be opened from another device.
 * - With no `window` (SSR), fall back to `VITE_PUBLIC_SITE_URL` only.
 */
export function getPublicAppOrigin(): string {
  const fromEnv = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.trim();
  const envUrl = fromEnv ? trimTrailingSlashes(fromEnv) : undefined;

  if (typeof window !== "undefined" && window.location?.origin) {
    const origin = window.location.origin;
    if (LOOPBACK_RE.test(origin) && envUrl && !LOOPBACK_RE.test(envUrl)) {
      return envUrl;
    }
    return origin;
  }

  return envUrl ?? "";
}
