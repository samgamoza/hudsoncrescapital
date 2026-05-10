import { createFileRoute } from "@tanstack/react-router";
import { apiErrorResponse } from "../-_utils";

export const Route = createFileRoute("/api/portal/my-wallets")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { getMyWallets } = await import("@/server/wallet.functions");
          const data = await getMyWallets();
          return Response.json(data);
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
    },
  },
});
