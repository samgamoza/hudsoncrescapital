import { createFileRoute } from "@tanstack/react-router";
import { fetchDiscoverAiFeed, type DiscoverFeedCategory } from "@/server/discover-ai-feed";

const CATEGORIES: DiscoverFeedCategory[] = ["general", "forex", "crypto", "merger"];

export const Route = createFileRoute("/api/public/discover-ai-feed")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const raw = url.searchParams.get("category");
        const category = CATEGORIES.includes(raw as DiscoverFeedCategory)
          ? (raw as DiscoverFeedCategory)
          : "general";
        const data = await fetchDiscoverAiFeed(category);
        return Response.json(data);
      },
    },
  },
});
