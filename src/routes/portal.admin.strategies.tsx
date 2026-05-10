import { createFileRoute } from "@tanstack/react-router";
import { DataTable, PageHeader, SectionCard } from "@/lib/portalShared";

export const Route = createFileRoute("/portal/admin/strategies")({
  component: StrategiesPage,
});

const strategies = [
  { name: "Momentum Alpha v3", isActive: true, riskLimitNotional: 5_000_000 },
  { name: "Mean Reversion FX", isActive: true, riskLimitNotional: 3_000_000 },
  { name: "Crypto Vol Harvest", isActive: false, riskLimitNotional: 2_000_000 },
  { name: "Statistical Arb US", isActive: true, riskLimitNotional: 7_500_000 },
];

function StrategiesPage() {
  return (
    <>
      <PageHeader
        title="Strategy Control Panel"
        subtitle="Activation and allocation governance across the strategy stack."
      />
      <SectionCard title="Strategies">
        <DataTable
          rows={strategies}
          columns={[
            { key: "name", label: "Strategy" },
            {
              key: "isActive",
              label: "Status",
              render: (r) => (
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border ${
                    r.isActive
                      ? "border-success/40 text-success bg-success/10"
                      : "border-muted text-muted-foreground bg-muted/30"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {r.isActive ? "ON" : "OFF"}
                </span>
              ),
            },
            {
              key: "riskLimitNotional",
              label: "Risk Limit",
              render: (r) => `$${r.riskLimitNotional.toLocaleString()}`,
            },
          ]}
        />
      </SectionCard>
    </>
  );
}
