import { createRouter, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { routeTree } from "./routeTree.gen";

// Stale-deploy lazy-chunk errors are caught here by TanStack Router's error
// boundary (rather than escaping to window.onerror), so we mirror the same
// "reload once, cooldown 60s" recovery used in __root.tsx.
const RELOAD_KEY = "hc:chunk-reload-at";
const RELOAD_COOLDOWN_MS = 60_000;

function looksLikeStaleChunk(msg: string | undefined): boolean {
  if (!msg) return false;
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /Loading chunk [\w-]+ failed/i.test(msg) ||
    /ChunkLoadError/i.test(msg)
  );
}

function tryReloadForStaleChunk(message: string | undefined): boolean {
  if (typeof window === "undefined") return false;
  if (!looksLikeStaleChunk(message)) return false;
  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_KEY) ?? "0");
    if (Number.isFinite(last) && Date.now() - last < RELOAD_COOLDOWN_MS) {
      return false;
    }
    window.sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // ignore storage failures
  }
  window.location.reload();
  return true;
}

function DefaultErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const isStaleChunk = looksLikeStaleChunk(error?.message);

  useEffect(() => {
    if (isStaleChunk) tryReloadForStaleChunk(error?.message);
  }, [isStaleChunk, error]);

  // While the recovery reload is in flight, show a friendly state instead of
  // the generic "Something went wrong" screen.
  if (isStaleChunk) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 h-10 w-10 animate-spin rounded-full border-2 border-muted border-t-primary" />
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Updating to the latest version…
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A new version of the site is available. Refreshing now.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          An unexpected error occurred. Please try again.
        </p>
        {import.meta.env.DEV && error.message && (
          <pre className="mt-4 max-h-40 overflow-auto rounded-md bg-muted p-3 text-left font-mono text-xs text-destructive">
            {error.message}
          </pre>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const getRouter = () => {
  const router = createRouter({
    routeTree,
    context: {},
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: DefaultErrorComponent,
  });

  return router;
};
