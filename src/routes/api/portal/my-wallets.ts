import { createFileRoute } from "@tanstack/react-router";
import { requireUserIdFromRequest } from "@/server/request-auth";
import { apiErrorResponse } from "../-_utils";

export const Route = createFileRoute("/api/portal/my-wallets")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const userId = await requireUserIdFromRequest(request);
          const { getMyWalletsForApi } = await import("@/server/wallet.functions");
          return Response.json(await getMyWalletsForApi(userId));
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
    },
  },
});
