import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { PageHeader, SectionCard, MetricCard } from "@/lib/portalShared";
import { ASSET_CLASSES, type AssetClass, type HoldingRow } from "@/lib/assetClasses";

export const Route = createFileRoute("/portal/investor/portfolio")({
  component: PortfolioPage,
});

type SP = {
  id: string;
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

function PortfolioPage() {
  const [rows, setRows] = useState<SP[] | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/portal/sub-portfolios").then((res) => {
          if (!res.ok) throw new Error(`Failed (${res.status})`);
          return res.json();
        });
        setRows((r ?? []) as SP[]);
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to load portfolio");
        setRows([]);
      }
    })();
  }, []);

  const totals = useMemo(() => {
    if (!rows) return null;
    let total = 0;
    let pnl = 0;
    let positions = 0;
    const byClass: Record<string, number> = {};
    for (const sp of rows) {
      for (const h of sp.sub_portfolio_holdings) {
        const v = valueOf(h);
        total += v;
        positions += 1;
        if (h.mark_price != null) pnl += (h.mark_price - h.avg_cost) * h.quantity;
        byClass[sp.asset_class] = (byClass[sp.asset_class] ?? 0) + v;
      }
    }
    return { total, pnl, positions, byClass };
  }, [rows]);

  if (rows === null) {
    return <p className="text-sm text-muted-foreground">Loading portfolio…</p>;
  }

  return (
    <>
      <PageHeader
        title="Portfolio"
        subtitle="Holdings across all your sub-portfolios. Each sleeve adapts to its asset class."
      />

      {totals && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            title="Total Market Value"
            value={`$${totals.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
            helper={`${totals.positions} position${totals.positions === 1 ? "" : "s"} across ${rows.length} sleeve${rows.length === 1 ? "" : "s"}`}
          />
          <MetricCard
            title="Unrealized P&L"
            value={`${totals.pnl >= 0 ? "+" : ""}$${totals.pnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
            tone={totals.pnl >= 0 ? "positive" : "negative"}
          />
          <MetricCard
            title="Asset Mix"
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
          description="Your account manager will set up your sleeves shortly."
        >
          <p className="text-sm text-muted-foreground">
            Once your sleeves are created, holdings will appear here grouped by asset class —
            equities, crypto, commodities, and managed strategies all rendered with the columns that
            matter for that asset.
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
              description={`${meta.label} · ${sp.base_currency} · target ${sp.target_allocation_pct ?? 0}% · ${sp.risk_band ?? "—"} risk · current value $${sleeveValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
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

      <Toaster />
    </>
  );
}
