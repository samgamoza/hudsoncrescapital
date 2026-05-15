import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

type PasswordSecurityBannerProps = {
  /** Increment after password change so the banner re-fetches profile security flags. */
  reloadKey?: number;
};

/**
 * Shown on the investor desk when `profiles.metadata.must_change_password` is set
 * (typically after admin onboarding with an initial password).
 */
export function PasswordSecurityBanner({ reloadKey = 0 }: PasswordSecurityBannerProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      try {
        const res = await fetch("/api/portal/profile", { signal: ac.signal });
        if (!res.ok) return;
        const d = (await res.json()) as { security?: { mustChangePassword?: boolean } };
        setShow(d.security?.mustChangePassword === true);
      } catch {
        if (ac.signal.aborted) return;
        setShow(false);
      }
    })();
    return () => ac.abort();
  }, [reloadKey]);

  if (!show) return null;

  return (
    <div className="surface-card flex flex-col gap-3 border-destructive/35 bg-destructive/8 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
          <ShieldAlert className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-semibold text-foreground">
            Security alert: please update your default password to secure your account.
          </p>
          <ol className="list-decimal space-y-1 pl-4 text-xs leading-relaxed text-muted-foreground">
            <li>
              Open <span className="font-medium text-foreground">Change password</span> in the desk header
              (gear icon on smaller screens).
            </li>
            <li>Enter your current temporary password in the &quot;Old password&quot; field.</li>
            <li>Create a strong, unique password (avoid personal details) and confirm it.</li>
            <li>Click &quot;Update password&quot; to save your changes.</li>
          </ol>
        </div>
      </div>
      <Link
        to="/portal/investor/settings"
        className="inline-flex shrink-0 items-center justify-center self-start rounded-lg bg-gradient-brand px-3 py-2 text-xs font-semibold text-brand-foreground shadow-md shadow-brand/15 hover:opacity-95 sm:self-auto"
      >
        Change password
      </Link>
    </div>
  );
}
