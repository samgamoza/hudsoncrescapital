import { createFileRoute } from "@tanstack/react-router";
import { DataTable, PageHeader, SectionCard } from "@/lib/portalShared";

export const Route = createFileRoute("/portal/admin/global-desk")({
  component: GlobalDeskPage,
});

const feed = [
  { desk: "US Desk (NYC)", action: "Executed BUY 600 NVDA", time: "09:31 EST" },
  { desk: "London Desk", action: "Adjusted EUR/USD hedge ratio", time: "14:10 GMT" },
  { desk: "Singapore Desk", action: "Risk rebalance complete", time: "21:05 SGT" },
  { desk: "US Desk (NYC)", action: "Closed XAU/USD position", time: "11:48 EST" },
];

function GlobalDeskPage() {
  return (
    <>
      <PageHeader
        title="Global Desk Monitor"
        subtitle="Time-zone aligned operational activity feed."
      />
      <SectionCard title="Live Activity Feed">
        <DataTable
          rows={feed}
          columns={[
            { key: "desk", label: "Desk" },
            { key: "action", label: "Activity" },
            { key: "time", label: "Time" },
          ]}
        />
      </SectionCard>
    </>
  );
}
