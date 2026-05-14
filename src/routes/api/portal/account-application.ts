import { createFileRoute } from "@tanstack/react-router";
import { apiErrorResponse } from "../-_utils";
import { requireUserIdFromRequest } from "@/server/request-auth";

/**
 * Compatibility surface for code that historically posted the legacy 6-step
 * wizard payload. The submission endpoint is gone: the in-portal completion
 * wizard now talks to `/api/portal/profile-completion`. We keep GET so the
 * dashboard / admin tooling can still read account context.
 */
export const Route = createFileRoute("/api/portal/account-application")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const userId = await requireUserIdFromRequest(request);
          const { getAccountApplicationContextForApi } = await import(
            "@/server/applications.functions"
          );
          return Response.json(await getAccountApplicationContextForApi(userId));
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
      POST: async () =>
        Response.json(
          {
            error: "Endpoint moved",
            details:
              "Use POST /api/portal/profile-completion. Signup no longer accepts the legacy account-application payload.",
          },
          { status: 410 },
        ),
    },
  },
});
