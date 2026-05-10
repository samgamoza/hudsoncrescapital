import { createFileRoute } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader, SectionCard } from "@/lib/portalShared";

export const Route = createFileRoute("/portal/investor/performance")({
  component: PerformancePage,
});

const perf = [
  { date: "Jan", equity: 9.8, drawdown: -1.2 },
  { date: "Feb", equity: 10.2, drawdown: -1.6 },
  { date: "Mar", equity: 10.6, drawdown: -0.9 },
  { date: "Apr", equity: 11.1, drawdown: -1.1 },
  { date: "May", equity: 11.5, drawdown: -0.6 },
];

function PerformancePage() {
  return (
    <>
      <PageHeader title="Performance Analytics" subtitle="Equity and drawdown analytics." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Equity Curve">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={perf}>
                <CartesianGrid stroke="oklch(0.30 0.025 260 / 0.4)" />
                <XAxis dataKey="date" stroke="oklch(0.68 0.02 250)" />
                <YAxis stroke="oklch(0.68 0.02 250)" />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.20 0.028 260)",
                    border: "1px solid oklch(0.30 0.025 260)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="equity"
                  stroke="oklch(0.65 0.22 255)"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
        <SectionCard title="Drawdown">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={perf}>
                <CartesianGrid stroke="oklch(0.30 0.025 260 / 0.4)" />
                <XAxis dataKey="date" stroke="oklch(0.68 0.02 250)" />
                <YAxis stroke="oklch(0.68 0.02 250)" />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.20 0.028 260)",
                    border: "1px solid oklch(0.30 0.025 260)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="drawdown"
                  stroke="oklch(0.65 0.22 25)"
                  fill="oklch(0.65 0.22 25 / 0.25)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>
    </>
  );
}
