import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Lock, ShieldCheck, X } from "lucide-react";
import { usePortalProfileStatus } from "@/lib/portal-profile-status";

/**
 * One-shot reminder modal shown the first time an investor lands in the
 * portal with `status === incomplete`. Acknowledging (either CTA) flips a
 * persistent flag on their profile so it never shows again, regardless of
 * device. While the profile remains incomplete the banner stays visible.
 */
export function ProfileCompletionModal() {
  const { shouldShowModal, acknowledgeModal } = usePortalProfileStatus();
  const [open, setOpen] = useState(false);

  // Arm the modal on first render after the status loads; never re-arm.
  useEffect(() => {
    if (shouldShowModal) setOpen(true);
  }, [shouldShowModal]);

  if (!open) return null;

  const dismiss = (target?: string) => {
    void acknowledgeModal();
    setOpen(false);
    if (target && typeof window !== "undefined") {
      window.location.assign(target);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-completion-modal-title"
      className="fixed inset-0 z-[120] flex items-center justify-center bg-background/80 px-4 py-8 backdrop-blur"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <button
          type="button"
          onClick={() => dismiss()}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
          aria-label="Close reminder"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="bg-gradient-to-br from-brand/25 via-brand/5 to-transparent px-6 pt-8 pb-5 text-center sm:px-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand/15 text-brand">
            <ShieldCheck className="h-6 w-6" aria-hidden />
          </div>
          <h2
            id="profile-completion-modal-title"
            className="mt-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
          >
            Welcome! Finish setting up your profile
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Your account is created. To unlock the trading workspace, deposits, and withdrawals,
            complete the online application from your portal profile. It takes about 10 minutes.
          </p>
        </div>

        <div className="space-y-3 px-6 py-5 text-sm sm:px-8">
          <div className="flex items-start gap-3 rounded-md border border-border bg-muted/15 p-3">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <div>
              <p className="font-medium text-foreground">Locked until your profile is complete</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                My Workspace, Deposit, and Withdraw are unavailable until our desk reviews your
                application.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border bg-surface/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-8">
          <button
            type="button"
            onClick={() => dismiss()}
            className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-elevated"
          >
            Maybe later
          </button>
          <Link
            to="/portal/investor/profile/complete"
            onClick={() => {
              void acknowledgeModal();
              setOpen(false);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-gradient-brand px-4 py-2 text-sm font-semibold text-brand-foreground shadow-glow hover:opacity-90"
          >
            Complete profile now <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
