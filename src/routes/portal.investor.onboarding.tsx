import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Legacy investor "lite" onboarding route. Retired after the signup/profile
 * split: the in-portal profile-completion wizard is now the single full
 * application. Any deep link lands users on the new route.
 */
export const Route = createFileRoute("/portal/investor/onboarding")({
  beforeLoad: () => {
    throw redirect({ to: "/portal/investor/profile/complete", replace: true });
  },
});
