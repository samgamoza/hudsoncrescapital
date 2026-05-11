import { createFileRoute } from "@tanstack/react-router";
import { apiErrorResponse, checkRateLimit, getClientIp, readJsonBody } from "../-_utils";
import { requireUserIdFromRequest } from "@/server/request-auth";

export const Route = createFileRoute("/api/portal/auth-diagnostics")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          if (process.env.AUTH_DIAGNOSTICS_ENABLED !== "true") {
            return Response.json({ ok: false, error: "Not found" }, { status: 404 });
          }
          const actorId = await requireUserIdFromRequest(request);
          const { getMyRolesForApi } = await import("@/server/admins.functions");
          const roles = await getMyRolesForApi(actorId);
          return Response.json({ ok: true, roles });
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
      POST: async ({ request }) => {
        try {
          if (process.env.AUTH_DIAGNOSTICS_ENABLED !== "true") {
            return Response.json({ ok: false, error: "Not found" }, { status: 404 });
          }
          const ip = getClientIp(request);
          const gate = checkRateLimit(`auth-diagnostics:${ip}`, { limit: 15, windowMs: 60_000 });
          if (!gate.ok) {
            return Response.json(
              { ok: false, error: "Too many requests" },
              { status: 429, headers: { "Retry-After": String(gate.retryAfterSeconds) } },
            );
          }

          const body = await readJsonBody<{ identifier?: string; sendReset?: boolean }>(request);
          const identifier = String(body.identifier ?? "").trim();
          if (!identifier)
            return Response.json({ ok: false, error: "Identifier is required" }, { status: 400 });

          const actorId = await requireUserIdFromRequest(request);
          const { getMyRolesForApi } = await import("@/server/admins.functions");
          const roles = await getMyRolesForApi(actorId);
          if (!roles.includes("super_admin")) {
            return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
          }

          const { resolveLoginEmailForApi, sendPasswordResetForApi } =
            await import("@/server/clients.functions");
          const resolved = await resolveLoginEmailForApi({ identifier });
          if (!resolved.email)
            return Response.json({ ok: true, found: false, resetTriggered: false });

          if (body.sendReset) {
            await sendPasswordResetForApi(actorId, { email: resolved.email });
            return Response.json({ ok: true, found: true, resetTriggered: true });
          }
          return Response.json({ ok: true, found: true, resetTriggered: false });
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
    },
  },
});
