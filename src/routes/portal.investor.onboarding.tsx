import { createFileRoute, Link } from "@tanstack/react-router";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader, SectionCard } from "@/lib/portalShared";
import { isValidE164 } from "@/lib/countries";
import {
  defaultInvestorLiteValues,
  InvestorLiteOnboardingFields,
  type InvestorLitePayload,
} from "@/components/portal/InvestorLiteOnboardingFields";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/portal/investor/onboarding")({
  head: () => ({
    meta: [
      { title: "Complete onboarding | Hudson Crest Capital" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvestorOnboardingPage,
});

function InvestorOnboardingPage() {
  const [lite, setLite] = useState<InvestorLitePayload>(() => defaultInvestorLiteValues());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/portal/profile");
        if (!res.ok) throw new Error(`Failed to load profile (${res.status})`);
        const data = (await res.json()) as {
          profile: {
            legal_first_name?: string | null;
            legal_last_name?: string | null;
            phone?: string | null;
            country_of_residence?: string | null;
            nationality?: string | null;
          } | null;
          accounts?: Array<{ metadata?: Record<string, unknown> | null }>;
        };
        const p = data.profile;
        const meta = data.accounts?.[0]?.metadata as
          | {
              onboarding_lite?: {
                employment_status?: string;
                investment_experience?: string;
                investor_background?: string | null;
                investment_goals?: string;
                investment_goal_tags?: string[];
              };
            }
          | undefined;
        const ol = meta?.onboarding_lite;
        setLite({
          legal_first_name: p?.legal_first_name ?? "",
          legal_last_name: p?.legal_last_name ?? "",
          phone: p?.phone ?? "",
          country_of_residence: p?.country_of_residence ?? "",
          nationality: p?.nationality ?? "",
          employment_status: (ol?.employment_status ??
            "") as InvestorLitePayload["employment_status"],
          investment_experience: (ol?.investment_experience ??
            "") as InvestorLitePayload["investment_experience"],
          investor_background: ol?.investor_background ?? "",
          investment_goals: ol?.investment_goals ?? "",
          investment_goal_tags: Array.isArray(ol?.investment_goal_tags)
            ? ol!.investment_goal_tags!
            : [],
          base_currency: "USD",
        });
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Could not load your profile");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (!lite.country_of_residence) throw new Error("Country of residence is required.");
      if (!lite.nationality) throw new Error("Nationality is required.");
      if (!lite.phone || !isValidE164(lite.phone))
        throw new Error("A valid international phone number is required.");
      const payload = {
        legal_first_name: lite.legal_first_name.trim(),
        legal_last_name: lite.legal_last_name.trim(),
        phone: lite.phone.trim(),
        country_of_residence: lite.country_of_residence,
        nationality: lite.nationality,
        employment_status: lite.employment_status || undefined,
        investment_experience: lite.investment_experience || undefined,
        investor_background: lite.investor_background.trim() || undefined,
        investment_goals: lite.investment_goals.trim() || undefined,
        investment_goal_tags:
          lite.investment_goal_tags.length > 0 ? lite.investment_goal_tags : undefined,
        base_currency: lite.base_currency,
      };

      const res = await fetch("/api/portal/investor-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? `Save failed (${res.status})`);

      toast.success("Profile submitted. Welcome to your portal.");
      window.location.replace("/portal/investor");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground py-12 text-center">Loading onboarding…</div>
    );
  }

  return (
    <>
      <PageHeader
        title="Complete your profile"
        subtitle="Tell us about yourself and your investment objectives so we can review your account application."
      />
      <SectionCard title="Investor onboarding">
        <p className="text-sm text-muted-foreground mb-6">
          This short form replaces the full paper style application for self serve signup. You will
          still complete identity verification (KYC) separately when prompted.
        </p>
        <InvestorLiteOnboardingFields
          values={lite}
          onChange={setLite}
          disabled={busy}
          formId="investor-lite-onboarding"
          onSubmit={submit}
          submitLabel="Submit profile"
          busy={busy}
        />
        <Link
          to="/portal/investor"
          className="inline-block mt-6 text-xs text-muted-foreground hover:text-foreground"
        >
          ← Back to dashboard
        </Link>
      </SectionCard>
      <Toaster />
    </>
  );
}
