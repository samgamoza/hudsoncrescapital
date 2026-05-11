import { createFileRoute } from "@tanstack/react-router";
import { apiErrorResponse, readJsonBody } from "../-_utils";
import { requireUserIdFromRequest } from "@/server/request-auth";

export const Route = createFileRoute("/api/portal/investor-trading")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const userId = await requireUserIdFromRequest(request);
          const { loadInvestorTradingWorkspaceForApi } = await import("@/server/trading.functions");
          return Response.json(await loadInvestorTradingWorkspaceForApi(userId));
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
      POST: async ({ request }) => {
        try {
          const userId = await requireUserIdFromRequest(request);
          const body = await readJsonBody<{ action?: string; payload?: unknown }>(request);
          const trading = await import("@/server/trading.functions");
          if (body?.action === "place") {
            return Response.json(await trading.placeInvestorOrderForApi(userId, body.payload));
          }
          if (body?.action === "cancel") {
            return Response.json(await trading.cancelInvestorOrderForApi(userId, body.payload));
          }
          return Response.json({ error: "Unsupported action" }, { status: 400 });
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
    },
  },
});
