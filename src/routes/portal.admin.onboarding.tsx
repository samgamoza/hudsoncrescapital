import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { PageHeader, SectionCard } from "@/lib/portalShared";
import { CountrySelect, IntlPhoneInput } from "@/components/portal/IntlPhoneInput";
import { ASSET_CLASS_LIST, type AssetClass } from "@/lib/assetClasses";
import { isValidE164 } from "@/lib/countries";
import { usePersistedState } from "@/hooks/usePersistedState";

export const Route = createFileRoute("/portal/admin/onboarding")({
  head: () => ({
    meta: [{ title: "Open Account | Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: OnboardingWizard,
});

type Step = 1 | 2 | 3 | 4 | 5 | 6;
const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: "Identity" },
  { n: 2, label: "Address" },
  { n: 3, label: "Account" },
  { n: 4, label: "Sub portfolio" },
  { n: 5, label: "Suitability" },
  { n: 6, label: "Compliance" },
];

const OBJECTIVES = [
  "capital_preservation",
  "income",
  "growth",
  "speculation",
  "hedging",
  "retirement",
];

const inputCls =
  "w-full px-3 py-2 rounded-lg bg-surface-elevated border border-border text-sm text-foreground focus:outline-none focus:border-brand/60 focus:ring-1 focus:ring-brand/40";

function OnboardingWizard() {
  const navigate = useNavigate();
  const [step, setStep, clearStep] = usePersistedState<Step>("admin:onboarding:step", 1);
  const [submitting, setSubmitting] = useState(false);

  const [f, setF, clearF] = usePersistedState("admin:onboarding:form", {
    email: "",
    username: "",
    password: "",
    legal_first_name: "",
    legal_last_name: "",
    display_name: "",
    date_of_birth: "",
    phone: "",
    country_of_residence: "US",
    nationality: "US",
    tax_id_last4: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state_region: "",
    postal_code: "",
    account_type: "cash" as "cash" | "margin" | "retirement",
    base_currency: "USD" as "USD" | "EUR" | "GBP" | "JPY" | "CHF" | "AUD" | "CAD",
    initial_status: "pending" as "pending" | "active",
    // Sub-portfolio
    create_sub_portfolio: true,
    sub_name: "Primary Allocation",
    sub_asset_class: "equities" as AssetClass,
    sub_allocation: 100,
    sub_risk: "moderate" as "conservative" | "moderate" | "aggressive",
    // Suitability
    employment_status: "employed" as
      | "employed"
      | "self_employed"
      | "retired"
      | "student"
      | "unemployed"
      | "other",
    employer: "",
    occupation: "",
    annual_income: "100k_250k" as
      | "under_50k"
      | "50k_100k"
      | "100k_250k"
      | "250k_500k"
      | "500k_1m"
      | "over_1m",
    net_worth: "250k_1m" as "under_50k" | "50k_250k" | "250k_1m" | "1m_5m" | "over_5m",
    source_of_funds: "employment" as
      | "employment"
      | "savings"
      | "investments"
      | "inheritance"
      | "business"
      | "other",
    investment_experience: "moderate" as "none" | "limited" | "moderate" | "extensive",
    risk_tolerance: "moderate" as "conservative" | "moderate" | "aggressive",
    investment_objectives: [] as string[],
    pep_flag: false,
    sanctions_cleared: true,
    internal_notes: "",
    send_invite: false,
  });

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  function validate(s: Step): string | null {
    if (s === 1) {
      if (!f.email.trim()) return "Email is required";
      if (!f.legal_first_name.trim()) return "Legal first name is required";
      if (!f.legal_last_name.trim()) return "Legal last name is required";
      if (!f.date_of_birth) return "Date of birth is required";
      if (!f.phone.trim()) return "Phone is required";
      if (!isValidE164(f.phone)) return "Phone must be a valid international number";
      if (f.username.trim() && !/^[a-zA-Z0-9_.-]{3,32}$/.test(f.username.trim()))
        return "Username must be 3–32 chars (letters, numbers, . _ -)";
      if (!f.send_invite) {
        if (!f.password || f.password.length < 8)
          return "Password must be at least 8 characters when not sending invite";
      }
    }
    if (s === 4 && f.create_sub_portfolio) {
      if (!f.sub_name.trim()) return "Sub portfolio name is required";
      if (f.sub_allocation < 0 || f.sub_allocation > 100) return "Allocation must be 0–100%";
    }
    if (s === 6) {
      if (!f.sanctions_cleared) return "Sanctions screening must be cleared before submission";
    }
    return null;
  }

  function next() {
    const err = validate(step);
    if (err) {
      toast.error(err);
      return;
    }
    setStep((s) => Math.min(6, s + 1) as Step);
  }
  function back() {
    setStep((s) => Math.max(1, s - 1) as Step);
  }

  async function submit() {
    for (let i = 1 as Step; i <= 6; i = (i + 1) as Step) {
      const err = validate(i);
      if (err) {
        toast.error(err);
        setStep(i);
        return;
      }
    }
    setSubmitting(true);
    try {
      const req = {
        email: f.email.trim(),
        username: f.username.trim() || undefined,
        password: f.password || undefined,
        legal_first_name: f.legal_first_name.trim(),
        legal_last_name: f.legal_last_name.trim(),
        display_name: f.display_name.trim() || undefined,
        date_of_birth: f.date_of_birth || undefined,
        phone: f.phone.trim() || undefined,
        country_of_residence: f.country_of_residence,
        nationality: f.nationality,
        tax_id_last4: f.tax_id_last4.trim() || undefined,
        address_line1: f.address_line1.trim() || undefined,
        address_line2: f.address_line2.trim() || undefined,
        city: f.city.trim() || undefined,
        state_region: f.state_region.trim() || undefined,
        postal_code: f.postal_code.trim() || undefined,
        account_type: f.account_type,
        base_currency: f.base_currency,
        initial_status: f.initial_status,
        employment_status: f.employment_status,
        employer: f.employer.trim() || undefined,
        occupation: f.occupation.trim() || undefined,
        annual_income: f.annual_income,
        net_worth: f.net_worth,
        source_of_funds: f.source_of_funds,
        investment_experience: f.investment_experience,
        risk_tolerance: f.risk_tolerance,
        investment_objectives: f.investment_objectives,
        pep_flag: f.pep_flag,
        sanctions_cleared: f.sanctions_cleared,
        internal_notes: f.internal_notes.trim() || undefined,
        send_invite: f.send_invite,
        initial_sub_portfolio: f.create_sub_portfolio
          ? {
              name: f.sub_name.trim(),
              asset_class: f.sub_asset_class,
              target_allocation_pct: f.sub_allocation,
              risk_band: f.sub_risk,
            }
          : undefined,
      };
      const r = await fetch("/api/portal/onboard-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (!r.ok) throw new Error(`Onboarding failed (${r.status})`);
      const res = await r.json();
      toast.success(`Account ${res.account_number} created (${f.initial_status}).`);
      clearF();
      clearStep();
      setTimeout(() => navigate({ to: "/portal/admin/clients" }), 900);
    } catch (e: any) {
      toast.error(e?.message ?? "Onboarding failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Open New Client Account"
        subtitle="Staff-only desk onboarding — not the public investor self-signup page. All fields sync to the client's profile."
      />

      {/* Stepper */}
      <div className="surface-card p-4">
        <div className="flex items-center justify-between gap-2">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex items-center flex-1">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold border ${
                  step >= s.n
                    ? "bg-brand text-brand-foreground border-brand"
                    : "bg-surface-elevated text-muted-foreground border-border"
                }`}
              >
                {step > s.n ? <CheckCircle2 className="h-4 w-4" /> : s.n}
              </div>
              <div className="ml-2 text-xs sm:text-sm hidden sm:block">
                <div
                  className={step >= s.n ? "text-foreground font-medium" : "text-muted-foreground"}
                >
                  {s.label}
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-3 ${step > s.n ? "bg-brand" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <SectionCard
        title={STEPS[step - 1].label}
        description={
          step === 1
            ? "Legal identity. Must match the client's government ID."
            : step === 2
              ? "Residential address for KYC and statement delivery."
              : step === 3
                ? "Account configuration and provisioning."
                : step === 4
                  ? "First sub portfolio. Add more after onboarding from the client page."
                  : step === 5
                    ? "Suitability assessment required by regulation."
                    : "Sanctions / PEP review and reviewer notes."
        }
      >
        {step === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Email">
              <input
                type="email"
                className={inputCls}
                value={f.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </Field>
            <Field label="Display Name (optional)">
              <input
                className={inputCls}
                value={f.display_name}
                onChange={(e) => set("display_name", e.target.value)}
              />
            </Field>
            <Field label="Legal First Name">
              <input
                className={inputCls}
                value={f.legal_first_name}
                onChange={(e) => set("legal_first_name", e.target.value)}
              />
            </Field>
            <Field label="Legal Last Name">
              <input
                className={inputCls}
                value={f.legal_last_name}
                onChange={(e) => set("legal_last_name", e.target.value)}
              />
            </Field>
            <Field label="Date of Birth">
              <input
                type="date"
                className={inputCls}
                value={f.date_of_birth}
                onChange={(e) => set("date_of_birth", e.target.value)}
              />
            </Field>
            <Field label="Phone (international)">
              <IntlPhoneInput
                value={f.phone}
                onChange={(v) => set("phone", v)}
                country={f.country_of_residence}
                defaultCountry={f.country_of_residence}
              />
            </Field>
            <Field label="Country of Residence">
              <CountrySelect
                value={f.country_of_residence}
                onChange={(c) => set("country_of_residence", c)}
              />
            </Field>
            <Field label="Nationality">
              <CountrySelect value={f.nationality} onChange={(c) => set("nationality", c)} />
            </Field>
            <Field label="Tax ID, last 4 (optional)">
              <input
                className={inputCls}
                maxLength={4}
                value={f.tax_id_last4}
                onChange={(e) => set("tax_id_last4", e.target.value)}
              />
            </Field>
            <Field label="Username (optional, for login)">
              <input
                className={inputCls}
                value={f.username}
                onChange={(e) => set("username", e.target.value)}
                placeholder="e.g. j.smith"
              />
            </Field>
            <Field
              label={
                f.send_invite ? "Initial Password (ignored: invite sent)" : "Initial Password"
              }
            >
              <input
                type="text"
                className={inputCls}
                value={f.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder={f.send_invite ? "Client sets via email link" : "Min 8 characters"}
                disabled={f.send_invite}
              />
            </Field>
            <Field label="Provisioning">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={f.send_invite}
                  onChange={(e) => set("send_invite", e.target.checked)}
                />
                Send sign-in invite email (otherwise use the password above)
              </label>
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Address line 1">
                <input
                  className={inputCls}
                  value={f.address_line1}
                  onChange={(e) => set("address_line1", e.target.value)}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Address line 2">
                <input
                  className={inputCls}
                  value={f.address_line2}
                  onChange={(e) => set("address_line2", e.target.value)}
                />
              </Field>
            </div>
            <Field label="City">
              <input
                className={inputCls}
                value={f.city}
                onChange={(e) => set("city", e.target.value)}
              />
            </Field>
            <Field label="State / Region">
              <input
                className={inputCls}
                value={f.state_region}
                onChange={(e) => set("state_region", e.target.value)}
              />
            </Field>
            <Field label="Postal Code">
              <input
                className={inputCls}
                value={f.postal_code}
                onChange={(e) => set("postal_code", e.target.value)}
              />
            </Field>
            <Field label="Country">
              <CountrySelect
                value={f.country_of_residence}
                onChange={(c) => set("country_of_residence", c)}
              />
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Account Type">
              <select
                className={inputCls}
                value={f.account_type}
                onChange={(e) => set("account_type", e.target.value as any)}
              >
                <option value="cash">Cash</option>
                <option value="margin">Margin</option>
                <option value="retirement">Retirement</option>
              </select>
            </Field>
            <Field label="Base Currency">
              <select
                className={inputCls}
                value={f.base_currency}
                onChange={(e) => set("base_currency", e.target.value as any)}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="JPY">JPY</option>
                <option value="CHF">CHF</option>
                <option value="AUD">AUD</option>
                <option value="CAD">CAD</option>
              </select>
            </Field>
            <Field label="Initial Status">
              <select
                className={inputCls}
                value={f.initial_status}
                onChange={(e) => set("initial_status", e.target.value as any)}
              >
                <option value="pending">Pending review</option>
                <option value="active">Active immediately</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Choose <span className="text-foreground">Active</span> only after KYC and sanctions
                checks pass.
              </p>
            </Field>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={f.create_sub_portfolio}
                onChange={(e) => set("create_sub_portfolio", e.target.checked)}
              />
              Create an initial sub-portfolio with this account
            </label>

            {f.create_sub_portfolio && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Sub-portfolio Name">
                  <input
                    className={inputCls}
                    value={f.sub_name}
                    onChange={(e) => set("sub_name", e.target.value)}
                    placeholder="e.g. Growth Equities, BTC Allocation, Gold Bullion"
                  />
                </Field>
                <Field label="Asset Class">
                  <select
                    className={inputCls}
                    value={f.sub_asset_class}
                    onChange={(e) => set("sub_asset_class", e.target.value as AssetClass)}
                  >
                    {ASSET_CLASS_LIST.map((a) => (
                      <option key={a.key} value={a.key}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {ASSET_CLASS_LIST.find((a) => a.key === f.sub_asset_class)?.description}
                  </p>
                </Field>
                <Field label="Target Allocation (%)">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    className={inputCls}
                    value={f.sub_allocation}
                    onChange={(e) => set("sub_allocation", Number(e.target.value))}
                  />
                </Field>
                <Field label="Risk Band">
                  <select
                    className={inputCls}
                    value={f.sub_risk}
                    onChange={(e) => set("sub_risk", e.target.value as any)}
                  >
                    <option value="conservative">Conservative</option>
                    <option value="moderate">Moderate</option>
                    <option value="aggressive">Aggressive</option>
                  </select>
                </Field>
                <div className="sm:col-span-2 text-xs text-muted-foreground p-3 rounded-lg bg-surface-elevated/40 border border-border">
                  Holdings (positions) for this sub-portfolio are added later from{" "}
                  <strong className="text-foreground">Admin → Trade Order</strong> (client sleeves &amp;
                  positions panel). This keeps onboarding fast; the desk adds lines in one place after
                  onboarding.
                </div>
              </div>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Employment Status">
              <select
                className={inputCls}
                value={f.employment_status}
                onChange={(e) => set("employment_status", e.target.value as any)}
              >
                <option value="employed">Employed</option>
                <option value="self_employed">Self employed</option>
                <option value="retired">Retired</option>
                <option value="student">Student</option>
                <option value="unemployed">Unemployed</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Occupation">
              <input
                className={inputCls}
                value={f.occupation}
                onChange={(e) => set("occupation", e.target.value)}
              />
            </Field>
            <Field label="Employer">
              <input
                className={inputCls}
                value={f.employer}
                onChange={(e) => set("employer", e.target.value)}
              />
            </Field>
            <Field label="Source of Funds">
              <select
                className={inputCls}
                value={f.source_of_funds}
                onChange={(e) => set("source_of_funds", e.target.value as any)}
              >
                <option value="employment">Employment</option>
                <option value="savings">Savings</option>
                <option value="investments">Investments</option>
                <option value="inheritance">Inheritance</option>
                <option value="business">Business</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Annual Income">
              <select
                className={inputCls}
                value={f.annual_income}
                onChange={(e) => set("annual_income", e.target.value as any)}
              >
                <option value="under_50k">Under $50k</option>
                <option value="50k_100k">$50k–$100k</option>
                <option value="100k_250k">$100k–$250k</option>
                <option value="250k_500k">$250k–$500k</option>
                <option value="500k_1m">$500k–$1m</option>
                <option value="over_1m">Over $1m</option>
              </select>
            </Field>
            <Field label="Net Worth">
              <select
                className={inputCls}
                value={f.net_worth}
                onChange={(e) => set("net_worth", e.target.value as any)}
              >
                <option value="under_50k">Under $50k</option>
                <option value="50k_250k">$50k–$250k</option>
                <option value="250k_1m">$250k–$1m</option>
                <option value="1m_5m">$1m–$5m</option>
                <option value="over_5m">Over $5m</option>
              </select>
            </Field>
            <Field label="Investment Experience">
              <select
                className={inputCls}
                value={f.investment_experience}
                onChange={(e) => set("investment_experience", e.target.value as any)}
              >
                <option value="none">None</option>
                <option value="limited">Limited</option>
                <option value="moderate">Moderate</option>
                <option value="extensive">Extensive</option>
              </select>
            </Field>
            <Field label="Risk Tolerance">
              <select
                className={inputCls}
                value={f.risk_tolerance}
                onChange={(e) => set("risk_tolerance", e.target.value as any)}
              >
                <option value="conservative">Conservative</option>
                <option value="moderate">Moderate</option>
                <option value="aggressive">Aggressive</option>
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Investment Objectives">
                <div className="flex flex-wrap gap-2">
                  {OBJECTIVES.map((o) => {
                    const active = f.investment_objectives.includes(o);
                    return (
                      <button
                        type="button"
                        key={o}
                        onClick={() =>
                          set(
                            "investment_objectives",
                            active
                              ? f.investment_objectives.filter((x) => x !== o)
                              : [...f.investment_objectives, o],
                          )
                        }
                        className={`text-xs px-3 py-1.5 rounded-full border capitalize transition-colors ${
                          active
                            ? "bg-brand text-brand-foreground border-brand"
                            : "bg-surface-elevated text-muted-foreground border-border hover:border-brand/40"
                        }`}
                      >
                        {o.replace(/_/g, " ")}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-surface-elevated/50 border border-border">
              <ShieldCheck className="h-5 w-5 text-brand mt-0.5" />
              <div className="text-sm text-muted-foreground">
                Confirm sanctions/PEP screening. The account cannot be submitted until{" "}
                <span className="text-foreground">Sanctions Cleared</span> is checked.
              </div>
            </div>
            <label className="flex items-center gap-3 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={f.sanctions_cleared}
                onChange={(e) => set("sanctions_cleared", e.target.checked)}
              />
              Sanctions / OFAC screening cleared
            </label>
            <label className="flex items-center gap-3 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={f.pep_flag}
                onChange={(e) => set("pep_flag", e.target.checked)}
              />
              Politically Exposed Person (PEP): requires enhanced due diligence
            </label>
            <Field label="Internal notes (optional)">
              <textarea
                rows={4}
                className={inputCls}
                value={f.internal_notes}
                onChange={(e) => set("internal_notes", e.target.value)}
                placeholder="Reviewer comments, EDD outcomes, references…"
              />
            </Field>
          </div>
        )}

        {/* Nav */}
        <div className="flex items-center justify-between pt-6 mt-2 border-t border-border">
          <button
            onClick={back}
            disabled={step === 1 || submitting}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          {step < 6 ? (
            <button
              onClick={next}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-brand-foreground text-sm font-medium hover:opacity-90"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-brand-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Create Account
            </button>
          )}
        </div>
      </SectionCard>

      <Toaster />
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-muted-foreground mb-1.5">{label}</div>
      {children}
    </label>
  );
}
