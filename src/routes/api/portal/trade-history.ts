import { createFileRoute } from "@tanstack/react-router";
import { apiErrorResponse } from "../-_utils";
import { requireUserIdFromRequest } from "@/server/request-auth";

export const Route = createFileRoute("/api/portal/trade-history")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const userId = await requireUserIdFromRequest(request);
          const { getMyTradeHistoryForApi } = await import("@/server/trade-history.functions");
          return Response.json(await getMyTradeHistoryForApi(userId));
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
    },
  },
});
