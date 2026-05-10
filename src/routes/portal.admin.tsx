import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { PortalShell, NAV_ADMIN } from "@/lib/portalShared";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/portal/admin")({
  head: () => ({
    meta: [
      { title: "Admin Portal — Hudson Crest Capital" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const { loading, role } = usePortalAuth("staff");
  const isStaff = role === "super_admin" || role === "admin" || role === "support";

  useEffect(() => {
    if (loading) return;
    if (!role) {
      navigate({ to: "/portal/login/admin", search: { redirect: "/portal/admin" } });
    } else if (!isStaff) {
      navigate({ to: "/portal/investor" });
    }
  }, [loading, role, isStaff, navigate]);

  if (loading || !isStaff)
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Verifying admin access…
      </div>
    );

  return (
    <PortalShell
      title="Admin Console"
      nav={NAV_ADMIN}
      badge={{
        label:
          role === "super_admin" ? "Super Admin" : role === "admin" ? "Admin Access" : "Support",
        tone: "admin",
      }}
    >
      <Outlet />
      <Toaster />
    </PortalShell>
  );
}
