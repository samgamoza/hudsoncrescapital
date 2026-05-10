import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/live-market-news")({
  server: {
    handlers: {
      GET: async () => {
        const { getLiveNewsSentiment } = await import("@/server/market.functions");
        const data = await getLiveNewsSentiment();
        return Response.json(data);
      },
    },
  },
});
