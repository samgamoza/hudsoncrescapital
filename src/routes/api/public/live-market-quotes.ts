import { createFileRoute } from "@tanstack/react-router";
import { fetchLiveMarketQuotes } from "@/server/market-quotes-fetch";

export const Route = createFileRoute("/api/public/live-market-quotes")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const data = await fetchLiveMarketQuotes();
          return Response.json(data);
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          return Response.json(
            { quotes: [], error: `Live quotes API failed: ${msg}` },
            { status: 200 },
          );
        }
      },
    },
  },
});
