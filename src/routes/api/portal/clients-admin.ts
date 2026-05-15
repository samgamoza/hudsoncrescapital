import { createFileRoute } from "@tanstack/react-router";
import { apiErrorResponse, readJsonBody } from "../-_utils";
import { requireUserIdFromRequest } from "@/server/request-auth";

export const Route = createFileRoute("/api/portal/clients-admin")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const actorId = await requireUserIdFromRequest(request);
          const url = new URL(request.url);
          const action = url.searchParams.get("action") ?? "list";
          const clients = await import("@/server/clients.functions");

          if (action === "list") {
            return Response.json(await clients.listClientsForApi(actorId));
          }
          if (action === "detail") {
            const userId = url.searchParams.get("userId");
            return Response.json(await clients.getClientForApi(actorId, { userId }));
          }
          if (action === "roles") {
            const { getMyRolesForApi } = await import("@/server/admins.functions");
            return Response.json(await getMyRolesForApi(actorId));
          }
          return Response.json({ error: "Unsupported action" }, { status: 400 });
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
      POST: async ({ request }) => {
        try {
          const actorId = await requireUserIdFromRequest(request);
          const body = await readJsonBody<{ action?: string; payload?: unknown }>(request);
          const action = body?.action;
          const payload = body?.payload;
          const clients = await import("@/server/clients.functions");
          if (action === "updateProfile")
            return Response.json(await clients.updateClientProfileForApi(actorId, payload));
          if (action === "updateAccountStatus")
            return Response.json(await clients.updateAccountStatusForApi(actorId, payload));
          if (action === "provisionPendingBrokerageAccount")
            return Response.json(
              await clients.provisionPendingBrokerageAccountForApi(actorId, payload),
            );
          if (action === "setClientLoginEnabled")
            return Response.json(await clients.setClientLoginEnabledForApi(actorId, payload));
          if (action === "sendPasswordReset")
            return Response.json(await clients.sendPasswordResetForApi(actorId, payload));
          if (action === "addClientNote")
            return Response.json(await clients.addClientNoteForApi(actorId, payload));
          if (action === "deactivateClient")
            return Response.json(await clients.deactivateClientForApi(actorId, payload));
          if (action === "deleteClient")
            return Response.json(await clients.deleteClientForApi(actorId, payload));
          if (action === "resetAllClients")
            return Response.json(await clients.resetAllClientsForApi(actorId, payload));
          return Response.json({ error: "Unsupported action" }, { status: 400 });
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
    },
  },
});
