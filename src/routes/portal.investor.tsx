import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { PortalShell, NAV_INVESTOR } from "@/lib/portalShared";
import { InvestorDashboardModeProvider, useInvestorDashboardMode } from "@/contexts/InvestorDashboardModeContext";
import { InvestorDashboard2Shell } from "@/components/investor/InvestorDashboard2Shell";
import { supabase } from "@/integrations/supabase/client";
import type { PortalRole } from "@/lib/portal-auth";
import { PortalProfileStatusProvider } from "@/lib/portal-profile-status";
import { ProfileCompletionModal } from "@/components/portal/ProfileCompletionModal";

export const Route = createFileRoute("/portal/investor")({
  head: () => ({
    meta: [
      { title: "Investor Portal | Hudson Crest Capital" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvestorLayout,
});

function InvestorLayout() {
  const navigate = useNavigate();
  const { loading, role } = usePortalAuth("investor");
  const [bootstrapReady, setBootstrapReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!role) navigate({ to: "/portal/login/investor", search: { redirect: "/portal/investor" } });
  }, [loading, role, navigate]);

  // Flush any pending signup-bootstrap payload that was stashed before the
  // user confirmed their email. Idempotent on the server.
  useEffect(() => {
    if (loading || !role) {
      setBootstrapReady(false);
      return;
    }
    if (role !== "investor") {
      setBootstrapReady(true);
      return;
    }
    setBootstrapReady(false);
    void (async () => {
      try {
        const { flushPendingSignupBootstrap } = await import(
          "@/lib/flush-pending-account-application"
        );
        await flushPendingSignupBootstrap();
      } finally {
        setBootstrapReady(true);
      }
    })();
  }, [loading, role]);

  if (loading || !role || (role === "investor" && !bootstrapReady))
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading portal…
      </div>
    );

  return (
    <PortalProfileStatusProvider>
      <InvestorDashboardModeProvider>
        <InvestorLayoutContent role={role} />
        {role === "investor" ? <ProfileCompletionModal /> : null}
      </InvestorDashboardModeProvider>
    </PortalProfileStatusProvider>
  );
}

function InvestorLayoutContent({ role }: { role: NonNullable<PortalRole> }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { investorDashboard, loading: modeLoading } = useInvestorDashboardMode();
  const [who, setWho] = useState({ email: "", displayName: "" });

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      const meta = u?.user_metadata as Record<string, string | undefined> | undefined;
      const dn =
        meta?.full_name?.trim() ||
        [meta?.first_name, meta?.last_name].filter(Boolean).join(" ").trim() ||
        u?.email?.split("@")[0] ||
        "";
      setWho({ email: u?.email ?? "", displayName: dn });
    });
  }, []);

  const pathNorm = pathname.replace(/\/+$/, "") || "/";
  const exemptDeskV2 =
    pathNorm.startsWith("/portal/investor/profile") ||
    pathNorm.startsWith("/portal/investor/apply") ||
    pathNorm.startsWith("/portal/investor/kyc");

  useEffect(() => {
    if (role !== "investor" || modeLoading || investorDashboard !== "v2") return;
    const p = pathname.replace(/\/+$/, "") || "/";
    if (
      p.startsWith("/portal/investor/profile") ||
      p.startsWith("/portal/investor/apply") ||
      p.startsWith("/portal/investor/kyc")
    )
      return;
    if (p === "/portal/investor") {
      navigate({ to: "/portal/investor/dashboard2", search: { tab: "profile" }, replace: true });
    }
  }, [role, modeLoading, investorDashboard, pathname, navigate]);

  const useDeskV2 = role === "investor" && !modeLoading && investorDashboard === "v2" && !exemptDeskV2;

  if (role === "investor" && modeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading portal…
      </div>
    );
  }

  if (useDeskV2) {
    return (
      <InvestorDashboard2Shell displayName={who.displayName} email={who.email}>
        <Outlet />
      </InvestorDashboard2Shell>
    );
  }

  return (
    <PortalShell
      title="Investor Portal"
      nav={NAV_INVESTOR}
      badge={{
        label: role !== "investor" ? `${role} (Investor View)` : "Investor Account",
        tone: "investor",
      }}
    >
      <Outlet />
    </PortalShell>
  );
}
