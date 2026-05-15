import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Legacy investor onboarding route. Deep links redirect to the public legacy account profile layout.
 */
export const Route = createFileRoute("/portal/investor/onboarding")({
  beforeLoad: () => {
    throw redirect({ to: "/portal/account-profile", replace: true });
  },
});
