import { createFileRoute } from "@tanstack/react-router";
import { apiErrorResponse, readJsonBody } from "../-_utils";

export const Route = createFileRoute("/api/portal/wallet-actions")({
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
      POST: async ({ request }) => {
        try {
          const body = await readJsonBody<{ action?: string; payload?: Record<string, unknown> }>(request);
          if (body?.action === "deposit") {
            const { submitDepositRequest } = await import("@/server/wallet.functions");
            return Response.json(await submitDepositRequest({ data: body.payload }));
          }
          if (body?.action === "withdraw") {
            const { submitWithdrawalRequest } = await import("@/server/wallet.functions");
            return Response.json(await submitWithdrawalRequest({ data: body.payload }));
          }
          if (body?.action === "cancel") {
            const { cancelMyRequest } = await import("@/server/wallet.functions");
            return Response.json(await cancelMyRequest({ data: body.payload }));
          }
          if (body?.action === "providers") {
            const { getPaymentProviders } = await import("@/server/payments.functions");
            return Response.json(await getPaymentProviders());
          }
          if (body?.action === "hosted-deposit") {
            const { startHostedDeposit } = await import("@/server/payments.functions");
            const origin = new URL(request.url).origin;
            return Response.json(
              await startHostedDeposit({
                data: { ...(body.payload ?? {}), origin },
              }),
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
