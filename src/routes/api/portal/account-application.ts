import { createFileRoute } from "@tanstack/react-router";
import { apiErrorResponse, readJsonBody } from "../-_utils";
import { requireUserIdFromRequest } from "@/server/request-auth";

export const Route = createFileRoute("/api/portal/account-application")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const userId = await requireUserIdFromRequest(request);
          const { getAccountApplicationContextForApi } = await import("@/server/applications.functions");
          return Response.json(await getAccountApplicationContextForApi(userId));
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
      POST: async ({ request }) => {
        try {
          const userId = await requireUserIdFromRequest(request);
          const body = await readJsonBody(request);
          const { submitAccountApplicationForApi } = await import("@/server/applications.functions");
          return Response.json(await submitAccountApplicationForApi(userId, body));
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
    },
  },
});
