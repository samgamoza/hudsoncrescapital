import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { formatPortalAuthError, isSafeInternalPath } from "@/lib/portal-auth";
import { getMarketingWebsiteHomeUrl } from "@/lib/site-origin";

/** Where to send the user after Supabase finishes (must stay same-origin, root-relative). */
function resolvePostConfirmPath(nextParam: string | undefined): string {
  if (nextParam && isSafeInternalPath(nextParam)) return nextParam;
  return "/portal/login/investor";
}

function parseHashError(): { title: string; detail: string } | null {
  const raw = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
  if (!raw) return null;
  const params = new URLSearchParams(raw);
  const err = params.get("error");
  if (!err && !params.get("error_code")) return null;
  const rawDesc = params.get("error_description") ?? err ?? "Access was denied.";
  let decoded = rawDesc.replace(/\+/g, " ");
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    /* ignore */
  }
  return {
    title: err === "access_denied" ? "Email link could not complete" : "Confirmation issue",
    detail: formatPortalAuthError(decoded),
  };
}

export const Route = createFileRoute("/auth/confirm")({
  validateSearch: z.object({
    next: z.string().optional(),
  }),
  head: () => ({
    meta: [
      { title: "Email confirmation | Hudson Crest Capital" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthEmailConfirmPage,
});

function AuthEmailConfirmPage() {
  const { next: nextParam } = useSearch({ from: "/auth/confirm" });
  const nextPath = resolvePostConfirmPath(nextParam);

  const [phase, setPhase] = useState<"working" | "success" | "error">("working");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const finishedRef = useRef(false);

  useEffect(() => {
    const hashErr = parseHashError();
    if (hashErr) {
      setPhase("error");
      setErrorMsg(hashErr.detail);
      return;
    }

    let active = true;

    const finishSuccess = () => {
      if (!active || finishedRef.current) return;
      finishedRef.current = true;
      setPhase("success");
      window.setTimeout(() => {
        window.location.replace(nextPath);
      }, 2200);
    };

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session) {
        finishSuccess();
        return;
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (session && event === "SIGNED_IN") {
        finishSuccess();
      }
    });

    const t = window.setTimeout(() => {
      if (!active || finishedRef.current) return;
      void (async () => {
        const { data } = await supabase.auth.getSession();
        if (!active || finishedRef.current) return;
        if (data.session) finishSuccess();
        else {
          setPhase("error");
          setErrorMsg(
            "This confirmation link is invalid, expired, or was already used. Request a new sign-up or sign in from the portal.",
          );
        }
      })();
    }, 8000);

    return () => {
      active = false;
      window.clearTimeout(t);
      sub.subscription.unsubscribe();
    };
  }, [nextPath]);

  return (
    <div className="min-h-screen bg-background grid-bg flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md surface-card p-8 shadow-elevated text-center">
        <a
          href={getMarketingWebsiteHomeUrl()}
          className="flex items-center justify-center mb-6"
          rel="noreferrer"
        >
          <img src={logo} alt="Hudson Crest Capital" className="h-12 w-auto" />
        </a>

        {phase === "working" && (
          <>
            <h1 className="text-xl font-semibold text-foreground">Confirming your email…</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Please wait while we verify your link. You will be redirected to sign in.
            </p>
          </>
        )}

        {phase === "success" && (
          <>
            <h1 className="text-xl font-semibold text-foreground">Email confirmed</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your address is verified. Taking you to the portal sign-in page…
            </p>
          </>
        )}

        {phase === "error" && (
          <>
            <h1 className="text-xl font-semibold text-destructive">Something went wrong</h1>
            <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">{errorMsg}</p>
            <div className="mt-6 flex flex-col gap-2 text-sm">
              <Link
                to={nextPath}
                className="inline-flex justify-center rounded-lg bg-gradient-brand px-4 py-2.5 font-medium text-brand-foreground shadow-glow"
              >
                Go to sign in
              </Link>
              <a
                href={getMarketingWebsiteHomeUrl()}
                className="text-muted-foreground hover:text-foreground"
                rel="noreferrer"
              >
                Back to website
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
