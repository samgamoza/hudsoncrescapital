import { createFileRoute, redirect } from "@tanstack/react-router";

/** Deep link: "Open account" sends applicants to the public multi-step signup flow. */
export const Route = createFileRoute("/portal/investor/apply")({
  beforeLoad: () => {
    throw redirect({ to: "/portal/signup/investor", replace: true });
  },
});
