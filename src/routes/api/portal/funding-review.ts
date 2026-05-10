import { createFileRoute } from "@tanstack/react-router";
import { apiErrorResponse, readJsonBody } from "../-_utils";

export const Route = createFileRoute("/api/portal/funding-review")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { listPendingFundingRequests } = await import("@/server/wallet.functions");
          const data = await listPendingFundingRequests();
          return Response.json(data);
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
      POST: async ({ request }) => {
        try {
          const body = await readJsonBody<{ kind?: string; payload?: unknown }>(request);
          if (body?.kind === "deposit") {
            const { reviewDepositRequest } = await import("@/server/wallet.functions");
            const data = await reviewDepositRequest({ data: body.payload });
            return Response.json(data);
          }
          if (body?.kind === "withdrawal") {
            const { reviewWithdrawalRequest } = await import("@/server/wallet.functions");
            const data = await reviewWithdrawalRequest({ data: body.payload });
            return Response.json(data);
          }
          return Response.json({ error: "Unsupported kind" }, { status: 400 });
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
    },
  },
});
