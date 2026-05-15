import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { PageHeader, SectionCard, MetricCard } from "@/lib/portalShared";
import { ASSET_CLASSES, type AssetClass, type HoldingRow } from "@/lib/assetClasses";
import { supabase } from "@/integrations/supabase/client";
import type {
  AccountPortfolioSnapshot,
  InvestorOrderRow,
  InvestorPositionRow,
} from "@/lib/trading.types";

export const Route = createFileRoute("/portal/investor/portfolio")({
  component: PortfolioPage,
});

type SP = {
  id: string;
  account_id: string;
  name: string;
  asset_class: AssetClass;
  base_currency: string;
  target_allocation_pct: number | null;
  risk_band: string | null;
  status: string;
  sub_portfolio_holdings: HoldingRow[];
};

function valueOf(h: HoldingRow): number {
  const px = h.mark_price ?? h.avg_cost;
  return px * h.quantity;
}

function fmtMoney(n: number, ccy = "USD") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: ccy.length === 3 ? ccy : "USD",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${ccy} ${n.toFixed(2)}`;
  }
}

function orderStatusTone(status: string) {
  switch (status) {
    case "filled":
      return "text-success";
    case "rejected":
    case "cancelled":
    case "expired":
      return "text-muted-foreground";
    case "working":
    case "partially_filled":
      return "text-brand";
    default:
      return "text-foreground";
  }
}

function PortfolioPage() {
  const [rows, setRows] = useState<SP[] | null>(null);
  const [accounts, setAccounts] = useState<
    { id: string; account_number: string; base_currency: string }[]
  >([]);
  const [orders, setOrders] = useState<InvestorOrderRow[]>([]);
  const [positions, setPositions] = useState<InvestorPositionRow[]>([]);
  const [snapshots, setSnapshots] = useState<AccountPortfolioSnapshot[]>([]);
  const [tab, setTab] = useState<"overview" | "add">("overview");
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    account_id: "",
    name: "",
    asset_class: "commodities" as AssetClass,
    target_allocation_pct: 0,
    risk_band: "moderate",
  });
  const [refreshTick, setRefreshTick] = useState(0);

  const load = async () => {
    try {
      const [portfolioRes, tradingRes] = await Promise.all([
        fetch("/api/portal/sub-portfolios"),
        fetch("/api/portal/investor-trading"),
      ]);
      if (!portfolioRes.ok) throw new Error(`Failed (${portfolioRes.status})`);
      if (!tradingRes.ok) throw new Error(`Failed (${tradingRes.status})`);
      const r = await portfolioRes.json();
      const trading = await tradingRes.json();
      setAccounts(Array.isArray(trading?.accounts) ? trading.accounts : []);
      setOrders(Array.isArray(trading?.orders) ? trading.orders : []);
      setPositions(Array.isArray(trading?.positions) ? trading.positions : []);
      setSnapshots(Array.isArray(trading?.account_snapshots) ? trading.account_snapshots : []);
      setRows((r ?? []) as SP[]);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load portfolio");
      setRows([]);
      setAccounts([]);
      setOrders([]);
      setPositions([]);
      setSnapshots([]);
    }
  };

  useEffect(() => {
    void load();
  }, [refreshTick]);

  useEffect(() => {
    if (!draft.account_id && accounts[0]?.id) {
      setDraft((d) => ({ ...d, account_id: accounts[0].id }));
    }
  }, [accounts, draft.account_id]);

  useEffect(() => {
    let disposed = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        const uid = data.session?.user?.id;
        if (!uid || disposed) return;
        channel = supabase.channel(`investor-portfolio-${uid}`);
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table: "sub_portfolios", filter: `user_id=eq.${uid}` },
          () => setRefreshTick((n) => n + 1),
        );
        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "sub_portfolio_holdings",
            filter: `user_id=eq.${uid}`,
          },
          () => setRefreshTick((n) => n + 1),
        );
        for (const a of accounts) {
          channel.on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "orders",
              filter: `account_id=eq.${a.id}`,
            },
            () => setRefreshTick((n) => n + 1),
          );
          channel.on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "positions",
              filter: `account_id=eq.${a.id}`,
            },
            () => setRefreshTick((n) => n + 1),
          );
        }
        void channel.subscribe();
      })
      .catch(() => {
        // graceful fallback: manual refresh path remains
      });
    return () => {
      disposed = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [accounts]);

  const totals = useMemo(() => {
    if (!rows) return null;
    let total = 0;
    let pnl = 0;
    let sleevePositions = 0;
    const byClass: Record<string, number> = {};
    for (const sp of rows) {
      for (const h of sp.sub_portfolio_holdings) {
        const v = valueOf(h);
        total += v;
        sleevePositions += 1;
        if (h.mark_price != null) pnl += (h.mark_price - h.avg_cost) * h.quantity;
        byClass[sp.asset_class] = (byClass[sp.asset_class] ?? 0) + v;
      }
    }
    return { total, pnl, sleevePositions, byClass };
  }, [rows]);

  const openOrdersCount = useMemo(
    () =>
      orders.filter((o) =>
        ["pending", "working", "partially_filled"].includes(String(o.status)),
      ).length,
    [orders],
  );

  if (rows === null) {
    return <p className="text-sm text-muted-foreground">Loading portfolio…</p>;
  }

  return (
    <>
      <PageHeader
        title="Portfolio"
        subtitle="Same data the desk uses for Trade Order: your live orders and broker positions, plus optional sleeves when you expand beyond Limited Risk Options / listed derivatives into other asset classes."
      />

      <div className="flex items-center gap-2 mb-2">
        <button
          className={`text-sm px-3 py-1.5 rounded-md border ${tab === "overview" ? "bg-surface-elevated border-brand/40" : "border-border"}`}
          onClick={() => setTab("overview")}
        >
          Portfolio overview
        </button>
        <button
          className={`text-sm px-3 py-1.5 rounded-md border ${tab === "add" ? "bg-surface-elevated border-brand/40" : "border-border"}`}
          onClick={() => setTab("add")}
        >
          Add Portfolio
        </button>
      </div>

      {tab === "add" && (
        <SectionCard
          title="Add Portfolio (optional sleeve)"
          description="Only needed when you split exposure across additional markets beyond the default Limited Risk Options book. Sleeves power the detailed holdings grid below; they are not required for the desk to work your orders."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select
              className="bg-surface border border-border rounded-md px-3 py-2 text-sm text-foreground w-full"
              value={draft.account_id}
              onChange={(e) => setDraft((d) => ({ ...d, account_id: e.target.value }))}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.account_number} ({a.base_currency})
                </option>
              ))}
            </select>
            <input
              className="bg-surface border border-border rounded-md px-3 py-2 text-sm text-foreground w-full"
              placeholder="Name (e.g. Limited Risk Options (Derivatives))"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
            <select
              className="bg-surface border border-border rounded-md px-3 py-2 text-sm text-foreground w-full"
              value={draft.asset_class}
              onChange={(e) =>
                setDraft((d) => ({ ...d, asset_class: e.target.value as AssetClass }))
              }
            >
              {Object.entries(ASSET_CLASSES).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>
            <input
              className="bg-surface border border-border rounded-md px-3 py-2 text-sm text-foreground w-full"
              type="number"
              min={0}
              max={100}
              placeholder="Target allocation %"
              value={draft.target_allocation_pct}
              onChange={(e) =>
                setDraft((d) => ({ ...d, target_allocation_pct: Number(e.target.value) }))
              }
            />
            <select
              className="bg-surface border border-border rounded-md px-3 py-2 text-sm text-foreground w-full"
              value={draft.risk_band}
              onChange={(e) => setDraft((d) => ({ ...d, risk_band: e.target.value }))}
            >
              <option value="conservative">Conservative</option>
              <option value="moderate">Moderate</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              className="text-sm px-3 py-2 rounded-md bg-gradient-brand text-brand-foreground disabled:opacity-50"
              disabled={saving || !draft.name.trim() || !draft.account_id}
              onClick={async () => {
                setSaving(true);
                try {
                  const { data } = await supabase.auth.getSession();
                  const uid = data.session?.user?.id;
                  if (!uid) throw new Error("Sign in again to create portfolios.");
                  const res = await fetch("/api/portal/sub-portfolios", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      account_id: draft.account_id,
                      user_id: uid,
                      name: draft.name.trim(),
                      asset_class: draft.asset_class,
                      base_currency:
                        accounts.find((a) => a.id === draft.account_id)?.base_currency ?? "USD",
                      target_allocation_pct: draft.target_allocation_pct,
                      risk_band: draft.risk_band,
                    }),
                  });
                  const body = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error(body?.error ?? `Create failed (${res.status})`);
                  toast.success("Portfolio sleeve created");
                  setDraft((d) => ({ ...d, name: "", target_allocation_pct: 0 }));
                  setTab("overview");
                  setRefreshTick((n) => n + 1);
                } catch (e: any) {
                  toast.error(e?.message ?? "Could not create portfolio");
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Creating..." : "Create Portfolio"}
            </button>
          </div>
        </SectionCard>
      )}

      {tab === "overview" && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              <strong className="text-foreground">Trade Order sync:</strong> orders and open positions below pull from
              the same books the admin desk uses when they select your account and post fills. Sleeve grids further
              down are optional for multi-asset allocation.
            </p>
            <Link
              to="/portal/investor/trade"
              className="text-sm shrink-0 rounded-md border border-border bg-surface px-3 py-1.5 font-medium text-foreground hover:bg-surface-elevated"
            >
              Go to Trade →
            </Link>
          </div>

          <SectionCard
            title="Trade orders & open positions"
            description="Live from your brokerage accounts—mirrors the admin Trade Order queue and ticket context (Limited Risk Options / listed derivatives first)."
          >
            {snapshots.length > 0 ? (
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {snapshots.map((s) => (
                  <div
                    key={s.account_id}
                    className="rounded-md border border-border bg-muted/15 px-3 py-2 text-sm"
                  >
                    <div className="font-medium text-foreground">{s.account_number}</div>
                    <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                      <div>
                        Cash:{" "}
                        <span className="text-foreground">
                          {fmtMoney(s.cash_balance, s.base_currency)}
                        </span>
                      </div>
                      <div>
                        Open positions (broker):{" "}
                        <span className="text-foreground">{s.open_position_count}</span>
                      </div>
                      <div>
                        Realized P&amp;L:{" "}
                        <span className={s.realized_pnl >= 0 ? "text-success" : "text-destructive"}>
                          {fmtMoney(s.realized_pnl, s.base_currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active brokerage accounts yet. When your account is active, orders and positions from the Trade
                Order flow will show here automatically.
              </p>
            ) : null}

            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Recent orders
            </h3>
            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground mb-4">No orders yet.</p>
            ) : (
              <div className="overflow-x-auto mb-6 rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="py-2 px-3">Symbol</th>
                      <th className="py-2 px-3">Account</th>
                      <th className="py-2 px-3">Side</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3 text-right">Qty</th>
                      <th className="py-2 px-3 text-right">Filled</th>
                      <th className="py-2 px-3 text-right">Limit</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Placed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 40).map((o) => (
                      <tr key={o.id} className="border-b border-border/50 hover:bg-surface-elevated/40">
                        <td className="py-2 px-3 font-medium">{o.symbol}</td>
                        <td className="py-2 px-3 text-xs text-muted-foreground">{o.account_number ?? "—"}</td>
                        <td
                          className={`py-2 px-3 text-xs font-medium ${o.side === "buy" ? "text-success" : "text-destructive"}`}
                        >
                          {o.side}
                        </td>
                        <td className="py-2 px-3 text-xs text-muted-foreground">{o.order_type}</td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          {o.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          {o.filled_quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">
                          {o.limit_price != null ? o.limit_price.toLocaleString() : "—"}
                        </td>
                        <td className={`py-2 px-3 text-xs capitalize ${orderStatusTone(o.status)}`}>
                          {o.status}
                        </td>
                        <td className="py-2 px-3 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(o.placed_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Open positions (broker book)
            </h3>
            {positions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open positions.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="py-2 px-3">Symbol</th>
                      <th className="py-2 px-3">Account</th>
                      <th className="py-2 px-3 text-right">Qty</th>
                      <th className="py-2 px-3 text-right">Avg cost</th>
                      <th className="py-2 px-3 text-right">Realized P&amp;L</th>
                      <th className="py-2 px-3">Ccy</th>
                      <th className="py-2 px-3">Last trade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((p) => (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-surface-elevated/40">
                        <td className="py-2 px-3 font-medium">{p.symbol}</td>
                        <td className="py-2 px-3 text-xs text-muted-foreground">{p.account_number ?? "—"}</td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          {p.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">{p.avg_cost.toLocaleString()}</td>
                        <td
                          className={`py-2 px-3 text-right tabular-nums ${p.realized_pnl >= 0 ? "text-success" : "text-destructive"}`}
                        >
                          {p.realized_pnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-3 text-xs">{p.currency}</td>
                        <td className="py-2 px-3 text-xs text-muted-foreground whitespace-nowrap">
                          {p.last_trade_at ? new Date(p.last_trade_at).toLocaleString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {totals && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
              <MetricCard
                title="Sleeve market value"
                value={fmtMoney(totals.total)}
                helper={`${totals.sleevePositions} line${totals.sleevePositions === 1 ? "" : "s"} in ${rows.length} sleeve${rows.length === 1 ? "" : "s"}`}
              />
              <MetricCard
                title="Unrealized P/L (sleeves)"
                value={`${totals.pnl >= 0 ? "+" : ""}${fmtMoney(totals.pnl)}`}
                tone={totals.pnl >= 0 ? "positive" : "negative"}
              />
              <MetricCard
                title="Asset mix (sleeves)"
                value={`${Object.keys(totals.byClass).length} class${Object.keys(totals.byClass).length === 1 ? "" : "es"}`}
                helper={Object.entries(totals.byClass)
                  .map(
                    ([k, v]) =>
                      `${ASSET_CLASSES[k as AssetClass]?.label ?? k}: ${totals.total > 0 ? Math.round((v / totals.total) * 100) : 0}%`,
                  )
                  .join(" · ")}
              />
              <MetricCard
                title="Open orders (non-final)"
                value={String(openOrdersCount)}
                helper="Same lifecycle as admin Trade Order queue"
              />
            </div>
          )}

          {rows.length === 0 ? (
            <SectionCard
              title="No sub-portfolios yet"
              description="Optional—your primary view is orders & positions above."
            >
              <p className="text-sm text-muted-foreground leading-relaxed">
                Hudson Crest is oriented around <strong className="text-foreground">Limited Risk Options Contracts</strong>{" "}
                and listed derivatives. The desk posts executions against your brokerage account; that activity appears
                in <strong className="text-foreground">Trade orders & open positions</strong> without any sleeve here.
                Your advisor may add sleeves when you expand into other asset classes (equities, crypto, commodities,
                managed strategy) for allocation reporting.
              </p>
            </SectionCard>
          ) : (
            rows.map((sp) => {
              const meta = ASSET_CLASSES[sp.asset_class];
              const holdings = sp.sub_portfolio_holdings;
              const sleeveValue = holdings.reduce((s, h) => s + valueOf(h), 0);
              return (
                <SectionCard
                  key={sp.id}
                  title={sp.name}
                  description={`${meta.label} · ${sp.base_currency} · target ${sp.target_allocation_pct ?? 0}% · ${sp.risk_band ?? "—"} risk · current value ${fmtMoney(sleeveValue, sp.base_currency)}`}
                >
                  {holdings.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No positions in this sleeve yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                            {meta.columns.map((c) => (
                              <th key={c.key} className="py-2 pr-4 font-medium">
                                {c.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {holdings.map((h) => (
                            <tr
                              key={h.id}
                              className="border-b border-border/50 hover:bg-surface-elevated/40"
                            >
                              {meta.columns.map((c) => (
                                <td key={c.key} className="py-3 pr-4 text-foreground">
                                  {c.render(h)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </SectionCard>
              );
            })
          )}
        </>
      )}

      <Toaster />
    </>
  );
}
