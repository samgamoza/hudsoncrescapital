import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/symbol-detail")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const slug = url.searchParams.get("slug");
        if (!slug) return Response.json({ error: "Missing slug" }, { status: 400 });
        const { getSymbolDetail } = await import("@/server/market.functions");
        const data = await getSymbolDetail({ data: { slug } });
        return Response.json(data);
      },
    },
  },
});
