import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { PortalShell, NAV_INVESTOR } from "@/lib/portalShared";

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
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { loading, role } = usePortalAuth("investor");
  const [investorGateReady, setInvestorGateReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!role) navigate({ to: "/portal/login/investor", search: { redirect: "/portal/investor" } });
  }, [loading, role, navigate]);

  useEffect(() => {
    if (loading || !role) {
      setInvestorGateReady(false);
      return;
    }
    if (role !== "investor") {
      setInvestorGateReady(true);
      return;
    }
    const path = pathname.replace(/\/+$/, "") || "/";
    if (path.startsWith("/portal/investor/onboarding")) {
      setInvestorGateReady(true);
      return;
    }
    setInvestorGateReady(false);
    void (async () => {
      try {
        const res = await fetch("/api/portal/investor-onboarding");
        if (res.ok) {
          const j = (await res.json()) as { needsOnboarding?: boolean };
          if (j.needsOnboarding) {
            navigate({ to: "/portal/investor/onboarding", replace: true });
          }
        }
      } finally {
        setInvestorGateReady(true);
      }
    })();
  }, [loading, role, pathname, navigate]);

  if (loading || !role || (role === "investor" && !investorGateReady))
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading portal…
      </div>
    );

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
