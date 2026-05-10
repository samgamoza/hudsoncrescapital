import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/paypal-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!process.env.PAYPAL_WEBHOOK_ID) return new Response("not configured", { status: 503 });
        const { creditDepositOnSuccess, verifyPayPalWebhook } = await import(
          "@/server/payments.server"
        );
        const raw = await request.text();
        const ok = await verifyPayPalWebhook({ headers: request.headers, rawBody: raw });
        if (!ok) return new Response("invalid signature", { status: 401 });

        const event = JSON.parse(raw);
        if (
          event.event_type === "CHECKOUT.ORDER.APPROVED" ||
          event.event_type === "PAYMENT.CAPTURE.COMPLETED" ||
          event.event_type === "CHECKOUT.ORDER.COMPLETED"
        ) {
          const resource = event.resource ?? {};
          const sessionId =
            resource.supplementary_data?.related_ids?.order_id ??
            resource.id ??
            resource.order_id ??
            "";
          const paymentId = resource.id ?? null;
          await creditDepositOnSuccess({
            provider: "paypal",
            sessionId,
            paymentId,
            eventId: event.id,
            eventType: event.event_type,
            payload: event,
          });
        }
        return new Response("ok");
      },
    },
  },
});
