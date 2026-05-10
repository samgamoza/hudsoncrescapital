import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { MetricCard, PageHeader, SectionCard } from "@/lib/portalShared";

export const Route = createFileRoute("/portal/admin/")({
  component: TradingPage,
});

function TradingPage() {
  const [form, setForm] = useState({
    portfolioId: "seed-investor-account",
    strategyId: "s1",
    assetId: "AAPL",
    side: "BUY",
    quantity: 10,
    requestedPrice: 192,
  });
  const [submitting, setSubmitting] = useState(false);
  const [health, setHealth] = useState<any | null>(null);
  const [schema, setSchema] = useState<any | null>(null);
  const [diagId, setDiagId] = useState("");
  const [diagResult, setDiagResult] = useState<string | null>(null);
  const [diagBusy, setDiagBusy] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast.success(
        `Order routed: ${form.side} ${form.quantity} ${form.assetId} @ $${form.requestedPrice}`,
      );
    }, 600);
  };

  const field = "bg-surface border border-border rounded-md px-3 py-2 text-sm text-foreground";

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/public/auth-health");
        if (!res.ok) throw new Error(`Health check failed (${res.status})`);
        setHealth(await res.json());
      } catch (e: any) {
        setHealth({ ok: false, error: e?.message ?? "Health check failed" });
      }
      try {
        const res = await fetch("/api/public/schema-readiness");
        if (!res.ok) throw new Error(`Schema check failed (${res.status})`);
        setSchema(await res.json());
      } catch (e: any) {
        setSchema({ ok: false, error: e?.message ?? "Schema check failed" });
      }
    })();
  }, []);

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
        subtitle="OMS-style execution with simulated fill handling."
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard title="NAV" value="$14,250,000" />
        <MetricCard title="P&L YTD" value="$2,134,000" tone="positive" helper="+15.0%" />
        <MetricCard title="Positions" value="5" />
      </div>
      <SectionCard
        title="Manual Trade Entry"
        description="Atomic execution path against the trading engine."
      >
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            className={field}
            value={form.portfolioId}
            onChange={(e) => setForm({ ...form, portfolioId: e.target.value })}
            placeholder="Portfolio ID"
          />
          <input
            className={field}
            value={form.strategyId}
            onChange={(e) => setForm({ ...form, strategyId: e.target.value })}
            placeholder="Strategy ID"
          />
          <input
            className={field}
            value={form.assetId}
            onChange={(e) => setForm({ ...form, assetId: e.target.value })}
            placeholder="Asset ID"
          />
          <select
            className={field}
            value={form.side}
            onChange={(e) => setForm({ ...form, side: e.target.value })}
          >
            <option>BUY</option>
            <option>SELL</option>
          </select>
          <input
            className={field}
            type="number"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
            placeholder="Quantity"
          />
          <input
            className={field}
            type="number"
            value={form.requestedPrice}
            onChange={(e) => setForm({ ...form, requestedPrice: Number(e.target.value) })}
            placeholder="Price"
          />
          <button
            type="submit"
            disabled={submitting}
            className="bg-gradient-brand text-brand-foreground rounded-md px-4 py-2 font-medium shadow-glow hover:opacity-90 disabled:opacity-50 sm:col-span-2 lg:col-span-2"
          >
            {submitting ? "Submitting…" : "Submit Trade"}
          </button>
        </form>
      </SectionCard>

      <SectionCard
        title="Auth Diagnostics"
        description="Validate Supabase env wiring and test login identifier/reset flow."
      >
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
