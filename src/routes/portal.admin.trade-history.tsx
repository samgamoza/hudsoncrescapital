import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { DataTable, PageHeader, SectionCard } from "@/lib/portalShared";
import type { StaffTradeHistoryRow } from "@/lib/trade-history.types";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/portal/admin/trade-history")({
  component: AdminTradeHistoryPage,
});

function AdminTradeHistoryPage() {
  const [rows, setRows] = useState<StaffTradeHistoryRow[] | null>(null);

  const loadRows = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/staff-trade-history");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof (data as { error?: string })?.error === "string"
            ? (data as { error: string }).error
            : `Failed (${res.status})`,
        );
      }
      setRows(Array.isArray(data) ? (data as StaffTradeHistoryRow[]) : []);
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
    const channel = supabase
      .channel("portal-admin-trade-history")
      .on("postgres_changes", { event: "*", schema: "public", table: "trades" }, () => {
        if (!disposed) void loadRows();
      })
      .subscribe();
    return () => {
      disposed = true;
      void supabase.removeChannel(channel);
    };
  }, [loadRows]);

  if (rows === null) {
    return <p className="text-sm text-muted-foreground">Loading trade history…</p>;
  }

  return (
    <>
      <PageHeader
        title="Trade history"
        subtitle="Recent executions across all investor accounts, newest first (up to 500 rows)."
      />
      <SectionCard
        title="Executions"
        description={
          rows.length === 0
            ? "No trades on file yet."
            : `${rows.length} fill${rows.length === 1 ? "" : "s"} shown.`
        }
      >
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            When orders are executed, fills appear here with client account context.
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
              {
                key: "client_email",
                label: "Client",
                render: (r) => <span className="text-foreground">{r.client_email ?? "—"}</span>,
              },
              {
                key: "account_number",
                label: "Account #",
                render: (r) => <span className="font-mono text-xs">{r.account_number ?? "—"}</span>,
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
