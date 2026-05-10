import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/auth-health")({
  server: {
    handlers: {
      GET: async () => {
        if (process.env.PUBLIC_STATUS_ENDPOINTS_ENABLED !== "true") {
          return Response.json({ ok: false, error: "Not found" }, { status: 404 });
        }
        return Response.json({ ok: true });
      },
    },
  },
});
