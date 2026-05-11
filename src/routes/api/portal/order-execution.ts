import { createFileRoute } from "@tanstack/react-router";
import { apiErrorResponse, readJsonBody } from "../-_utils";
import { requireUserIdFromRequest } from "@/server/request-auth";

/** Staff/admin manual order execution — separate surface from investor order entry. */
export const Route = createFileRoute("/api/portal/order-execution")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const actorId = await requireUserIdFromRequest(request);
          const body = await readJsonBody<{ action?: string; payload?: unknown }>(request);
          const trading = await import("@/server/trading.functions");

          switch (body?.action) {
            case "executionWorkspace":
              return Response.json(await trading.loadExecutionWorkspaceForApi(actorId, body.payload));
            case "markWorking":
              return Response.json(await trading.markOrderWorkingForApi(actorId, body.payload));
            case "fill":
              return Response.json(await trading.fillOrderForApi(actorId, body.payload));
            case "reject":
              return Response.json(await trading.rejectOrderForApi(actorId, body.payload));
            case "expire":
              return Response.json(await trading.expireOrderForApi(actorId, body.payload));
            default:
              return Response.json({ error: "Unsupported action" }, { status: 400 });
          }
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
    },
  },
});
