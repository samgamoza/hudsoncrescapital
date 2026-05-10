import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/portal/tickets")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const id = url.searchParams.get("id");
        const tickets = await import("@/server/tickets.functions");
        if (id) return Response.json(await tickets.getTicket({ data: { id } }));
        return Response.json(await tickets.listMyTickets());
      },
      POST: async ({ request }) => {
        const body = await request.json();
        const action = body?.action;
        const payload = body?.payload;
        const tickets = await import("@/server/tickets.functions");
        if (action === "create") return Response.json(await tickets.createTicket({ data: payload }));
        if (action === "reply") return Response.json(await tickets.replyTicket({ data: payload }));
        return Response.json({ error: "Unsupported action" }, { status: 400 });
      },
    },
  },
});
