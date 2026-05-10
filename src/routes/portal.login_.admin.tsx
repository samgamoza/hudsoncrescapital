import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PortalLoginForm } from "@/components/portal/PortalLoginForm";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/portal/login_/admin")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Admin Login — Hudson Crest Capital" },
      { name: "description", content: "Restricted admin console access." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  return <PortalLoginForm audience="admin" fromRouteId="/portal/login_/admin" />;
}
