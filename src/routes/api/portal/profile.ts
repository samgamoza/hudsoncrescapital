import { createFileRoute } from "@tanstack/react-router";
import { apiErrorResponse, readJsonBody } from "../-_utils";
import { requireUserIdFromRequest } from "@/server/request-auth";

export const Route = createFileRoute("/api/portal/profile")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const userId = await requireUserIdFromRequest(request);
          const { getMyProfile } = await import("@/server/profile.functions");
          return Response.json(await getMyProfile(userId));
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
          const profile = await import("@/server/profile.functions");
          if (action === "update") {
            return Response.json(await profile.updateMyProfile(userId, payload));
          }
          if (action === "changePassword") {
            return Response.json(await profile.changeMyPassword(userId, payload));
          }
          if (action === "deactivate") {
            return Response.json(await profile.deactivateMyAccount(userId));
          }
          if (action === "reactivate") {
            return Response.json(await profile.reactivateMyAccount(userId));
          }
          if (action === "delete") {
            return Response.json(await profile.deleteMyAccount(userId, payload));
          }
          return Response.json({ error: "Unsupported action" }, { status: 400 });
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
    },
  },
});
