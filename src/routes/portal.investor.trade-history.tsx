import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { DataTable, PageHeader, SectionCard } from "@/lib/portalShared";
import type { TradeHistoryRow } from "@/lib/trade-history.types";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/portal/investor/trade-history")({
  component: TradeHistoryPage,
});

function TradeHistoryPage() {
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

  useEffect(() => {
    const id = window.setInterval(() => void loadRows(), 12000);
    return () => window.clearInterval(id);
  }, [loadRows]);

  useEffect(() => {
    let disposed = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        const uid = data.session?.user?.id;
        if (!uid || disposed) return;
        channel = supabase
          .channel(`portal-investor-trade-history-${uid}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "trades" }, () => {
            if (!disposed) void loadRows();
          })
          .subscribe();
      })
      .catch(() => {});
    return () => {
      disposed = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [loadRows]);

  if (rows === null) {
    return <p className="text-sm text-muted-foreground">Loading trade history…</p>;
  }

  return (
    <>
      <PageHeader
        title="Trade history"
        subtitle="Confirmed executions across your brokerage accounts, newest first."
      />
      <SectionCard
        title="Executions"
        description={
          rows.length === 0
            ? "No trades on file yet. Fills will appear here once your accounts begin trading."
            : `${rows.length} fill${rows.length === 1 ? "" : "s"} (up to 500 most recent).`
        }
      >
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            When orders are executed in the system, each fill is listed with symbol, side, quantity,
            and price.
          </p>
        ) : (
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
                  <span
                    className={
                      r.side === "buy" ? "text-success font-medium" : "text-danger font-medium"
                    }
                  >
                    {r.side === "buy" ? "Buy" : "Sell"}
                  </span>
                ),
              },
              {
                key: "quantity",
                label: "Qty",
                render: (r) =>
                  Number(r.quantity).toLocaleString(undefined, { maximumFractionDigits: 8 }),
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
              {
                key: "fees",
                label: "Fees / comm.",
                render: (r) =>
                  `${Number(r.fees).toLocaleString()} / ${Number(r.commission).toLocaleString()} ${r.currency}`,
              },
            ]}
          />
        )}
      </SectionCard>
    </>
  );
}
