import { createFileRoute } from "@tanstack/react-router";
import { apiErrorResponse } from "../-_utils";
import { requireUserIdFromRequest } from "@/server/request-auth";

export const Route = createFileRoute("/api/portal/staff-trade-history")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const userId = await requireUserIdFromRequest(request);
          const { getStaffTradeHistoryForApi } = await import("@/server/trade-history.functions");
          return Response.json(await getStaffTradeHistoryForApi(userId));
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
    },
  },
});
