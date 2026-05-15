/**
 * Assign `window.location` while reducing cross-origin / host-mismatch issues:
 * - Same host as the current page (including apex vs `www`) → use a path-only assign so the
 *   browser keeps the URL bar on the host the user actually used.
 * - Other URLs → always assign on **this** `window` only (never `window.top`).
 *
 * Navigating `window.top` from an embedded frame breaks when the parent is cross-origin, an
 * error tab (`chrome-error://chromewebdata/`), `about:`, etc., and Chrome logs:
 * "Unsafe attempt to load URL … from frame with URL chrome-error://chromewebdata/".
 * Hosted checkout (Stripe/PayPal) should run in the same frame or a new tab from the caller.
 */
function stripLeadingWww(host: string) {
  return host.replace(/^www\./i, "");
}

function sameSiteHosts(a: string, b: string) {
  return stripLeadingWww(a.toLowerCase()) === stripLeadingWww(b.toLowerCase());
}

export function assignLocationHref(href: string) {
  if (typeof window === "undefined") return;
  let next: URL;
  try {
    next = new URL(href, window.location.href);
  } catch {
    return;
  }

  const cur = window.location;
  if (
    next.protocol === cur.protocol &&
    sameSiteHosts(next.hostname, cur.hostname) &&
    (next.port === cur.port || (!next.port && !cur.port))
  ) {
    const path = `${next.pathname}${next.search}${next.hash}` || "/";
    window.location.assign(path);
    return;
  }

  window.location.assign(next.href);
}
