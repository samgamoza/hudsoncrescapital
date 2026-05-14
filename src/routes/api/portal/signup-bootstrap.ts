import { createFileRoute } from "@tanstack/react-router";
import { apiErrorResponse, readJsonBody } from "../-_utils";
import { requireUserIdFromRequest } from "@/server/request-auth";

/**
 * Called immediately after Supabase email confirmation + first sign-in so the
 * basic identity captured during signup is committed to our own tables. Safe
 * to call repeatedly: the underlying server fn is idempotent.
 */
export const Route = createFileRoute("/api/portal/signup-bootstrap")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await requireUserIdFromRequest(request);
          const body = await readJsonBody(request);
          const { bootstrapInvestorProfile } = await import("@/server/applications.functions");
          return Response.json(await bootstrapInvestorProfile({ data: body }));
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
    },
  },
});
