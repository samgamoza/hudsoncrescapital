import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Dashboard2Main } from "@/components/investor/Dashboard2Main";

const searchSchema = z.object({
  tab: z
    .enum([
      "profile",
      "trading-buy",
      "trading-sell",
      "trade-order",
      "funding-record",
      "funding-transfer",
      "help-desk",
    ])
    .optional()
    .default("profile"),
});

export const Route = createFileRoute("/portal/investor/dashboard2")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [{ title: "Investor desk | Hudson Crest Capital" }, { name: "robots", content: "noindex" }],
  }),
  component: Dashboard2Route,
});

function Dashboard2Route() {
  const { tab } = Route.useSearch();
  return <Dashboard2Main tab={tab} />;
}
