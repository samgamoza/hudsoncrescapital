import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { audit } from "./_shared.server";

/** Plain impl for `/api/` routes (no server-fn resolution). */
export async function getPaymentProvidersForApi() {
  const { stripeConfigured, paypalConfigured } = await import("./payments.server");
  return { stripe: stripeConfigured(), paypal: paypalConfigured() };
}

/** Returns which payment providers are wired and ready. UI uses this to show/hide buttons. */
export const getPaymentProviders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(() => getPaymentProvidersForApi());

const StartInput = z.object({
  accountId: z.string().uuid(),
  amount: z.number().positive().max(1_000_000),
  provider: z.enum(["stripe", "paypal"]),
  origin: z.string().url(),
});

export async function startHostedDepositForApi(userId: string, raw: unknown) {
  const data = StartInput.parse(raw);
  const allowedOrigin = String(process.env.PUBLIC_APP_ORIGIN ?? "").trim();
  if (allowedOrigin && data.origin !== allowedOrigin) {
    throw new Error("Invalid origin");
  }

  const { stripeConfigured, paypalConfigured, createStripeCheckoutSession, createPayPalOrder } =
    await import("./payments.server");
  if (data.provider === "stripe" && !stripeConfigured())
    throw new Error("Stripe is not configured. Add STRIPE_SECRET_KEY to enable.");
  if (data.provider === "paypal" && !paypalConfigured())
    throw new Error("PayPal is not configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.");

  const { data: acct } = await supabaseAdmin
    .from("accounts")
    .select("id, user_id, status, base_currency")
    .eq("id", data.accountId)
    .single();
  if (!acct || acct.user_id !== userId) throw new Error("Account not found");
  if (acct.status !== "active") throw new Error("Account is not active");

  const { data: req, error } = await (supabaseAdmin.from("deposit_requests") as any)
    .insert({
      user_id: userId,
      account_id: data.accountId,
      amount: data.amount,
      currency: acct.base_currency,
      method: data.provider,
      payment_provider: data.provider,
      notes: `Hosted ${data.provider} top-up`,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  const success = `${data.origin}/portal/investor/wallet?deposit=success`;
  const cancel = `${data.origin}/portal/investor/wallet?deposit=cancel`;
  let sessionId = "";
  let url = "";
  if (data.provider === "stripe") {
    const s = await createStripeCheckoutSession({
      amount: data.amount,
      currency: acct.base_currency,
      successUrl: success,
      cancelUrl: cancel,
      metadata: { deposit_request_id: req.id, user_id: userId },
    });
    sessionId = s.id;
    url = s.url;
  } else {
    const o = await createPayPalOrder({
      amount: data.amount,
      currency: acct.base_currency,
      returnUrl: success,
      cancelUrl: cancel,
      custom: req.id,
    });
    sessionId = o.id;
    url = o.url;
  }

  await (supabaseAdmin.from("deposit_requests") as any)
    .update({ provider_session_id: sessionId })
    .eq("id", req.id);

  await audit({
    actorId: userId,
    action: `deposit.${data.provider}.session.created`,
    targetType: "deposit_request",
    targetId: req.id,
    targetUserId: userId,
    payload: { amount: data.amount, sessionId },
  });

  return { url, sessionId, requestId: req.id };
}

export const startHostedDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => StartInput.parse(d))
  .handler(({ context, data }) => startHostedDepositForApi(context.userId, data));
