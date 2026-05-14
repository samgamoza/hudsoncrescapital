import { createFileRoute } from "@tanstack/react-router";

/**
 * Legacy investor-onboarding endpoint. Repurposed after the signup/profile
 * split: the GET now returns the compact `PortalProfileSummary` consumed by
 * the portal layout, modal, and banner. POST is removed — the in-portal
 * completion wizard talks to `/api/portal/profile-completion` instead.
 */
export const Route = createFileRoute("/api/portal/investor-onboarding")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { getPortalProfileSummary } = await import("@/server/applications.functions");
          return Response.json(await getPortalProfileSummary());
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
    },
  },
});
