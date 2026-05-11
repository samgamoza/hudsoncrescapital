import { createFileRoute } from "@tanstack/react-router";
import { requireUserIdFromRequest } from "@/server/request-auth";
import { apiErrorResponse, readJsonBody } from "../-_utils";

export const Route = createFileRoute("/api/portal/wallet-actions")({
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
      POST: async ({ request }) => {
        try {
          const userId = await requireUserIdFromRequest(request);
          const body = await readJsonBody<{ action?: string; payload?: Record<string, unknown> }>(request);
          if (body?.action === "deposit") {
            const { submitDepositRequestForApi } = await import("@/server/wallet.functions");
            return Response.json(await submitDepositRequestForApi(userId, body.payload));
          }
          if (body?.action === "withdraw") {
            const { submitWithdrawalRequestForApi } = await import("@/server/wallet.functions");
            return Response.json(await submitWithdrawalRequestForApi(userId, body.payload));
          }
          if (body?.action === "cancel") {
            const { cancelMyRequestForApi } = await import("@/server/wallet.functions");
            return Response.json(await cancelMyRequestForApi(userId, body.payload));
          }
          if (body?.action === "providers") {
            const { getPaymentProvidersForApi } = await import("@/server/payments.functions");
            return Response.json(await getPaymentProvidersForApi());
          }
          if (body?.action === "hosted-deposit") {
            const { startHostedDepositForApi } = await import("@/server/payments.functions");
            const origin = new URL(request.url).origin;
            return Response.json(
              await startHostedDepositForApi(userId, { ...(body.payload ?? {}), origin }),
            );
          }
          return Response.json({ error: "Unsupported action" }, { status: 400 });
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
    },
  },
});
