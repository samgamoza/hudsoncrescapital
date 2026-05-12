/**
 * Assign `window.location` while reducing cross-origin / host-mismatch issues:
 * - Same host as the current page (including apex vs `www`) → use a path-only assign so the
 *   browser keeps the URL bar on the host the user actually used.
 * - External URLs (e.g. Stripe Checkout) → prefer `window.top` when we are nested, then fall back.
 *
 * Note: `chrome-error://chromewebdata/` means the network failed before your app loaded; no
 * in-app script can recover that tab—fix DNS, TLS, or the parent frame that embeds your origin.
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

  try {
    const top = window.top;
    if (top && top !== window) {
      top.location.assign(next.href);
      return;
    }
  } catch {
    /* cross-origin top: cannot navigate parent */
  }

  window.location.assign(next.href);
}
