import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  BadgeInfo,
  BarChart3,
  Bell,
  BookOpenText,
  ChartCandlestick,
  ChevronDown,
  Clock3,
  ExternalLink,
  Filter,
  History,
  Lightbulb,
  LayoutDashboard,
  SearchX,
  ShieldAlert,
  Search,
  Settings2,
  SlidersHorizontal,
  Star,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import type { AssetListing, AssetListingsResponse } from "@/lib/asset-listings.types";

type PlacePayload = {
  accountId: string;
  instrumentId: string;
  side: "buy" | "sell";
  orderType: "market" | "limit" | "stop" | "stop_limit";
  timeInForce: "day" | "gtc" | "ioc" | "fok";
  quantity: number;
  limitPrice?: number | null;
  stopPrice?: number | null;
};

function findTradableInstrumentForAsset(
  instruments: TradableInstrument[],
  asset: AssetListing | null,
): TradableInstrument | null {
  if (!asset) return null;
  const candidates = [asset.display_symbol, asset.symbol, asset.cqs_symbol, asset.nasdaq_symbol]
    .map((s) => String(s ?? "").trim().toUpperCase())
    .filter(Boolean);
  const bySym = new Map(instruments.map((i) => [i.symbol.trim().toUpperCase(), i]));
  for (const c of candidates) {
    const row = bySym.get(c);
    if (row) return row;
  }
  return null;
}

async function postWorkspacePlaceOrder(payload: PlacePayload): Promise<{ ok: true } | { error: string }> {
  const res = await fetch("/api/portal/investor-trading", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "place",
      payload: {
        accountId: payload.accountId,
        instrumentId: payload.instrumentId,
        side: payload.side,
        orderType: payload.orderType,
        timeInForce: payload.timeInForce,
        quantity: payload.quantity,
        limitPrice: payload.limitPrice ?? null,
        stopPrice: payload.stopPrice ?? null,
        clientOrderId: null as string | null,
      },
    }),
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) return { error: body?.error ?? `Order failed (${res.status})` };
  return { ok: true as const };
}

/** Map free-form deal-ticket fields to a validated place payload (minus routing ids). */
function parseDealFieldsToSpec(
  side: "buy" | "sell",
  size: string,
  price: string,
  stop: string,
  limit: string,
): { ok: true; spec: Omit<PlacePayload, "accountId" | "instrumentId"> } | { ok: false; error: string } {
  const quantity = Number(size);
  if (!Number.isFinite(quantity) || quantity <= 0) return { ok: false, error: "Enter a valid size." };
  const lim = Number(limit);
  const stp = Number(stop);
  const px = Number(price);
  if (Number.isFinite(lim) && lim > 0 && Number.isFinite(stp) && stp > 0) {
    return {
      ok: true,
      spec: {
        side,
        orderType: "stop_limit",
        timeInForce: "day",
        quantity,
        limitPrice: lim,
        stopPrice: stp,
      },
    };
  }
  if (Number.isFinite(lim) && lim > 0) {
    return {
      ok: true,
      spec: { side, orderType: "limit", timeInForce: "day", quantity, limitPrice: lim },
    };
  }
  if (Number.isFinite(stp) && stp > 0) {
    return {
      ok: true,
      spec: { side, orderType: "stop", timeInForce: "day", quantity, stopPrice: stp },
    };
  }
  if (Number.isFinite(px) && px > 0) {
    return {
      ok: true,
      spec: { side, orderType: "limit", timeInForce: "day", quantity, limitPrice: px },
    };
  }
  return {
    ok: true,
    spec: { side, orderType: "market", timeInForce: "day", quantity },
  };
}
import type {
  AccountPortfolioSnapshot,
  InvestorTradingWorkspace,
  TradableInstrument,
} from "@/lib/trading.types";
import type { TradeHistoryRow } from "@/lib/trade-history.types";
import { DataTable } from "@/lib/portalShared";
import { supabase } from "@/integrations/supabase/client";
import {
  displayNameOfAsset,
  displaySymbolOfAsset,
  isDirectlyTradableAsset,
  isOptionsChainAsset,
  isReferenceOnlyAsset,
} from "@/lib/asset-listings.types";
type AssetListingQuote = {
  symbol: string;
  last: number;
  change: number;
  changePct: number;
  buy: number;
  sell: number;
  up: boolean;
};

/** Primary rail — kept in direct view. */
const WORKSPACE_MARKET_MAIN_VISIBLE: {
  label: string;
  icon: ComponentType<{ className?: string }>;
  value: string;
}[] = [
  { label: "Commodities", icon: Wallet, value: "commodities" },
  { label: "Shares", icon: ChartCandlestick, value: "shares" },
  { label: "Crypto", icon: Wallet, value: "cryptocurrency" },
  { label: "FX", icon: Clock3, value: "fx" },
  { label: "Options", icon: ChartCandlestick, value: "options" },
];

/** Tucked under "More asset classes" (closed by default) so the rail stays focused. */
const WORKSPACE_MARKET_MAIN_MORE: {
  label: string;
  icon: ComponentType<{ className?: string }>;
  value?: string;
}[] = [
  { label: "ETFs", icon: ChartCandlestick, value: "etfs" },
  { label: "Bonds and Rates", icon: LayoutDashboard, value: "bonds_rates" },
  { label: "Indices", icon: SlidersHorizontal, value: "indices" },
  { label: "Knock-Outs", icon: LayoutDashboard },
];

export const Route = createFileRoute("/portal/trade-workspace")({
  head: () => ({
    meta: [
      { title: "Trade Workspace | Hudson Crest Capital" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TradeWorkspacePage,
});

type WorkspaceMainPanel =
  | "catalog"
  | "search"
  | "discover"
  | "positions"
  | "orders"
  | "history"
  | "alerts";

const WORKSPACE_RAIL_VALUES = new Set<WorkspaceMainPanel>(["search", "discover"]);

const PORTFOLIO_MAIN_VALUES = new Set<WorkspaceMainPanel>(["positions", "orders", "history", "alerts"]);

function WorkspacePortfolioOrdersPanel({
  workspace,
  onRefresh,
}: {
  workspace: InvestorTradingWorkspace | null;
  onRefresh: () => void;
}) {
  const cancelOpen = async (orderId: string) => {
    try {
      const res = await fetch("/api/portal/investor-trading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", payload: { orderId } }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? `Cancel failed (${res.status})`);
      toast.success("Order cancelled");
      onRefresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Cancel failed");
    }
  };

  const rows = workspace?.orders ?? [];
  if (!workspace) {
    return <p className="text-sm text-muted-foreground">Loading orders…</p>;
  }
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No orders on file yet. Place an order from the catalog or the classic ticket to see it here.
      </p>
    );
  }

  return (
    <DataTable
      rows={rows}
      columns={[
        {
          key: "placed_at",
          label: "Placed",
          render: (r) => new Date(r.placed_at).toLocaleString(),
        },
        { key: "symbol", label: "Symbol" },
        {
          key: "instrument_name",
          label: "Name",
          render: (r) => <span className="text-muted-foreground">{r.instrument_name}</span>,
        },
        {
          key: "side",
          label: "Side",
          render: (r) => (
            <span className={r.side === "buy" ? "text-success font-medium" : "text-danger font-medium"}>
              {r.side === "buy" ? "Buy" : "Sell"}
            </span>
          ),
        },
        { key: "order_type", label: "Type" },
        { key: "status", label: "Status" },
        {
          key: "quantity",
          label: "Qty",
          render: (r) => r.quantity.toLocaleString(undefined, { maximumFractionDigits: 8 }),
        },
        {
          key: "id",
          label: "",
          render: (r) =>
            ["pending", "working", "partially_filled"].includes(r.status) ? (
              <button
                type="button"
                className="text-xs text-destructive hover:underline"
                onClick={() => void cancelOpen(r.id)}
              >
                Cancel
              </button>
            ) : (
              <span className="text-muted-foreground">—</span>
            ),
        },
      ]}
    />
  );
}

function WorkspacePortfolioHistoryPanel() {
  const [rows, setRows] = useState<TradeHistoryRow[] | null>(null);

  const loadRows = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/trade-history");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof (data as { error?: string })?.error === "string"
            ? (data as { error: string }).error
            : `Failed (${res.status})`;
        throw new Error(msg);
      }
      setRows(Array.isArray(data) ? (data as TradeHistoryRow[]) : []);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not load trade history");
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  if (rows === null) {
    return <p className="text-sm text-muted-foreground">Loading trade history…</p>;
  }
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No executions on file yet. Fills will appear here once your accounts begin trading.
      </p>
    );
  }

  return (
    <DataTable
      rows={rows}
      columns={[
        {
          key: "executed_at",
          label: "Executed",
          render: (r) => new Date(r.executed_at).toLocaleString(),
        },
        { key: "symbol", label: "Symbol" },
        {
          key: "instrument_name",
          label: "Name",
          render: (r) => <span className="text-muted-foreground">{r.instrument_name}</span>,
        },
        {
          key: "side",
          label: "Side",
          render: (r) => (
            <span className={r.side === "buy" ? "text-success font-medium" : "text-danger font-medium"}>
              {r.side === "buy" ? "Buy" : "Sell"}
            </span>
          ),
        },
        {
          key: "quantity",
          label: "Qty",
          render: (r) => r.quantity.toLocaleString(undefined, { maximumFractionDigits: 8 }),
        },
        {
          key: "price",
          label: "Price",
          render: (r) =>
            `${Number(r.price).toLocaleString(undefined, { maximumFractionDigits: 6 })} ${r.currency}`,
        },
        {
          key: "gross_amount",
          label: "Gross",
          render: (r) =>
            `${Number(r.gross_amount).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${r.currency}`,
        },
      ]}
    />
  );
}

function WorkspaceEmptyCanvas() {
  return (
    <div className="flex min-h-[min(70vh,calc(100vh-8rem))] w-full flex-col items-center justify-center bg-gradient-to-b from-muted/5 via-muted/15 to-muted/5 px-6 py-16 text-center md:px-12">
      <div className="max-w-lg space-y-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          My Workspace
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          This is your new workspace
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          You can use it to watch a focused set of markets, keep your layouts tidy, or mirror how you
          work across screens — it is up to you.
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground/90">
          <span className="font-medium text-foreground">To get started,</span> pick an asset class
          under <span className="font-medium text-foreground">Market Main</span> on the left (for
          example Commodities, Shares, FX, or Options). The catalog and tools load here after you
          choose one.
        </p>
        <p className="text-[11px] text-muted-foreground/70">
          Optional filters stay under{" "}
          <span className="text-foreground/80">Search & filters</span> once a catalog is open.
        </p>
      </div>
    </div>
  );
}

function TradeWorkspacePage() {
  const navigate = useNavigate();
  const { loading, role } = usePortalAuth("investor");
  /** No catalog until user picks an asset class (IG-style empty first view). */
  const [marketClass, setMarketClass] = useState<string | null>(null);
  const [mainPanel, setMainPanel] = useState<WorkspaceMainPanel>("catalog");
  const [hdrWs, setHdrWs] = useState<InvestorTradingWorkspace | null>(null);

  const reloadHdrWs = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/investor-trading");
      const data = (await res.json().catch(() => ({}))) as InvestorTradingWorkspace & {
        error?: string;
      };
      if (!res.ok) return;
      setHdrWs(data);
    } catch {
      /* non-fatal for layout */
    }
  }, []);

  useEffect(() => {
    if (loading || !role) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/portal/investor-trading");
        const data = (await res.json().catch(() => ({}))) as InvestorTradingWorkspace & {
          error?: string;
        };
        if (!res.ok || cancelled) return;
        setHdrWs(data);
      } catch {
        /* non-fatal for layout */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, role]);

  useEffect(() => {
    if (loading || !role) return;
    let disposed = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        const uid = data.session?.user?.id;
        if (!uid || disposed) return;
        channel = supabase
          .channel(`workspace-hdr-${uid}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "orders", filter: `placed_by=eq.${uid}` },
            () => {
              void fetch("/api/portal/investor-trading")
                .then((r) => r.json())
                .then((d) => {
                  if (!disposed && d && typeof d === "object" && Array.isArray((d as any).accounts))
                    setHdrWs(d as InvestorTradingWorkspace);
                })
                .catch(() => {});
            },
          )
          .on("postgres_changes", { event: "*", schema: "public", table: "trades" }, () => {
            void fetch("/api/portal/investor-trading")
              .then((r) => r.json())
              .then((d) => {
                if (!disposed && d && typeof d === "object" && Array.isArray((d as any).accounts))
                  setHdrWs(d as InvestorTradingWorkspace);
              })
              .catch(() => {});
          })
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "positions" },
            () => {
              void fetch("/api/portal/investor-trading")
                .then((r) => r.json())
                .then((d) => {
                  if (!disposed && d && typeof d === "object" && Array.isArray((d as any).accounts))
                    setHdrWs(d as InvestorTradingWorkspace);
                })
                .catch(() => {});
            },
          )
          .subscribe();
      })
      .catch(() => {});
    return () => {
      disposed = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [loading, role]);

  useEffect(() => {
    if (loading) return;
    if (!role)
      navigate({ to: "/portal/login/investor", search: { redirect: "/portal/trade-workspace" } });
  }, [loading, role, navigate]);

  if (loading || !role) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading workspace…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster />
      <header className="h-14 border-b border-border bg-surface/60 backdrop-blur flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold tracking-wide">My Workspace</span>
          <span className="hidden md:inline-flex text-xs text-muted-foreground border border-border rounded px-2 py-0.5">
            Live
          </span>
        </div>
        <WorkspaceHeaderFunds snapshots={hdrWs?.account_snapshots} />
        <div className="flex items-center gap-2">
          <button
            className="text-xs border border-border rounded px-2.5 py-1.5 hover:bg-surface-elevated"
            onClick={() => navigate({ to: "/portal/investor" })}
          >
            Back to dashboard
          </button>
          <button className="text-xs border border-border rounded px-2.5 py-1.5 hover:bg-surface-elevated">
            Manage funds
          </button>
          <button
            className="text-xs border border-brand/40 text-brand rounded px-2.5 py-1.5 hover:bg-brand/10"
            onClick={() => navigate({ to: "/portal/investor/trade" })}
          >
            Classic ticket
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr_260px] min-h-[calc(100vh-56px)]">
        <aside className="border-r border-border bg-surface/30 p-3">
          <NavGroup
            title="Workspace"
            items={[
              { label: "Search", icon: Search, value: "search" },
              { label: "DiscoverAI", icon: Lightbulb, value: "discover" },
            ]}
            activeValue={WORKSPACE_RAIL_VALUES.has(mainPanel) ? mainPanel : undefined}
            onSelect={(value) => {
              if (value === "search" || value === "discover") setMainPanel(value);
            }}
          />
          <NavGroup
            title="Market Main"
            items={WORKSPACE_MARKET_MAIN_VISIBLE}
            activeValue={mainPanel === "catalog" ? (marketClass ?? undefined) : undefined}
            onSelect={(value) => {
              if (value) {
                setMarketClass(value);
                setMainPanel("catalog");
              }
            }}
          />
          <WorkspaceMoreMarketClasses
            items={WORKSPACE_MARKET_MAIN_MORE}
            activeValue={mainPanel === "catalog" ? marketClass ?? "" : ""}
            onSelect={(value) => {
              if (value) {
                setMarketClass(value);
                setMainPanel("catalog");
              }
            }}
          />
          <NavGroup
            title="Portfolio"
            items={[
              { label: "Positions", icon: LayoutDashboard, value: "positions" },
              { label: "Orders", icon: ChartCandlestick, value: "orders" },
              { label: "History", icon: History, value: "history" },
              { label: "Alerts", icon: Bell, value: "alerts" },
            ]}
            activeValue={PORTFOLIO_MAIN_VALUES.has(mainPanel) ? mainPanel : undefined}
            onSelect={(value) => {
              if (value === "positions" || value === "orders" || value === "history" || value === "alerts") {
                setMainPanel(value);
              }
            }}
          />
        </aside>

        <main className="min-h-0 bg-background md:min-h-[calc(100vh-3.5rem)]">
          {mainPanel === "catalog" && !marketClass ? <WorkspaceEmptyCanvas /> : null}
          {mainPanel === "catalog" && marketClass ? (
            <div className="h-full p-4 md:p-6">
              <AssetBrowser forcedAssetClass={marketClass} />
            </div>
          ) : null}
          {mainPanel === "search" ? (
            <div className="h-full p-4 md:p-6">
              <div className="mb-3">
                <h2 className="text-sm font-semibold tracking-tight">Search</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Search and filter listings across all asset classes. Pick a class under{" "}
                  <span className="text-foreground/90">Market Main</span> for a focused catalog view.
                </p>
              </div>
              <AssetBrowser />
            </div>
          ) : null}
          {mainPanel === "discover" ? (
            <div className="h-full space-y-3 overflow-auto p-4 md:p-6">
              <div>
                <h2 className="text-sm font-semibold tracking-tight">DiscoverAI</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  AI-assisted discovery and thematic screens are not connected to this workspace yet.
                </p>
              </div>
              <p className="text-sm text-muted-foreground border border-border rounded-lg p-4 bg-surface/30">
                Coming soon: ask in natural language for ideas, compare sectors, and surface instruments
                that match your goals — with clear disclosures and human oversight where required.
              </p>
            </div>
          ) : null}
          {mainPanel === "positions" ? (
            <div className="h-full space-y-3 overflow-auto p-4 md:p-6">
              <div>
                <h2 className="text-sm font-semibold tracking-tight">Positions</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Open lines across your accounts (non-zero quantity), newest activity first.
                </p>
              </div>
              {!hdrWs ? (
                <p className="text-sm text-muted-foreground">Loading positions…</p>
              ) : (hdrWs.positions ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No open positions on file.</p>
              ) : (
                <DataTable
                  rows={hdrWs.positions}
                  columns={[
                    { key: "symbol", label: "Symbol" },
                    {
                      key: "instrument_name",
                      label: "Name",
                      render: (r) => <span className="text-muted-foreground">{r.instrument_name}</span>,
                    },
                    {
                      key: "account_number",
                      label: "Account",
                      render: (r) => (
                        <span className="font-mono text-xs">{r.account_number ?? "—"}</span>
                      ),
                    },
                    {
                      key: "quantity",
                      label: "Qty",
                      render: (r) =>
                        r.quantity.toLocaleString(undefined, { maximumFractionDigits: 8 }),
                    },
                    {
                      key: "avg_cost",
                      label: "Avg cost",
                      render: (r) =>
                        `${r.avg_cost.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${r.currency}`,
                    },
                    {
                      key: "realized_pnl",
                      label: "Realized P/L",
                      render: (r) => (
                        <span
                          className={
                            r.realized_pnl >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          }
                        >
                          {r.realized_pnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
                          {r.currency}
                        </span>
                      ),
                    },
                    {
                      key: "last_trade_at",
                      label: "Last activity",
                      render: (r) =>
                        r.last_trade_at ? new Date(r.last_trade_at).toLocaleString() : "—",
                    },
                  ]}
                />
              )}
            </div>
          ) : null}
          {mainPanel === "orders" ? (
            <div className="h-full space-y-3 overflow-auto p-4 md:p-6">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold tracking-tight">Orders</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Recent orders across your accounts (newest first). Cancel is available for open
                    lines.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void reloadHdrWs()}
                  className="text-xs border border-border rounded px-2.5 py-1.5 hover:bg-surface-elevated"
                >
                  Refresh
                </button>
              </div>
              <WorkspacePortfolioOrdersPanel workspace={hdrWs} onRefresh={reloadHdrWs} />
            </div>
          ) : null}
          {mainPanel === "history" ? (
            <div className="h-full space-y-3 overflow-auto p-4 md:p-6">
              <div>
                <h2 className="text-sm font-semibold tracking-tight">History</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Confirmed executions (fills), newest first.
                </p>
              </div>
              <WorkspacePortfolioHistoryPanel />
            </div>
          ) : null}
          {mainPanel === "alerts" ? (
            <div className="h-full space-y-3 overflow-auto p-4 md:p-6">
              <div>
                <h2 className="text-sm font-semibold tracking-tight">Alerts</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Price and account alerts are not wired to this workspace yet.
                </p>
              </div>
              <p className="text-sm text-muted-foreground border border-border rounded-lg p-4 bg-surface/30">
                Coming soon: configurable alerts will appear here and can optionally notify you by
                email.
              </p>
            </div>
          ) : null}
        </main>

        <aside className="border-l border-border bg-surface/30 p-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Panels</div>
          <div className="flex flex-col gap-2">
            <WorkspaceBlotter />
            <Panel title="Notifications" icon={Bell}>
              No new notifications.
            </Panel>
            <Panel title="Posts" icon={BookOpenText}>
              Market commentary and updates will appear here.
            </Panel>
            <Panel title="All" icon={Settings2}>
              Configure your workspace layout and panel preferences.
            </Panel>
          </div>
        </aside>
      </div>
    </div>
  );
}

function WorkspaceHeaderFunds({ snapshots }: { snapshots?: AccountPortfolioSnapshot[] }) {
  const snap = snapshots?.[0];
  if (!snap) {
    return (
      <div className="hidden lg:flex items-center gap-4 text-xs text-muted-foreground">
        <span>
          Primary account: <b className="text-foreground">—</b>
        </span>
        <span>Cash · Realized · Positions loading after catalog sync…</span>
      </div>
    );
  }
  const cur = snap.base_currency ?? "USD";
  return (
    <div className="hidden lg:flex items-center gap-4 text-xs text-muted-foreground">
      <span title={`Account ${snap.account_number}`}>
       Acct <b className="text-foreground font-mono">{snap.account_number}</b> ({cur})
      </span>
      <span>
        Cash:{" "}
        <b className="text-foreground">{fmtNum(snap.cash_balance)}</b>
      </span>
      <span title="Aggregate realized P/L across open position rows">
        Realized P/L:{" "}
        <b className={snap.realized_pnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
          {fmtNum(snap.realized_pnl)}
        </b>
      </span>
      <span>
        Open lines:{" "}
        <b className="text-foreground">{snap.open_position_count}</b>
      </span>
    </div>
  );
}

function WorkspaceBlotter() {
  const [orders, setOrders] = useState<InvestorTradingWorkspace["orders"]>([]);
  const [fills, setFills] = useState<
    { id: string; executed_at: string; symbol: string; side: string; quantity: number; price: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [ordersRes, fillsRes] = await Promise.all([
        fetch("/api/portal/investor-trading"),
        fetch("/api/portal/trade-history"),
      ]);
      const ordersBody = await ordersRes.json().catch(() => ({}));
      const fillsBody = await fillsRes.json().catch(() => []);
      if (!ordersRes.ok) throw new Error(ordersBody?.error ?? `Orders failed (${ordersRes.status})`);
      if (!fillsRes.ok) throw new Error(`Fills failed (${fillsRes.status})`);
      const ws = ordersBody as InvestorTradingWorkspace;
      const open = (ws.orders ?? []).filter((o) =>
        ["pending", "working", "partially_filled"].includes(o.status),
      );
      setOrders(open.slice(0, 8));
      setFills(
        (Array.isArray(fillsBody) ? fillsBody : [])
          .slice(0, 8)
          .map((f: any) => ({
            id: String(f.id),
            executed_at: String(f.executed_at),
            symbol: String(f.symbol ?? "—"),
            side: String(f.side ?? ""),
            quantity: Number(f.quantity ?? 0),
            price: Number(f.price ?? 0),
          })),
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not load blotter";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const cancelOpen = async (orderId: string) => {
    try {
      const res = await fetch("/api/portal/investor-trading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", payload: { orderId } }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? `Cancel failed (${res.status})`);
      toast.success("Order cancelled");
      void load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Cancel failed");
    }
  };

  useEffect(() => {
    void load();
    const id = window.setInterval(() => {
      void load();
    }, 10000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let disposed = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        const uid = data.session?.user?.id;
        if (!uid || disposed) return;
        channel = supabase
          .channel(`workspace-blotter-${uid}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "orders", filter: `placed_by=eq.${uid}` },
            () => void load(),
          )
          .on("postgres_changes", { event: "*", schema: "public", table: "trades" }, () => void load())
          .subscribe();
      })
      .catch(() => {
        // polling fallback already active
      });
    return () => {
      disposed = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <section className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-foreground">Order Blotter</div>
        <button
          type="button"
          onClick={() => void load()}
          className="text-[11px] text-muted-foreground hover:text-foreground"
        >
          Refresh
        </button>
      </div>
      {loading ? (
        <div className="text-xs text-muted-foreground">Loading...</div>
      ) : (
        <>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
            Open orders
          </div>
          <div className="space-y-1 mb-3">
            {orders.length === 0 ? (
              <div className="text-xs text-muted-foreground">No open orders.</div>
            ) : (
              orders.map((o) => (
                <div key={o.id} className="text-xs border border-border rounded px-2 py-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-medium truncate">{o.symbol}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-muted-foreground">{o.status}</span>
                      <button
                        type="button"
                        onClick={() => void cancelOpen(o.id)}
                        className="text-[10px] uppercase text-destructive hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                  <div className="text-muted-foreground">
                    {o.side} {o.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
            Recent fills
          </div>
          <div className="space-y-1">
            {fills.length === 0 ? (
              <div className="text-xs text-muted-foreground">No fills yet.</div>
            ) : (
              fills.map((f) => (
                <div key={f.id} className="text-xs border border-border rounded px-2 py-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{f.symbol}</span>
                    <span className={f.side === "buy" ? "text-success" : "text-destructive"}>
                      {f.side}
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    {f.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })} @{" "}
                    {fmtPx(f.price)}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </section>
  );
}

function AssetBrowser({ forcedAssetClass }: { forcedAssetClass?: string }) {
  const [query, setQuery] = useState("");
  const [activeClass, setActiveClass] = useState<string>(forcedAssetClass ?? "all");
  const [assetType, setAssetType] = useState("");
  const [exchange, setExchange] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [issuer, setIssuer] = useState("");
  const [settlementType, setSettlementType] = useState("");
  const [etfOnly, setEtfOnly] = useState(false);
  const [activeOnly, setActiveOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AssetListing[]>([]);
  const [selected, setSelected] = useState<AssetListing | null>(null);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [ticketAsset, setTicketAsset] = useState<AssetListing | null>(null);
  const [dealTab, setDealTab] = useState<"deal" | "order" | "info">("deal");
  const [liveQuotes, setLiveQuotes] = useState<Record<string, AssetListingQuote>>({});
  const [quoteFeedHint, setQuoteFeedHint] = useState<string | null>(null);
  const [tradeWs, setTradeWs] = useState<InvestorTradingWorkspace | null>(null);

  const loadTradeWs = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/investor-trading");
      const raw = await res.json().catch(() => ({}));
      if (!res.ok) return;
      setTradeWs(raw as InvestorTradingWorkspace);
    } catch {
      /* non-fatal */
    }
  }, []);

  useEffect(() => {
    void loadTradeWs();
  }, [loadTradeWs]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portal/asset-listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          assetClass: activeClass,
          assetType,
          exchange,
          category,
          subCategory,
          issuer,
          settlementType,
          etfOnly,
          activeOnly,
          limit: 500,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<AssetListingsResponse> & {
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);
      const nextRows = Array.isArray(data.rows) ? data.rows : [];
      setRows(nextRows);
      if (selected) {
        const refreshed = nextRows.find((r) => r.id === selected.id) ?? null;
        setSelected(refreshed);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Could not load asset listings");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const raw = localStorage.getItem("workspace:watchlist");
    if (raw) {
      try {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setWatchlist(arr.map(String));
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("workspace:watchlist", JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    if (!forcedAssetClass) return;
    setActiveClass((prev) => (prev === forcedAssetClass ? prev : forcedAssetClass));
  }, [forcedAssetClass]);

  // Auto-search and filter refresh (debounced), including sidebar market selection.
  useEffect(() => {
    const t = setTimeout(() => {
      void load();
    }, 250);
    return () => clearTimeout(t);
  }, [
    activeClass,
    query,
    assetType,
    exchange,
    category,
    subCategory,
    issuer,
    settlementType,
    etfOnly,
    activeOnly,
  ]);

  useEffect(() => {
    if (!rows.length) return;
    const symbols = Array.from(
      new Set(
        rows
          .slice(0, 80)
          .map((r) => displaySymbolOfAsset(r).trim().toUpperCase())
          .filter(Boolean),
      ),
    );
    if (!symbols.length) return;

    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/public/asset-listing-quotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbols }),
        });
        const body = await res.json().catch(() => ({}));
        const list = Array.isArray(body?.quotes) ? (body.quotes as AssetListingQuote[]) : [];
        if (cancelled) return;
        const bySym = Object.fromEntries(list.map((q) => [q.symbol.toUpperCase(), q]));
        setLiveQuotes(bySym);
        setQuoteFeedHint(
          list.length === 0 && typeof (body as { error?: string }).error === "string"
            ? (body as { error: string }).error
            : null,
        );
      } catch {
        // silent fallback
      }
    };

    void tick();
    const id = window.setInterval(() => {
      void tick();
    }, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [rows]);

  const refresh = async () => {
    await load();
  };

  const assetTypeOpts = useMemo(
    () => [...new Set(rows.map((r) => r.asset_type).filter(Boolean))].sort(),
    [rows],
  );
  const exchangeOpts = useMemo(
    () => [...new Set(rows.map((r) => r.exchange_name || "").filter(Boolean))].sort(),
    [rows],
  );
  const categoryOpts = useMemo(
    () => [...new Set(rows.map((r) => r.category || "").filter(Boolean))].sort(),
    [rows],
  );
  const subCategoryOpts = useMemo(
    () => [...new Set(rows.map((r) => r.sub_category || "").filter(Boolean))].sort(),
    [rows],
  );
  const issuerOpts = useMemo(
    () => [...new Set(rows.map((r) => r.issuer || "").filter(Boolean))].sort(),
    [rows],
  );
  const settlementOpts = useMemo(
    () => [...new Set(rows.map((r) => r.settlement_type || "").filter(Boolean))].sort(),
    [rows],
  );

  const onToggleWatch = (asset: AssetListing) => {
    const key = String(asset.id);
    setWatchlist((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]));
  };

  const actionLabel = (asset: AssetListing) => {
    if (isReferenceOnlyAsset(asset)) return "View Details";
    if (isOptionsChainAsset(asset)) return "Open Chain";
    if (isDirectlyTradableAsset(asset)) return "Trade";
    return "View";
  };

  return (
    <div className="h-full rounded-xl border border-border bg-surface/40 overflow-hidden">
      <div className="border-b border-border px-3 py-2 flex flex-wrap items-center gap-2 text-xs">
        <Tab label="Asset Browser" active count={rows.length} />
        <Tab label="Watchlist" count={watchlist.length} />
        <div className="ml-auto text-muted-foreground">Catalog: asset_listings</div>
      </div>

      <details className="group border-b border-border bg-background/40 open:bg-background/50">
        <summary className="cursor-pointer list-none px-3 py-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground flex items-center gap-2 select-none [&::-webkit-details-marker]:hidden">
          <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180 text-brand" aria-hidden />
          <span className="font-medium uppercase tracking-wide">Search & filters</span>
          <span className="normal-case font-normal opacity-80">(optional)</span>
        </summary>
        <div className="border-t border-border/60 p-3 flex flex-col gap-3">
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-2">
          <input
            className="bg-surface border border-border rounded-md px-3 py-2 text-sm text-foreground md:col-span-2"
            placeholder="Search symbol, name, base/quote, category..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void refresh();
              }
            }}
          />
          <select
            className="bg-surface border border-border rounded-md px-2 py-2 text-sm"
            value={assetType}
            onChange={(e) => setAssetType(e.target.value)}
          >
            <option value="">Asset Type</option>
            {assetTypeOpts.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
          <select
            className="bg-surface border border-border rounded-md px-2 py-2 text-sm"
            value={exchange}
            onChange={(e) => setExchange(e.target.value)}
          >
            <option value="">Exchange</option>
            {exchangeOpts.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
          <select
            className="bg-surface border border-border rounded-md px-2 py-2 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Category</option>
            {categoryOpts.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex items-center justify-center gap-1.5 border border-border rounded-md px-3 py-2 text-sm hover:bg-surface-elevated"
          >
            <Filter className="h-4 w-4" />
            Apply
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-2">
          <select
            className="bg-surface border border-border rounded-md px-2 py-2 text-sm"
            value={subCategory}
            onChange={(e) => setSubCategory(e.target.value)}
          >
            <option value="">Sub Category</option>
            {subCategoryOpts.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
          <select
            className="bg-surface border border-border rounded-md px-2 py-2 text-sm"
            value={issuer}
            onChange={(e) => setIssuer(e.target.value)}
          >
            <option value="">Issuer</option>
            {issuerOpts.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
          <select
            className="bg-surface border border-border rounded-md px-2 py-2 text-sm"
            value={settlementType}
            onChange={(e) => setSettlementType(e.target.value)}
          >
            <option value="">Settlement</option>
            {settlementOpts.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-2 text-xs border border-border rounded-md px-3 py-2">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
            />
            Active only
          </label>
          <label className="inline-flex items-center gap-2 text-xs border border-border rounded-md px-3 py-2">
            <input
              type="checkbox"
              checked={etfOnly}
              onChange={(e) => setEtfOnly(e.target.checked)}
            />
            ETF only
          </label>
          <button
            type="button"
            onClick={() => {
              setAssetType("");
              setExchange("");
              setCategory("");
              setSubCategory("");
              setIssuer("");
              setSettlementType("");
              setEtfOnly(false);
              setActiveOnly(true);
              setQuery("");
              setActiveClass("all");
              void load();
            }}
            className="border border-border rounded-md px-3 py-2 text-sm hover:bg-surface-elevated"
          >
            Reset
          </button>
        </div>
        </div>
      </details>

      {quoteFeedHint ? (
        <p className="mb-3 text-xs text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-md px-2.5 py-2 bg-amber-500/5">
          Live prices unavailable: {quoteFeedHint}
        </p>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] min-h-[600px]">
        <section className="overflow-auto">
          {loading ? (
            <div className="h-[420px] grid place-items-center text-sm text-muted-foreground">
              Loading assets…
            </div>
          ) : rows.length === 0 ? (
            <div className="h-[420px] grid place-items-center text-sm text-muted-foreground">
              <div className="inline-flex items-center gap-2">
                <SearchX className="h-4 w-4" />
                No assets found for current filters.
              </div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface/80 backdrop-blur border-b border-border">
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2.5 px-3">Watch</th>
                  <th className="py-2.5 px-3">Symbol</th>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3 text-right">Sell</th>
                  <th className="py-2.5 px-3 text-right">Buy</th>
                  <th className="py-2.5 px-3 text-right">Change</th>
                  <th className="py-2.5 px-3 text-right">% Change</th>
                  <th className="py-2.5 px-3">Class</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Exchange</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Settlement</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((asset) => {
                  const watch = watchlist.includes(String(asset.id));
                  const qKey = displaySymbolOfAsset(asset).trim().toUpperCase();
                  const q = liveQuotes[qKey];
                  const sellTxt = q ? fmtPx(q.sell) : "—";
                  const buyTxt = q ? fmtPx(q.buy) : "—";
                  const chgTxt = q ? `${q.change >= 0 ? "+" : ""}${fmtNum(q.change)}` : "—";
                  const chgPctTxt = q
                    ? `${q.changePct >= 0 ? "+" : ""}${q.changePct.toFixed(2)}%`
                    : "—";
                  return (
                    <tr
                      key={asset.id}
                      className="border-b border-border/50 hover:bg-surface-elevated/30 cursor-pointer"
                      onClick={() => {
                        setSelected(asset);
                        setDealTab("deal");
                        if (isDirectlyTradableAsset(asset)) setTicketAsset(asset);
                      }}
                    >
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleWatch(asset);
                          }}
                          aria-label="Toggle watchlist"
                          className={
                            watch ? "text-brand" : "text-muted-foreground hover:text-foreground"
                          }
                        >
                          <Star className={`h-4 w-4 ${watch ? "fill-current" : ""}`} />
                        </button>
                      </td>
                      <td className="px-3 py-2.5 font-medium">{displaySymbolOfAsset(asset)}</td>
                      <td className="px-3 py-2.5">{displayNameOfAsset(asset)}</td>
                      <td className="px-3 py-2.5 text-right font-medium">{sellTxt}</td>
                      <td className="px-3 py-2.5 text-right font-medium">{buyTxt}</td>
                      <td
                        className={`px-3 py-2.5 text-right ${q ? (q.change >= 0 ? "text-success" : "text-destructive") : "text-muted-foreground"}`}
                      >
                        {chgTxt}
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right ${q ? (q.changePct >= 0 ? "text-success" : "text-destructive") : "text-muted-foreground"}`}
                      >
                        {chgPctTxt}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{asset.asset_class}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{asset.asset_type}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {asset.exchange_name || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {asset.sub_category || asset.category || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {asset.settlement_type || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(asset);
                            if (isDirectlyTradableAsset(asset)) setTicketAsset(asset);
                            if (isOptionsChainAsset(asset)) return;
                          }}
                          className="border border-border rounded-md px-2 py-1 text-xs hover:bg-surface-elevated"
                        >
                          {actionLabel(asset)}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <aside className="border-l border-border bg-background/50 p-3 space-y-3">
          <section className="rounded-lg border border-border bg-background p-3">
            <div className="inline-flex items-center gap-1 rounded-md border border-border p-1 text-xs">
              <button
                type="button"
                onClick={() => setDealTab("deal")}
                className={`px-2 py-1 rounded ${dealTab === "deal" ? "bg-brand/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Deal
              </button>
              <button
                type="button"
                onClick={() => setDealTab("order")}
                className={`px-2 py-1 rounded ${dealTab === "order" ? "bg-brand/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Order
              </button>
              <button
                type="button"
                onClick={() => setDealTab("info")}
                className={`px-2 py-1 rounded ${dealTab === "info" ? "bg-brand/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Info
              </button>
            </div>
            <div className="mt-3 rounded-md border border-border bg-surface/50 h-36 p-2">
              {selected ? (
                <div className="h-full flex flex-col">
                  <div className="text-xs text-muted-foreground flex items-center justify-between">
                    <span>{displaySymbolOfAsset(selected)}</span>
                    <span className="inline-flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Live chart
                    </span>
                  </div>
                  <div className="flex-1 mt-2 rounded bg-background/60 border border-border grid place-items-center text-[11px] text-muted-foreground">
                    No chart
                  </div>
                </div>
              ) : (
                <div className="h-full grid place-items-center text-xs text-muted-foreground">
                  Select an instrument
                </div>
              )}
            </div>
          </section>

          {dealTab === "deal" || dealTab === "order" ? (
            <DealTicketCard
              asset={ticketAsset ?? selected}
              mode={dealTab}
              onClose={() => setTicketAsset(null)}
              liveQuotes={liveQuotes}
              workspace={tradeWs}
              reloadWorkspace={loadTradeWs}
            />
          ) : null}

          <AssetDetailsCard asset={selected} />
          {dealTab === "info" ? (
            <TradeTicketCard
              asset={ticketAsset ?? selected}
              onClose={() => setTicketAsset(null)}
              workspace={tradeWs}
              reloadWorkspace={loadTradeWs}
            />
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function AssetDetailsCard({ asset }: { asset: AssetListing | null }) {
  if (!asset) {
    return (
      <Panel title="Asset Details" icon={BadgeInfo}>
        Select an instrument to inspect details, market metadata, and trade eligibility.
      </Panel>
    );
  }
  const referenceOnly = isReferenceOnlyAsset(asset);
  const optionsChain = isOptionsChainAsset(asset);
  const tradable = isDirectlyTradableAsset(asset);

  return (
    <section className="rounded-lg border border-border bg-background p-3">
      <div className="text-xs text-muted-foreground mb-1">Asset Detail</div>
      <h3 className="text-sm font-semibold">
        {displaySymbolOfAsset(asset)} · {displayNameOfAsset(asset)}
      </h3>
      <div className="mt-2 text-xs text-muted-foreground space-y-1">
        <div>
          Class: <span className="text-foreground">{asset.asset_class}</span>
        </div>
        <div>
          Type: <span className="text-foreground">{asset.asset_type}</span>
        </div>
        <div>
          Exchange: <span className="text-foreground">{asset.exchange_name || "—"}</span>
        </div>
        <div>
          Category: <span className="text-foreground">{asset.category || "—"}</span>
        </div>
        <div>
          Sub category: <span className="text-foreground">{asset.sub_category || "—"}</span>
        </div>
        <div>
          Pricing unit: <span className="text-foreground">{asset.pricing_unit || "—"}</span>
        </div>
        <div>
          Settlement: <span className="text-foreground">{asset.settlement_type || "—"}</span>
        </div>
        {asset.base_asset || asset.quote_asset ? (
          <div>
            Pair:{" "}
            <span className="text-foreground">
              {asset.base_asset || "—"}/{asset.quote_asset || "—"}
            </span>
          </div>
        ) : null}
      </div>
      {referenceOnly && (
        <p className="mt-3 text-xs text-amber-600/90 dark:text-amber-400/90 border border-amber-500/30 rounded-md px-2.5 py-2 bg-amber-500/5">
          This instrument is for reference only. Trade related ETFs, futures, or options instead.
        </p>
      )}
      {optionsChain && (
        <p className="mt-3 text-xs text-amber-600/90 dark:text-amber-400/90 border border-amber-500/30 rounded-md px-2.5 py-2 bg-amber-500/5">
          Options involve risk. Select a specific contract before placing an order.
        </p>
      )}
      {!referenceOnly && !optionsChain && tradable && (
        <p className="mt-3 text-xs text-muted-foreground border border-border rounded-md px-2.5 py-2">
          Directly tradable class. Use the order ticket to stage buy/sell flow.
        </p>
      )}
      {asset.source_url ? (
        <a
          href={asset.source_url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-brand hover:underline"
        >
          Source
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ) : null}
    </section>
  );
}

function TradeTicketCard({
  asset,
  onClose,
  workspace,
  reloadWorkspace,
}: {
  asset: AssetListing | null;
  onClose: () => void;
  workspace: InvestorTradingWorkspace | null;
  reloadWorkspace: () => void;
}) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit" | "stop" | "stop_limit">("market");
  const [tif, setTif] = useState<"day" | "gtc" | "ioc" | "fok">("day");
  const [quantity, setQuantity] = useState("");
  const [limitStr, setLimitStr] = useState("");
  const [stopStr, setStopStr] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setReviewing(false);
    setQuantity("");
    setLimitStr("");
    setStopStr("");
    setOrderType("market");
    setTif("day");
    setSubmitting(false);
  }, [asset?.id]);

  if (!asset) {
    return (
      <Panel title="Trade Ticket" icon={ChartCandlestick}>
        Select a directly tradable asset and click <b>Trade</b> to open the order ticket.
      </Panel>
    );
  }

  if (!isDirectlyTradableAsset(asset)) {
    return (
      <Panel title="Trade Ticket" icon={ShieldAlert}>
        This instrument is not directly tradable from the parent listing. Use details/chain flow.
      </Panel>
    );
  }

  const qty = Number(quantity || 0);
  const pxLimit = Number(limitStr || 0);
  const pxStop = Number(stopStr || 0);
  const estimatePx =
    orderType === "limit" || orderType === "stop_limit"
      ? pxLimit
      : orderType === "stop"
        ? pxStop
        : NaN;
  const estimated =
    qty > 0 && Number.isFinite(estimatePx) && estimatePx > 0 ? qty * estimatePx : null;

  return (
    <section className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs text-muted-foreground">Trade Ticket</div>
          <h3 className="text-sm font-semibold">{displaySymbolOfAsset(asset)}</h3>
        </div>
        <button className="text-xs text-muted-foreground hover:text-foreground" onClick={onClose}>
          Close
        </button>
      </div>

      {!reviewing ? (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSide("buy")}
              className={`border rounded-md px-2 py-1.5 text-xs ${side === "buy" ? "border-success/50 bg-success/10 text-success" : "border-border text-muted-foreground"}`}
            >
              Buy
            </button>
            <button
              type="button"
              onClick={() => setSide("sell")}
              className={`border rounded-md px-2 py-1.5 text-xs ${side === "sell" ? "border-destructive/50 bg-destructive/10 text-destructive" : "border-border text-muted-foreground"}`}
            >
              Sell
            </button>
          </div>
          <select
            className="w-full bg-surface border border-border rounded-md px-2 py-2 text-sm"
            value={orderType}
            onChange={(e) => setOrderType(e.target.value as any)}
          >
            <option value="market">Market</option>
            <option value="limit">Limit</option>
            <option value="stop">Stop</option>
            <option value="stop_limit">Stop Limit</option>
          </select>
          <select
            className="w-full bg-surface border border-border rounded-md px-2 py-2 text-sm"
            value={tif}
            onChange={(e) => setTif(e.target.value as any)}
          >
            <option value="day">Day</option>
            <option value="gtc">GTC</option>
            <option value="ioc">IOC</option>
            <option value="fok">FOK</option>
          </select>
          <input
            className="w-full bg-surface border border-border rounded-md px-2 py-2 text-sm"
            placeholder="Quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          {orderType === "limit" || orderType === "stop_limit" ? (
            <input
              className="w-full bg-surface border border-border rounded-md px-2 py-2 text-sm"
              placeholder="Limit price"
              value={limitStr}
              onChange={(e) => setLimitStr(e.target.value)}
            />
          ) : null}
          {orderType === "stop" || orderType === "stop_limit" ? (
            <input
              className="w-full bg-surface border border-border rounded-md px-2 py-2 text-sm"
              placeholder="Stop price"
              value={stopStr}
              onChange={(e) => setStopStr(e.target.value)}
            />
          ) : null}
          <button
            type="button"
            onClick={() => {
              if (!qty || qty <= 0) return toast.error("Enter quantity before review.");
              if (orderType === "limit" && (!pxLimit || pxLimit <= 0))
                return toast.error("Limit price is required.");
              if (orderType === "stop" && (!pxStop || pxStop <= 0))
                return toast.error("Stop price is required.");
              if (orderType === "stop_limit" && (!pxLimit || !pxStop || pxLimit <= 0 || pxStop <= 0))
                return toast.error("Stop-limit needs both limit and stop prices.");
              setReviewing(true);
            }}
            className="w-full border border-brand/40 text-brand rounded-md px-3 py-2 text-sm hover:bg-brand/10"
          >
            Review Order
          </button>
          <p className="text-[11px] text-muted-foreground">
            Submits a real pending order for staff execution (same pipeline as the classic ticket).
          </p>
        </div>
      ) : (
        <div className="mt-3 space-y-2 text-xs">
          <div className="rounded-md border border-border p-2 space-y-1 text-muted-foreground">
            <div>
              Instrument: <span className="text-foreground">{displaySymbolOfAsset(asset)}</span>
            </div>
            <div>
              Action: <span className="text-foreground uppercase">{side}</span>
            </div>
            <div>
              Type: <span className="text-foreground">{orderType}</span>
            </div>
            <div>
              TIF: <span className="text-foreground">{tif}</span>
            </div>
            <div>
              Qty: <span className="text-foreground">{quantity}</span>
            </div>
            <div>
              Limit: <span className="text-foreground">{limitStr || "—"}</span>
            </div>
            <div>
              Stop: <span className="text-foreground">{stopStr || "—"}</span>
            </div>
            <div>
              Estimated notional:{" "}
              <span className="text-foreground">
                {estimated ? estimated.toLocaleString() : "—"}
              </span>
            </div>
            <div>
              Fees: <span className="text-foreground">—</span>
            </div>
            <div>
              Buying power check: <span className="text-foreground">—</span>
            </div>
            <div>
              Position impact: <span className="text-foreground">—</span>
            </div>
          </div>
          <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-2.5 py-2 text-amber-700 dark:text-amber-300">
            Confirming places the order in <b>pending</b> status for operations to work and fill.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setReviewing(false)}
              className="border border-border rounded-md px-2 py-2 hover:bg-surface-elevated"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() =>
                void (async () => {
                  const inst = findTradableInstrumentForAsset(workspace?.instruments ?? [], asset);
                  if (!inst) {
                    toast.error(
                      "This listing symbol is not linked to a tradable instrument. Try the classic ticket or another symbol.",
                    );
                    return;
                  }
                  const accountId = workspace?.accounts[0]?.id;
                  if (!accountId) {
                    toast.error("No active brokerage account on file.");
                    return;
                  }
                  let limitPrice: number | null = null;
                  let stopPrice: number | null = null;
                  if (orderType === "limit" || orderType === "stop_limit") {
                    limitPrice = pxLimit;
                  }
                  if (orderType === "stop" || orderType === "stop_limit") {
                    stopPrice = pxStop;
                  }
                  setSubmitting(true);
                  const out = await postWorkspacePlaceOrder({
                    accountId,
                    instrumentId: inst.id,
                    side,
                    orderType,
                    timeInForce: tif,
                    quantity: qty,
                    limitPrice,
                    stopPrice,
                  });
                  setSubmitting(false);
                  if ("error" in out) {
                    toast.error(out.error);
                    return;
                  }
                  toast.success("Order placed");
                  setReviewing(false);
                  reloadWorkspace();
                })()
              }
              className="border border-brand/40 text-brand rounded-md px-2 py-2 hover:bg-brand/10 disabled:opacity-50"
            >
              {submitting ? "Placing…" : "Place order"}
            </button>
          </div>
          <Link
            to="/portal/investor/trade"
            className="inline-flex items-center gap-1.5 text-xs text-brand hover:underline"
          >
            Open classic executable ticket
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </section>
  );
}

function DealTicketCard({
  asset,
  mode,
  onClose,
  liveQuotes,
  workspace,
  reloadWorkspace,
}: {
  asset: AssetListing | null;
  mode: "deal" | "order";
  onClose: () => void;
  liveQuotes: Record<string, AssetListingQuote>;
  workspace: InvestorTradingWorkspace | null;
  reloadWorkspace: () => void;
}) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [size, setSize] = useState("");
  const [price, setPrice] = useState("");
  const [stop, setStop] = useState("");
  const [limit, setLimit] = useState("");
  const [dealBusy, setDealBusy] = useState(false);

  useEffect(() => {
    setSide("buy");
    setSize("");
    setPrice("");
    setStop("");
    setLimit("");
    setDealBusy(false);
  }, [asset?.id, mode]);

  if (!asset) {
    return (
      <Panel title="Deal Ticket" icon={ChartCandlestick}>
        Click a market row to open the buy/sell interface in this workspace.
      </Panel>
    );
  }

  const quote = liveQuotes[displaySymbolOfAsset(asset).trim().toUpperCase()] ?? quoteForAsset(asset);

  if (!isDirectlyTradableAsset(asset)) {
    return (
      <Panel title="Deal Ticket" icon={ShieldAlert}>
        {isReferenceOnlyAsset(asset)
          ? "Reference instrument: use related tradable products."
          : "Options parent: open chain to choose specific contracts before trading."}
      </Panel>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">
            {mode === "deal" ? "Deal Ticket" : "Order Ticket"}
          </div>
          <div className="text-sm font-semibold">{displayNameOfAsset(asset)}</div>
          <div className="text-xs text-muted-foreground">
            {displaySymbolOfAsset(asset)} · {asset.asset_class}
          </div>
        </div>
        <button className="text-xs text-muted-foreground hover:text-foreground" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2">
          <div className="text-[10px] text-muted-foreground uppercase">Sell</div>
          <div className="text-lg font-semibold">{fmtPx(quote.sell)}</div>
        </div>
        <div className="rounded-md border border-success/30 bg-success/10 p-2">
          <div className="text-[10px] text-muted-foreground uppercase">Buy</div>
          <div className="text-lg font-semibold">{fmtPx(quote.buy)}</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setSide("sell")}
          className={`rounded-md border px-2 py-1.5 text-xs ${side === "sell" ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-border text-muted-foreground"}`}
        >
          Sell
        </button>
        <button
          type="button"
          onClick={() => setSide("buy")}
          className={`rounded-md border px-2 py-1.5 text-xs ${side === "buy" ? "border-success/40 bg-success/10 text-success" : "border-border text-muted-foreground"}`}
        >
          Buy
        </button>
      </div>

      <div className="mt-3 space-y-2">
        <input
          className="w-full bg-surface border border-border rounded-md px-2 py-2 text-sm"
          placeholder="Size"
          value={size}
          onChange={(e) => setSize(e.target.value)}
        />
        <input
          className="w-full bg-surface border border-border rounded-md px-2 py-2 text-sm"
          placeholder="Price (optional)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <input
          className="w-full bg-surface border border-border rounded-md px-2 py-2 text-sm"
          placeholder="Stop"
          value={stop}
          onChange={(e) => setStop(e.target.value)}
        />
        <input
          className="w-full bg-surface border border-border rounded-md px-2 py-2 text-sm"
          placeholder="Limit"
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
        />
      </div>

      <div className="mt-3 text-[11px] text-muted-foreground space-y-1">
        <div className="inline-flex items-center gap-1">
          <BarChart3 className="h-3.5 w-3.5" /> Margin: —
        </div>
        <div>Resulting position: preview pending broker integration</div>
        <div>Fees and charges apply.</div>
      </div>

      <button
        type="button"
        disabled={dealBusy}
        onClick={() =>
          void (async () => {
            const mapped = parseDealFieldsToSpec(side, size, price, stop, limit);
            if (!mapped.ok) {
              toast.error(mapped.error);
              return;
            }
            const inst = findTradableInstrumentForAsset(workspace?.instruments ?? [], asset);
            if (!inst) {
              toast.error(
                "Listing symbol is not mapped to an instrument. Open the classic ticket or pick another listing.",
              );
              return;
            }
            const accountId = workspace?.accounts[0]?.id;
            if (!accountId) {
              toast.error("No active brokerage account.");
              return;
            }
            setDealBusy(true);
            const out = await postWorkspacePlaceOrder({
              accountId,
              instrumentId: inst.id,
              ...mapped.spec,
            });
            setDealBusy(false);
            if ("error" in out) {
              toast.error(out.error);
              return;
            }
            toast.success(
              `${side.toUpperCase()} ${mapped.spec.orderType} order queued for ${displaySymbolOfAsset(asset)}`,
            );
            reloadWorkspace();
          })()
        }
        className="mt-3 w-full border border-brand/40 text-brand rounded-md px-3 py-2 text-sm hover:bg-brand/10 disabled:opacity-50"
      >
        {dealBusy ? "Placing…" : mode === "deal" ? "Place Deal" : "Place Order"}
      </button>
    </section>
  );
}

function Tab({
  label,
  count,
  active = false,
}: {
  label: string;
  count?: number;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 ${
        active
          ? "border-brand/40 bg-brand/10 text-foreground"
          : "border-border text-muted-foreground hover:text-foreground hover:bg-surface-elevated"
      }`}
    >
      {label}
      {typeof count === "number" ? (
        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-background border border-border text-[10px] px-1">
          {count}
        </span>
      ) : null}
    </button>
  );
}

function WorkspaceMoreMarketClasses({
  items,
  activeValue,
  onSelect,
}: {
  items: { label: string; icon: ComponentType<{ className?: string }>; value?: string }[];
  activeValue: string;
  onSelect: (value?: string) => void;
}) {
  const activeMoreLabel = items.find((i) => i.value === activeValue)?.label;
  const btnClass = (active: boolean) =>
    `inline-flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-left transition-colors ${
      active
        ? "bg-brand/10 text-foreground border border-brand/30"
        : "text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
    }`;

  return (
    <div className="mb-4">
      <details className="group rounded-md border border-border/70 bg-background/30 [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-md px-2.5 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground hover:bg-surface-elevated hover:text-foreground">
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <span className="truncate">More asset classes</span>
            {activeMoreLabel ? (
              <span className="truncate normal-case font-normal text-brand">· {activeMoreLabel}</span>
            ) : null}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-1 flex flex-col gap-1 border-t border-border/60 pt-1.5">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={!item.value}
              onClick={() => onSelect(item.value)}
              className={`${btnClass(!!item.value && item.value === activeValue)} ${
                !item.value ? "cursor-not-allowed opacity-50 hover:bg-transparent" : ""
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}

function NavGroup({
  title,
  items,
  activeValue,
  onSelect,
}: {
  title: string;
  items: { label: string; icon: ComponentType<{ className?: string }>; value?: string }[];
  activeValue?: string;
  onSelect?: (value?: string) => void;
}) {
  return (
    <div className="mb-4">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">
        {title}
      </div>
      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onSelect?.(item.value)}
            className={`inline-flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-left transition-colors ${
              activeValue && item.value === activeValue
                ? "bg-brand/10 text-foreground border border-brand/30"
                : "text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function quoteForAsset(asset: AssetListing): { buy: number; sell: number } {
  const seed = String(asset.symbol || asset.display_symbol || asset.id);
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 100000;
  const base = 40 + (h % 10000) / 100;
  const spread = Math.max(0.01, ((h % 17) + 1) / 100);
  const sell = Number((base - spread / 2).toFixed(2));
  const buy = Number((base + spread / 2).toFixed(2));
  return { buy, sell };
}

function fmtPx(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (Math.abs(n) >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function fmtNum(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-background p-3">
      <div className="inline-flex items-center gap-2 text-xs text-foreground mb-2">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      <p className="text-xs text-muted-foreground">{children}</p>
    </section>
  );
}
