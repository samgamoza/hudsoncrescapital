import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/portal/sub-portfolio-holdings")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json();
        const { addHolding } = await import("@/server/portfolios.functions");
        const data = await addHolding({ data: body });
        return Response.json(data);
      },
      PATCH: async ({ request }) => {
        const body = await request.json();
        const { updateHolding } = await import("@/server/portfolios.functions");
        const data = await updateHolding({ data: body });
        return Response.json(data);
      },
      DELETE: async ({ request }) => {
        const body = await request.json();
        const { deleteHolding } = await import("@/server/portfolios.functions");
        const data = await deleteHolding({ data: body });
        return Response.json(data);
      },
    },
  },
});
