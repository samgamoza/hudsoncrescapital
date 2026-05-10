import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/portal/staff-trade-history")({
  server: {
    handlers: {
      GET: async () => {
        const { getStaffTradeHistory } = await import("@/server/trade-history.functions");
        const data = await getStaffTradeHistory();
        return Response.json(data);
      },
    },
  },
});
