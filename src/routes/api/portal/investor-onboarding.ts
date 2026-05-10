import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/portal/investor-onboarding")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { getInvestorOnboardingState } = await import("@/server/applications.functions");
          return Response.json(await getInvestorOnboardingState());
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          const status =
            typeof (e as { status?: number })?.status === "number"
              ? (e as { status: number }).status
              : msg.includes("Unauthorized") || msg.includes("401")
                ? 401
                : 500;
          return Response.json({ error: msg }, { status });
        }
      },
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { submitInvestorOnboardingLite } = await import("@/server/applications.functions");
          return Response.json(await submitInvestorOnboardingLite({ data: body }));
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          if (msg.includes("Forbidden") || msg.includes("not found")) {
            return Response.json({ error: msg }, { status: 403 });
          }
          const status = msg.includes("Unauthorized") || msg.includes("401") ? 401 : 400;
          return Response.json({ error: msg }, { status });
        }
      },
    },
  },
});
