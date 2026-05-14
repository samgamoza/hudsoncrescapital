import { createFileRoute } from "@tanstack/react-router";
import { apiErrorResponse } from "../-_utils";
import { requireUserIdFromRequest } from "@/server/request-auth";

/**
 * Legacy investor-onboarding endpoint. Repurposed after the signup/profile
 * split: the GET now returns the compact `PortalProfileSummary` consumed by
 * the portal layout, modal, and banner. POST is removed — the in-portal
 * completion wizard talks to `/api/portal/profile-completion` instead.
 */
export const Route = createFileRoute("/api/portal/investor-onboarding")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const userId = await requireUserIdFromRequest(request);
          const { getPortalProfileSummary } = await import("@/server/applications.functions");
          return Response.json(await getPortalProfileSummary(userId));
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
    },
  },
});
