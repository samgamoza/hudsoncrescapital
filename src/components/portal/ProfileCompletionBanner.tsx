import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { usePortalProfileStatus } from "@/lib/portal-profile-status";

/**
 * Persistent (non-dismissible) banner shown while the user's profile is
 * incomplete. Stays out of the way visually but keeps a clear CTA to the
 * completion wizard so the user can always jump back in.
 */
export function ProfileCompletionBanner() {
  const { isIncomplete } = usePortalProfileStatus();
  if (!isIncomplete) return null;

  return (
    <div className="surface-card flex flex-col gap-3 border-amber-500/40 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-600">
          <AlertTriangle className="h-4 w-4" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            Complete your profile to unlock trading and funding
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            My Workspace, Deposit, and Withdraw stay locked until you finish the online
            application and our desk reviews it.
          </p>
        </div>
      </div>
      <Link
        to="/portal/investor/profile/complete"
        className="inline-flex items-center justify-center gap-2 self-start rounded-md bg-gradient-brand px-3 py-2 text-xs font-semibold text-brand-foreground shadow-glow hover:opacity-90 sm:self-auto"
      >
        Complete profile <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
