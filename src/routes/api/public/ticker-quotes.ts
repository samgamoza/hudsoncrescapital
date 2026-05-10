import { createFileRoute } from "@tanstack/react-router";
import { fetchTickerTapeQuotes } from "@/server/market-quotes-fetch";

export const Route = createFileRoute("/api/public/ticker-quotes")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const data = await fetchTickerTapeQuotes();
          return Response.json(data, {
            headers: {
              "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
            },
          });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          return Response.json(
            { quotes: [], error: `Ticker API failed: ${msg}` },
            {
              status: 200,
              headers: {
                "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
              },
            },
          );
        }
      },
    },
  },
});
