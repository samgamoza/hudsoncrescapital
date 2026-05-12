import { createFileRoute } from "@tanstack/react-router";
import { apiErrorResponse, readJsonBody } from "../-_utils";
import { requireUserIdFromRequest } from "@/server/request-auth";

export const Route = createFileRoute("/api/portal/portal-settings")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { getInvestorDashboardLayoutForApi } = await import("@/server/portal-settings.functions");
          return Response.json(await getInvestorDashboardLayoutForApi());
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
      POST: async ({ request }) => {
        try {
          const actorId = await requireUserIdFromRequest(request);
          const body = await readJsonBody(request);
          const { setInvestorDashboardLayoutForApi } = await import("@/server/portal-settings.functions");
          return Response.json(await setInvestorDashboardLayoutForApi(actorId, body));
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
    },
  },
});
