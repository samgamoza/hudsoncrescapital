import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Legacy "Open account" route. The in-portal profile-completion wizard now
 * lives at /portal/investor/profile/complete, which handles new applicants
 * and re-submissions in one place.
 */
export const Route = createFileRoute("/portal/investor/apply")({
  beforeLoad: () => {
    throw redirect({ to: "/portal/investor/profile/complete", replace: true });
  },
});
