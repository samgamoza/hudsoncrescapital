import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PortalLoginForm } from "@/components/portal/PortalLoginForm";

const searchSchema = z.object({
  redirect: z.string().optional(),
  mode: z.enum(["login", "signup"]).optional(),
  verify: z.enum(["required"]).optional(),
  email: z.string().optional(),
});

export const Route = createFileRoute("/portal/login_/investor")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Investor Login — Hudson Crest Capital" },
      { name: "description", content: "Secure portal login for Hudson Crest Capital investors." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvestorLoginPage,
});

function InvestorLoginPage() {
  return <PortalLoginForm audience="investor" fromRouteId="/portal/login_/investor" />;
}
