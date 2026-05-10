import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/portal/trade-history")({
  server: {
    handlers: {
      GET: async () => {
        const { getMyTradeHistory } = await import("@/server/trade-history.functions");
        const data = await getMyTradeHistory();
        return Response.json(data);
      },
    },
  },
});
