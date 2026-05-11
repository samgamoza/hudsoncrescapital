import { createFileRoute } from "@tanstack/react-router";
import { requireUserIdFromRequest } from "@/server/request-auth";
import { apiErrorResponse, readJsonBody } from "../-_utils";

export const Route = createFileRoute("/api/portal/sub-portfolio-holdings")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const actorId = await requireUserIdFromRequest(request);
          const body = await readJsonBody<unknown>(request);
          const { addHoldingForApi } = await import("@/server/portfolios.functions");
          return Response.json(await addHoldingForApi(actorId, body));
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
      PATCH: async ({ request }) => {
        try {
          const actorId = await requireUserIdFromRequest(request);
          const body = await readJsonBody<unknown>(request);
          const { updateHoldingForApi } = await import("@/server/portfolios.functions");
          return Response.json(await updateHoldingForApi(actorId, body));
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
      DELETE: async ({ request }) => {
        try {
          const actorId = await requireUserIdFromRequest(request);
          const body = await readJsonBody<unknown>(request);
          const { deleteHoldingForApi } = await import("@/server/portfolios.functions");
          return Response.json(await deleteHoldingForApi(actorId, body));
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
    },
  },
});
