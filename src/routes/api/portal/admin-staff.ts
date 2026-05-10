import { createFileRoute } from "@tanstack/react-router";
import { apiErrorResponse, readJsonBody } from "../-_utils";

export const Route = createFileRoute("/api/portal/admin-staff")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { listAdmins, getMyRoles } = await import("@/server/admins.functions");
          const [admins, roles] = await Promise.all([listAdmins(), getMyRoles()]);
          return Response.json({ admins, roles });
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
      POST: async ({ request }) => {
        try {
          const body = await readJsonBody<{ action?: string; payload?: unknown }>(request);
          if (body?.action === "grant") {
            const { grantStaffRole } = await import("@/server/admins.functions");
            const data = await grantStaffRole({ data: body.payload });
            return Response.json(data);
          }
          if (body?.action === "revoke") {
            const { revokeStaffRole } = await import("@/server/admins.functions");
            const data = await revokeStaffRole({ data: body.payload });
            return Response.json(data);
          }
          return Response.json({ error: "Unsupported action" }, { status: 400 });
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
    },
  },
});
