import { createFileRoute } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader, SectionCard } from "@/lib/portalShared";

export const Route = createFileRoute("/portal/admin/risk")({
  component: RiskPage,
});

const exposure = [
  { symbol: "AAPL", exposure: 230_880 },
  { symbol: "NVDA", exposure: 289_260 },
  { symbol: "BTC", exposure: 267_960 },
  { symbol: "EUR/USD", exposure: 1_094_000 },
  { symbol: "XAU", exposure: 508_500 },
];

function RiskPage() {
  return (
    <>
      <PageHeader title="Risk Management" subtitle="Exposure controls and portfolio alerting." />
      <SectionCard title="Exposure by Instrument">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={exposure}>
              <CartesianGrid stroke="oklch(0.30 0.025 260 / 0.4)" />
              <XAxis dataKey="symbol" stroke="oklch(0.68 0.02 250)" />
              <YAxis stroke="oklch(0.68 0.02 250)" />
              <Tooltip
                contentStyle={{
                  background: "oklch(0.20 0.028 260)",
                  border: "1px solid oklch(0.30 0.025 260)",
                }}
              />
              <Area
                type="monotone"
                dataKey="exposure"
                stroke="oklch(0.78 0.15 70)"
                fill="oklch(0.78 0.15 70 / 0.25)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </>
  );
}
