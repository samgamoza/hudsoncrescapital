import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/portal/investor-trading")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { loadInvestorTradingWorkspace } = await import("@/server/trading.functions");
          const data = await loadInvestorTradingWorkspace();
          return Response.json(data);
        } catch (e: any) {
          const msg = e?.message ?? String(e);
          const status = typeof e?.status === "number" ? e.status : msg.includes("Unauthorized") ? 401 : 500;
          return Response.json({ error: msg }, { status });
        }
      },
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          if (body?.action === "place") {
            const { placeInvestorOrder } = await import("@/server/trading.functions");
            return Response.json(await placeInvestorOrder({ data: body.payload }));
          }
          if (body?.action === "cancel") {
            const { cancelInvestorOrder } = await import("@/server/trading.functions");
            return Response.json(await cancelInvestorOrder({ data: body.payload }));
          }
          return Response.json({ error: "Unsupported action" }, { status: 400 });
        } catch (e: any) {
          const msg = e?.message ?? String(e);
          if (msg.includes("Forbidden") || msg.includes("not found")) {
            return Response.json({ error: msg }, { status: 403 });
          }
          return Response.json({ error: msg }, { status: 400 });
        }
      },
    },
  },
});
