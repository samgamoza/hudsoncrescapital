import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MetricCard, PageHeader, SectionCard } from "@/lib/portalShared";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/portal/admin/")({
  component: TradingPage,
});

function TradingPage() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [statusFilter, setStatusFilter] = useState("open");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [fillQty, setFillQty] = useState("");
  const [fillPrice, setFillPrice] = useState("");
  const [fillFees, setFillFees] = useState("35");
  const [fillCommission, setFillCommission] = useState("0");
  /** Desk ticket fields (CrossOcean-style trade order form — only qty/price/fees feed execution). */
  const [optionType, setOptionType] = useState<"call" | "put">("call");
  const [commodity, setCommodity] = useState("");
  const [contractSpec, setContractSpec] = useState("");
  const [strikePrice, setStrikePrice] = useState("");
  const [contractSize, setContractSize] = useState("1000");
  const [execBusy, setExecBusy] = useState(false);
  const [health, setHealth] = useState<any | null>(null);
  const [schema, setSchema] = useState<any | null>(null);
  const [diagId, setDiagId] = useState("");
  const [diagResult, setDiagResult] = useState<string | null>(null);
  const [diagBusy, setDiagBusy] = useState(false);
  const field =
    "bg-surface border border-border rounded-md px-3 py-2 text-sm text-foreground w-full";
  const roField =
    "bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-muted-foreground w-full cursor-not-allowed";
  const labelSm =
    "block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1";

  const apiJson = async <T,>(input: RequestInfo | URL, init?: RequestInit): Promise<T> => {
    const res = await fetch(input, init);
    const text = await res.text();
    let body: any = {};
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = {};
    }
    if (!res.ok) {
      const msg =
        body?.error ??
        body?.details ??
        body?.hint ??
        text ??
        `Execution request failed (${res.status})`;
      throw new Error(String(msg));
    }
    return body as T;
  };

  const refreshOrders = async () => {
    try {
      const payload: Record<string, unknown> = {};
      if (statusFilter === "open") {
        payload.statuses = ["pending", "working", "partially_filled"];
      } else if (statusFilter !== "all") {
        payload.statuses = [statusFilter];
      }
      const data = await apiJson<{ orders: any[]; statusCounts: Record<string, number> }>(
        "/api/portal/order-execution",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "executionWorkspace", payload }),
        },
      );
      setRows(Array.isArray(data.orders) ? data.orders : []);
      setStatusCounts(data.statusCounts ?? {});
      setSelectedOrderId((cur) =>
        cur && data.orders.some((o: any) => o.id === cur) ? cur : (data.orders?.[0]?.id ?? ""),
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load execution workspace");
      setRows([]);
      setStatusCounts({});
    }
  };

  const runOrderAction = async (
    action: string,
    payload: Record<string, unknown>,
    success: string,
  ) => {
    setExecBusy(true);
    try {
      await apiJson("/api/portal/order-execution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload }),
      });
      toast.success(success);
      await refreshOrders();
    } catch (e: any) {
      toast.error(e?.message ?? "Action failed");
    } finally {
      setExecBusy(false);
    }
  };

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/public/auth-health");
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setHealth({
            ok: false,
            diagnosticsEnabled: false,
            error: `HTTP ${res.status}`,
            ...(typeof body === "object" && body ? body : {}),
          });
        } else {
          setHealth(body);
        }
      } catch (e: any) {
        setHealth({
          ok: false,
          diagnosticsEnabled: false,
          error: e?.message ?? "Health check failed",
        });
      }
      try {
        const res = await fetch("/api/public/schema-readiness");
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setSchema({
            ok: false,
            diagnosticsEnabled: false,
            error: `HTTP ${res.status}`,
            ...(typeof body === "object" && body ? body : {}),
          });
        } else {
          setSchema(body);
        }
      } catch (e: any) {
        setSchema({
          ok: false,
          diagnosticsEnabled: false,
          error: e?.message ?? "Schema check failed",
        });
      }
    })();
    void refreshOrders();
  }, []);

  useEffect(() => {
    void refreshOrders();
  }, [statusFilter]);

  useEffect(() => {
    const id = setInterval(() => {
      void refreshOrders();
    }, 6000);
    return () => clearInterval(id);
  }, [statusFilter]);

  useEffect(() => {
    let disposed = false;
    const channel = supabase
      .channel("admin-execution-stream")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        void refreshOrders();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "trades" }, () => {
        void refreshOrders();
      })
      .subscribe();
    if (disposed) void supabase.removeChannel(channel);
    return () => {
      disposed = true;
      void supabase.removeChannel(channel);
    };
  }, [statusFilter]);

  const selectedOrder = useMemo(
    () => (rows ?? []).find((r: any) => r.id === selectedOrderId) ?? null,
    [rows, selectedOrderId],
  );

  const premiumNum = Number(fillPrice);
  const positionsNum = Number(fillQty);
  const contractSizeNum = Number(contractSize);
  const feesNum = Number(fillFees);

  const pricePerContract = useMemo(() => {
    if (!Number.isFinite(premiumNum) || !Number.isFinite(contractSizeNum)) return null;
    return premiumNum * contractSizeNum;
  }, [premiumNum, contractSizeNum]);

  const tradeValue = useMemo(() => {
    if (!Number.isFinite(positionsNum) || pricePerContract == null || !Number.isFinite(pricePerContract))
      return null;
    return positionsNum * pricePerContract;
  }, [positionsNum, pricePerContract]);

  const totalInvoiced = useMemo(() => {
    if (tradeValue == null || !Number.isFinite(feesNum)) return null;
    return tradeValue + feesNum;
  }, [tradeValue, feesNum]);

  const tradeDetailsSummary = useMemo(() => {
    if (!selectedOrder) return "";
    const side = (selectedOrder.side ?? "buy").toString().toUpperCase();
    const opt = optionType === "call" ? "CALL" : "PUT";
    const pr = strikePrice.trim() || (Number.isFinite(premiumNum) ? premiumNum.toFixed(2) : "—");
    const pos = Number.isFinite(positionsNum) && positionsNum > 0 ? String(positionsNum) : "—";
    return `${side} ${pos}x ${opt} PR:${pr}`;
  }, [selectedOrder, optionType, strikePrice, premiumNum, positionsNum]);

  useEffect(() => {
    if (!selectedOrder) return;
    setOptionType("call");
    setCommodity("");
    setContractSpec("");
    setStrikePrice("");
    setContractSize("1000");
    setFillFees("35");
    setFillCommission("0");
    const rem = Number(selectedOrder.remaining_quantity ?? 0);
    if (rem > 0) setFillQty(String(rem));
    else setFillQty("");
    if (selectedOrder.limit_price != null) setFillPrice(String(selectedOrder.limit_price));
    else setFillPrice("");
  }, [selectedOrder?.id]);

  const runLookup = async (sendReset: boolean) => {
    setDiagBusy(true);
    setDiagResult(null);
    try {
      const res = await fetch("/api/portal/auth-diagnostics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: diagId.trim(), sendReset }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `Diagnostics failed (${res.status})`);
      if (!data.found) {
        setDiagResult("No matching user was found in this Supabase project.");
      } else if (sendReset) {
        setDiagResult(`Reset trigger submitted for: ${data.email}`);
      } else {
        setDiagResult(`Identifier resolves to: ${data.email}`);
      }
    } catch (e: any) {
      setDiagResult(e?.message ?? "Diagnostics request failed");
    } finally {
      setDiagBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Trading Interface"
        subtitle="Manual execution workspace for staff: queue orders, apply partial/full fills, reject or expire."
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard title="Open queue" value={String(statusCounts.pending ?? 0)} helper="Pending" />
        <MetricCard title="Working" value={String(statusCounts.working ?? 0)} helper="In market" />
        <MetricCard
          title="Partially filled"
          value={String(statusCounts.partially_filled ?? 0)}
          helper="Needs more fills"
        />
      </div>
      <SectionCard
        title="Trade Order"
        description="Select a queued order, complete the ticket as you would for broker verification, then request execution. Quantity, premium, and fees are posted as the desk fill."
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="py-2 px-3">Order</th>
                  <th className="py-2 px-3">Client</th>
                  <th className="py-2 px-3">Side</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Remaining</th>
                  <th className="py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(rows ?? []).map((r: any) => (
                  <tr key={r.id} className="border-b border-border/50">
                    <td className="py-2 px-3">
                      <div className="font-medium">{r.symbol}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.account_number ?? "—"} · {new Date(r.placed_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-muted-foreground text-xs">
                      {r.client_email ?? "—"}
                    </td>
                    <td
                      className={`py-2 px-3 ${r.side === "buy" ? "text-success" : "text-destructive"}`}
                    >
                      {r.side}
                    </td>
                    <td className="py-2 px-3">
                      <span className="text-xs px-2 py-0.5 rounded-full border border-border">
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      {Number(r.remaining_quantity ?? 0).toLocaleString(undefined, {
                        maximumFractionDigits: 8,
                      })}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          className="text-xs px-2 py-1 border border-border rounded-md hover:bg-surface-elevated"
                          onClick={() => setSelectedOrderId(r.id)}
                        >
                          Select
                        </button>
                        {["pending", "partially_filled"].includes(r.status) && (
                          <button
                            className="text-xs px-2 py-1 border border-border rounded-md hover:bg-surface-elevated"
                            disabled={execBusy}
                            onClick={() =>
                              void runOrderAction(
                                "markWorking",
                                { orderId: r.id },
                                "Order moved to working",
                              )
                            }
                          >
                            Working
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {(rows ?? []).length === 0 && (
                  <tr>
                    <td className="px-3 py-4 text-sm text-muted-foreground" colSpan={6}>
                      No orders in this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="space-y-3">
            <select
              className={field}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="open">Open (pending/working/partial)</option>
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="working">Working</option>
              <option value="partially_filled">Partially filled</option>
              <option value="filled">Filled</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {!selectedOrder ? (
              <div className="text-sm text-muted-foreground">Select an order to execute.</div>
            ) : (
              <>
                <div className="rounded-md border border-border p-3 text-sm">
                  <div className="font-medium">{selectedOrder.symbol}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {selectedOrder.client_email ?? "Unknown client"} · {selectedOrder.side}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Remaining {Number(selectedOrder.remaining_quantity ?? 0).toLocaleString()}
                  </div>
                </div>

                <h3 className="text-base font-semibold text-foreground pt-1">Trade Order</h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <div>
                      <label className={labelSm} htmlFor="desk-trade-order">
                        Trade Order
                      </label>
                      <select
                        id="desk-trade-order"
                        className={field}
                        value={selectedOrder.side === "sell" ? "sell" : "buy"}
                        disabled
                        aria-readonly
                      >
                        <option value="buy">Buy</option>
                        <option value="sell">Sell</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelSm} htmlFor="desk-positions">
                        Position(s)
                      </label>
                      <input
                        id="desk-positions"
                        className={field}
                        inputMode="decimal"
                        placeholder="Contracts / size"
                        value={fillQty}
                        onChange={(e) => setFillQty(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelSm} htmlFor="desk-option">
                        Option
                      </label>
                      <select
                        id="desk-option"
                        className={field}
                        value={optionType}
                        onChange={(e) => setOptionType(e.target.value as "call" | "put")}
                      >
                        <option value="call">Call</option>
                        <option value="put">Put</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelSm} htmlFor="desk-commodity">
                        Select a Commodity
                      </label>
                      <select
                        id="desk-commodity"
                        className={field}
                        value={commodity}
                        onChange={(e) => setCommodity(e.target.value)}
                      >
                        <option value="">— Select —</option>
                        <optgroup label="Currencies">
                          <option value="currencies">Currencies</option>
                          <option value="majors">Major pairs</option>
                        </optgroup>
                        <optgroup label="Commodities">
                          <option value="metals">Metals</option>
                          <option value="energy">Energy</option>
                          <option value="ag">Agricultural</option>
                        </optgroup>
                        <optgroup label="Other">
                          <option value="indices">Indices</option>
                        </optgroup>
                      </select>
                    </div>
                    <div>
                      <label className={labelSm} htmlFor="desk-contract">
                        Contract
                      </label>
                      <select
                        id="desk-contract"
                        className={field}
                        value={contractSpec}
                        onChange={(e) => setContractSpec(e.target.value)}
                      >
                        <option value="">— Select —</option>
                        <option value="g14">G14 (28 Jan 14)</option>
                        <option value="h15">H15 (15 Mar 15)</option>
                        <option value="m16">M16 (20 Jun 16)</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelSm} htmlFor="desk-strike">
                        Strike Price
                      </label>
                      <input
                        id="desk-strike"
                        className={field}
                        inputMode="decimal"
                        placeholder="Strike"
                        value={strikePrice}
                        onChange={(e) => setStrikePrice(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className={labelSm} htmlFor="desk-premium">
                        Premium
                      </label>
                      <input
                        id="desk-premium"
                        className={field}
                        inputMode="decimal"
                        placeholder="1.00"
                        value={fillPrice}
                        onChange={(e) => setFillPrice(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelSm} htmlFor="desk-contract-size">
                        Contract Size
                      </label>
                      <input
                        id="desk-contract-size"
                        className={roField}
                        readOnly
                        tabIndex={-1}
                        value={Number(contractSize).toLocaleString()}
                      />
                    </div>
                    <div>
                      <label className={labelSm} htmlFor="desk-px-per">
                        Price per Contract
                      </label>
                      <input
                        id="desk-px-per"
                        className={roField}
                        readOnly
                        tabIndex={-1}
                        value={
                          pricePerContract != null && Number.isFinite(pricePerContract)
                            ? pricePerContract.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : "—"
                        }
                      />
                    </div>
                    <div>
                      <label className={labelSm} htmlFor="desk-trade-val">
                        Trade Value
                      </label>
                      <input
                        id="desk-trade-val"
                        className={roField}
                        readOnly
                        tabIndex={-1}
                        value={
                          tradeValue != null && Number.isFinite(tradeValue)
                            ? tradeValue.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : "0.00"
                        }
                      />
                    </div>
                    <div>
                      <label className={labelSm} htmlFor="desk-fees">
                        Trade Fees
                      </label>
                      <input
                        id="desk-fees"
                        className={field}
                        inputMode="decimal"
                        value={fillFees}
                        onChange={(e) => setFillFees(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelSm} htmlFor="desk-total">
                        Total Invoiced
                      </label>
                      <input
                        id="desk-total"
                        className={roField}
                        readOnly
                        tabIndex={-1}
                        value={
                          totalInvoiced != null && Number.isFinite(totalInvoiced)
                            ? totalInvoiced.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : "0.00"
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 border-t border-border pt-4 md:grid-cols-2">
                  <div>
                    <div className={labelSm}>Trade Details</div>
                    <p className="text-sm font-medium text-foreground">{tradeDetailsSummary}</p>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground md:text-left">
                    Trade requests are submitted to your broker for verification. Upon receiving a
                    request, your broker will contact you to verify your trade details.
                  </p>
                </div>

                <button
                  className="mt-4 bg-gradient-brand text-brand-foreground rounded-md px-4 py-2.5 text-sm font-semibold w-full disabled:opacity-50"
                  disabled={execBusy}
                  onClick={() => {
                    const q = Number(fillQty);
                    const p = Number(fillPrice);
                    const fees = Number(fillFees || "0");
                    const comm = Number(fillCommission || "0");
                    if (!Number.isFinite(q) || q <= 0) return toast.error("Invalid position(s)");
                    if (!Number.isFinite(p) || p <= 0) return toast.error("Invalid premium");
                    if (!Number.isFinite(fees) || fees < 0) return toast.error("Invalid trade fees");
                    if (!Number.isFinite(comm) || comm < 0)
                      return toast.error("Invalid commission");
                    void runOrderAction(
                      "fill",
                      {
                        orderId: selectedOrder.id,
                        quantity: q,
                        price: p,
                        fees,
                        commission: comm,
                      },
                      "Trade request executed. Fill recorded.",
                    );
                  }}
                >
                  Request Trade
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className="text-xs px-2 py-2 rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                    disabled={execBusy}
                    onClick={() => {
                      const reason = window.prompt("Reject reason");
                      if (!reason?.trim()) return;
                      void runOrderAction(
                        "reject",
                        { orderId: selectedOrder.id, reason: reason.trim() },
                        "Order rejected",
                      );
                    }}
                  >
                    Reject
                  </button>
                  <button
                    className="text-xs px-2 py-2 rounded-md border border-border hover:bg-surface-elevated disabled:opacity-50"
                    disabled={execBusy}
                    onClick={() =>
                      void runOrderAction(
                        "expire",
                        { orderId: selectedOrder.id, reason: "Expired by desk" },
                        "Order expired",
                      )
                    }
                  >
                    Expire
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Auth Diagnostics"
        description="Validate Supabase env wiring and test login identifier/reset flow."
      >
        {health?.diagnosticsEnabled === false && health?.message ? (
          <div className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
            {health.message}
          </div>
        ) : null}
        {schema?.diagnosticsEnabled === false && schema?.message ? (
          <div className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
            {schema.message}
          </div>
        ) : null}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div className={field}>
            Server project: {health?.env?.server?.projectRef ?? "unknown"} | URL{" "}
            {health?.env?.server?.supabaseUrlPresent ? "OK" : "MISSING"} | Publishable key{" "}
            {health?.env?.server?.publishableKeyPresent ? "OK" : "MISSING"}
          </div>
          <div className={field}>
            Client project: {health?.env?.client?.projectRef ?? "unknown"} | URL{" "}
            {health?.env?.client?.supabaseUrlPresent ? "OK" : "MISSING"} | Key{" "}
            {health?.env?.client?.publishableKeyPresent ? "OK" : "MISSING"}
          </div>
          <div className={field}>
            Schema readiness:{" "}
            {schema?.summary
              ? `${schema.summary.passing}/${schema.summary.required} tables OK`
              : "unavailable"}{" "}
            | Missing: {schema?.summary?.missing ?? "?"}
          </div>
        </div>
        {Array.isArray(schema?.missingTables) && schema.missingTables.length > 0 && (
          <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Missing tables: {schema.missingTables.join(", ")}. Run database migrations on the new
            Supabase project.
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className={field}
            value={diagId}
            onChange={(e) => setDiagId(e.target.value)}
            placeholder="Email or username to diagnose"
          />
          <button
            className="bg-surface border border-border rounded-md px-3 py-2 text-sm hover:bg-surface-elevated disabled:opacity-50"
            disabled={diagBusy || !diagId.trim()}
            onClick={() => void runLookup(false)}
          >
            Resolve Identifier
          </button>
          <button
            className="bg-gradient-brand text-brand-foreground rounded-md px-3 py-2 text-sm hover:opacity-90 disabled:opacity-50"
            disabled={diagBusy || !diagId.trim()}
            onClick={() => void runLookup(true)}
          >
            Trigger Reset Email
          </button>
        </div>
        {diagResult && <div className="mt-3 text-sm text-muted-foreground">{diagResult}</div>}
      </SectionCard>
    </>
  );
}
