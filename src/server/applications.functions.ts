import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/* ------------------------------------------------------------------ */
/* Signup bootstrap                                                   */
/* ------------------------------------------------------------------ */

/**
 * Minimal payload captured during the new self-serve signup flow. Email +
 * password are handled directly by Supabase auth; the rest is forwarded here
 * via user_metadata so a stub `profiles` row exists from day one with
 * status='incomplete'. Anything else lives behind the in-portal profile-
 * completion wizard so the signup screen stays single-step.
 */
export const signupBootstrapSchema = z.object({
  legal_first_name: z.string().trim().min(1).max(100),
  legal_last_name: z.string().trim().min(1).max(100),
  country_of_residence: z.string().trim().length(2),
  phone: z.string().trim().min(5).max(40),
  agreed_terms: z.literal(true),
  agreed_risk: z.literal(true),
});
export type SignupBootstrapPayload = z.infer<typeof signupBootstrapSchema>;

/**
 * Create (or refresh) the stub investor profile + pending brokerage account
 * for the current user, using only the basic identity fields collected at
 * signup. Idempotent: if a profile row already exists we keep its status.
 */
export const bootstrapInvestorProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => signupBootstrapSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { audit } = await import("./_shared.server");
    const { userId } = context;

    const country = data.country_of_residence.toUpperCase();
    const now = new Date().toISOString();

    const { data: existing, error: lookupErr } = await supabaseAdmin
      .from("profiles")
      .select("user_id, status, metadata")
      .eq("user_id", userId)
      .maybeSingle();
    if (lookupErr) throw new Error(lookupErr.message);

    const prevMeta =
      existing?.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata)
        ? (existing.metadata as Record<string, unknown>)
        : {};

    const { error: profErr } = await (supabaseAdmin.from("profiles") as any).upsert(
      {
        user_id: userId,
        legal_first_name: data.legal_first_name,
        legal_last_name: data.legal_last_name,
        display_name: `${data.legal_first_name} ${data.legal_last_name}`.trim(),
        phone: data.phone,
        country_of_residence: country,
        status: existing?.status === "submitted" || existing?.status === "verified"
          ? existing.status
          : "incomplete",
        metadata: {
          ...prevMeta,
          agreed_terms_at: prevMeta.agreed_terms_at ?? now,
          agreed_risk_at: prevMeta.agreed_risk_at ?? now,
          signup_bootstrapped_at: prevMeta.signup_bootstrapped_at ?? now,
        },
      },
      { onConflict: "user_id" },
    );
    if (profErr) throw new Error(`Profile bootstrap failed: ${profErr.message}`);

    // Ensure exactly one pending brokerage account exists so the in-portal
    // wizard has something to attach metadata to. Re-use the most recent one
    // if signup was retried.
    const { data: accounts, error: accountsErr } = await supabaseAdmin
      .from("accounts")
      .select("id, status, account_number, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (accountsErr) throw new Error(accountsErr.message);

    let primaryId: string | null =
      (accounts ?? []).find((a) => a.status === "pending")?.id ??
      (accounts ?? []).find((a) => a.status === "active")?.id ??
      null;

    if (!primaryId) {
      const acctNumber = `HCC-${Date.now().toString(36).toUpperCase()}-${Math.random()
        .toString(36)
        .slice(2, 6)
        .toUpperCase()}`;
      const { data: acct, error: acctErr } = await (supabaseAdmin.from("accounts") as any)
        .insert({
          user_id: userId,
          account_number: acctNumber,
          account_type: "cash",
          base_currency: "USD",
          status: "pending",
          metadata: { signup_bootstrapped_at: now },
        })
        .select("id")
        .single();
      if (acctErr) throw new Error(`Account bootstrap failed: ${acctErr.message}`);
      primaryId = acct.id;

      await audit({
        actorId: userId,
        action: "account.signup_bootstrap",
        targetType: "account",
        targetId: acct.id,
        targetUserId: userId,
        payload: { account_number: acctNumber },
      });
    }

    return {
      ok: true as const,
      profileStatus:
        existing?.status === "submitted" || existing?.status === "verified"
          ? existing.status
          : "incomplete",
      accountId: primaryId,
    };
  });

/* ------------------------------------------------------------------ */
/* Profile-completion wizard (in-portal)                              */
/* ------------------------------------------------------------------ */

const tradingExperienceLevel = z.enum(["none", "limited", "experienced"]);

export const profileCompletionSchema = z.object({
  // 1. Personal — fields NOT collected at signup
  middle_name: z.string().trim().max(100).optional().default(""),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be YYYY-MM-DD"),
  country_of_citizenship: z.string().trim().length(2),
  residential_address: z.object({
    line1: z.string().trim().min(1).max(200),
    line2: z.string().trim().max(200).optional().default(""),
    city: z.string().trim().min(1).max(100),
    state_region: z.string().trim().max(100).optional().default(""),
    postal_code: z.string().trim().min(1).max(40),
    country: z.string().trim().length(2),
  }),

  // 2. Tax identification
  is_us_person: z.boolean(),
  tax_id_number: z.string().trim().min(3).max(40),
  fatca_crs_acknowledged: z.literal(true),

  // 3. Employment & financial profile
  employment_status: z.enum(["employed", "self_employed", "retired", "student", "unemployed"]),
  employer_name: z.string().trim().max(200).optional().default(""),
  occupation: z.string().trim().max(200).optional().default(""),
  annual_income: z.enum(["under_25k", "25k_50k", "50k_100k", "100k_250k", "over_250k"]),
  net_worth: z.enum(["under_50k", "50k_250k", "250k_1m", "over_1m"]),

  // 4. Investment profile
  investment_objectives: z
    .array(z.enum(["capital_growth", "income", "speculation", "hedging", "capital_preservation"]))
    .min(1, "Select at least one investment objective"),
  trading_experience: z.object({
    stocks: tradingExperienceLevel,
    etfs: tradingExperienceLevel,
    options: tradingExperienceLevel,
    forex: tradingExperienceLevel,
    crypto: tradingExperienceLevel,
  }),
  risk_tolerance: z.enum(["low", "medium", "high", "speculative"]),

  // 5. Account features requested
  account_features: z
    .array(
      z.enum([
        "cash_account",
        "margin_trading",
        "options_trading",
        "crypto_trading",
        "international_markets",
      ]),
    )
    .min(1, "Select at least one account feature"),

  // 6. Banking information (optional)
  banking: z
    .object({
      bank_name: z.string().trim().max(200).optional().default(""),
      account_holder: z.string().trim().max(200).optional().default(""),
      account_number: z.string().trim().max(80).optional().default(""),
      swift_or_routing: z.string().trim().max(40).optional().default(""),
    })
    .optional(),

  // 7. Regulatory declarations
  pep: z.boolean(),
  broker_dealer_affiliation: z.boolean(),
  insider_control_person: z.boolean(),

  // 8. CIP — acknowledgement; uploads are tracked separately in `kyc_documents`.
  cip_acknowledged: z.literal(true),
});
export type ProfileCompletionPayload = z.infer<typeof profileCompletionSchema>;

/** Submit (or update) the full in-portal profile-completion wizard. */
export const submitProfileCompletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => profileCompletionSchema.parse(d))
  .handler(async ({ context, data }) => submitProfileCompletionForApi(context.userId, data));

export async function submitProfileCompletionForApi(userId: string, raw: unknown) {
  const data = profileCompletionSchema.parse(raw);
  const { audit } = await import("./_shared.server");
  const now = new Date().toISOString();

  // Promote anything that has a dedicated `profiles` column. The free-form
  // remainder lives on the account row to keep the profile schema stable.
  const taxLast4 = data.tax_id_number.replace(/\D/g, "").slice(-4) || null;

  const { error: profErr } = await (supabaseAdmin.from("profiles") as any).upsert(
    {
      user_id: userId,
      date_of_birth: data.date_of_birth,
      nationality: data.country_of_citizenship.toUpperCase(),
      tax_id_last4: taxLast4,
      status: "submitted",
    },
    { onConflict: "user_id" },
  );
  if (profErr) throw new Error(`Profile save failed: ${profErr.message}`);

  // Locate the user's pending or active account. bootstrapInvestorProfile
  // guarantees one exists, but signup-time edge-cases (skipped bootstrap, race
  // conditions, admin-imported users) mean we should still self-heal.
  const { data: accounts, error: listErr } = await supabaseAdmin
    .from("accounts")
    .select("id, status, account_number, metadata")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (listErr) throw new Error(listErr.message);

  const target =
    (accounts ?? []).find((a) => a.status === "pending") ??
    (accounts ?? []).find((a) => a.status === "active") ??
    (accounts ?? [])[0] ??
    null;

  // Build the wizard payload sans the redundant TIN; the full number never
  // round-trips through our metadata, only the last-4 we keep on profiles.
  const { tax_id_number: _omit, ...sanitized } = data;
  void _omit;

  const profileCompletionMetadata = {
    ...sanitized,
    submitted_at: now,
  };

  if (!target) {
    const acctNumber = `HCC-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`;
    const { data: created, error: createErr } = await (supabaseAdmin.from("accounts") as any)
      .insert({
        user_id: userId,
        account_number: acctNumber,
        account_type: "cash",
        base_currency: "USD",
        status: "pending",
        metadata: {
          address: data.residential_address,
          profile_completion: profileCompletionMetadata,
          submitted_at: now,
        },
      })
      .select("id, account_number")
      .single();
    if (createErr) throw new Error(`Application failed: ${createErr.message}`);
    await audit({
      actorId: userId,
      action: "profile.completion.submit",
      targetType: "account",
      targetId: created.id,
      targetUserId: userId,
      payload: { account_number: created.account_number },
    });
    return {
      ok: true as const,
      accountId: created.id,
      accountNumber: created.account_number,
      merged: false as const,
    };
  }

  const prevMeta =
    target.metadata && typeof target.metadata === "object" && !Array.isArray(target.metadata)
      ? (target.metadata as Record<string, unknown>)
      : {};

  const { error: updErr } = await (supabaseAdmin.from("accounts") as any)
    .update({
      metadata: {
        ...prevMeta,
        address: data.residential_address,
        profile_completion: profileCompletionMetadata,
        profile_completion_updated_at: now,
      },
      updated_at: now,
    })
    .eq("id", target.id);
  if (updErr) throw new Error(`Application update failed: ${updErr.message}`);

  await audit({
    actorId: userId,
    action: "profile.completion.submit",
    targetType: "account",
    targetId: target.id,
    targetUserId: userId,
    payload: { account_number: target.account_number },
  });

  return {
    ok: true as const,
    accountId: target.id as string,
    accountNumber: target.account_number as string,
    merged: Boolean(prevMeta.profile_completion),
  };
}

/* ------------------------------------------------------------------ */
/* Status + reminder modal helpers                                    */
/* ------------------------------------------------------------------ */

export type PortalProfileSummary = {
  /** `incomplete` | `submitted` | `verified` | other free-form values. */
  status: string;
  /** ISO timestamp the user dismissed the completion modal, or null. */
  modalSeenAt: string | null;
  /** Whether the user has at least one brokerage account row. */
  hasAccount: boolean;
};

/** Compact summary used by the portal layout to drive modal/banner/gate UX. */
export const getPortalProfileSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PortalProfileSummary> => {
    const { userId } = context;
    const [profileQ, accountsQ] = await Promise.all([
      supabaseAdmin.from("profiles").select("status, metadata").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("accounts").select("id").eq("user_id", userId).limit(1),
    ]);
    const meta =
      profileQ.data?.metadata && typeof profileQ.data.metadata === "object" && !Array.isArray(profileQ.data.metadata)
        ? (profileQ.data.metadata as Record<string, unknown>)
        : {};
    const seenRaw = meta.completion_modal_seen_at;
    return {
      status: profileQ.data?.status ?? "incomplete",
      modalSeenAt: typeof seenRaw === "string" && seenRaw.length > 0 ? seenRaw : null,
      hasAccount: (accountsQ.data ?? []).length > 0,
    };
  });

/** Persist the "user has acknowledged the completion reminder" flag. */
export const markProfileCompletionModalSeen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: existing, error: readErr } = await supabaseAdmin
      .from("profiles")
      .select("metadata")
      .eq("user_id", userId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);

    const prev =
      existing?.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata)
        ? (existing.metadata as Record<string, unknown>)
        : {};
    const next = { ...prev, completion_modal_seen_at: new Date().toISOString() };

    const { error: updErr } = await (supabaseAdmin.from("profiles") as any).upsert(
      { user_id: userId, metadata: next },
      { onConflict: "user_id" },
    );
    if (updErr) throw new Error(updErr.message);
    return { ok: true as const };
  });

/* ------------------------------------------------------------------ */
/* Application context — read for the wizard + admin tooling          */
/* ------------------------------------------------------------------ */

export async function getAccountApplicationContextForApi(userId: string) {
  const { data: rows, error } = await supabaseAdmin
    .from("accounts")
    .select("id, account_number, status, account_type, base_currency, created_at, metadata")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return { accounts: rows ?? [] };
}

export const getMyApplicationStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const [accountsQ, profileQ, kycQ] = await Promise.all([
      supabaseAdmin
        .from("accounts")
        .select(
          "id, account_number, status, account_type, base_currency, created_at, opened_at, suspension_reason, metadata",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("kyc_documents").select("doc_type, status").eq("user_id", userId),
    ]);
    return {
      accounts: accountsQ.data ?? [],
      profile: profileQ.data,
      kycDocs: kycQ.data ?? [],
    };
  });
