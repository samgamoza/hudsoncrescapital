import { createFileRoute } from "@tanstack/react-router";
import { apiErrorResponse, readJsonBody } from "../-_utils";
import { requireUserIdFromRequest } from "@/server/request-auth";

export const Route = createFileRoute("/api/portal/admin-staff")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const actorId = await requireUserIdFromRequest(request);
          const { listAdminsForApi, getMyRolesForApi } = await import("@/server/admins.functions");
          const [admins, roles] = await Promise.all([
            listAdminsForApi(actorId),
            getMyRolesForApi(actorId),
          ]);
          return Response.json({ admins, roles });
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
      POST: async ({ request }) => {
        try {
          const actorId = await requireUserIdFromRequest(request);
          const body = await readJsonBody<{ action?: string; payload?: unknown }>(request);
          if (body?.action === "grant") {
            const { grantStaffRoleForApi } = await import("@/server/admins.functions");
            return Response.json(await grantStaffRoleForApi(actorId, body.payload));
          }
          if (body?.action === "revoke") {
            const { revokeStaffRoleForApi } = await import("@/server/admins.functions");
            return Response.json(await revokeStaffRoleForApi(actorId, body.payload));
          }
          return Response.json({ error: "Unsupported action" }, { status: 400 });
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
    },
  },
});
