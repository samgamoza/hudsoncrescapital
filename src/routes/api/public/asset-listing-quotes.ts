import { createFileRoute } from "@tanstack/react-router";
import { fetchAssetListingQuotes } from "@/server/market-quotes-fetch";

export const Route = createFileRoute("/api/public/asset-listing-quotes")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const symbols = Array.isArray(body?.symbols) ? body.symbols : [];
          const data = await fetchAssetListingQuotes(symbols);
          return Response.json(data);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          return Response.json({ quotes: [], error: msg }, { status: 400 });
        }
      },
    },
  },
});
