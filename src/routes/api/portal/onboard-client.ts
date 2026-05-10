import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/portal/onboard-client")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const payload = await request.json();
        const { onboardClient } = await import("@/server/clients.functions");
        const data = await onboardClient({ data: payload });
        return Response.json(data);
      },
    },
  },
});
