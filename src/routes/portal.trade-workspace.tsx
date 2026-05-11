import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  BadgeInfo,
  BarChart3,
  Bell,
  BookOpenText,
  ChartCandlestick,
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

export const Route = createFileRoute("/portal/trade-workspace")({
  head: () => ({
    meta: [
      { title: "Trade Workspace | Hudson Crest Capital" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TradeWorkspacePage,
});

function TradeWorkspacePage() {
  const navigate = useNavigate();
  const { loading, role } = usePortalAuth("investor");
  const [marketClass, setMarketClass] = useState<string>("commodities");

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
        <div className="hidden lg:flex items-center gap-4 text-xs text-muted-foreground">
          <span>
            Funds: <b className="text-foreground">US$20,000.00</b>
          </span>
          <span>
            P/L: <b className="text-foreground">US$0.00</b>
          </span>
          <span>
            Available: <b className="text-success">US$20,000.00</b>
          </span>
        </div>
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
              { label: "Search", icon: Search },
              { label: "DiscoverAI", icon: Lightbulb },
            ]}
          />
          <NavGroup
            title="Market Main"
            items={[
              { label: "Commodities", icon: Wallet, value: "commodities" },
              { label: "Shares", icon: ChartCandlestick, value: "shares" },
              { label: "Crypto", icon: Wallet, value: "cryptocurrency" },
              { label: "FX", icon: Clock3, value: "fx" },
              { label: "Options", icon: ChartCandlestick, value: "options" },
              { label: "ETFs", icon: ChartCandlestick, value: "etfs" },
              { label: "Bonds and Rates", icon: LayoutDashboard, value: "bonds_rates" },
              { label: "Indices", icon: SlidersHorizontal, value: "indices" },
              { label: "Knock-Outs", icon: LayoutDashboard },
            ]}
            activeValue={marketClass}
            onSelect={(value) => {
              if (value) setMarketClass(value);
            }}
          />
          <NavGroup
            title="Portfolio"
            items={[
              { label: "Positions", icon: LayoutDashboard },
              { label: "Orders", icon: ChartCandlestick },
              { label: "History", icon: History },
              { label: "Alerts", icon: Bell },
            ]}
          />
        </aside>

        <main className="bg-background p-4 md:p-6">
          <AssetBrowser forcedAssetClass={marketClass} />
        </main>

        <aside className="border-l border-border bg-surface/30 p-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Panels</div>
          <div className="flex flex-col gap-2">
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
          .map((r) =>
            String(r.symbol || "")
              .trim()
              .toUpperCase(),
          )
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
      <div className="border-b border-border px-3 py-2 flex items-center gap-2 text-xs">
        <Tab label="Asset Browser" active count={rows.length} />
        <Tab label="Watchlist" count={watchlist.length} />
        <Tab label="Trade Ticket" count={ticketAsset ? 1 : 0} />
        <div className="ml-auto text-muted-foreground">Catalog: asset_listings</div>
      </div>

      <div className="border-b border-border bg-background/40 p-3 flex flex-col gap-3">
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
                  const q = liveQuotes[String(asset.symbol || "").toUpperCase()];
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
                            if (isOptionsChainAsset(asset))
                              toast.message("Options chain view placeholder opened.");
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
                    Price chart panel placeholder
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
            />
          ) : null}

          <AssetDetailsCard asset={selected} />
          {dealTab === "info" ? (
            <TradeTicketCard asset={ticketAsset ?? selected} onClose={() => setTicketAsset(null)} />
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

function TradeTicketCard({ asset, onClose }: { asset: AssetListing | null; onClose: () => void }) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit" | "stop" | "stop_limit">("market");
  const [tif, setTif] = useState<"day" | "gtc" | "ioc" | "fok">("day");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    setReviewing(false);
    setQuantity("");
    setPrice("");
    setOrderType("market");
    setTif("day");
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
  const px = Number(price || 0);
  const estimated = qty > 0 && px > 0 ? qty * px : null;

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
          {orderType === "limit" || orderType === "stop" || orderType === "stop_limit" ? (
            <input
              className="w-full bg-surface border border-border rounded-md px-2 py-2 text-sm"
              placeholder="Price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          ) : null}
          <button
            type="button"
            onClick={() => {
              if (!qty || qty <= 0) return toast.error("Enter quantity before review.");
              setReviewing(true);
            }}
            className="w-full border border-brand/40 text-brand rounded-md px-3 py-2 text-sm hover:bg-brand/10"
          >
            Review Order
          </button>
          <p className="text-[11px] text-muted-foreground">
            Ticket is broker-integration ready. Final execution wiring can reuse this payload
            structure.
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
              Est. price: <span className="text-foreground">{price || "Market"}</span>
            </div>
            <div>
              Estimated notional:{" "}
              <span className="text-foreground">
                {estimated ? estimated.toLocaleString() : "—"}
              </span>
            </div>
            <div>
              Fees: <span className="text-foreground">Broker fee placeholder</span>
            </div>
            <div>
              Buying power check: <span className="text-foreground">Pending integration</span>
            </div>
            <div>
              Position impact: <span className="text-foreground">Pending integration</span>
            </div>
          </div>
          <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-2.5 py-2 text-amber-700 dark:text-amber-300">
            Confirming this submits an order intent. Final fill/execution depends on broker
            integration and risk checks.
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
              onClick={() =>
                toast.success(
                  "Order intent captured. Broker execution wiring can be attached next.",
                )
              }
              className="border border-brand/40 text-brand rounded-md px-2 py-2 hover:bg-brand/10"
            >
              Confirm
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
}: {
  asset: AssetListing | null;
  mode: "deal" | "order";
  onClose: () => void;
  liveQuotes: Record<string, AssetListingQuote>;
}) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [size, setSize] = useState("");
  const [price, setPrice] = useState("");
  const [stop, setStop] = useState("");
  const [limit, setLimit] = useState("");

  useEffect(() => {
    setSide("buy");
    setSize("");
    setPrice("");
    setStop("");
    setLimit("");
  }, [asset?.id, mode]);

  if (!asset) {
    return (
      <Panel title="Deal Ticket" icon={ChartCandlestick}>
        Click a market row to open the buy/sell interface in this workspace.
      </Panel>
    );
  }

  const quote = liveQuotes[String(asset.symbol || "").toUpperCase()] ?? quoteForAsset(asset);

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
          <BarChart3 className="h-3.5 w-3.5" /> Margin: placeholder
        </div>
        <div>Resulting position: preview pending broker integration</div>
        <div>Fees and charges apply.</div>
      </div>

      <button
        type="button"
        onClick={() =>
          toast.success(
            `${side.toUpperCase()} deal staged for ${displaySymbolOfAsset(asset)}. Connect broker adapter for live execution.`,
          )
        }
        className="mt-3 w-full border border-brand/40 text-brand rounded-md px-3 py-2 text-sm hover:bg-brand/10"
      >
        {mode === "deal" ? "Place Deal" : "Place Order"}
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
