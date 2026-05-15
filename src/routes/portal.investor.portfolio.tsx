import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { PageHeader, SectionCard, MetricCard } from "@/lib/portalShared";
import { ASSET_CLASSES, type AssetClass, type HoldingRow } from "@/lib/assetClasses";
import { supabase } from "@/integrations/supabase/client";
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

function PortfolioPage() {
  const [rows, setRows] = useState<SP[] | null>(null);
  const [accounts, setAccounts] = useState<
    { id: string; account_number: string; base_currency: string }[]
  >([]);
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
      setRows((r ?? []) as SP[]);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load portfolio");
      setRows([]);
      setAccounts([]);
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

  if (rows === null) {
    return <p className="text-sm text-muted-foreground">Loading portfolio…</p>;
  }

  return (
    <>
      <PageHeader
        title="Portfolio"
        subtitle="Optional sleeves for multi-asset allocation and holdings reporting. Trade execution and order history are on the Trade page."
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
          description="Optional when you split exposure across additional markets beyond the default Limited Risk Options book. Sleeves power the holdings grids on this page."
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
          {totals && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
            </div>
          )}

          {rows.length === 0 ? (
            <SectionCard
              title="No sub-portfolios yet"
              description="Optional sleeves for multi-asset allocation and holdings reporting."
            >
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your advisor can add sleeves when you expand into other asset classes (equities, crypto, commodities,
                managed strategy). Use the <strong className="text-foreground">Trade</strong> page for order entry and
                execution history.
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
