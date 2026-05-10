import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/portal/profile")({
  server: {
    handlers: {
      GET: async () => {
        const { getMyProfile } = await import("@/server/profile.functions");
        return Response.json(await getMyProfile());
      },
      POST: async ({ request }) => {
        const body = await request.json();
        const action = body?.action;
        const payload = body?.payload;
        const profile = await import("@/server/profile.functions");
        if (action === "update") return Response.json(await profile.updateMyProfile({ data: payload }));
        if (action === "changePassword") return Response.json(await profile.changeMyPassword({ data: payload }));
        if (action === "deactivate") return Response.json(await profile.deactivateMyAccount());
        if (action === "reactivate") return Response.json(await profile.reactivateMyAccount());
        if (action === "delete") return Response.json(await profile.deleteMyAccount({ data: payload }));
        return Response.json({ error: "Unsupported action" }, { status: 400 });
      },
    },
  },
});
