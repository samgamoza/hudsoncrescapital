import { createFileRoute } from "@tanstack/react-router";
import { apiErrorResponse, readJsonBody } from "../-_utils";
import { requireUserIdFromRequest } from "@/server/request-auth";
import {
  getInvestorDashboardLayoutForApi,
  setInvestorDashboardLayoutForApi,
} from "@/server/portal-settings.functions";

export const Route = createFileRoute("/api/portal/portal-settings")({
  server: {
    handlers: {
      GET: async () => {
        try {
          return Response.json(await getInvestorDashboardLayoutForApi());
        } catch (error) {
          console.error("[portal-settings GET]", error);
          return Response.json({ investorDashboard: "v1" as const });
        }
      },
      POST: async ({ request }) => {
        try {
          const actorId = await requireUserIdFromRequest(request);
          const body = await readJsonBody(request);
          return Response.json(await setInvestorDashboardLayoutForApi(actorId, body));
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
    },
  },
});
