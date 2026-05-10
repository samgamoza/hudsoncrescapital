import { createFileRoute, Link } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ensurePortalRole, formatPortalAuthError, resolvePortalRedirect } from "@/lib/portal-auth";
import { isValidE164 } from "@/lib/countries";
import logo from "@/assets/logo.png";
import {
  defaultInvestorLiteValues,
  InvestorLiteOnboardingFields,
  type InvestorLitePayload,
} from "@/components/portal/InvestorLiteOnboardingFields";

function getPublicAppOrigin() {
  const configured = import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined;
  if (configured) return configured.replace(/\/+$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

function getEmailDomain(email: string): string {
  const idx = email.lastIndexOf("@");
  return idx >= 0
    ? email
        .slice(idx + 1)
        .toLowerCase()
        .trim()
    : "";
}

function getReservedStaffDomains(): string[] {
  const raw = (import.meta.env.VITE_STAFF_RESERVED_EMAIL_DOMAINS as string | undefined) ?? "";
  return raw
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

function isStrictAccountSeparationEnabled(): boolean {
  const raw =
    (import.meta.env.VITE_ENFORCE_STRICT_ACCOUNT_SEPARATION as string | undefined) ?? "false";
  return raw.trim().toLowerCase() === "true";
}

export const Route = createFileRoute("/portal/signup_/investor")({
  head: () => ({
    meta: [
      { title: "Sign up — Hudson Crest Capital" },
      { name: "description", content: "Create an investor account and complete onboarding." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvestorSignupPage,
});

function InvestorSignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lite, setLite] = useState<InvestorLitePayload>(() => defaultInvestorLiteValues());
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const loginEmail = email.trim();
      if (!loginEmail.includes("@")) throw new Error("Enter a valid email address.");
      if (!lite.legal_first_name.trim() || !lite.legal_last_name.trim())
        throw new Error("First and last name are required.");
      if (!lite.country_of_residence) throw new Error("Country of residence is required.");
      if (!lite.nationality) throw new Error("Nationality is required.");
      if (!lite.phone || !isValidE164(lite.phone))
        throw new Error("A valid international phone number is required.");
      if (lite.investment_goals.trim().length < 20)
        throw new Error("Investment goals must be at least 20 characters.");

      if (isStrictAccountSeparationEnabled()) {
        const reserved = getReservedStaffDomains();
        const domain = getEmailDomain(loginEmail);
        if (domain && reserved.includes(domain)) {
          throw new Error(
            "This email domain is reserved for staff/admin accounts. Please use a personal investor email instead.",
          );
        }
      }

      const appOrigin = getPublicAppOrigin();
      const { data: signUpData, error: signErr } = await supabase.auth.signUp({
        email: loginEmail,
        password,
        options: {
          emailRedirectTo: `${appOrigin}/portal/login/investor`,
          data: {
            legal_first_name: lite.legal_first_name.trim(),
            legal_last_name: lite.legal_last_name.trim(),
            display_name: `${lite.legal_first_name.trim()} ${lite.legal_last_name.trim()}`,
            phone: lite.phone.trim(),
            country_of_residence: lite.country_of_residence,
            nationality: lite.nationality,
          },
        },
      });
      if (signErr) throw signErr;

      if (!signUpData.session) {
        setInfo("Account created. Redirecting you to login to verify your email status…");
        const verifyPath = `/portal/login/investor?verify=required&email=${encodeURIComponent(loginEmail)}`;
        window.setTimeout(() => window.location.replace(verifyPath), 700);
        return;
      }

      const payload = {
        legal_first_name: lite.legal_first_name.trim(),
        legal_last_name: lite.legal_last_name.trim(),
        phone: lite.phone.trim(),
        country_of_residence: lite.country_of_residence,
        nationality: lite.nationality,
        employment_status: lite.employment_status,
        investment_experience: lite.investment_experience,
        investor_background: lite.investor_background.trim() || undefined,
        investment_goals: lite.investment_goals.trim(),
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
      if (!res.ok) throw new Error(body?.error ?? `Onboarding failed (${res.status})`);

      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session?.user) {
        setInfo("Signed up but session expired. Please sign in to finish onboarding.");
        return;
      }
      const role = await ensurePortalRole(supabase as any, sess.session.user.id);
      const target = resolvePortalRedirect(role, "/portal/investor");
      setInfo("Account ready. Redirecting…");
      window.setTimeout(() => window.location.replace(target), 600);
    } catch (err: unknown) {
      setError(formatPortalAuthError(err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background grid-bg flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg surface-card p-8 shadow-elevated">
        <Link to="/" className="flex items-center justify-center mb-6">
          <img src={logo} alt="Hudson Crest Capital" className="h-12 w-auto" />
        </Link>
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-brand">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          Investor signup
        </div>
        <h1 className="text-2xl font-semibold text-foreground">Create your account</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Basic profile, background, and investment goals. You can add verification documents later
          in the portal.
        </p>

        <InvestorLiteOnboardingFields
          values={lite}
          onChange={setLite}
          disabled={busy}
          formId="investor-lite-signup"
          onSubmit={submit}
          submitLabel="Create account"
          busy={busy}
          top={
            <>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Email</label>
                <input
                  form="investor-lite-signup"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-foreground"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Password
                </label>
                <input
                  form="investor-lite-signup"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-foreground"
                  placeholder="••••••••"
                />
              </div>
            </>
          }
        />

        {error && (
          <div className="mt-4 text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded-md px-3 py-2">
            {error}
          </div>
        )}
        {info && (
          <div className="mt-4 text-sm text-foreground border border-border bg-surface rounded-md px-3 py-2">
            {info}
          </div>
        )}

        <div className="mt-8 pt-4 border-t border-border flex flex-col gap-2 text-xs text-muted-foreground">
          <Link to="/portal/login/investor" className="hover:text-foreground">
            Already have an account? Sign in →
          </Link>
          <Link to="/" className="hover:text-foreground">
            ← Back to website
          </Link>
        </div>
      </div>
    </div>
  );
}
