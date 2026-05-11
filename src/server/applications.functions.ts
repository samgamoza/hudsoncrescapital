import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const financialProfileSchema = z.object({
  employment_status: z.enum([
    "employed",
    "self_employed",
    "retired",
    "student",
    "unemployed",
    "other",
  ]),
  employer: z.string().trim().max(200).optional(),
  occupation: z.string().trim().max(200).optional(),
  annual_income: z.enum(["under_50k", "50k_100k", "100k_250k", "250k_500k", "500k_1m", "over_1m"]),
  net_worth: z.enum(["under_50k", "50k_250k", "250k_1m", "1m_5m", "over_5m"]),
  source_of_funds: z.enum([
    "employment",
    "savings",
    "investments",
    "inheritance",
    "business",
    "other",
  ]),
  investment_experience: z.enum(["none", "limited", "moderate", "extensive"]),
  risk_tolerance: z.enum(["conservative", "moderate", "aggressive"]),
  investment_objectives: z.array(z.string().max(50)).max(10).default([]),
});

const applySchema = z.object({
  // Personal (also written into profiles table)
  legal_first_name: z.string().trim().min(1).max(100),
  legal_last_name: z.string().trim().min(1).max(100),
  date_of_birth: z.string().min(8).max(20),
  phone: z.string().trim().min(5).max(40),
  country_of_residence: z.string().trim().length(2),
  nationality: z.string().trim().length(2),
  // Account
  account_type: z.enum(["cash", "margin"]).default("cash"),
  base_currency: z.enum(["USD", "EUR", "GBP"]).default("USD"),
  // Financial profile (stored in accounts.metadata)
  financial: financialProfileSchema,
  // Acknowledgements
  agreed_terms: z.literal(true),
  agreed_risk: z.literal(true),
});

export const submitAccountApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => applySchema.parse(d))
  .handler(async ({ context, data }) => {
    const { audit } = await import("./_shared.server");
    const { userId } = context;

    // 1. Upsert profile fields
    const { error: profErr } = await supabaseAdmin.from("profiles").upsert(
      {
        user_id: userId,
        legal_first_name: data.legal_first_name,
        legal_last_name: data.legal_last_name,
        date_of_birth: data.date_of_birth,
        phone: data.phone,
        country_of_residence: data.country_of_residence.toUpperCase(),
        nationality: data.nationality.toUpperCase(),
        status: "submitted",
      },
      { onConflict: "user_id" },
    );
    if (profErr) throw new Error(`Profile save failed: ${profErr.message}`);

    // 2. Generate a human-readable account number
    const acctNumber = `HCC-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`;

    // 3. Insert pending account
    const { data: acct, error: acctErr } = await (supabaseAdmin.from("accounts") as any)
      .insert({
        user_id: userId,
        account_number: acctNumber,
        account_type: data.account_type,
        base_currency: data.base_currency,
        status: "pending",
        metadata: {
          financial: data.financial,
          acknowledgements: {
            agreed_terms_at: new Date().toISOString(),
            agreed_risk_at: new Date().toISOString(),
          },
          submitted_at: new Date().toISOString(),
        },
      })
      .select()
      .single();
    if (acctErr) throw new Error(`Application failed: ${acctErr.message}`);

    await audit({
      actorId: userId,
      action: "account.application.submit",
      targetType: "account",
      targetId: acct.id,
      targetUserId: userId,
      payload: { account_number: acctNumber, account_type: data.account_type },
    });

    return { ok: true, accountId: acct.id, accountNumber: acctNumber };
  });

export const getMyApplicationStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const [accountsQ, profileQ, kycQ] = await Promise.all([
      supabaseAdmin
        .from("accounts")
        .select(
          "id, account_number, status, account_type, base_currency, created_at, opened_at, suspension_reason",
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

const goalTagSchema = z.enum([
  "growth",
  "income",
  "capital_preservation",
  "speculation",
  "hedging",
  "diversification",
]);

export const investorOnboardingLiteSchema = z.object({
  legal_first_name: z.string().trim().min(1).max(100),
  legal_last_name: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(5).max(40),
  country_of_residence: z.string().trim().length(2),
  nationality: z.string().trim().length(2),
  employment_status: z
    .enum(["employed", "self_employed", "retired", "student", "unemployed", "other"])
    .optional(),
  investment_experience: z.enum(["none", "limited", "moderate", "extensive"]).optional(),
  investor_background: z.string().trim().max(2000).optional(),
  investment_goals: z.string().trim().max(4000).optional(),
  investment_goal_tags: z.array(goalTagSchema).max(8).optional(),
  base_currency: z.enum(["USD", "EUR", "GBP"]).default("USD"),
});

/** Investor self-serve signup: basic profile + background + goals (no full financial/KYC form). */
export const submitInvestorOnboardingLite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => investorOnboardingLiteSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { audit } = await import("./_shared.server");
    const { userId } = context;

    const { error: profErr } = await supabaseAdmin.from("profiles").upsert(
      {
        user_id: userId,
        legal_first_name: data.legal_first_name,
        legal_last_name: data.legal_last_name,
        phone: data.phone,
        country_of_residence: data.country_of_residence.toUpperCase(),
        nationality: data.nationality.toUpperCase(),
        display_name: `${data.legal_first_name} ${data.legal_last_name}`,
        status: "submitted",
      },
      { onConflict: "user_id" },
    );
    if (profErr) throw new Error(`Profile save failed: ${profErr.message}`);

    const onboardingLite = {
      employment_status: data.employment_status ?? null,
      investment_experience: data.investment_experience ?? null,
      investor_background: data.investor_background?.trim()
        ? data.investor_background.trim()
        : null,
      investment_goals: data.investment_goals?.trim() ? data.investment_goals.trim() : null,
      investment_goal_tags: data.investment_goal_tags ?? [],
      completed_at: new Date().toISOString(),
    };

    const { data: existingAccounts, error: listErr } = await supabaseAdmin
      .from("accounts")
      .select("id, account_number, metadata, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (listErr) throw new Error(listErr.message);

    if (!existingAccounts?.length) {
      const acctNumber = `HCC-${Date.now().toString(36).toUpperCase()}-${Math.random()
        .toString(36)
        .slice(2, 6)
        .toUpperCase()}`;

      const { data: acct, error: acctErr } = await (supabaseAdmin.from("accounts") as any)
        .insert({
          user_id: userId,
          account_number: acctNumber,
          account_type: "cash",
          base_currency: data.base_currency,
          status: "pending",
          metadata: {
            onboarding_lite: onboardingLite,
            submitted_at: new Date().toISOString(),
          },
        })
        .select()
        .single();

      if (acctErr) throw new Error(`Account creation failed: ${acctErr.message}`);

      await audit({
        actorId: userId,
        action: "account.onboarding_lite.submit",
        targetType: "account",
        targetId: acct.id,
        targetUserId: userId,
        payload: { account_number: acctNumber },
      });

      return { ok: true as const, accountId: acct.id, accountNumber: acct.account_number };
    }

    const target = existingAccounts[0];
    const prevMeta =
      target.metadata && typeof target.metadata === "object" && !Array.isArray(target.metadata)
        ? (target.metadata as Record<string, unknown>)
        : {};

    const { error: updErr } = await (supabaseAdmin.from("accounts") as any)
      .update({
        metadata: {
          ...prevMeta,
          onboarding_lite: onboardingLite,
          onboarding_lite_updated_at: new Date().toISOString(),
        },
      })
      .eq("id", target.id);

    if (updErr) throw new Error(`Account update failed: ${updErr.message}`);

    await audit({
      actorId: userId,
      action: "account.onboarding_lite.update",
      targetType: "account",
      targetId: target.id,
      targetUserId: userId,
      payload: {},
    });

    return {
      ok: true as const,
      accountId: target.id,
      accountNumber: target.account_number ?? null,
    };
  });

export const getInvestorOnboardingState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle();
    return {
      needsOnboarding: profile?.status === "incomplete",
      profileStatus: profile?.status ?? null,
    };
  });
