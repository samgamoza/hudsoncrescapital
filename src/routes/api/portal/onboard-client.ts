import { createFileRoute } from "@tanstack/react-router";
import { apiErrorResponse } from "../-_utils";
import { requireUserIdFromRequest } from "@/server/request-auth";

export const Route = createFileRoute("/api/portal/onboard-client")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const actorId = await requireUserIdFromRequest(request);
          const payload = await request.json();
          const { onboardClientForApi } = await import("@/server/clients.functions");
          return Response.json(await onboardClientForApi(actorId, payload));
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
    },
  },
});
