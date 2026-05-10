import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { PageHeader, SectionCard, DataTable } from "@/lib/portalShared";

export const Route = createFileRoute("/portal/admin/funding")({
  component: FundingPage,
});

const btn = "text-xs px-2.5 py-1.5 rounded-md border border-border hover:bg-surface-elevated";
const btnApprove =
  "text-xs px-2.5 py-1.5 rounded-md border border-success/40 text-success hover:bg-success/10";
const btnReject =
  "text-xs px-2.5 py-1.5 rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10";

function fmt(n: any, c = "USD") {
  return Number(n ?? 0).toLocaleString(undefined, { style: "currency", currency: c });
}

function FundingPage() {
  const [d, setD] = useState<{ deposits: any[]; withdrawals: any[] } | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  const refresh = async () => {
    try {
      const res = await fetch("/api/portal/funding-review");
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      setD(await res.json());
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load");
    }
  };
  useEffect(() => {
    void refresh();
  }, []);

  const review = async (
    kind: "deposit" | "withdrawal",
    id: string,
    decision: "approve" | "reject",
  ) => {
    const notes = decision === "reject" ? (prompt("Reason (optional):") ?? undefined) : undefined;
    try {
      const res = await fetch("/api/portal/funding-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, payload: { requestId: id, decision, reviewNotes: notes } }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      toast.success(`Request ${decision}d`);
      void refresh();
    } catch (e: any) {
      toast.error(e?.message);
    }
  };

  const fdep = (d?.deposits ?? []).filter((r: any) => filter === "all" || r.status === "pending");
  const fwd = (d?.withdrawals ?? []).filter((r: any) => filter === "all" || r.status === "pending");

  return (
    <>
      <PageHeader
        title="Funding Review"
        subtitle="Approve or reject pending deposits and withdrawals."
      />
      <div className="flex gap-2">
        <button
          className={`${btn} ${filter === "pending" ? "bg-surface-elevated" : ""}`}
          onClick={() => setFilter("pending")}
        >
          Pending
        </button>
        <button
          className={`${btn} ${filter === "all" ? "bg-surface-elevated" : ""}`}
          onClick={() => setFilter("all")}
        >
          All
        </button>
      </div>

      <SectionCard title={`Deposit Requests (${fdep.length})`}>
        <DataTable
          rows={fdep}
          columns={[
            {
              key: "created_at",
              label: "Date",
              render: (r) => new Date(r.created_at).toLocaleString(),
            },
            { key: "email", label: "User" },
            { key: "amount", label: "Amount", render: (r) => fmt(r.amount, r.currency) },
            { key: "method", label: "Method" },
            { key: "reference", label: "Reference" },
            {
              key: "status",
              label: "Status",
              render: (r) => <span className="capitalize">{r.status}</span>,
            },
            {
              key: "actions",
              label: "",
              render: (r) =>
                r.status === "pending" ? (
                  <div className="flex gap-2">
                    <button
                      className={btnApprove}
                      onClick={() => review("deposit", r.id, "approve")}
                    >
                      Approve
                    </button>
                    <button className={btnReject} onClick={() => review("deposit", r.id, "reject")}>
                      Reject
                    </button>
                  </div>
                ) : null,
            },
          ]}
        />
      </SectionCard>

      <SectionCard title={`Withdrawal Requests (${fwd.length})`}>
        <DataTable
          rows={fwd}
          columns={[
            {
              key: "created_at",
              label: "Date",
              render: (r) => new Date(r.created_at).toLocaleString(),
            },
            { key: "email", label: "User" },
            { key: "amount", label: "Amount", render: (r) => fmt(r.amount, r.currency) },
            { key: "method", label: "Method" },
            { key: "destination", label: "Destination" },
            {
              key: "status",
              label: "Status",
              render: (r) => <span className="capitalize">{r.status}</span>,
            },
            {
              key: "actions",
              label: "",
              render: (r) =>
                r.status === "pending" ? (
                  <div className="flex gap-2">
                    <button
                      className={btnApprove}
                      onClick={() => review("withdrawal", r.id, "approve")}
                    >
                      Approve
                    </button>
                    <button
                      className={btnReject}
                      onClick={() => review("withdrawal", r.id, "reject")}
                    >
                      Reject
                    </button>
                  </div>
                ) : null,
            },
          ]}
        />
      </SectionCard>
      <Toaster />
    </>
  );
}
