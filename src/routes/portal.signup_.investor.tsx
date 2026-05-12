import { createFileRoute, Link } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { Check, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensurePortalRole, formatPortalAuthError, resolvePortalRedirect } from "@/lib/portal-auth";
import { getMarketingWebsiteHomeUrl, getPublicAppOrigin } from "@/lib/site-origin";
import { isValidE164 } from "@/lib/countries";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import {
  defaultInvestorLiteValues,
  InvestorLiteOnboardingFields,
  type InvestorLitePayload,
} from "@/components/portal/InvestorLiteOnboardingFields";
import {
  INVESTOR_BACKGROUND_OPTIONS,
  INVESTMENT_OUTCOME_OPTIONS,
  INVESTOR_GOAL_OPTIONS,
  serializeInvestorLiteSelections,
} from "@/lib/investor-lite-goals";

const FORM_ID = "investor-signup-wizard";

const STEPS = [
  {
    key: "account",
    title: "Account security",
    subtitle: "Choose the email and password you will use to sign in to the investor portal.",
  },
  {
    key: "personal",
    title: "Personal details",
    subtitle: "Tell us who you are, as you would on an official application.",
  },
  {
    key: "investment",
    title: "Investment profile",
    subtitle: "Help us understand your experience and objectives.",
  },
  {
    key: "review",
    title: "Review & create account",
    subtitle: "Confirm your information, then submit to finish registration and onboarding.",
  },
] as const;

const EMPLOYMENT_LABELS: Record<InvestorLitePayload["employment_status"], string> = {
  "": "Not specified",
  employed: "Employed",
  self_employed: "Self employed",
  retired: "Retired",
  student: "Student",
  unemployed: "Unemployed",
  other: "Other",
};

const EXPERIENCE_LABELS: Record<InvestorLitePayload["investment_experience"], string> = {
  "": "Not specified",
  none: "None",
  limited: "Limited",
  moderate: "Moderate",
  extensive: "Extensive",
};

const inputClass =
  "w-full bg-surface border border-border rounded-md px-3 py-2 text-foreground placeholder:text-muted-foreground";

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
      { title: "Sign up | Hudson Crest Capital" },
      { name: "description", content: "Create an investor account and complete onboarding." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvestorSignupPage,
});

function InvestorSignupPage() {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lite, setLite] = useState<InvestorLitePayload>(() => defaultInvestorLiteValues());
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const validateStep = (s: number): string | null => {
    if (s === 0) {
      const loginEmail = email.trim();
      if (!loginEmail.includes("@")) return "Enter a valid email address.";
      if (password.length < 6) return "Password must be at least 6 characters.";
      return null;
    }
    if (s === 1) {
      if (!lite.legal_first_name.trim() || !lite.legal_last_name.trim())
        return "First and last name are required.";
      if (!lite.country_of_residence) return "Country of residence is required.";
      if (!lite.nationality) return "Nationality is required.";
      if (!lite.phone || !isValidE164(lite.phone))
        return "A valid international phone number is required.";
      return null;
    }
    return null;
  };

  const goNext = () => {
    setError(null);
    const msg = validateStep(step);
    if (msg) {
      setError(msg);
      return;
    }
    if (isStrictAccountSeparationEnabled() && step === 0) {
      const reserved = getReservedStaffDomains();
      const domain = getEmailDomain(email.trim());
      if (domain && reserved.includes(domain)) {
        setError(
          "This email domain is reserved for staff/admin accounts. Please use a personal investor email instead.",
        );
        return;
      }
    }
    setStep((x) => Math.min(STEPS.length - 1, x + 1));
  };

  const goBack = () => {
    setError(null);
    setStep((x) => Math.max(0, x - 1));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (step !== STEPS.length - 1) return;
    setError(null);
    setInfo(null);
    const msg = validateStep(0) || validateStep(1) || validateStep(2);
    if (msg) {
      setError(msg);
      return;
    }
    setBusy(true);
    try {
      const loginEmail = email.trim();

      const appOrigin = getPublicAppOrigin();
      const { data: signUpData, error: signErr } = await supabase.auth.signUp({
        email: loginEmail,
        password,
        options: {
          emailRedirectTo: `${appOrigin}/auth/confirm?next=${encodeURIComponent("/portal/login/investor")}`,
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
        employment_status: lite.employment_status || undefined,
        investment_experience: lite.investment_experience || undefined,
        investor_background:
          serializeInvestorLiteSelections(
            lite.investor_background_tag_ids,
            INVESTOR_BACKGROUND_OPTIONS,
          ).trim() || undefined,
        investment_goals:
          serializeInvestorLiteSelections(
            lite.investment_outcomes_tag_ids,
            INVESTMENT_OUTCOME_OPTIONS,
          ).trim() || undefined,
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
      const role = await ensurePortalRole(supabase as never, sess.session.user.id);
      const target = resolvePortalRedirect(role, "/portal/investor");
      setInfo("Account ready. Redirecting…");
      window.setTimeout(() => window.location.replace(target), 600);
    } catch (err: unknown) {
      setError(formatPortalAuthError(err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(false);
    }
  };

  const goalLabels = INVESTOR_GOAL_OPTIONS.filter((g) =>
    lite.investment_goal_tags.includes(g.id),
  ).map((g) => g.label);

  const backgroundLabels = INVESTOR_BACKGROUND_OPTIONS.filter((o) =>
    lite.investor_background_tag_ids.includes(o.id),
  ).map((o) => o.label);

  const outcomeLabels = INVESTMENT_OUTCOME_OPTIONS.filter((o) =>
    lite.investment_outcomes_tag_ids.includes(o.id),
  ).map((o) => o.label);

  return (
    <div className="min-h-screen bg-background grid-bg flex items-center justify-center px-4 py-10 sm:px-6">
      <div className="flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl lg:min-h-[min(100vh-5rem,720px)] lg:flex-row">
        {/* Left — IC-style value panel */}
        <aside className="relative flex flex-col justify-between border-b border-border bg-gradient-to-br from-brand/25 via-background to-background p-8 lg:w-[42%] lg:border-b-0 lg:border-r lg:p-10">
          <div>
            <a
              href={getMarketingWebsiteHomeUrl()}
              className="inline-flex items-center gap-2"
              rel="noreferrer"
            >
              <img src={logo} alt="Hudson Crest Capital" className="h-10 w-auto" />
            </a>
            <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand">
              Investor signup
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Access institutional grade execution
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              One guided flow: create your secure login and complete onboarding so we can review
              your application.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-foreground/90">
              {[
                "AI assisted portfolio analytics and risk aware workflows",
                "Multi currency accounts with disciplined onboarding",
                "Encrypted connection. Your credentials stay protected.",
              ].map((line) => (
                <li key={line} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/20 text-brand">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-10 hidden text-xs text-muted-foreground lg:block">
            Hudson Crest Capital LLC. For qualified investors. Not an offer where prohibited.
          </p>
        </aside>

        {/* Right — wizard */}
        <div className="flex flex-1 flex-col bg-card p-6 sm:p-8 lg:p-10">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
              OPEN INVESTOR ACCOUNT
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Step {step + 1} of {STEPS.length}
            </p>
          </div>

          {/* Stepper */}
          <nav aria-label="Signup progress" className="mb-8">
            <ol className="flex items-center gap-1">
              {STEPS.map((s, i) => {
                const done = i < step;
                const current = i === step;
                return (
                  <li key={s.key} className="flex flex-1 items-center last:flex-none">
                    <div className="flex flex-col items-center gap-1.5">
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                          done && "bg-brand text-brand-foreground",
                          current && !done && "bg-brand text-brand-foreground ring-2 ring-brand/35",
                          !done && !current && "bg-muted text-muted-foreground",
                        )}
                      >
                        {done ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                      </span>
                      <span
                        className={cn(
                          "hidden max-w-[4.5rem] truncate text-center text-[10px] font-medium uppercase tracking-wide sm:block",
                          current ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {s.key === "account"
                          ? "Account"
                          : s.key === "personal"
                            ? "Personal"
                            : s.key === "investment"
                              ? "Invest"
                              : "Review"}
                      </span>
                    </div>
                    {i < STEPS.length - 1 ? (
                      <div
                        className={cn(
                          "mx-1 h-0.5 min-w-[8px] flex-1 rounded-full transition-colors sm:mx-2",
                          i < step ? "bg-brand/70" : "bg-border",
                        )}
                        aria-hidden
                      />
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground">{STEPS[step].title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{STEPS[step].subtitle}</p>
          </div>

          <form id={FORM_ID} className="flex flex-1 flex-col" onSubmit={submit}>
            {step === 0 && (
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={cn("mt-1", inputClass)}
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={cn("mt-1", inputClass)}
                    placeholder="••••••••"
                  />
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  By continuing you agree to our{" "}
                  <Link to="/terms" className="text-brand underline-offset-2 hover:underline">
                    Terms
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" className="text-brand underline-offset-2 hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>
            )}

            {step === 1 && (
              <InvestorLiteOnboardingFields
                asForm={false}
                values={lite}
                onChange={setLite}
                disabled={busy}
                sections="identity"
              />
            )}

            {step === 2 && (
              <InvestorLiteOnboardingFields
                asForm={false}
                values={lite}
                onChange={setLite}
                disabled={busy}
                sections="investment"
              />
            )}

            {step === 3 && (
              <div className="space-y-4 text-sm">
                <div className="rounded-lg border border-border bg-surface/60 p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Account
                  </div>
                  <p className="mt-1 font-medium text-foreground">{email.trim() || "—"}</p>
                </div>
                <div className="rounded-lg border border-border bg-surface/60 p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Identity
                  </div>
                  <p className="mt-1 text-foreground">
                    {lite.legal_first_name} {lite.legal_last_name}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Residence: {lite.country_of_residence || "—"} · Nationality:{" "}
                    {lite.nationality || "—"}
                  </p>
                  <p className="mt-1 text-muted-foreground">Phone: {lite.phone || "—"}</p>
                  <p className="mt-1 text-muted-foreground">Base currency: {lite.base_currency}</p>
                </div>
                <div className="rounded-lg border border-border bg-surface/60 p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Investment
                  </div>
                  <p className="mt-1 text-foreground">
                    {EMPLOYMENT_LABELS[lite.employment_status]} ·{" "}
                    {EXPERIENCE_LABELS[lite.investment_experience]}
                  </p>
                  {backgroundLabels.length > 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Background: </span>
                      {backgroundLabels.join(", ")}
                    </p>
                  ) : null}
                  {outcomeLabels.length > 0 ? (
                    <p className="mt-2 text-xs text-foreground">
                      <span className="font-medium">Investment goals: </span>
                      {outcomeLabels.join(", ")}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">
                      No investment goal selections (optional).
                    </p>
                  )}
                  {goalLabels.length > 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Focus: {goalLabels.join(", ")}
                    </p>
                  ) : null}
                </div>
              </div>
            )}

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

            <div className="mt-auto flex flex-col gap-3 pt-8 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2">
                {step > 0 ? (
                  <button
                    type="button"
                    onClick={goBack}
                    disabled={busy}
                    className="rounded-lg border border-border bg-transparent px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 disabled:opacity-50"
                  >
                    Back
                  </button>
                ) : null}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {step < STEPS.length - 1 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={busy}
                    className="rounded-lg bg-gradient-brand px-6 py-2.5 text-sm font-semibold text-brand-foreground shadow-glow hover:opacity-90 disabled:opacity-50"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded-lg bg-gradient-brand px-6 py-2.5 text-sm font-semibold text-brand-foreground shadow-glow hover:opacity-90 disabled:opacity-50"
                  >
                    {busy ? "Creating account…" : "Create account"}
                  </button>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5 shrink-0" />
              <span>Data encrypted in transit</span>
            </div>
          </form>

          <div className="mt-6 border-t border-border pt-6 text-xs text-muted-foreground">
            <Link to="/portal/login/investor" className="block hover:text-foreground">
              Already have an account? Sign in →
            </Link>
            <a
              href={getMarketingWebsiteHomeUrl()}
              className="mt-2 block hover:text-foreground"
              rel="noreferrer"
            >
              ← Back to website
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
