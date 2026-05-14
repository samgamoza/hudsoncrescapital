import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { CountrySelect } from "@/components/portal/IntlPhoneInput";
import { usePortalProfileStatus } from "@/lib/portal-profile-status";

/* ---- shared form styling ---- */
const field =
  "w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand/60";
const label = "block text-xs font-medium uppercase tracking-wider text-muted-foreground";
const req = <span className="text-destructive"> *</span>;
const sectionTitle = "text-sm font-semibold text-brand border-b border-border pb-1 mb-3";

/* ---- option dictionaries (mirror server zod) ---- */
const EMPLOYMENT_OPTS = [
  { value: "employed", label: "Employed" },
  { value: "self_employed", label: "Self-Employed" },
  { value: "retired", label: "Retired" },
  { value: "student", label: "Student" },
  { value: "unemployed", label: "Unemployed" },
] as const;

const ANNUAL_INCOME_OPTS = [
  { value: "under_25k", label: "Below $25,000" },
  { value: "25k_50k", label: "$25,000 – $50,000" },
  { value: "50k_100k", label: "$50,000 – $100,000" },
  { value: "100k_250k", label: "$100,000 – $250,000" },
  { value: "over_250k", label: "Above $250,000" },
] as const;

const NET_WORTH_OPTS = [
  { value: "under_50k", label: "Below $50,000" },
  { value: "50k_250k", label: "$50,000 – $250,000" },
  { value: "250k_1m", label: "$250,000 – $1,000,000" },
  { value: "over_1m", label: "Above $1,000,000" },
] as const;

const INVESTMENT_OBJECTIVES = [
  { id: "capital_growth", label: "Capital Growth" },
  { id: "income", label: "Income" },
  { id: "speculation", label: "Speculation" },
  { id: "hedging", label: "Hedging" },
  { id: "capital_preservation", label: "Preservation of Capital" },
] as const;

const TRADING_PRODUCTS = [
  { key: "stocks", label: "Stocks" },
  { key: "etfs", label: "ETFs" },
  { key: "options", label: "Options" },
  { key: "forex", label: "Forex" },
  { key: "crypto", label: "Crypto" },
] as const;

const EXPERIENCE_LEVELS = [
  { value: "none", label: "None" },
  { value: "limited", label: "Limited" },
  { value: "experienced", label: "Experienced" },
] as const;

const RISK_LEVELS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "speculative", label: "Speculative" },
] as const;

const ACCOUNT_FEATURES = [
  { id: "cash_account", label: "Cash Account" },
  { id: "margin_trading", label: "Margin Trading" },
  { id: "options_trading", label: "Options Trading" },
  { id: "crypto_trading", label: "Cryptocurrency Trading" },
  { id: "international_markets", label: "International Markets Access" },
] as const;

const KYC_BUCKET = "kyc-documents";
const KYC_ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];
const KYC_MAX_BYTES = 10 * 1024 * 1024;

type ExperienceMap = Record<(typeof TRADING_PRODUCTS)[number]["key"], string>;

const STEPS = [
  { key: "personal", title: "Personal information" },
  { key: "tax", title: "Tax identification" },
  { key: "employment", title: "Employment & financial" },
  { key: "investment", title: "Investment profile" },
  { key: "features", title: "Account features" },
  { key: "banking", title: "Banking (optional)" },
  { key: "regulatory", title: "Regulatory declarations" },
  { key: "cip", title: "Identity verification" },
] as const;

type FormState = {
  middle_name: string;
  date_of_birth: string;
  country_of_citizenship: string;
  residential_address: {
    line1: string;
    line2: string;
    city: string;
    state_region: string;
    postal_code: string;
    country: string;
  };

  is_us_person: "" | "yes" | "no";
  tax_id_number: string;
  fatca_crs_acknowledged: boolean;

  employment_status: "" | (typeof EMPLOYMENT_OPTS)[number]["value"];
  employer_name: string;
  occupation: string;
  annual_income: "" | (typeof ANNUAL_INCOME_OPTS)[number]["value"];
  net_worth: "" | (typeof NET_WORTH_OPTS)[number]["value"];

  investment_objectives: string[];
  trading_experience: ExperienceMap;
  risk_tolerance: "" | (typeof RISK_LEVELS)[number]["value"];

  account_features: string[];

  banking: {
    bank_name: string;
    account_holder: string;
    account_number: string;
    swift_or_routing: string;
  };

  pep: "" | "yes" | "no";
  broker_dealer_affiliation: "" | "yes" | "no";
  insider_control_person: "" | "yes" | "no";

  cip_acknowledged: boolean;
};

function emptyExperience(): ExperienceMap {
  return { stocks: "", etfs: "", options: "", forex: "", crypto: "" };
}

function defaultForm(prefill: Partial<FormState>): FormState {
  return {
    middle_name: "",
    date_of_birth: "",
    country_of_citizenship: "US",
    residential_address: {
      line1: "",
      line2: "",
      city: "",
      state_region: "",
      postal_code: "",
      country: "US",
    },
    is_us_person: "",
    tax_id_number: "",
    fatca_crs_acknowledged: false,
    employment_status: "",
    employer_name: "",
    occupation: "",
    annual_income: "",
    net_worth: "",
    investment_objectives: [],
    trading_experience: emptyExperience(),
    risk_tolerance: "",
    account_features: [],
    banking: { bank_name: "", account_holder: "", account_number: "", swift_or_routing: "" },
    pep: "",
    broker_dealer_affiliation: "",
    insider_control_person: "",
    cip_acknowledged: false,
    ...prefill,
  } as FormState;
}

type KycDoc = {
  id: string;
  doc_type: string;
  status: string;
  storage_path: string;
  submitted_at: string;
  review_notes: string | null;
};

function validateStep(step: number, f: FormState, kyc: KycDoc[]): string | null {
  switch (step) {
    case 0: {
      if (!f.date_of_birth) return "Date of birth is required.";
      if (!f.country_of_citizenship) return "Country of citizenship is required.";
      const a = f.residential_address;
      if (!a.line1.trim() || !a.city.trim() || !a.postal_code.trim() || !a.country) {
        return "Residential address line, city, postal code, and country are required.";
      }
      return null;
    }
    case 1: {
      if (f.is_us_person === "") return "Please indicate whether you are a U.S. person.";
      if (!f.tax_id_number.trim()) return "Tax identification number is required.";
      if (!f.fatca_crs_acknowledged) return "Please certify your tax information.";
      return null;
    }
    case 2: {
      if (!f.employment_status) return "Employment status is required.";
      if (!f.annual_income) return "Annual income is required.";
      if (!f.net_worth) return "Estimated net worth is required.";
      return null;
    }
    case 3: {
      if (f.investment_objectives.length === 0)
        return "Select at least one investment objective.";
      const missing = TRADING_PRODUCTS.find((p) => !f.trading_experience[p.key]);
      if (missing) return `Trading experience for ${missing.label} is required.`;
      if (!f.risk_tolerance) return "Risk tolerance is required.";
      return null;
    }
    case 4: {
      if (f.account_features.length === 0) return "Select at least one account feature.";
      return null;
    }
    case 5:
      return null; // banking is optional
    case 6: {
      if (f.pep === "") return "Please answer the PEP question.";
      if (f.broker_dealer_affiliation === "")
        return "Please answer the broker-dealer affiliation question.";
      if (f.insider_control_person === "")
        return "Please answer the insider / control person question.";
      return null;
    }
    case 7: {
      if (!f.cip_acknowledged) return "Please acknowledge the customer identification notice.";
      const hasIdentity = kyc.some(
        (d) =>
          d.doc_type === "passport" ||
          d.doc_type === "driver_license" ||
          d.doc_type === "drivers_license" ||
          d.doc_type === "national_id",
      );
      const hasPoa = kyc.some((d) => d.doc_type === "proof_of_address");
      if (!hasIdentity)
        return "Upload an identity document (passport, driver's license, or national ID).";
      if (!hasPoa) return "Upload a proof of address document.";
      return null;
    }
    default:
      return null;
  }
}

function buildPayload(f: FormState) {
  const banking =
    [f.banking.bank_name, f.banking.account_holder, f.banking.account_number, f.banking.swift_or_routing]
      .map((v) => v.trim())
      .some((v) => v.length > 0)
      ? {
          bank_name: f.banking.bank_name.trim(),
          account_holder: f.banking.account_holder.trim(),
          account_number: f.banking.account_number.trim(),
          swift_or_routing: f.banking.swift_or_routing.trim(),
        }
      : undefined;

  return {
    middle_name: f.middle_name.trim(),
    date_of_birth: f.date_of_birth,
    country_of_citizenship: f.country_of_citizenship.toUpperCase(),
    residential_address: {
      line1: f.residential_address.line1.trim(),
      line2: f.residential_address.line2.trim(),
      city: f.residential_address.city.trim(),
      state_region: f.residential_address.state_region.trim(),
      postal_code: f.residential_address.postal_code.trim(),
      country: f.residential_address.country.toUpperCase(),
    },
    is_us_person: f.is_us_person === "yes",
    tax_id_number: f.tax_id_number.trim(),
    fatca_crs_acknowledged: true as const,
    employment_status: f.employment_status,
    employer_name: f.employer_name.trim(),
    occupation: f.occupation.trim(),
    annual_income: f.annual_income,
    net_worth: f.net_worth,
    investment_objectives: f.investment_objectives,
    trading_experience: f.trading_experience,
    risk_tolerance: f.risk_tolerance,
    account_features: f.account_features,
    banking,
    pep: f.pep === "yes",
    broker_dealer_affiliation: f.broker_dealer_affiliation === "yes",
    insider_control_person: f.insider_control_person === "yes",
    cip_acknowledged: true as const,
  };
}

export function ProfileCompletionWizard() {
  const navigate = useNavigate();
  const { refresh } = usePortalProfileStatus();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<FormState>(() => defaultForm({}));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [kyc, setKyc] = useState<KycDoc[]>([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [profRes, kycRes] = await Promise.all([
        fetch("/api/portal/profile"),
        supabase
          .from("kyc_documents")
          .select("id, doc_type, status, storage_path, submitted_at, review_notes")
          .order("submitted_at", { ascending: false }),
      ]);

      if (profRes.ok) {
        const data = (await profRes.json()) as {
          profile: Record<string, string | null> | null;
          accounts?: Array<{ status: string; metadata?: Record<string, unknown> | null }>;
        };
        const profile = data.profile ?? {};
        const primary =
          (data.accounts ?? []).find((a) => a.status === "pending") ??
          (data.accounts ?? []).find((a) => a.status === "active") ??
          (data.accounts ?? [])[0] ??
          null;
        const meta = (primary?.metadata as Record<string, any> | undefined) ?? {};
        const completion = (meta.profile_completion as Record<string, any> | undefined) ?? {};
        const address = (meta.address as Record<string, any> | undefined) ?? {};

        setF((prev) =>
          defaultForm({
            ...prev,
            middle_name: completion.middle_name ?? "",
            date_of_birth: profile.date_of_birth ?? completion.date_of_birth ?? "",
            country_of_citizenship: (profile.nationality ?? completion.country_of_citizenship ?? "US") as string,
            residential_address: {
              line1: address.line1 ?? completion.residential_address?.line1 ?? "",
              line2: address.line2 ?? completion.residential_address?.line2 ?? "",
              city: address.city ?? completion.residential_address?.city ?? "",
              state_region: address.state_region ?? completion.residential_address?.state_region ?? "",
              postal_code: address.postal_code ?? completion.residential_address?.postal_code ?? "",
              country: (address.country ?? completion.residential_address?.country ?? profile.country_of_residence ?? "US") as string,
            },
            is_us_person:
              typeof completion.is_us_person === "boolean"
                ? completion.is_us_person
                  ? "yes"
                  : "no"
                : "",
            tax_id_number: "",
            fatca_crs_acknowledged: Boolean(completion.fatca_crs_acknowledged),
            employment_status: completion.employment_status ?? "",
            employer_name: completion.employer_name ?? "",
            occupation: completion.occupation ?? "",
            annual_income: completion.annual_income ?? "",
            net_worth: completion.net_worth ?? "",
            investment_objectives: Array.isArray(completion.investment_objectives)
              ? completion.investment_objectives
              : [],
            trading_experience: {
              ...emptyExperience(),
              ...(completion.trading_experience ?? {}),
            },
            risk_tolerance: completion.risk_tolerance ?? "",
            account_features: Array.isArray(completion.account_features)
              ? completion.account_features
              : [],
            banking: {
              bank_name: completion.banking?.bank_name ?? "",
              account_holder: completion.banking?.account_holder ?? "",
              account_number: completion.banking?.account_number ?? "",
              swift_or_routing: completion.banking?.swift_or_routing ?? "",
            },
            pep:
              typeof completion.pep === "boolean" ? (completion.pep ? "yes" : "no") : "",
            broker_dealer_affiliation:
              typeof completion.broker_dealer_affiliation === "boolean"
                ? completion.broker_dealer_affiliation
                  ? "yes"
                  : "no"
                : "",
            insider_control_person:
              typeof completion.insider_control_person === "boolean"
                ? completion.insider_control_person
                  ? "yes"
                  : "no"
                : "",
            cip_acknowledged: Boolean(completion.cip_acknowledged),
          }),
        );
      }

      setKyc((kycRes.data as KycDoc[]) ?? []);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load profile data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const next = () => {
    const err = validateStep(step, f, kyc);
    if (err) {
      toast.error(err);
      return;
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const prev = () => setStep((s) => Math.max(0, s - 1));

  const submit = async () => {
    for (let i = 0; i < STEPS.length; i++) {
      const err = validateStep(i, f, kyc);
      if (err) {
        toast.error(err);
        setStep(i);
        return;
      }
    }
    setBusy(true);
    try {
      const res = await fetch("/api/portal/profile-completion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(f)),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = body?.details
          ? typeof body.details === "string"
            ? body.details
            : JSON.stringify(body.details.fieldErrors ?? body.details)
          : body?.error ?? `Submit failed (${res.status})`;
        throw new Error(detail);
      }
      toast.success(
        body.merged
          ? "Profile updated. Our desk will continue reviewing your account."
          : "Profile submitted. Our desk will review your account.",
      );
      await refresh();
      window.setTimeout(() => navigate({ to: "/portal/investor" }), 600);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading profile…
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-6">
      <nav aria-label="Profile completion steps" className="flex shrink-0 flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => (i < step ? setStep(i) : undefined)}
            disabled={i > step}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              i === step && "border-brand bg-brand/15 text-foreground",
              i < step && "border-brand/40 text-brand hover:bg-brand/10",
              i > step && "border-border text-muted-foreground cursor-default",
            )}
          >
            {i + 1}. {s.title}
          </button>
        ))}
      </nav>

      <div className="shrink-0">
        <h2 className="text-lg font-semibold text-foreground">{STEPS[step].title}</h2>
      </div>

      {step === 0 && <PersonalStep f={f} setF={setF} />}
      {step === 1 && <TaxStep f={f} setF={setF} />}
      {step === 2 && <EmploymentStep f={f} setF={setF} />}
      {step === 3 && <InvestmentStep f={f} setF={setF} />}
      {step === 4 && <FeaturesStep f={f} setF={setF} />}
      {step === 5 && <BankingStep f={f} setF={setF} />}
      {step === 6 && <RegulatoryStep f={f} setF={setF} />}
      {step === 7 && <CipStep f={f} setF={setF} kyc={kyc} setKyc={setKyc} />}

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
          onClick={prev}
          disabled={step === 0 || busy}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={next}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-md bg-gradient-brand px-4 py-2 text-sm font-medium text-brand-foreground shadow-glow hover:opacity-90"
          >
            Continue <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-md bg-gradient-brand px-5 py-2 text-sm font-medium text-brand-foreground shadow-glow hover:opacity-90 disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
              </>
            ) : (
              <>
                Submit profile <Check className="h-4 w-4" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

/* --------------- Steps --------------- */

type StepProps = {
  f: FormState;
  setF: React.Dispatch<React.SetStateAction<FormState>>;
};

function PersonalStep({ f, setF }: StepProps) {
  return (
    <div className="space-y-5 text-sm">
      <h3 className={sectionTitle}>Personal information</h3>
      <p className="text-xs text-muted-foreground">
        Your first name, last name, country of residence, mobile, and email were captured during
        signup. Add the remaining personal details below.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className={label}>Middle name</label>
          <input
            className={cn("mt-1", field)}
            value={f.middle_name}
            onChange={(e) => setF((p) => ({ ...p, middle_name: e.target.value }))}
          />
        </div>
        <div>
          <label className={label}>Date of birth{req}</label>
          <input
            type="date"
            className={cn("mt-1", field)}
            value={f.date_of_birth}
            onChange={(e) => setF((p) => ({ ...p, date_of_birth: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className={label}>Country of citizenship{req}</label>
          <div className="mt-1">
            <CountrySelect
              value={f.country_of_citizenship}
              onChange={(c) => setF((p) => ({ ...p, country_of_citizenship: c }))}
            />
          </div>
        </div>
      </div>

      <h4 className={sectionTitle}>Residential address</h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={label}>Address line 1{req}</label>
          <input
            className={cn("mt-1", field)}
            value={f.residential_address.line1}
            onChange={(e) =>
              setF((p) => ({
                ...p,
                residential_address: { ...p.residential_address, line1: e.target.value },
              }))
            }
            required
          />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Address line 2</label>
          <input
            className={cn("mt-1", field)}
            value={f.residential_address.line2}
            onChange={(e) =>
              setF((p) => ({
                ...p,
                residential_address: { ...p.residential_address, line2: e.target.value },
              }))
            }
          />
        </div>
        <div>
          <label className={label}>City{req}</label>
          <input
            className={cn("mt-1", field)}
            value={f.residential_address.city}
            onChange={(e) =>
              setF((p) => ({
                ...p,
                residential_address: { ...p.residential_address, city: e.target.value },
              }))
            }
            required
          />
        </div>
        <div>
          <label className={label}>State / Province</label>
          <input
            className={cn("mt-1", field)}
            value={f.residential_address.state_region}
            onChange={(e) =>
              setF((p) => ({
                ...p,
                residential_address: { ...p.residential_address, state_region: e.target.value },
              }))
            }
          />
        </div>
        <div>
          <label className={label}>Postal code{req}</label>
          <input
            className={cn("mt-1", field)}
            value={f.residential_address.postal_code}
            onChange={(e) =>
              setF((p) => ({
                ...p,
                residential_address: { ...p.residential_address, postal_code: e.target.value },
              }))
            }
            required
          />
        </div>
        <div>
          <label className={label}>Country{req}</label>
          <div className="mt-1">
            <CountrySelect
              value={f.residential_address.country}
              onChange={(c) =>
                setF((p) => ({
                  ...p,
                  residential_address: { ...p.residential_address, country: c },
                }))
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TaxStep({ f, setF }: StepProps) {
  return (
    <div className="space-y-5 text-sm">
      <h3 className={sectionTitle}>Tax identification</h3>
      <div>
        <span className={label}>U.S. Person?{req}</span>
        <div className="mt-2 flex flex-wrap gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="is_us_person"
              checked={f.is_us_person === "yes"}
              onChange={() => setF((p) => ({ ...p, is_us_person: "yes" }))}
            />
            Yes
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="is_us_person"
              checked={f.is_us_person === "no"}
              onChange={() => setF((p) => ({ ...p, is_us_person: "no" }))}
            />
            No
          </label>
        </div>
      </div>
      <div>
        <label className={label}>Tax Identification Number{req}</label>
        <p className="text-[11px] text-muted-foreground mt-0.5">SSN, ITIN, or National Tax ID.</p>
        <input
          className={cn("mt-1", field)}
          value={f.tax_id_number}
          onChange={(e) => setF((p) => ({ ...p, tax_id_number: e.target.value }))}
          autoComplete="off"
          required
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          We only store the last 4 digits with your profile; the full number is encrypted in
          transit.
        </p>
      </div>
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          className="mt-1"
          checked={f.fatca_crs_acknowledged}
          onChange={(e) => setF((p) => ({ ...p, fatca_crs_acknowledged: e.target.checked }))}
        />
        <span className="text-foreground">
          I certify that the tax information provided is accurate and complete for FATCA / CRS
          purposes.
        </span>
      </label>
    </div>
  );
}

function EmploymentStep({ f, setF }: StepProps) {
  return (
    <div className="space-y-5 text-sm">
      <h3 className={sectionTitle}>Employment & financial profile</h3>
      <div>
        <span className={label}>Employment status{req}</span>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {EMPLOYMENT_OPTS.map((o) => (
            <label key={o.value} className="flex items-center gap-2">
              <input
                type="radio"
                name="employment_status"
                checked={f.employment_status === o.value}
                onChange={() => setF((p) => ({ ...p, employment_status: o.value }))}
              />
              {o.label}
            </label>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label}>Employer name</label>
          <input
            className={cn("mt-1", field)}
            value={f.employer_name}
            onChange={(e) => setF((p) => ({ ...p, employer_name: e.target.value }))}
          />
        </div>
        <div>
          <label className={label}>Occupation</label>
          <input
            className={cn("mt-1", field)}
            value={f.occupation}
            onChange={(e) => setF((p) => ({ ...p, occupation: e.target.value }))}
          />
        </div>
      </div>
      <div>
        <span className={label}>Annual income (USD){req}</span>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {ANNUAL_INCOME_OPTS.map((o) => (
            <label key={o.value} className="flex items-center gap-2">
              <input
                type="radio"
                name="annual_income"
                checked={f.annual_income === o.value}
                onChange={() => setF((p) => ({ ...p, annual_income: o.value }))}
              />
              {o.label}
            </label>
          ))}
        </div>
      </div>
      <div>
        <span className={label}>Estimated net worth (excluding residence){req}</span>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {NET_WORTH_OPTS.map((o) => (
            <label key={o.value} className="flex items-center gap-2">
              <input
                type="radio"
                name="net_worth"
                checked={f.net_worth === o.value}
                onChange={() => setF((p) => ({ ...p, net_worth: o.value }))}
              />
              {o.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function InvestmentStep({ f, setF }: StepProps) {
  const toggleObjective = (id: string) =>
    setF((p) => ({
      ...p,
      investment_objectives: p.investment_objectives.includes(id)
        ? p.investment_objectives.filter((x) => x !== id)
        : [...p.investment_objectives, id],
    }));

  return (
    <div className="space-y-5 text-sm">
      <h3 className={sectionTitle}>Investment profile</h3>

      <div>
        <span className={label}>Investment objective (select all that apply){req}</span>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {INVESTMENT_OBJECTIVES.map((o) => (
            <label key={o.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={f.investment_objectives.includes(o.id)}
                onChange={() => toggleObjective(o.id)}
              />
              {o.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <span className={label}>Trading experience{req}</span>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Indicate your experience level for each product.
        </p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2 pr-3">Product</th>
                {EXPERIENCE_LEVELS.map((l) => (
                  <th key={l.value} className="py-2 px-2 text-center">
                    {l.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TRADING_PRODUCTS.map((p) => (
                <tr key={p.key} className="border-b border-border/50">
                  <td className="py-2 pr-3 text-foreground">{p.label}</td>
                  {EXPERIENCE_LEVELS.map((l) => (
                    <td key={l.value} className="py-2 px-2 text-center">
                      <input
                        type="radio"
                        name={`exp-${p.key}`}
                        checked={f.trading_experience[p.key] === l.value}
                        onChange={() =>
                          setF((prev) => ({
                            ...prev,
                            trading_experience: { ...prev.trading_experience, [p.key]: l.value },
                          }))
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <span className={label}>Risk tolerance{req}</span>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {RISK_LEVELS.map((r) => (
            <label key={r.value} className="flex items-center gap-2">
              <input
                type="radio"
                name="risk_tolerance"
                checked={f.risk_tolerance === r.value}
                onChange={() => setF((p) => ({ ...p, risk_tolerance: r.value }))}
              />
              {r.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeaturesStep({ f, setF }: StepProps) {
  const toggle = (id: string) =>
    setF((p) => ({
      ...p,
      account_features: p.account_features.includes(id)
        ? p.account_features.filter((x) => x !== id)
        : [...p.account_features, id],
    }));

  return (
    <div className="space-y-5 text-sm">
      <h3 className={sectionTitle}>Account features requested</h3>
      <p className="text-xs text-muted-foreground">
        Choose which capabilities you want enabled. Final approval is subject to suitability and
        regulatory review.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {ACCOUNT_FEATURES.map((feat) => (
          <label
            key={feat.id}
            className="flex items-center gap-2 rounded-md border border-border bg-surface/30 px-3 py-2"
          >
            <input
              type="checkbox"
              checked={f.account_features.includes(feat.id)}
              onChange={() => toggle(feat.id)}
            />
            <span className="text-foreground">{feat.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function BankingStep({ f, setF }: StepProps) {
  return (
    <div className="space-y-5 text-sm">
      <h3 className={sectionTitle}>Banking information (optional)</h3>
      <p className="text-xs text-muted-foreground">
        Adding bank details speeds up your first deposit and withdrawal. You can also add this
        later from Wallet.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label}>Bank name</label>
          <input
            className={cn("mt-1", field)}
            value={f.banking.bank_name}
            onChange={(e) =>
              setF((p) => ({ ...p, banking: { ...p.banking, bank_name: e.target.value } }))
            }
          />
        </div>
        <div>
          <label className={label}>Account holder name</label>
          <input
            className={cn("mt-1", field)}
            value={f.banking.account_holder}
            onChange={(e) =>
              setF((p) => ({
                ...p,
                banking: { ...p.banking, account_holder: e.target.value },
              }))
            }
          />
        </div>
        <div>
          <label className={label}>Account number / IBAN</label>
          <input
            className={cn("mt-1", field)}
            value={f.banking.account_number}
            onChange={(e) =>
              setF((p) => ({
                ...p,
                banking: { ...p.banking, account_number: e.target.value },
              }))
            }
            autoComplete="off"
          />
        </div>
        <div>
          <label className={label}>SWIFT / routing number</label>
          <input
            className={cn("mt-1", field)}
            value={f.banking.swift_or_routing}
            onChange={(e) =>
              setF((p) => ({
                ...p,
                banking: { ...p.banking, swift_or_routing: e.target.value },
              }))
            }
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
}

function YesNoRow({
  prompt,
  value,
  onChange,
  name,
}: {
  prompt: string;
  value: "" | "yes" | "no";
  onChange: (v: "yes" | "no") => void;
  name: string;
}) {
  return (
    <div className="rounded-md border border-border bg-surface/30 p-3">
      <p className="text-sm text-foreground">{prompt}</p>
      <div className="mt-2 flex gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name={name}
            checked={value === "yes"}
            onChange={() => onChange("yes")}
          />
          Yes
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name={name}
            checked={value === "no"}
            onChange={() => onChange("no")}
          />
          No
        </label>
      </div>
    </div>
  );
}

function RegulatoryStep({ f, setF }: StepProps) {
  return (
    <div className="space-y-5 text-sm">
      <h3 className={sectionTitle}>Regulatory declarations</h3>
      <div className="space-y-3">
        <YesNoRow
          name="pep"
          prompt="Are you a Politically Exposed Person (PEP)?"
          value={f.pep}
          onChange={(v) => setF((p) => ({ ...p, pep: v }))}
        />
        <YesNoRow
          name="broker_dealer_affiliation"
          prompt="Are you affiliated with a broker-dealer, exchange, or publicly traded company?"
          value={f.broker_dealer_affiliation}
          onChange={(v) => setF((p) => ({ ...p, broker_dealer_affiliation: v }))}
        />
        <YesNoRow
          name="insider_control_person"
          prompt="Are you an insider or control person of a publicly traded company?"
          value={f.insider_control_person}
          onChange={(v) => setF((p) => ({ ...p, insider_control_person: v }))}
        />
      </div>
    </div>
  );
}

/* --------------- CIP / KYC upload step --------------- */

type CipProps = StepProps & {
  kyc: KycDoc[];
  setKyc: React.Dispatch<React.SetStateAction<KycDoc[]>>;
};

function CipStep({ f, setF, kyc, setKyc }: CipProps) {
  const [uploading, setUploading] = useState<string | null>(null);
  const idInputRef = useRef<HTMLInputElement>(null);
  const poaInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  const refreshDocs = useCallback(async () => {
    const { data, error } = await supabase
      .from("kyc_documents")
      .select("id, doc_type, status, storage_path, submitted_at, review_notes")
      .order("submitted_at", { ascending: false });
    if (error) toast.error(error.message);
    setKyc((data as KycDoc[]) ?? []);
  }, [setKyc]);

  const uploadDoc = async (file: File, docType: string, label: string) => {
    if (!KYC_ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Unsupported file type. Use PDF, JPEG, PNG, WebP, or HEIC.");
      return;
    }
    if (file.size > KYC_MAX_BYTES) {
      toast.error("File must be under 10 MB.");
      return;
    }
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes.user) {
      toast.error("You must be signed in.");
      return;
    }
    const userId = userRes.user.id;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const path = `${userId}/${docType}-${Date.now()}.${ext}`;

    setUploading(docType);
    try {
      const { error: upErr } = await supabase.storage.from(KYC_BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (upErr) throw upErr;

      const { error: insErr } = await (supabase.from("kyc_documents") as any).insert({
        user_id: userId,
        doc_type: docType,
        storage_path: path,
        status: "pending",
      });
      if (insErr) {
        await supabase.storage.from(KYC_BUCKET).remove([path]);
        throw insErr;
      }
      toast.success(`${label} uploaded for review.`);
      await refreshDocs();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Upload failed: ${msg}`);
    } finally {
      setUploading(null);
    }
  };

  const deleteDoc = async (doc: KycDoc) => {
    if (doc.status === "approved") {
      toast.error("Approved documents cannot be removed.");
      return;
    }
    const { error } = await supabase.storage.from(KYC_BUCKET).remove([doc.storage_path]);
    if (error) toast.error(error.message);
    await refreshDocs();
  };

  const identityDocs = useMemo(
    () =>
      kyc.filter((d) =>
        ["passport", "driver_license", "drivers_license", "national_id"].includes(d.doc_type),
      ),
    [kyc],
  );
  const poaDocs = useMemo(() => kyc.filter((d) => d.doc_type === "proof_of_address"), [kyc]);
  const selfieDocs = useMemo(() => kyc.filter((d) => d.doc_type === "selfie"), [kyc]);

  return (
    <div className="space-y-5 text-sm">
      <h3 className={sectionTitle}>Customer identification program notice</h3>
      <div className="rounded-md border border-border bg-muted/15 p-4 text-xs leading-relaxed text-muted-foreground">
        To help the government fight money laundering and terrorist financing, federal law
        requires financial institutions to obtain, verify, and record information identifying each
        person opening an account. We may request additional documentation including passport,
        driver's license, proof of address, or biometric verification.
      </div>

      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          className="mt-1"
          checked={f.cip_acknowledged}
          onChange={(e) => setF((p) => ({ ...p, cip_acknowledged: e.target.checked }))}
        />
        <span className="text-foreground">
          I acknowledge the Customer Identification Program notice and authorize Hudson Crest
          Capital to verify my identity.
        </span>
      </label>

      <h4 className={sectionTitle}>Required document uploads</h4>

      <KycUploadCard
        title="Identity verification"
        subtitle="Passport, driver's license, or national ID."
        docs={identityDocs}
        inputRef={idInputRef}
        uploading={uploading === "passport"}
        onPick={() => idInputRef.current?.click()}
        onFile={(file) => void uploadDoc(file, "passport", "Identity document")}
        onDelete={deleteDoc}
        required
      />

      <KycUploadCard
        title="Proof of address"
        subtitle="Utility bill or bank statement within the last 90 days."
        docs={poaDocs}
        inputRef={poaInputRef}
        uploading={uploading === "proof_of_address"}
        onPick={() => poaInputRef.current?.click()}
        onFile={(file) => void uploadDoc(file, "proof_of_address", "Proof of address")}
        onDelete={deleteDoc}
        required
      />

      <KycUploadCard
        title="Selfie / liveness (optional)"
        subtitle="Speeds up identity verification when available."
        docs={selfieDocs}
        inputRef={selfieInputRef}
        uploading={uploading === "selfie"}
        onPick={() => selfieInputRef.current?.click()}
        onFile={(file) => void uploadDoc(file, "selfie", "Selfie / liveness")}
        onDelete={deleteDoc}
      />
    </div>
  );
}

function KycUploadCard({
  title,
  subtitle,
  docs,
  inputRef,
  uploading,
  onPick,
  onFile,
  onDelete,
  required,
}: {
  title: string;
  subtitle: string;
  docs: KycDoc[];
  inputRef: React.RefObject<HTMLInputElement | null>;
  uploading: boolean;
  onPick: () => void;
  onFile: (file: File) => void;
  onDelete: (doc: KycDoc) => void;
  required?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-surface/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            {title}
            {required && <span className="text-destructive"> *</span>}
          </p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onPick}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 rounded-md border border-brand/40 px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand/10 disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          {uploading ? "Uploading…" : "Upload"}
        </button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={KYC_ACCEPTED_TYPES.join(",")}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            if (inputRef.current) inputRef.current.value = "";
          }}
        />
      </div>

      {docs.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">No document uploaded yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 py-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate text-foreground/90">
                  {d.storage_path.split("/").pop()}
                </span>
                {d.status === "approved" && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                )}
                {d.status === "pending" && (
                  <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                )}
                {d.status === "rejected" && (
                  <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                )}
              </div>
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive disabled:opacity-40"
                onClick={() => onDelete(d)}
                disabled={d.status === "approved"}
                aria-label="Remove document"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
