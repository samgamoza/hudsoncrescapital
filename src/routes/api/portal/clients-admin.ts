import { createFileRoute } from "@tanstack/react-router";
import { apiErrorResponse, readJsonBody } from "../-_utils";

export const Route = createFileRoute("/api/portal/clients-admin")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const action = url.searchParams.get("action") ?? "list";
          if (action === "list") {
            const { listClients } = await import("@/server/clients.functions");
            return Response.json(await listClients());
          }
          if (action === "detail") {
            const userId = url.searchParams.get("userId");
            const { getClient } = await import("@/server/clients.functions");
            return Response.json(await getClient({ data: { userId } }));
          }
          if (action === "roles") {
            const { getMyRoles } = await import("@/server/admins.functions");
            return Response.json(await getMyRoles());
          }
          return Response.json({ error: "Unsupported action" }, { status: 400 });
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
      POST: async ({ request }) => {
        try {
          const body = await readJsonBody<{ action?: string; payload?: unknown }>(request);
          const action = body?.action;
          const payload = body?.payload;
          const clients = await import("@/server/clients.functions");
          if (action === "updateProfile") return Response.json(await clients.updateClientProfile({ data: payload }));
          if (action === "updateAccountStatus") return Response.json(await clients.updateAccountStatus({ data: payload }));
          if (action === "setClientLoginEnabled") return Response.json(await clients.setClientLoginEnabled({ data: payload }));
          if (action === "sendPasswordReset") return Response.json(await clients.sendPasswordReset({ data: payload }));
          if (action === "addClientNote") return Response.json(await clients.addClientNote({ data: payload }));
          if (action === "deactivateClient") return Response.json(await clients.deactivateClient({ data: payload }));
          if (action === "deleteClient") return Response.json(await clients.deleteClient({ data: payload }));
          if (action === "resetAllClients") return Response.json(await clients.resetAllClients({ data: payload }));
          return Response.json({ error: "Unsupported action" }, { status: 400 });
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
    },
  },
});
