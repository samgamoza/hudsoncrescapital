import { createFileRoute } from "@tanstack/react-router";
import { requireUserIdFromRequest } from "@/server/request-auth";
import { apiErrorResponse, readJsonBody } from "../-_utils";

export const Route = createFileRoute("/api/portal/sub-portfolios")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const actorId = await requireUserIdFromRequest(request);
          const url = new URL(request.url);
          const userId = url.searchParams.get("userId") ?? undefined;
          const accountId = url.searchParams.get("accountId") ?? undefined;
          const { listSubPortfoliosForApi } = await import("@/server/portfolios.functions");
          return Response.json(await listSubPortfoliosForApi(actorId, { userId, accountId }));
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
      POST: async ({ request }) => {
        try {
          const actorId = await requireUserIdFromRequest(request);
          const body = await readJsonBody<unknown>(request);
          const { createSubPortfolioForApi } = await import("@/server/portfolios.functions");
          return Response.json(await createSubPortfolioForApi(actorId, body));
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
      PATCH: async ({ request }) => {
        try {
          const actorId = await requireUserIdFromRequest(request);
          const body = await readJsonBody<unknown>(request);
          const { updateSubPortfolioForApi } = await import("@/server/portfolios.functions");
          return Response.json(await updateSubPortfolioForApi(actorId, body));
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
      DELETE: async ({ request }) => {
        try {
          const actorId = await requireUserIdFromRequest(request);
          const body = await readJsonBody<unknown>(request);
          const { deleteSubPortfolioForApi } = await import("@/server/portfolios.functions");
          return Response.json(await deleteSubPortfolioForApi(actorId, body));
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
    },
  },
});
