import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

import appCss from "../styles.css?url";

// Install a one-time fetch interceptor that attaches the current Supabase
// access token as a Bearer Authorization header on TanStack server-fn calls.
// This is required by `requireSupabaseAuth` middleware on the server.
//
// On first mount the Supabase client may still be restoring the session from
// localStorage, so getSession() can briefly return null. We wait (poll) up to
// ~2s for a token, and additionally retry once on a 401 response in case a
// token becomes available right after the initial request fired.
if (typeof window !== "undefined" && !(window as any).__lovableServerFnAuthPatched) {
  (window as any).__lovableServerFnAuthPatched = true;
  const originalFetch = window.fetch.bind(window);

  const hasStoredSession = (): boolean => {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
          const v = localStorage.getItem(key);
          if (v && v.length > 2) return true;
        }
      }
    } catch {
      // ignore
    }
    return false;
  };

  const getAccessToken = async (waitMs = 2000): Promise<string | null> => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) return data.session.access_token;
    // If nothing is persisted, don't bother waiting — user is just signed out.
    if (!hasStoredSession()) return null;
    const start = Date.now();
    while (Date.now() - start < waitMs) {
      await new Promise((r) => setTimeout(r, 75));
      const { data: d2 } = await supabase.auth.getSession();
      if (d2.session?.access_token) return d2.session.access_token;
    }
    return null;
  };

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : (input as Request).url;
      if (url && (url.includes("/_serverFn/") || url.includes("/api/portal/"))) {
        const buildHeaders = async () => {
          const headers = new Headers(
            init?.headers ?? (input instanceof Request ? input.headers : undefined),
          );
          if (!headers.has("authorization") && !headers.has("Authorization")) {
            const token = await getAccessToken();
            if (token) headers.set("Authorization", `Bearer ${token}`);
          }
          return headers;
        };

        const headers = await buildHeaders();
        const res = await originalFetch(input as any, { ...(init ?? {}), headers });

        // Retry once on 401 if a token is now available (or just became available).
        if (res.status === 401) {
          const retryHeaders = new Headers(
            init?.headers ?? (input instanceof Request ? input.headers : undefined),
          );
          const token = await getAccessToken(2500);
          if (token) {
            retryHeaders.set("Authorization", `Bearer ${token}`);
            return originalFetch(input as any, { ...(init ?? {}), headers: retryHeaders });
          }
        }
        return res;
      }
    } catch {
      // fall through to original
    }
    return originalFetch(input as any, init);
  };
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Hudson Crest Capital | Capital, Enhanced by Intelligence" },
      {
        name: "description",
        content:
          "AI driven institutional trading across global markets. Disciplined execution, engineered intelligence.",
      },
      { property: "og:title", content: "Hudson Crest Capital | Capital, Enhanced by Intelligence" },
      {
        property: "og:description",
        content:
          "AI driven institutional trading across global markets. Disciplined execution, engineered intelligence.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#0b1220" },
      { name: "apple-mobile-web-app-title", content: "Hudson Crest" },
      { name: "application-name", content: "Hudson Crest Capital" },
      {
        name: "twitter:title",
        content: "Hudson Crest Capital | Capital, Enhanced by Intelligence",
      },
      {
        name: "twitter:description",
        content:
          "AI driven institutional trading across global markets. Disciplined execution, engineered intelligence.",
      },
      {
        property: "og:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/af94a126-87fb-4d56-a7ce-c7b707e9f16b",
      },
      {
        name: "twitter:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/af94a126-87fb-4d56-a7ce-c7b707e9f16b",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      // Disable manifest reference for protected preview deployments where
      // Vercel auth can return 401 on manifest fetch and spam console errors.
      // Re-enable once using an unprotected production domain.
      // { rel: "manifest", href: "/site.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}
