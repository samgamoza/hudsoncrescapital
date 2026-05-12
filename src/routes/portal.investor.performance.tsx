import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/lib/portalShared";

export const Route = createFileRoute("/portal/investor/performance")({
  component: PerformancePage,
});

function PerformancePage() {
  return (
    <>
      <PageHeader
        title="Performance Analytics"
        subtitle="Long-term analytics will appear here when reporting is enabled for your account."
      />
      <SectionCard title="Equity and drawdown">
        <p className="text-sm text-muted-foreground">
          No performance series is published in the portal yet. Balances and wallet ledger lines are
          available on the{" "}
          <Link to="/portal/investor/wallet" className="text-brand hover:underline">
            Wallet
          </Link>{" "}
          page; positions and fills appear under{" "}
          <Link to="/portal/investor/trade-history" className="text-brand hover:underline">
            Trade history
          </Link>
          .
        </p>
      </SectionCard>
    </>
  );
}
