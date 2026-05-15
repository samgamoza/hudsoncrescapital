import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy investor onboarding URL; forwards to the current public open-account flow. */
export const Route = createFileRoute("/portal/investor/onboarding")({
  beforeLoad: () => {
    throw redirect({ to: "/portal/signup/investor", replace: true });
  },
});
