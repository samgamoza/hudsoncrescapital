import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/portal/audit-logs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const payload = await request.json();
        const { listAuditLogs } = await import("@/server/admins.functions");
        const data = await listAuditLogs({ data: payload });
        return Response.json(data);
      },
    },
  },
});
