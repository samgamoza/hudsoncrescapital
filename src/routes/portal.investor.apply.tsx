import { createFileRoute, redirect } from "@tanstack/react-router";

/** Deep link: "Open account" sends applicants to the public one-page investor signup. */
export const Route = createFileRoute("/portal/investor/apply")({
  beforeLoad: () => {
    throw redirect({ to: "/portal/signup/investor", replace: true });
  },
});
