import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Wallet,
  ShieldCheck,
  ArrowRight,
  ChartCandlestick,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { MetricCard, PageHeader, SectionCard, DataTable } from "@/lib/portalShared";

export const Route = createFileRoute("/portal/investor/")({
  component: InvestorDashboard,
});

const perfFallback = [
  { date: "Jan", equity: 9.8 },
  { date: "Feb", equity: 10.2 },
  { date: "Mar", equity: 10.6 },
  { date: "Apr", equity: 11.1 },
  { date: "May", equity: 11.5 },
];

const allocation = [
  { name: "Equity", value: 42 },
  { name: "Crypto", value: 28 },
  { name: "FX", value: 18 },
  { name: "Commodity", value: 12 },
];

const COLORS = [
  "oklch(0.65 0.22 255)",
  "oklch(0.72 0.18 150)",
  "oklch(0.78 0.15 70)",
  "oklch(0.55 0.05 260)",
];

const fmt = (n: any, c = "USD") =>
  Number(n ?? 0).toLocaleString(undefined, {
    style: "currency",
    currency: c,
    maximumFractionDigits: 2,
  });

function QuickAction({
  to,
  icon: Icon,
  label,
  hint,
}: {
  to: string;
  icon: any;
  label: string;
  hint: string;
}) {
  return (
    <Link
      to={to}
      className="surface-card p-4 flex items-center gap-3 hover:border-brand/40 transition-colors group"
    >
      <div className="h-10 w-10 rounded-lg bg-brand/15 text-brand flex items-center justify-center">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-brand transition-colors" />
    </Link>
  );
}

function InvestorDashboard() {
  const [data, setData] = useState<{
    wallets: any[];
    transactions: any[];
    deposits: any[];
    withdrawals: any[];
    accounts: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/portal/my-wallets");
        if (!res.ok) throw new Error(`Wallet API failed (${res.status})`);
        setData(await res.json());
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const summary = useMemo(() => {
    const wallets = data?.wallets ?? [];
    const txns = data?.transactions ?? [];
    const totalAvailable = wallets.reduce(
      (s: number, w: any) => s + Number(w.available_balance ?? 0),
      0,
    );
    const totalPending = wallets.reduce(
      (s: number, w: any) => s + Number(w.pending_balance ?? 0),
      0,
    );
    const currency = (wallets[0]?.currency as string) ?? "USD";

    const now = new Date();
    const monthAgo = new Date(now);
    monthAgo.setMonth(now.getMonth() - 1);
    const monthDeposits = txns
      .filter((t: any) => t.txn_type === "deposit" && new Date(t.created_at) >= monthAgo)
      .reduce((s: number, t: any) => s + Number(t.amount ?? 0), 0);
    const monthWithdrawals = txns
      .filter((t: any) => t.txn_type === "withdrawal" && new Date(t.created_at) >= monthAgo)
      .reduce((s: number, t: any) => s + Math.abs(Number(t.amount ?? 0)), 0);

    const pendingDeposits = (data?.deposits ?? []).filter(
      (r: any) => r.status === "pending",
    ).length;
    const pendingWithdrawals = (data?.withdrawals ?? []).filter(
      (r: any) => r.status === "pending",
    ).length;

    return {
      totalAvailable,
      totalPending,
      currency,
      monthDeposits,
      monthWithdrawals,
      pendingDeposits,
      pendingWithdrawals,
    };
  }, [data]);

  const recentTxns = (data?.transactions ?? []).slice(0, 6);

  return (
    <>
      <PageHeader
        title="Investor Dashboard"
        subtitle="Capital, funding activity, and portfolio at a glance."
      />

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickAction
          to="/portal/trade-workspace"
          icon={ChartCandlestick}
          label="Trade"
          hint="Open dedicated workspace"
        />
        <QuickAction
          to="/portal/investor/wallet"
          icon={ArrowDownToLine}
          label="Deposit Funds"
          hint="Top up your account"
        />
        <QuickAction
          to="/portal/investor/wallet"
          icon={ArrowUpFromLine}
          label="Withdraw"
          hint="Request a payout"
        />
        <QuickAction
          to="/portal/investor/transactions"
          icon={Wallet}
          label="Transactions"
          hint="Full history"
        />
        <QuickAction
          to="/portal/investor/kyc"
          icon={ShieldCheck}
          label="Verification"
          hint="KYC & documents"
        />
      </div>

      {/* Real metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Available Balance"
          value={loading ? "…" : fmt(summary.totalAvailable, summary.currency)}
          helper={
            summary.totalPending > 0
              ? `${fmt(summary.totalPending, summary.currency)} pending`
              : "Across all wallets"
          }
        />
        <MetricCard
          title="Deposits (30d)"
          value={loading ? "…" : fmt(summary.monthDeposits, summary.currency)}
          tone="positive"
          helper={
            summary.pendingDeposits > 0
              ? `${summary.pendingDeposits} pending review`
              : "Cleared in last 30 days"
          }
        />
        <MetricCard
          title="Withdrawals (30d)"
          value={loading ? "…" : fmt(summary.monthWithdrawals, summary.currency)}
          tone={summary.monthWithdrawals > 0 ? "negative" : "neutral"}
          helper={
            summary.pendingWithdrawals > 0
              ? `${summary.pendingWithdrawals} pending review`
              : "Cleared in last 30 days"
          }
        />
        <MetricCard
          title="Active Accounts"
          value={
            loading
              ? "…"
              : String((data?.accounts ?? []).filter((a: any) => a.status === "active").length)
          }
          helper={`${(data?.accounts ?? []).length} total`}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SectionCard title="Portfolio Performance" description="Equity growth, last 5 months">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={perfFallback}>
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
                    dataKey="equity"
                    stroke="oklch(0.65 0.22 255)"
                    fill="oklch(0.65 0.22 255 / 0.25)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>
        <SectionCard title="Allocation" description="Across asset classes">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={allocation} dataKey="value" nameKey="name" outerRadius={88}>
                  {allocation.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.20 0.028 260)",
                    border: "1px solid oklch(0.30 0.025 260)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* Recent activity + pending funding */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SectionCard title="Recent Transactions" description="Last 6 wallet movements">
            {recentTxns.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">
                No transactions yet.{" "}
                <Link to="/portal/investor/wallet" className="text-brand hover:underline">
                  Make your first deposit
                </Link>
                .
              </div>
            ) : (
              <DataTable
                rows={recentTxns}
                columns={[
                  {
                    key: "created_at",
                    label: "Date",
                    render: (r) => new Date(r.created_at).toLocaleDateString(),
                  },
                  {
                    key: "txn_type",
                    label: "Type",
                    render: (r) => <span className="capitalize">{r.txn_type}</span>,
                  },
                  {
                    key: "description",
                    label: "Description",
                    render: (r) => (
                      <span className="text-muted-foreground">{r.description ?? "—"}</span>
                    ),
                  },
                  {
                    key: "amount",
                    label: "Amount",
                    render: (r) => (
                      <span className={Number(r.amount) >= 0 ? "text-success" : "text-danger"}>
                        {fmt(r.amount, r.currency ?? summary.currency)}
                      </span>
                    ),
                  },
                ]}
              />
            )}
          </SectionCard>
        </div>

        <SectionCard title="Funding Status" description="Open requests awaiting review">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-elevated/50 border border-border">
              <div>
                <div className="text-xs text-muted-foreground">Pending Deposits</div>
                <div className="text-xl font-semibold text-foreground">
                  {summary.pendingDeposits}
                </div>
              </div>
              <ArrowDownToLine className="h-5 w-5 text-brand" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-elevated/50 border border-border">
              <div>
                <div className="text-xs text-muted-foreground">Pending Withdrawals</div>
                <div className="text-xl font-semibold text-foreground">
                  {summary.pendingWithdrawals}
                </div>
              </div>
              <ArrowUpFromLine className="h-5 w-5 text-brand" />
            </div>
            <Link
              to="/portal/investor/wallet"
              className="text-sm text-brand hover:underline inline-flex items-center gap-1 mt-1"
            >
              Manage funding <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </SectionCard>
      </div>

      <Toaster />
    </>
  );
}
