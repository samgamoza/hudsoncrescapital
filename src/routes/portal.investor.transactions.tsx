import { createFileRoute } from "@tanstack/react-router";
import { DataTable, PageHeader, SectionCard } from "@/lib/portalShared";

export const Route = createFileRoute("/portal/investor/transactions")({
  component: TransactionsPage,
});

const txns = [
  { id: "TX-10241", type: "Deposit", amount: 500000, date: "2026-04-12" },
  { id: "TX-10198", type: "Withdrawal", amount: -120000, date: "2026-03-30" },
  { id: "TX-10133", type: "Deposit", amount: 250000, date: "2026-02-18" },
  { id: "TX-10087", type: "Performance Fee", amount: -38400, date: "2026-01-31" },
  { id: "TX-10054", type: "Deposit", amount: 1000000, date: "2026-01-04" },
];

function TransactionsPage() {
  return (
    <>
      <PageHeader title="Transactions" subtitle="Capital movements and transaction history." />
      <SectionCard title="Deposits & Withdrawals">
        <DataTable
          rows={txns}
          columns={[
            { key: "id", label: "ID" },
            { key: "type", label: "Type" },
            {
              key: "amount",
              label: "Amount",
              render: (r) => (
                <span className={r.amount >= 0 ? "text-success" : "text-danger"}>
                  ${Math.abs(r.amount).toLocaleString()}
                </span>
              ),
            },
            { key: "date", label: "Date", render: (r) => new Date(r.date).toLocaleDateString() },
          ]}
        />
      </SectionCard>
    </>
  );
}
