import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowDownRight, ArrowUpRight, RefreshCw } from "lucide-react";
import { DataTable, PageHeader, SectionCard } from "@/lib/portalShared";
import type { InvestorTradingWorkspace, TradableInstrument } from "@/lib/trading.types";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/portal/investor/trade")({
  head: () => ({
    meta: [{ title: "Trade | Investor Portal" }, { name: "robots", content: "noindex" }],
  }),
  component: InvestorTradePage,
});

type OrderType = "market" | "limit" | "stop" | "stop_limit";
type Tif = "day" | "gtc" | "ioc" | "fok";

function InvestorTradePage() {
  const [ws, setWs] = useState<InvestorTradingWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [symbolFilter, setSymbolFilter] = useState("");

  const [accountId, setAccountId] = useState("");
  const [instrumentId, setInstrumentId] = useState("");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<OrderType>("market");
  const [timeInForce, setTimeInForce] = useState<Tif>("day");
  const [quantity, setQuantity] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const [clientOrderId, setClientOrderId] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portal/investor-trading");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `Failed (${res.status})`);
      const w = data as InvestorTradingWorkspace;
      setWs(w);
      setAccountId((a) => a || w.accounts[0]?.id || "");
      setInstrumentId((i) => i || w.instruments[0]?.id || "");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not load trading data");
      setWs({ instruments: [], accounts: [], orders: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => void load(), 15000);
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
          .channel(`investor-orders-${uid}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "orders", filter: `placed_by=eq.${uid}` },
            () => void load(),
          )
          .on("postgres_changes", { event: "*", schema: "public", table: "trades" }, () =>
            void load(),
          )
          .subscribe();
      })
      .catch(() => {
        // fallback remains manual refresh
      });
    return () => {
      disposed = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  const selectedInstrument = useMemo(
    () => ws?.instruments.find((i) => i.id === instrumentId) ?? null,
    [ws, instrumentId],
  );

  const filteredInstruments = useMemo(() => {
    if (!ws) return [];
    const q = symbolFilter.trim().toLowerCase();
    if (!q) return ws.instruments;
    return ws.instruments.filter(
      (i) => i.symbol.toLowerCase().includes(q) || i.name.toLowerCase().includes(q),
    );
  }, [ws, symbolFilter]);

  const estimatedNotional = useMemo(() => {
    const q = parseFloat(quantity);
    if (!selectedInstrument || !Number.isFinite(q) || q <= 0) return null;
    if (orderType === "market") return null;
    if (orderType === "limit" || orderType === "stop_limit") {
      const p = parseFloat(limitPrice);
      if (!Number.isFinite(p) || p <= 0) return null;
      return q * p;
    }
    const p = parseFloat(stopPrice);
    if (!Number.isFinite(p) || p <= 0) return null;
    return q * p;
  }, [quantity, limitPrice, stopPrice, orderType, selectedInstrument]);

  const resetFormPrices = () => {
    setLimitPrice("");
    setStopPrice("");
  };

  useEffect(() => {
    if (orderType === "market") resetFormPrices();
  }, [orderType]);

  const submit = async () => {
    if (!ws?.accounts.length) {
      toast.error("No active brokerage account is available for trading.");
      return;
    }
    if (!accountId || !instrumentId) {
      toast.error("Select an account and a symbol.");
      return;
    }
    const qty = parseFloat(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error("Enter a valid quantity.");
      return;
    }

    const payload: Record<string, unknown> = {
      accountId,
      instrumentId,
      side,
      orderType,
      quantity: qty,
      timeInForce,
      clientOrderId: clientOrderId.trim() || null,
    };

    if (orderType === "limit" || orderType === "stop_limit") {
      const lp = parseFloat(limitPrice);
      if (!Number.isFinite(lp) || lp <= 0) {
        toast.error("Enter a valid limit price.");
        return;
      }
      payload.limitPrice = lp;
    }
    if (orderType === "stop" || orderType === "stop_limit") {
      const sp = parseFloat(stopPrice);
      if (!Number.isFinite(sp) || sp <= 0) {
        toast.error("Enter a valid stop price.");
        return;
      }
      payload.stopPrice = sp;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/portal/investor-trading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "place", payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `Order failed (${res.status})`);
      toast.success("Order submitted and queued for routing.");
      setQuantity("");
      setClientOrderId("");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Order failed");
    } finally {
      setSubmitting(false);
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      const res = await fetch("/api/portal/investor-trading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", payload: { orderId } }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `Cancel failed (${res.status})`);
      toast.success("Cancellation requested.");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not cancel order");
    }
  };

  if (loading || !ws) {
    return <p className="text-sm text-muted-foreground">Loading trading workspace…</p>;
  }

  const field =
    "w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/30";

  const openOrders = ws.orders.filter((o) =>
    ["pending", "working", "partially_filled"].includes(o.status),
  );

  return (
    <>
      <PageHeader
        title="Trade"
        subtitle="Submit equity-style orders with industry-standard fields: side, order type, time in force, quantity, and price instructions. Executions appear in Trade history once filled."
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SectionCard
          title="Order ticket"
          description="All orders are validated for account ownership, active status, lot size, and tick size before acceptance."
          right={
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2 py-1"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          }
        >
          {ws.accounts.length === 0 ? (
            <p className="text-sm text-destructive">
              You need an active brokerage account to trade. Contact your advisor or complete
              onboarding.
            </p>
          ) : ws.instruments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tradable symbols are published yet.</p>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Account
                </label>
                <select
                  className={`${field} mt-1`}
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                >
                  {ws.accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.account_number} · {a.base_currency} · {a.account_type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Symbol
                </label>
                <input
                  type="search"
                  className={`${field} mt-1 mb-2`}
                  placeholder="Filter symbols…"
                  value={symbolFilter}
                  onChange={(e) => setSymbolFilter(e.target.value)}
                />
                <select
                  className={`${field} mt-1`}
                  value={instrumentId}
                  onChange={(e) => setInstrumentId(e.target.value)}
                >
                  {filteredInstruments.map((i: TradableInstrument) => (
                    <option key={i.id} value={i.id}>
                      {i.symbol} · {i.name} ({i.currency})
                    </option>
                  ))}
                </select>
                {selectedInstrument && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Lot {selectedInstrument.lot_size} · Tick {selectedInstrument.tick_size} ·{" "}
                    {selectedInstrument.asset_class}
                    {selectedInstrument.exchange ? ` · ${selectedInstrument.exchange}` : ""}
                  </p>
                )}
              </div>

              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Side
                </span>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSide("buy")}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                      side === "buy"
                        ? "border-success/50 bg-success/15 text-success"
                        : "border-border text-muted-foreground hover:bg-surface-elevated"
                    }`}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    Buy
                  </button>
                  <button
                    type="button"
                    onClick={() => setSide("sell")}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                      side === "sell"
                        ? "border-destructive/50 bg-destructive/10 text-destructive"
                        : "border-border text-muted-foreground hover:bg-surface-elevated"
                    }`}
                  >
                    <ArrowDownRight className="h-4 w-4" />
                    Sell
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Order type
                  </label>
                  <select
                    className={`${field} mt-1`}
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value as OrderType)}
                  >
                    <option value="market">Market</option>
                    <option value="limit">Limit</option>
                    <option value="stop">Stop (market)</option>
                    <option value="stop_limit">Stop-limit</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Time in force
                  </label>
                  <select
                    className={`${field} mt-1`}
                    value={timeInForce}
                    onChange={(e) => setTimeInForce(e.target.value as Tif)}
                  >
                    <option value="day">Day</option>
                    <option value="gtc">GTC (Good til cancelled)</option>
                    <option value="ioc">IOC (Immediate or cancel)</option>
                    <option value="fok">FOK (Fill or kill)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Quantity
                </label>
                <input
                  className={`${field} mt-1`}
                  inputMode="decimal"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder={
                    selectedInstrument
                      ? `Multiple of ${selectedInstrument.lot_size}`
                      : "Shares / units"
                  }
                />
              </div>

              {(orderType === "limit" || orderType === "stop_limit") && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Limit price
                  </label>
                  <input
                    className={`${field} mt-1`}
                    inputMode="decimal"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    placeholder={
                      selectedInstrument ? `Align to tick ${selectedInstrument.tick_size}` : ""
                    }
                  />
                </div>
              )}

              {(orderType === "stop" || orderType === "stop_limit") && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Stop price
                  </label>
                  <input
                    className={`${field} mt-1`}
                    inputMode="decimal"
                    value={stopPrice}
                    onChange={(e) => setStopPrice(e.target.value)}
                    placeholder={
                      selectedInstrument ? `Align to tick ${selectedInstrument.tick_size}` : ""
                    }
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Client order ID <span className="normal-case opacity-70">(optional)</span>
                </label>
                <input
                  className={`${field} mt-1`}
                  value={clientOrderId}
                  onChange={(e) => setClientOrderId(e.target.value)}
                  placeholder="Your reference"
                  maxLength={64}
                />
              </div>

              {estimatedNotional != null && selectedInstrument && (
                <p className="text-xs text-muted-foreground">
                  Est. notional ~{" "}
                  <span className="text-foreground font-medium">
                    {estimatedNotional.toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
                    {selectedInstrument.currency}
                  </span>{" "}
                  (indicative for limit/stop instructions).
                </p>
              )}

              {orderType === "market" && (
                <p className="text-xs text-amber-600/90 dark:text-amber-400/90 border border-amber-500/30 rounded-md px-3 py-2 bg-amber-500/5">
                  Market orders may fill at prices away from the last displayed quote during
                  volatile conditions. Ensure you understand execution risk.
                </p>
              )}

              <button
                type="button"
                disabled={submitting || ws.accounts.length === 0}
                onClick={() => void submit()}
                className="bg-gradient-brand text-brand-foreground font-medium rounded-md px-4 py-2.5 shadow-glow hover:opacity-90 disabled:opacity-50"
              >
                {submitting
                  ? "Submitting…"
                  : `${side === "buy" ? "Buy" : "Sell"} ${orderType.replace("_", " ")}`}
              </button>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Orders are recorded in the custody system and routed according to firm workflow.
                This interface does not constitute investment advice. If an order is rejected, a
                reason may appear in your order list once back-office processing completes.
              </p>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Working orders"
          description={`${openOrders.length} open / working. Filled and cancelled orders remain in the full list below.`}
        >
          {openOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No working orders. Submit an order from the ticket or check Trade history for fills.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                    <th className="py-2 pr-3">Placed</th>
                    <th className="py-2 pr-3">Symbol</th>
                    <th className="py-2 pr-3">Side</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Qty</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3" />
                  </tr>
                </thead>
                <tbody>
                  {openOrders.map((o) => (
                    <tr key={o.id} className="border-b border-border/50">
                      <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">
                        {new Date(o.placed_at).toLocaleString()}
                      </td>
                      <td className="py-2 pr-3 font-medium">{o.symbol}</td>
                      <td
                        className={`py-2 pr-3 ${o.side === "buy" ? "text-success" : "text-destructive"}`}
                      >
                        {o.side}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">{o.order_type}</td>
                      <td className="py-2 pr-3">{o.quantity.toLocaleString()}</td>
                      <td className="py-2 pr-3 text-xs">{o.status}</td>
                      <td className="py-2 pr-3 text-right">
                        <button
                          type="button"
                          onClick={() => void cancelOrder(o.id)}
                          className="text-xs text-destructive hover:underline"
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Recent orders"
        description="Latest 150 orders for your accounts, all states."
      >
        {ws.orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <DataTable
            rows={ws.orders}
            columns={[
              {
                key: "placed_at",
                label: "Placed",
                render: (r) => new Date(r.placed_at).toLocaleString(),
              },
              { key: "account_number", label: "Account", render: (r) => r.account_number ?? "—" },
              { key: "symbol", label: "Symbol" },
              {
                key: "side",
                label: "Side",
                render: (r) => (
                  <span
                    className={
                      r.side === "buy" ? "text-success font-medium" : "text-destructive font-medium"
                    }
                  >
                    {r.side}
                  </span>
                ),
              },
              { key: "order_type", label: "Type" },
              { key: "time_in_force", label: "TIF" },
              {
                key: "quantity",
                label: "Qty",
                render: (r) => r.quantity.toLocaleString(undefined, { maximumFractionDigits: 8 }),
              },
              {
                key: "limit_price",
                label: "Limit",
                render: (r) => (r.limit_price != null ? r.limit_price.toLocaleString() : "—"),
              },
              {
                key: "stop_price",
                label: "Stop",
                render: (r) => (r.stop_price != null ? r.stop_price.toLocaleString() : "—"),
              },
              { key: "status", label: "Status" },
              {
                key: "filled_quantity",
                label: "Filled",
                render: (r) =>
                  r.filled_quantity.toLocaleString(undefined, { maximumFractionDigits: 8 }),
              },
              {
                key: "rejection_reason",
                label: "Note",
                render: (r) => (
                  <span className="text-muted-foreground text-xs">{r.rejection_reason ?? "—"}</span>
                ),
              },
            ]}
          />
        )}
      </SectionCard>
    </>
  );
}
