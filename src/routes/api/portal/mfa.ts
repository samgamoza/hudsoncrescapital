import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/portal/mfa")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json();
        const action = body?.action;
        const payload = body?.payload;
        const mfa = await import("@/server/mfa.functions");
        if (action === "start") return Response.json(await mfa.startMfaEnrollment());
        if (action === "verify") return Response.json(await mfa.verifyAndEnableMfa({ data: payload }));
        if (action === "disable") return Response.json(await mfa.disableMfa({ data: payload }));
        return Response.json({ error: "Unsupported action" }, { status: 400 });
      },
    },
  },
});
