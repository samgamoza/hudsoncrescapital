import { Link } from "@tanstack/react-router";
import { ArrowRight, Lock } from "lucide-react";
import { usePortalProfileStatus } from "@/lib/portal-profile-status";

type Props = {
  /** Label of the feature being gated, e.g. "My Workspace". */
  feature: string;
  /** Optional sub-line tailored to the feature. */
  hint?: string;
  /** Optional full-page presentation instead of a card. */
  fullScreen?: boolean;
};

/**
 * Visual gate shown in place of trading / funding features when the user has
 * not yet completed their profile. Renders nothing when the user is complete
 * (so callers can use it as a transparent wrapper).
 */
export function ProfileGateLock({ feature, hint, fullScreen }: Props) {
  const { loading, isIncomplete } = usePortalProfileStatus();
  if (loading) {
    return (
      <div className="text-sm text-muted-foreground py-10 text-center">Checking access…</div>
    );
  }
  if (!isIncomplete) return null;

  const body = (
    <div className="surface-card mx-auto flex max-w-lg flex-col items-center gap-4 p-6 text-center sm:p-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
        <Lock className="h-5 w-5" aria-hidden />
      </div>
      <h2 className="text-xl font-semibold text-foreground">{feature} is locked</h2>
      <p className="text-sm text-muted-foreground">
        {hint ??
          "Complete your online application, including identity verification, so our desk can review your account. " +
            "Once approved, this feature unlocks automatically."}
      </p>
      <Link
        to="/portal/investor/profile/complete"
        className="inline-flex items-center gap-2 rounded-md bg-gradient-brand px-4 py-2 text-sm font-semibold text-brand-foreground shadow-glow hover:opacity-90"
      >
        Complete profile <ArrowRight className="h-4 w-4" />
      </Link>
      <Link
        to="/portal/investor"
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        ← Back to dashboard
      </Link>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
        {body}
      </div>
    );
  }
  return body;
}

/**
 * Render `children` only when the profile is complete; otherwise render the
 * gate UI. Convenience wrapper for route bodies that should be hidden until
 * the user is approved.
 */
export function ProfileGate({
  feature,
  hint,
  fullScreen,
  children,
}: Props & { children: React.ReactNode }) {
  const { loading, isIncomplete } = usePortalProfileStatus();
  if (loading) {
    return (
      <div className="text-sm text-muted-foreground py-10 text-center">Checking access…</div>
    );
  }
  if (isIncomplete) {
    return <ProfileGateLock feature={feature} hint={hint} fullScreen={fullScreen} />;
  }
  return <>{children}</>;
}
