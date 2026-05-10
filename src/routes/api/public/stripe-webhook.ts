import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secret) return new Response("not configured", { status: 503 });
        const { creditDepositOnSuccess, verifyStripeSignature } = await import(
          "@/server/payments.server"
        );
        const raw = await request.text();
        const ok = await verifyStripeSignature(raw, request.headers.get("stripe-signature"), secret);
        if (!ok) return new Response("invalid signature", { status: 401 });

        const event = JSON.parse(raw);
        if (event.type === "checkout.session.completed") {
          const s = event.data.object;
          if (s.payment_status === "paid") {
            await creditDepositOnSuccess({
              provider: "stripe",
              sessionId: s.id,
              paymentId: s.payment_intent ?? null,
              eventId: event.id,
              eventType: event.type,
              payload: event,
            });
          }
        }
        return new Response("ok");
      },
    },
  },
});
