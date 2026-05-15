import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/lib/portalShared";
import { DeskTradeHistoryTables } from "@/components/investor/DeskTradeHistoryTables";

export const Route = createFileRoute("/portal/investor/trade-history")({
  component: TradeHistoryPage,
});

function TradeHistoryPage() {
  return (
    <>
      <PageHeader
        title="Trade history"
        subtitle="Trade Buy and Trade Sell executions across your accounts, with CrossOcean-style columns and exports."
      />
      <DeskTradeHistoryTables showSectionCards liveSync />
    </>
  );
}
