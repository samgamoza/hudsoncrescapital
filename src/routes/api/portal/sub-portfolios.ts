import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/portal/sub-portfolios")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const userId = url.searchParams.get("userId") ?? undefined;
        const accountId = url.searchParams.get("accountId") ?? undefined;
        const { listSubPortfolios } = await import("@/server/portfolios.functions");
        const data = await listSubPortfolios({ data: { userId, accountId } });
        return Response.json(data);
      },
      POST: async ({ request }) => {
        const body = await request.json();
        const { createSubPortfolio } = await import("@/server/portfolios.functions");
        const data = await createSubPortfolio({ data: body });
        return Response.json(data);
      },
      PATCH: async ({ request }) => {
        const body = await request.json();
        const { updateSubPortfolio } = await import("@/server/portfolios.functions");
        const data = await updateSubPortfolio({ data: body });
        return Response.json(data);
      },
      DELETE: async ({ request }) => {
        const body = await request.json();
        const { deleteSubPortfolio } = await import("@/server/portfolios.functions");
        const data = await deleteSubPortfolio({ data: body });
        return Response.json(data);
      },
    },
  },
});
