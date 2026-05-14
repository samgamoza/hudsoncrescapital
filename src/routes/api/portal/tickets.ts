import { createFileRoute } from "@tanstack/react-router";
import { apiErrorResponse, readJsonBody } from "../-_utils";
import { requireUserIdFromRequest } from "@/server/request-auth";

export const Route = createFileRoute("/api/portal/tickets")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const userId = await requireUserIdFromRequest(request);
          const url = new URL(request.url);
          const id = url.searchParams.get("id");
          const tickets = await import("@/server/tickets.functions");
          if (id) return Response.json(await tickets.getTicket(userId, { id }));
          return Response.json(await tickets.listMyTickets(userId));
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
      POST: async ({ request }) => {
        try {
          const userId = await requireUserIdFromRequest(request);
          const body = await readJsonBody<{ action?: string; payload?: unknown }>(request);
          const action = body?.action;
          const payload = body?.payload;
          const tickets = await import("@/server/tickets.functions");
          if (action === "create") {
            return Response.json(await tickets.createTicket(userId, payload));
          }
          if (action === "reply") {
            return Response.json(await tickets.replyTicket(userId, payload));
          }
          return Response.json({ error: "Unsupported action" }, { status: 400 });
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
    },
  },
});
