import { createFileRoute } from "@tanstack/react-router";
import { apiErrorResponse, readJsonBody } from "../-_utils";
import { requireUserIdFromRequest } from "@/server/request-auth";

/**
 * In-portal profile-completion wizard endpoint.
 *
 * GET   -> compact profile summary (status / modalSeenAt / hasAccount)
 * POST  -> submit the full 8-section wizard payload
 * PATCH -> mark the one-time "complete your profile" reminder modal as seen
 */
export const Route = createFileRoute("/api/portal/profile-completion")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await requireUserIdFromRequest(request);
          const { getPortalProfileSummary } = await import("@/server/applications.functions");
          return Response.json(await getPortalProfileSummary());
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
      POST: async ({ request }) => {
        try {
          const userId = await requireUserIdFromRequest(request);
          const body = await readJsonBody(request);
          const { submitProfileCompletionForApi } = await import("@/server/applications.functions");
          return Response.json(await submitProfileCompletionForApi(userId, body));
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
      PATCH: async ({ request }) => {
        try {
          await requireUserIdFromRequest(request);
          const { markProfileCompletionModalSeen } = await import(
            "@/server/applications.functions"
          );
          return Response.json(await markProfileCompletionModalSeen());
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
    },
  },
});
