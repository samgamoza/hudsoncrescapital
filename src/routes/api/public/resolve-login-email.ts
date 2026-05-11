import { createFileRoute } from "@tanstack/react-router";
import { apiErrorResponse, checkRateLimit, getClientIp, readJsonBody } from "../-_utils";

export const Route = createFileRoute("/api/public/resolve-login-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const ip = getClientIp(request);
          const gate = checkRateLimit(`resolve-login:${ip}`, { limit: 30, windowMs: 60_000 });
          if (!gate.ok) {
            return Response.json(
              { error: "Too many requests" },
              { status: 429, headers: { "Retry-After": String(gate.retryAfterSeconds) } },
            );
          }

          const body = await readJsonBody<{ identifier?: string }>(request);
          const { resolveLoginEmailForApi } = await import("@/server/clients.functions");
          const data = await resolveLoginEmailForApi({ identifier: body.identifier ?? "" });
          return Response.json(data);
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
    },
  },
});
