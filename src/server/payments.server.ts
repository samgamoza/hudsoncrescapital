// Server-only payment provider helpers.
// All providers are OPTIONAL — code stays dormant until env vars are set.
// Required env vars when activating:
//   Stripe:  STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
//   PayPal:  PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID, PAYPAL_ENV (sandbox|live)
//   Site URL (for redirect): VITE_PUBLIC_SITE_URL  (falls back to request origin)
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type Provider = "stripe" | "paypal";

export const stripeConfigured = () => !!process.env.STRIPE_SECRET_KEY;
export const paypalConfigured = () =>
  !!process.env.PAYPAL_CLIENT_ID && !!process.env.PAYPAL_CLIENT_SECRET;

const PAYPAL_BASE = () =>
  (process.env.PAYPAL_ENV ?? "sandbox") === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

// ============== STRIPE ==============
export async function createStripeCheckoutSession(opts: {
  amount: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}) {
  const key = process.env.STRIPE_SECRET_KEY!;
  const body = new URLSearchParams();
  body.append("mode", "payment");
  body.append("payment_method_types[]", "card");
  body.append("success_url", opts.successUrl);
  body.append("cancel_url", opts.cancelUrl);
  body.append("line_items[0][price_data][currency]", opts.currency.toLowerCase());
  body.append("line_items[0][price_data][product_data][name]", "Wallet Top-Up");
  body.append("line_items[0][price_data][unit_amount]", String(Math.round(opts.amount * 100)));
  body.append("line_items[0][quantity]", "1");
  for (const [k, v] of Object.entries(opts.metadata)) {
    body.append(`metadata[${k}]`, v);
    body.append(`payment_intent_data[metadata][${k}]`, v);
  }
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const json = (await res.json()) as any;
  if (!res.ok) throw new Error(`Stripe: ${json?.error?.message ?? res.statusText}`);
  return { id: json.id as string, url: json.url as string };
}

/** Verify a Stripe webhook signature (Stripe-Signature header). */
export async function verifyStripeSignature(
  rawBody: string,
  sigHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!sigHeader) return false;
  const parts = Object.fromEntries(sigHeader.split(",").map((p) => p.split("=") as [string, string]));
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${rawBody}`));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex === v1;
}

// ============== PAYPAL ==============
async function paypalAccessToken(): Promise<string> {
  const id = process.env.PAYPAL_CLIENT_ID!;
  const secret = process.env.PAYPAL_CLIENT_SECRET!;
  const res = await fetch(`${PAYPAL_BASE()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const json = (await res.json()) as any;
  if (!res.ok) throw new Error(`PayPal auth: ${json?.error_description ?? res.statusText}`);
  return json.access_token as string;
}

export async function createPayPalOrder(opts: {
  amount: number;
  currency: string;
  returnUrl: string;
  cancelUrl: string;
  custom: string; // deposit_request_id
}) {
  const token = await paypalAccessToken();
  const res = await fetch(`${PAYPAL_BASE()}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: opts.custom,
          custom_id: opts.custom,
          amount: { currency_code: opts.currency, value: opts.amount.toFixed(2) },
          description: "Wallet top-up",
        },
      ],
      application_context: {
        brand_name: "Hudson Crest Capital",
        user_action: "PAY_NOW",
        return_url: opts.returnUrl,
        cancel_url: opts.cancelUrl,
      },
    }),
  });
  const json = (await res.json()) as any;
  if (!res.ok) throw new Error(`PayPal order: ${json?.message ?? res.statusText}`);
  const approve = (json.links ?? []).find((l: any) => l.rel === "approve")?.href as string;
  return { id: json.id as string, url: approve };
}

export async function verifyPayPalWebhook(opts: {
  headers: Headers;
  rawBody: string;
}): Promise<boolean> {
  const token = await paypalAccessToken();
  const res = await fetch(`${PAYPAL_BASE()}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      transmission_id: opts.headers.get("paypal-transmission-id"),
      transmission_time: opts.headers.get("paypal-transmission-time"),
      cert_url: opts.headers.get("paypal-cert-url"),
      auth_algo: opts.headers.get("paypal-auth-algo"),
      transmission_sig: opts.headers.get("paypal-transmission-sig"),
      webhook_id: process.env.PAYPAL_WEBHOOK_ID!,
      webhook_event: JSON.parse(opts.rawBody),
    }),
  });
  const json = (await res.json()) as any;
  return json?.verification_status === "SUCCESS";
}

// ============== Shared: credit wallet on success (idempotent) ==============
export async function creditDepositOnSuccess(opts: {
  provider: Provider;
  sessionId: string;
  paymentId?: string | null;
  eventId: string;
  eventType: string;
  payload: unknown;
}) {
  // Idempotency: skip if event already processed
  const { data: existing } = await (supabaseAdmin.from("payment_events") as any)
    .select("id, processed_at")
    .eq("provider", opts.provider)
    .eq("event_id", opts.eventId)
    .maybeSingle();
  if (existing?.processed_at) return { ok: true, idempotent: true };

  // Find the deposit request by provider + session id
  const { data: req } = await (supabaseAdmin.from("deposit_requests") as any)
    .select("*")
    .eq("payment_provider", opts.provider)
    .eq("provider_session_id", opts.sessionId)
    .maybeSingle();

  // Record the event regardless (so audit is complete)
  await (supabaseAdmin.from("payment_events") as any).insert({
    provider: opts.provider,
    event_id: opts.eventId,
    event_type: opts.eventType,
    deposit_request_id: req?.id ?? null,
    payload: opts.payload as any,
  });

  if (!req) return { ok: false, reason: "deposit_request not found" };
  if (req.status !== "pending") {
    await (supabaseAdmin.from("payment_events") as any)
      .update({ processed_at: new Date().toISOString() })
      .eq("provider", opts.provider)
      .eq("event_id", opts.eventId);
    return { ok: true, idempotent: true };
  }

  // Look up wallet, post credit, mark request approved
  const { data: wallet } = await (supabaseAdmin.from("wallets") as any)
    .select("id, available_balance, currency, user_id")
    .eq("account_id", req.account_id)
    .single();
  if (!wallet) throw new Error("Wallet not found for deposit");

  const newBalance = Number(wallet.available_balance) + Number(req.amount);
  await (supabaseAdmin.from("wallet_transactions") as any).insert({
    wallet_id: wallet.id,
    user_id: wallet.user_id,
    txn_type: "deposit",
    amount: Number(req.amount),
    currency: wallet.currency,
    balance_after: newBalance,
    description: `${opts.provider} deposit (${opts.sessionId})`,
    reference_id: req.id,
    reference_type: "deposit_request",
    posted_by: null,
  });
  await (supabaseAdmin.from("wallets") as any)
    .update({ available_balance: newBalance })
    .eq("id", wallet.id);
  await (supabaseAdmin.from("deposit_requests") as any)
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      review_notes: `Auto-approved via ${opts.provider} webhook`,
      provider_payment_id: opts.paymentId ?? null,
    })
    .eq("id", req.id);
  await (supabaseAdmin.from("payment_events") as any)
    .update({ processed_at: new Date().toISOString() })
    .eq("provider", opts.provider)
    .eq("event_id", opts.eventId);

  await (supabaseAdmin.from("audit_logs") as any).insert({
    actor_id: null,
    actor_role: "system",
    action: `deposit.request.auto_approve`,
    target_type: "deposit_request",
    target_id: req.id,
    target_user_id: req.user_id,
    payload: { provider: opts.provider, session: opts.sessionId, amount: req.amount },
  });

  return { ok: true };
}
