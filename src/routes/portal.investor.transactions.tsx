import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { DataTable, PageHeader, SectionCard } from "@/lib/portalShared";

export const Route = createFileRoute("/portal/investor/transactions")({
  component: TransactionsPage,
});

type WalletPayload = {
  transactions?: any[];
};

function fmt(n: any, c = "USD") {
  return Number(n ?? 0).toLocaleString(undefined, { style: "currency", currency: c });
}

function TransactionsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/portal/wallet-actions");
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        const data: WalletPayload = await res.json();
        setRows([...(data.transactions ?? [])].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)));
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to load transactions");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <>
      <PageHeader
        title="Transactions"
        subtitle="Wallet ledger activity for your accounts. Use Wallet to submit deposit or withdrawal requests."
      />
      <SectionCard title="Wallet transactions">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <DataTable
            rows={rows}
            columns={[
              {
                key: "created_at",
                label: "Date",
                render: (r) => new Date(r.created_at).toLocaleString(),
              },
              {
                key: "txn_type",
                label: "Type",
                render: (r) => <span className="capitalize">{r.txn_type}</span>,
              },
              { key: "description", label: "Description" },
              {
                key: "amount",
                label: "Amount",
                render: (r) => (
                  <span className={Number(r.amount) >= 0 ? "text-success" : "text-destructive"}>
                    {fmt(r.amount, r.currency)}
                  </span>
                ),
              },
              {
                key: "balance_after",
                label: "Balance After",
                render: (r) => fmt(r.balance_after, r.currency),
              },
            ]}
          />
        )}
      </SectionCard>
      <Toaster />
    </>
  );
}
