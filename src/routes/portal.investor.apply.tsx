import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Legacy "Open account" route. Lands on the public Cross Ocean–style account profile.
 */
export const Route = createFileRoute("/portal/investor/apply")({
  beforeLoad: () => {
    throw redirect({ to: "/portal/account-profile", replace: true });
  },
});
