import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { CountrySelect, IntlPhoneInput } from "@/components/portal/IntlPhoneInput";
import { isValidE164 } from "@/lib/countries";
import { INVESTOR_GOAL_OPTIONS } from "@/lib/investor-lite-goals";
import { supabase } from "@/integrations/supabase/client";
import { ensurePortalRole, formatPortalAuthError, resolvePortalRedirect } from "@/lib/portal-auth";
import { getPublicAppOrigin } from "@/lib/site-origin";
import {
  getEmailDomain,
  getReservedStaffDomains,
  isStrictAccountSeparationEnabled,
} from "@/lib/portal-signup-email-guard";
import { PENDING_ACCOUNT_APPLICATION_STORAGE_KEY } from "@/lib/flush-pending-account-application";
import type { AccountApplicationPayload } from "@/server/applications.functions";

const field =
  "w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground";
const fieldCompact = cn(field, "py-1.5 text-[13px] leading-tight");
const label = "block text-xs font-medium uppercase tracking-wider text-muted-foreground";
const req = <span className="text-destructive"> *</span>;
const sectionTitle = "text-sm font-semibold text-brand border-b border-border pb-1 mb-3";

const EXPERIENCE_KEYS = [
  { key: "stocks", label: "Stocks" },
  { key: "options", label: "Options" },
  { key: "funds", label: "Mutual funds" },
  { key: "futures", label: "Futures" },
  { key: "forex", label: "Forex" },
] as const;

const EXPERIENCE_OPTS = [
  { value: "", label: "— Choose one —" },
  { value: "none", label: "None" },
  { value: "1_3", label: "1–3 years" },
  { value: "4_7", label: "4–7 years" },
  { value: "8_plus", label: "8+ years" },
] as const;

const TRADE_FREQ_OPTS = [
  { value: "", label: "None" },
  { value: "1_5", label: "1–5" },
  { value: "6_20", label: "6–20" },
  { value: "21_50", label: "21–50" },
  { value: "50_plus", label: "50+" },
] as const;

const KNOWLEDGE_OPTS = [
  { value: "", label: "None" },
  { value: "limited", label: "Limited" },
  { value: "moderate", label: "Moderate" },
  { value: "strong", label: "Strong" },
] as const;

const REP_OPTIONS = [
  { value: "", label: "— Select one —" },
  { value: "unassigned", label: "Not yet assigned" },
  { value: "desk_ny", label: "New York" },
  { value: "desk_ldn", label: "London" },
  { value: "desk_sg", label: "Singapore" },
];

const ENTITY_TYPES = [
  { value: "individual", label: "Individual" },
  { value: "joint", label: "Joint" },
  { value: "joint_tic", label: "Joint as tenants-in-common" },
  { value: "corporate", label: "Corporate" },
  { value: "llc", label: "Limited liability company" },
  { value: "sole_prop", label: "Sole proprietorship" },
];

const PRODUCT_LINES = [
  { id: "equities", label: "Equities (Stocks)" },
  { id: "fixed_income", label: "Fixed Income (Bonds)" },
  { id: "funds", label: "Funds (Mutual Funds / ETFs)" },
  { id: "commodities", label: "Commodities" },
  { id: "forex", label: "Forex" },
  { id: "crypto", label: "Crypto" },
];

const DERIVATIVE_PRODUCT_LINES = [
  { id: "futures", label: "Futures" },
  { id: "options", label: "Options" },
  { id: "limited_risk_options", label: "Limited Risk Options Contracts" },
  { id: "warrants", label: "Warrants" },
  { id: "structured_products", label: "Structured Products" },
];

const ID_TYPES = [
  { value: "", label: "— Select one —" },
  { value: "drivers_license", label: "Driver's license" },
  { value: "passport", label: "Passport" },
  { value: "national_id", label: "National ID" },
  { value: "other", label: "Other government ID" },
];

const EMPLOYMENT = [
  { value: "employed", label: "Employed" },
  { value: "self_employed", label: "Self employed" },
  { value: "retired", label: "Retired" },
  { value: "student", label: "Student" },
  { value: "unemployed", label: "Unemployed" },
  { value: "other", label: "Other" },
] as const;

const INCOME = [
  { value: "", label: "— Choose one —" },
  { value: "under_50k", label: "Under $50,000" },
  { value: "50k_100k", label: "$50,000 – $100,000" },
  { value: "100k_250k", label: "$100,000 – $250,000" },
  { value: "250k_500k", label: "$250,000 – $500,000" },
  { value: "500k_1m", label: "$500,000 – $1,000,000" },
  { value: "over_1m", label: "Over $1,000,000" },
] as const;

const NET_WORTH = [
  { value: "", label: "— Choose one —" },
  { value: "under_50k", label: "Under $50,000" },
  { value: "50k_250k", label: "$50,000 – $250,000" },
  { value: "250k_1m", label: "$250,000 – $1,000,000" },
  { value: "1m_5m", label: "$1,000,000 – $5,000,000" },
  { value: "over_5m", label: "Over $5,000,000" },
] as const;

const SOURCE_FUNDS = [
  { value: "", label: "— Choose one —" },
  { value: "employment", label: "Employment income" },
  { value: "savings", label: "Savings" },
  { value: "investments", label: "Investments / securities" },
  { value: "inheritance", label: "Inheritance or gift" },
  { value: "business", label: "Business proceeds" },
  { value: "other", label: "Other" },
] as const;

const INV_EXP = [
  { value: "", label: "— Choose one —" },
  { value: "none", label: "None" },
  { value: "limited", label: "Limited" },
  { value: "moderate", label: "Moderate" },
  { value: "extensive", label: "Extensive" },
] as const;

const RISK = [
  { value: "", label: "— Choose one —" },
  { value: "conservative", label: "Conservative" },
  { value: "moderate", label: "Moderate" },
  { value: "aggressive", label: "Aggressive" },
] as const;

const LIQUID_NET_OPTS = [
  { value: "", label: "— Choose one —" },
  { value: "under_50k", label: "Under $50,000 liquid" },
  { value: "50k_250k", label: "$50,000 – $250,000" },
  { value: "250k_1m", label: "$250,000 – $1,000,000" },
  { value: "1m_5m", label: "$1,000,000 – $5,000,000" },
  { value: "over_5m", label: "Over $5,000,000" },
];

type ExpMap = Record<(typeof EXPERIENCE_KEYS)[number]["key"], string>;

function emptyExp(): ExpMap {
  return { stocks: "", options: "", funds: "", futures: "", forex: "" };
}

type FormState = {
  rep: string;
  firstName: string;
  middleName: string;
  lastName: string;
  country: string;
  nationality: string;
  phone: string;
  email: string;
  signupPassword: string;
  signupPasswordConfirm: string;
  employerName: string;
  employerAddress: string;
  portalSecurityAck: boolean;
  acceptedMinimums: boolean;
  products: string[];
  entityType: string;
  account_type: "cash" | "margin";
  base_currency: "USD" | "EUR" | "GBP";
  dob: string;
  citizenshipUs: boolean;
  citizenshipOther: string;
  idType: string;
  idNumber: string;
  mailLine1: string;
  mailLine2: string;
  mailCity: string;
  mailState: string;
  mailPostal: string;
  mailCountry: string;
  eveningPhone: string;
  cellPhone: string;
  fax: string;
  marital: string;
  dependents: string;
  expYears: ExpMap;
  monthlyTrades: ExpMap;
  knowledgeRating: ExpMap;
  employment_status: (typeof EMPLOYMENT)[number]["value"] | "";
  occupation: string;
  annual_income: string;
  net_worth: string;
  marginalBracket: string;
  liquidNet: string;
  source_of_funds: string;
  investment_experience: string;
  risk_tolerance: string;
  investment_objectives: string[];
  contractCount: string;
  contractNames: string;
  applicationMonies: string;
  fundingSourceDetail: string;
  supportingDocName: string;
  supportingNotes: string;
  agreedTerms: boolean;
  agreedRisk: boolean;
};

function defaultForm(email: string): FormState {
  return {
    rep: "",
    firstName: "",
    middleName: "",
    lastName: "",
    country: "US",
    nationality: "US",
    phone: "",
    email,
    signupPassword: "",
    signupPasswordConfirm: "",
    employerName: "",
    employerAddress: "",
    portalSecurityAck: false,
    acceptedMinimums: false,
    products: [],
    entityType: "individual",
    account_type: "cash",
    base_currency: "USD",
    dob: "",
    citizenshipUs: true,
    citizenshipOther: "",
    idType: "",
    idNumber: "",
    mailLine1: "",
    mailLine2: "",
    mailCity: "",
    mailState: "",
    mailPostal: "",
    mailCountry: "US",
    eveningPhone: "",
    cellPhone: "",
    fax: "",
    marital: "",
    dependents: "",
    expYears: emptyExp(),
    monthlyTrades: emptyExp(),
    knowledgeRating: emptyExp(),
    employment_status: "",
    occupation: "",
    annual_income: "",
    net_worth: "",
    marginalBracket: "",
    liquidNet: "",
    source_of_funds: "",
    investment_experience: "",
    risk_tolerance: "",
    investment_objectives: [],
    contractCount: "",
    contractNames: "",
    applicationMonies: "",
    fundingSourceDetail: "",
    supportingDocName: "",
    supportingNotes: "",
    agreedTerms: false,
    agreedRisk: false,
  };
}

const STEPS = [
  { key: "account", title: "Account information", subtitle: "Who is opening the account and how we reach you." },
  { key: "security", title: "Account security", subtitle: "Your Hudson Crest portal credentials." },
  { key: "type", title: "Account type", subtitle: "Products, entity type, and base currency." },
  { key: "details", title: "Account details", subtitle: "Identity, mailing address, and household information." },
  { key: "financial", title: "Financial information", subtitle: "Experience, income, net worth, and funding." },
  { key: "review", title: "Supporting materials & declarations", subtitle: "Optional documents and legal acknowledgements." },
] as const;

function validateStep(step: number, f: FormState, mode: "apply" | "signup"): string | null {
  if (step === 0) {
    if (!f.rep) return "Please select a representative or desk assignment.";
    if (!f.firstName.trim() || !f.lastName.trim()) return "First and last name are required.";
    if (!f.country) return "Country is required.";
    if (!f.phone.trim() || !isValidE164(f.phone)) return "A valid primary phone (E.164) is required.";
    if (!f.email.includes("@")) return "A valid email is required.";
  }
  if (step === 1) {
    if (mode === "signup") {
      if (f.signupPassword.length < 6) return "Password must be at least 6 characters.";
      if (f.signupPassword !== f.signupPasswordConfirm) return "Passwords do not match.";
    }
  }
  return null;
}

function buildPayload(f: FormState): AccountApplicationPayload {
  const wizard_payload = {
    representative: f.rep,
    middle_name: f.middleName.trim(),
    employer: { name: f.employerName.trim(), address: f.employerAddress.trim() },
    products: f.products,
    entity_type: f.entityType,
    citizenship: f.citizenshipUs ? "US" : f.citizenshipOther.trim(),
    id: { type: f.idType, number: f.idNumber.trim() },
    mailing: {
      line1: f.mailLine1.trim(),
      line2: f.mailLine2.trim(),
      city: f.mailCity.trim(),
      state: f.mailState.trim(),
      postal: f.mailPostal.trim(),
      country: f.mailCountry,
    },
    phones: {
      evening: f.eveningPhone.trim(),
      cell: f.cellPhone.trim(),
      fax: f.fax.trim(),
    },
    marital_status: f.marital,
    dependents: f.dependents.trim(),
    experience_years: f.expYears,
    monthly_trades: f.monthlyTrades,
    knowledge_rating: f.knowledgeRating,
    marginal_tax_bracket: f.marginalBracket,
    liquid_net_worth_band: f.liquidNet,
    contracts: { count: f.contractCount.trim(), names: f.contractNames.trim() },
    application_monies: f.applicationMonies.trim(),
    funding_source_detail: f.fundingSourceDetail.trim(),
    supporting_document_filename: f.supportingDocName.trim(),
    supporting_notes: f.supportingNotes.trim(),
  };

  return {
    legal_first_name: f.firstName.trim(),
    legal_last_name: f.lastName.trim(),
    date_of_birth: f.dob,
    phone: f.phone.trim(),
    country_of_residence: f.country.toUpperCase().slice(0, 2),
    nationality: f.nationality.toUpperCase().slice(0, 2),
    account_type: f.account_type,
    base_currency: f.base_currency,
    financial: {
      employment_status: f.employment_status as Exclude<FormState["employment_status"], "">,
      employer: f.employerName.trim() || undefined,
      occupation: f.occupation.trim() || undefined,
      annual_income: f.annual_income as AccountApplicationPayload["financial"]["annual_income"],
      net_worth: f.net_worth as AccountApplicationPayload["financial"]["net_worth"],
      source_of_funds: f.source_of_funds as AccountApplicationPayload["financial"]["source_of_funds"],
      investment_experience:
        f.investment_experience as AccountApplicationPayload["financial"]["investment_experience"],
      risk_tolerance: f.risk_tolerance as AccountApplicationPayload["financial"]["risk_tolerance"],
      investment_objectives: f.investment_objectives,
    },
    agreed_terms: true,
    agreed_risk: true,
    wizard_payload,
  };
}

export function FullAccountApplicationWizard({ mode = "apply" }: { mode?: "apply" | "signup" }) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(mode !== "signup");
  const [accounts, setAccounts] = useState<Array<{ status: string }>>([]);
  const [f, setF] = useState<FormState>(() => defaultForm(""));

  const load = useCallback(async () => {
    if (mode === "signup") {
      setAccounts([]);
      setF(defaultForm(""));
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [profRes, appRes] = await Promise.all([
        fetch("/api/portal/profile"),
        fetch("/api/portal/account-application"),
      ]);
      if (!profRes.ok) throw new Error("Could not load profile");
      const prof = (await profRes.json()) as {
        profile: Record<string, string | null> | null;
        email: string;
      };
      const app = appRes.ok ? ((await appRes.json()) as { accounts?: { status: string }[] }) : { accounts: [] };
      setAccounts(app.accounts ?? []);
      setF((prev) => ({
        ...defaultForm(prof.email ?? ""),
        ...prev,
        email: prof.email ?? "",
        firstName: prof.profile?.legal_first_name ?? "",
        lastName: prof.profile?.legal_last_name ?? "",
        phone: prof.profile?.phone ?? "",
        country: (prof.profile?.country_of_residence as string) || prev.country || "US",
        nationality: (prof.profile?.nationality as string) || prev.nationality || "US",
        dob: (prof.profile?.date_of_birth as string) || "",
      }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasActive = useMemo(() => accounts.some((a) => a.status === "active"), [accounts]);

  const next = () => {
    const err = validateStep(step, f, mode);
    if (err) {
      toast.error(err);
      return;
    }
    if (mode === "signup" && step === 0 && isStrictAccountSeparationEnabled()) {
      const reserved = getReservedStaffDomains();
      const domain = getEmailDomain(f.email.trim());
      if (domain && reserved.includes(domain)) {
        toast.error(
          "This email domain is reserved for staff/admin accounts. Please use a personal investor email instead.",
        );
        return;
      }
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const prev = () => setStep((s) => Math.max(0, s - 1));

  const submit = async () => {
    for (let i = 0; i < STEPS.length; i++) {
      const err = validateStep(i, f, mode);
      if (err) {
        toast.error(err);
        return;
      }
    }
    const payload = buildPayload(f);
    setBusy(true);
    try {
      if (mode === "signup") {
        const loginEmail = f.email.trim();
        const appOrigin = getPublicAppOrigin();
        const { data: signUpData, error: signErr } = await supabase.auth.signUp({
          email: loginEmail,
          password: f.signupPassword,
          options: {
            emailRedirectTo: `${appOrigin}/auth/confirm?next=${encodeURIComponent("/portal/login/investor")}`,
            data: {
              legal_first_name: f.firstName.trim(),
              legal_last_name: f.lastName.trim(),
              display_name: `${f.firstName.trim()} ${f.lastName.trim()}`,
              phone: f.phone.trim(),
              country_of_residence: f.country.toUpperCase().slice(0, 2),
              nationality: f.nationality.toUpperCase().slice(0, 2),
            },
          },
        });
        if (signErr) throw signErr;

        if (!signUpData.session) {
          try {
            sessionStorage.setItem(
              PENDING_ACCOUNT_APPLICATION_STORAGE_KEY,
              JSON.stringify({ email: loginEmail.toLowerCase(), payload }),
            );
          } catch {
            /* ignore quota */
          }
          toast.success(
            "Account created. After you confirm your email and sign in, your application will finish submitting automatically.",
          );
          const verifyPath = `/portal/login/investor?verify=required&email=${encodeURIComponent(loginEmail)}`;
          window.setTimeout(() => window.location.replace(verifyPath), 700);
          return;
        }

        const res = await fetch("/api/portal/account-application", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error ?? body?.details ?? `Submit failed (${res.status})`);

        const { data: sess } = await supabase.auth.getSession();
        if (!sess.session?.user) {
          toast.error("Signed up but session missing. Please sign in to complete your application.");
          return;
        }
        const role = await ensurePortalRole(supabase as never, sess.session.user.id);
        const target = resolvePortalRedirect(role, "/portal/investor");
        toast.success(
          body.merged
            ? "Application saved. Our desk will review your submission."
            : "Welcome — your application is submitted for desk review.",
        );
        window.setTimeout(() => window.location.replace(target), 600);
        return;
      }

      const res = await fetch("/api/portal/account-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? body?.details ?? `Submit failed (${res.status})`);
      toast.success(
        body.merged
          ? "Application updated. Our desk will review your submission."
          : "Application submitted. Our desk will review your submission.",
      );
      await load();
      window.setTimeout(() => {
        window.location.assign("/portal/investor");
      }, 900);
    } catch (e) {
      toast.error(formatPortalAuthError(e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  };

  const toggleProduct = (id: string) => {
    setF((prev) => ({
      ...prev,
      products: prev.products.includes(id) ? prev.products.filter((p) => p !== id) : [...prev.products, id],
    }));
  };

  const toggleGoal = (id: string) => {
    setF((prev) => ({
      ...prev,
      investment_objectives: prev.investment_objectives.includes(id)
        ? prev.investment_objectives.filter((g) => g !== id)
        : [...prev.investment_objectives, id].slice(0, 10),
    }));
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground py-8 text-center">Loading application…</div>;
  }

  if (hasActive) {
    return (
      <div className="rounded-lg border border-border bg-surface/50 p-6 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">You already have an active brokerage account.</p>
        <p className="mt-2">
          For additional entities or capacity, email{" "}
          <a className="text-brand hover:underline" href="mailto:onboarding@hudsoncrestcapital.com">
            onboarding@hudsoncrestcapital.com
          </a>{" "}
          or open a ticket from Support.
        </p>
        <Link to="/portal/investor" className="mt-4 inline-block text-brand text-sm hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className={cn("flex min-h-0 flex-col", step === 0 ? "gap-2 sm:gap-2.5" : "gap-6")}>
      <nav
        aria-label="Application steps"
        className={cn("flex shrink-0 flex-wrap", step === 0 ? "gap-1.5" : "gap-2")}
      >
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => (i < step ? setStep(i) : undefined)}
            className={cn(
              "rounded-full border font-medium transition-colors",
              step === 0 ? "px-2.5 py-0.5 text-[10px] sm:px-3 sm:py-1 sm:text-xs" : "px-3 py-1 text-xs",
              i === step && "border-brand bg-brand/15 text-foreground",
              i < step && "border-brand/40 text-brand hover:bg-brand/10",
              i > step && "border-border text-muted-foreground cursor-default",
            )}
            disabled={i > step}
          >
            {i + 1}. {s.title}
          </button>
        ))}
      </nav>

      <div className="shrink-0">
        <h2 className={cn("font-semibold text-foreground", step === 0 ? "text-base" : "text-lg")}>
          {STEPS[step].title}
        </h2>
        <p
          className={cn(
            "text-muted-foreground",
            step === 0 ? "mt-0.5 text-xs leading-snug sm:max-w-[42rem]" : "mt-1 text-sm",
          )}
        >
          {step === 1 && mode === "signup"
            ? "Choose a secure password for the email you entered. You can add MFA after sign-in from Settings."
            : STEPS[step].subtitle}
        </p>
      </div>

      {step === 0 && (
        <div className="space-y-2.5 text-sm sm:space-y-2">
          <details className="group rounded-md border border-border/80 bg-muted/10 text-xs text-muted-foreground open:bg-muted/15">
            <summary className="cursor-pointer list-none px-2.5 py-1.5 font-medium text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="inline-flex w-full items-center justify-between gap-2">
                <span>What you will need for this application</span>
                <span className="text-[10px] font-normal text-brand group-open:hidden">Show</span>
                <span className="hidden text-[10px] font-normal text-brand group-open:inline">Hide</span>
              </span>
            </summary>
            <div className="border-t border-border/50 px-2.5 pb-2 pt-1.5 leading-snug">
              <p className="text-[11px]">
                Most people finish in under ten minutes. Have government ID ready, plus employer name and address.
                You will add mailing address and household details on a later step.
              </p>
              <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[11px]">
                <li>Photo ID (driver license, passport, or national ID)</li>
                <li>Employer legal name and business address</li>
                <li>Country of residence drives phone format and regulatory routing</li>
              </ul>
            </div>
          </details>

          <div className="grid grid-cols-1 gap-2.5 sm:gap-2 md:grid-cols-2 lg:grid-cols-12 lg:gap-x-3 lg:gap-y-2">
            <div className="md:col-span-2 lg:col-span-4">
              <label className={cn(label, "text-[10px]")}>
                Representative{req}
              </label>
              <select
                className={cn("mt-0.5", fieldCompact)}
                value={f.rep}
                onChange={(e) => setF({ ...f, rep: e.target.value })}
              >
                {REP_OPTIONS.map((o) => (
                  <option key={o.value || "blank"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 md:col-span-2 lg:col-span-8">
              <div>
                <label className={cn(label, "text-[10px]")}>First name{req}</label>
                <input
                  className={cn("mt-0.5", fieldCompact)}
                  value={f.firstName}
                  onChange={(e) => setF({ ...f, firstName: e.target.value })}
                />
              </div>
              <div>
                <label className={cn(label, "text-[10px]")}>Middle</label>
                <input
                  className={cn("mt-0.5", fieldCompact)}
                  value={f.middleName}
                  onChange={(e) => setF({ ...f, middleName: e.target.value })}
                />
              </div>
              <div>
                <label className={cn(label, "text-[10px]")}>Last name{req}</label>
                <input
                  className={cn("mt-0.5", fieldCompact)}
                  value={f.lastName}
                  onChange={(e) => setF({ ...f, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="lg:col-span-4">
              <label className={cn(label, "text-[10px]")}>Country of residence{req}</label>
              <div className="mt-0.5">
                <CountrySelect value={f.country} onChange={(c) => setF({ ...f, country: c })} />
              </div>
            </div>
            <div className="lg:col-span-4">
              <label className={cn(label, "text-[10px]")}>Primary / daytime phone{req}</label>
              <div className="mt-0.5">
                <IntlPhoneInput value={f.phone} onChange={(p) => setF({ ...f, phone: p })} country={f.country} />
              </div>
            </div>
            <div className="md:col-span-2 lg:col-span-4">
              <label className={cn(label, "text-[10px]")}>Email{req}</label>
              <input
                type="email"
                className={cn("mt-0.5", fieldCompact)}
                value={f.email}
                onChange={(e) => setF({ ...f, email: e.target.value })}
              />
            </div>

            <div className="md:col-span-1 lg:col-span-6">
              <label className={cn(label, "text-[10px]")}>Employer name</label>
              <input
                className={cn("mt-0.5", fieldCompact)}
                value={f.employerName}
                onChange={(e) => setF({ ...f, employerName: e.target.value })}
              />
            </div>
            <div className="md:col-span-1 lg:col-span-6">
              <label className={cn(label, "text-[10px]")}>Employer address</label>
              <textarea
                rows={2}
                className={cn("mt-0.5 min-h-0 resize-y", fieldCompact)}
                placeholder="Street, city, region / state"
                value={f.employerAddress}
                onChange={(e) => setF({ ...f, employerAddress: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      {step === 1 && mode === "signup" && (
        <div className="space-y-4 text-sm">
          <h3 className={sectionTitle}>Portal password</h3>
          <p className="text-muted-foreground">
            Use at least six characters. This password signs you into the Hudson Crest investor portal.
          </p>
          <div>
            <label className={label}>Password{req}</label>
            <input
              type="password"
              autoComplete="new-password"
              className={cn("mt-1", field)}
              value={f.signupPassword}
              onChange={(e) => setF({ ...f, signupPassword: e.target.value })}
            />
          </div>
          <div>
            <label className={label}>Confirm password{req}</label>
            <input
              type="password"
              autoComplete="new-password"
              className={cn("mt-1", field)}
              value={f.signupPasswordConfirm}
              onChange={(e) => setF({ ...f, signupPasswordConfirm: e.target.value })}
            />
          </div>
          <h3 className={cn(sectionTitle, "mt-6")}>Security practices</h3>
          <p className="text-muted-foreground">
            We use email-based sign-in with optional MFA. Legacy in-browser security questions are not collected; use
            Settings after sign-in for recovery options.
          </p>
          <label className="flex items-start gap-2 text-foreground">
            <input
              type="checkbox"
              className="mt-1"
              checked={f.portalSecurityAck}
              onChange={(e) => setF({ ...f, portalSecurityAck: e.target.checked })}
            />
            <span>I understand how to manage my portal password and security settings.</span>
          </label>
        </div>
      )}

      {step === 1 && mode === "apply" && (
        <div className="space-y-4 text-sm text-muted-foreground">
          <h3 className={sectionTitle}>Provide username and password</h3>
          <p>
            Your <strong className="text-foreground">Hudson Crest investor portal</strong> login is already active
            from self-serve signup. Usernames must remain at least eight characters where configured; change your
            password or display preferences anytime under{" "}
            <Link to="/portal/investor/settings" className="text-brand hover:underline">
              Investor → Settings
            </Link>
            .
          </p>
          <h3 className={cn(sectionTitle, "mt-6")}>Security questions (reference)</h3>
          <p>
            Legacy broker flows collected security Q&amp;A in-browser. We rely on modern authentication (email
            confirmation, optional MFA in Settings, and support-assisted recovery). Acknowledge below to continue.
          </p>
          <label className="flex items-start gap-2 text-foreground">
            <input
              type="checkbox"
              className="mt-1"
              checked={f.portalSecurityAck}
              onChange={(e) => setF({ ...f, portalSecurityAck: e.target.checked })}
            />
            <span>I understand how to manage my portal password and security settings.</span>
          </label>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5 text-sm">
          <h3 className={sectionTitle}>What will you be trading?</h3>
          <div className="space-y-2">
            {PRODUCT_LINES.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-foreground">
                <input
                  type="checkbox"
                  checked={f.products.includes(p.id)}
                  onChange={() => toggleProduct(p.id)}
                />
                {p.label}
              </label>
            ))}
            <div className="pt-1 text-foreground">Derivatives</div>
            <div className="space-y-2 pl-6">
              {DERIVATIVE_PRODUCT_LINES.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-foreground">
                  <input
                    type="checkbox"
                    checked={f.products.includes(p.id)}
                    onChange={() => toggleProduct(p.id)}
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>

          <h3 className={cn(sectionTitle, "mt-6")}>Select the account type you need</h3>
          <div className="space-y-2">
            {ENTITY_TYPES.map((e) => (
              <label key={e.value} className="flex items-center gap-2 text-foreground">
                <input
                  type="radio"
                  name="entity"
                  checked={f.entityType === e.value}
                  onChange={() => setF({ ...f, entityType: e.value })}
                />
                {e.label}
              </label>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5 text-sm">
          <p className="text-muted-foreground">
            Complete identity and mailing information. Fields marked with an asterisk are required for regulatory
            records.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={label}>Date of birth</label>
              <input
                type="date"
                className={cn("mt-1", field)}
                value={f.dob}
                onChange={(e) => setF({ ...f, dob: e.target.value })}
              />
            </div>
            <div>
              <label className={label}>Base currency</label>
              <select
                className={cn("mt-1", field)}
                value={f.base_currency}
                onChange={(e) => setF({ ...f, base_currency: e.target.value as FormState["base_currency"] })}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>
          <div>
            <span className={label}>Citizenship</span>
            <div className="mt-2 flex flex-wrap gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="cit"
                  checked={f.citizenshipUs}
                  onChange={() => setF({ ...f, citizenshipUs: true })}
                />
                U.S. person
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="cit"
                  checked={!f.citizenshipUs}
                  onChange={() => setF({ ...f, citizenshipUs: false })}
                />
                Non–U.S. person
              </label>
            </div>
            {!f.citizenshipUs && (
              <input
                className={cn("mt-2", field)}
                placeholder="Country of citizenship if non–U.S."
                value={f.citizenshipOther}
                onChange={(e) => setF({ ...f, citizenshipOther: e.target.value })}
              />
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={label}>Type of ID</label>
              <select className={cn("mt-1", field)} value={f.idType} onChange={(e) => setF({ ...f, idType: e.target.value })}>
                {ID_TYPES.map((o) => (
                  <option key={o.value || "x"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>ID number</label>
              <input className={cn("mt-1", field)} value={f.idNumber} onChange={(e) => setF({ ...f, idNumber: e.target.value })} />
            </div>
          </div>
          <h3 className={sectionTitle}>Mailing address</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={label}>Address line 1</label>
              <input className={cn("mt-1", field)} value={f.mailLine1} onChange={(e) => setF({ ...f, mailLine1: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Address line 2</label>
              <input className={cn("mt-1", field)} value={f.mailLine2} onChange={(e) => setF({ ...f, mailLine2: e.target.value })} />
            </div>
            <div>
              <label className={label}>City</label>
              <input className={cn("mt-1", field)} value={f.mailCity} onChange={(e) => setF({ ...f, mailCity: e.target.value })} />
            </div>
            <div>
              <label className={label}>State / region</label>
              <input className={cn("mt-1", field)} value={f.mailState} onChange={(e) => setF({ ...f, mailState: e.target.value })} />
            </div>
            <div>
              <label className={label}>Postal code</label>
              <input className={cn("mt-1", field)} value={f.mailPostal} onChange={(e) => setF({ ...f, mailPostal: e.target.value })} />
            </div>
            <div>
              <label className={label}>Country</label>
              <div className="mt-1">
                <CountrySelect value={f.mailCountry} onChange={(c) => setF({ ...f, mailCountry: c })} />
              </div>
            </div>
          </div>
          <h3 className={sectionTitle}>Contact information</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={label}>Evening phone</label>
              <input className={cn("mt-1", field)} value={f.eveningPhone} onChange={(e) => setF({ ...f, eveningPhone: e.target.value })} />
            </div>
            <div>
              <label className={label}>Mobile phone</label>
              <input className={cn("mt-1", field)} value={f.cellPhone} onChange={(e) => setF({ ...f, cellPhone: e.target.value })} />
            </div>
            <div>
              <label className={label}>Fax</label>
              <input className={cn("mt-1", field)} value={f.fax} onChange={(e) => setF({ ...f, fax: e.target.value })} />
            </div>
            <div>
              <label className={label}>Email</label>
              <input type="email" className={cn("mt-1", field)} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            </div>
          </div>
          <h3 className={sectionTitle}>Marital status</h3>
          <div className="flex flex-wrap gap-4">
            {["Single", "Married", "Domestic partner", "Other"].map((m) => (
              <label key={m} className="flex items-center gap-2">
                <input type="radio" name="marital" checked={f.marital === m} onChange={() => setF({ ...f, marital: m })} />
                {m}
              </label>
            ))}
          </div>
          <div>
            <label className={label}>Number of dependents</label>
            <input className={cn("mt-1 max-w-xs", field)} value={f.dependents} onChange={(e) => setF({ ...f, dependents: e.target.value })} />
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-6 text-sm">
          <div>
            <h3 className={sectionTitle}>Individual account owner — years of experience</h3>
            <p className="mb-3 text-xs text-muted-foreground">Please indicate years of experience for each asset class.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {EXPERIENCE_KEYS.map((row) => (
                <div key={row.key}>
                  <label className={label}>
                    {row.label}
                  </label>
                  <select
                    className={cn("mt-1", field)}
                    value={f.expYears[row.key]}
                    onChange={(e) =>
                      setF({ ...f, expYears: { ...f.expYears, [row.key]: e.target.value } })
                    }
                  >
                    {EXPERIENCE_OPTS.map((o) => (
                      <option key={o.value || "b"} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className={sectionTitle}>Average trades executed in a month (optional)</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {EXPERIENCE_KEYS.map((row) => (
                <div key={row.key}>
                  <label className={label}>{row.label}</label>
                  <select
                    className={cn("mt-1", field)}
                    value={f.monthlyTrades[row.key]}
                    onChange={(e) =>
                      setF({ ...f, monthlyTrades: { ...f.monthlyTrades, [row.key]: e.target.value } })
                    }
                  >
                    {TRADE_FREQ_OPTS.map((o) => (
                      <option key={o.value || "b"} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className={sectionTitle}>Rate your trading knowledge (optional)</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {EXPERIENCE_KEYS.map((row) => (
                <div key={row.key}>
                  <label className={label}>{row.label}</label>
                  <select
                    className={cn("mt-1", field)}
                    value={f.knowledgeRating[row.key]}
                    onChange={(e) =>
                      setF({ ...f, knowledgeRating: { ...f.knowledgeRating, [row.key]: e.target.value } })
                    }
                  >
                    {KNOWLEDGE_OPTS.map((o) => (
                      <option key={o.value || "b"} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={label}>Employment status</label>
              <select
                className={cn("mt-1", field)}
                value={f.employment_status}
                onChange={(e) =>
                  setF({ ...f, employment_status: e.target.value as FormState["employment_status"] })
                }
              >
                <option value="">— Choose one —</option>
                {EMPLOYMENT.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Occupation / title</label>
              <input className={cn("mt-1", field)} value={f.occupation} onChange={(e) => setF({ ...f, occupation: e.target.value })} />
            </div>
            <div>
              <label className={label}>Approximate annual income</label>
              <select
                className={cn("mt-1", field)}
                value={f.annual_income}
                onChange={(e) => setF({ ...f, annual_income: e.target.value })}
              >
                {INCOME.map((o) => (
                  <option key={o.value || "b"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Approximate total net worth</label>
              <select
                className={cn("mt-1", field)}
                value={f.net_worth}
                onChange={(e) => setF({ ...f, net_worth: e.target.value })}
              >
                {NET_WORTH.map((o) => (
                  <option key={o.value || "b"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 text-xs text-muted-foreground">
              Total net worth includes investments, cash, property, and other assets minus liabilities (excluding
              primary residence rules may apply in your jurisdiction).
            </div>
            <div>
              <label className={label}>Approximate liquid net worth</label>
              <select
                className={cn("mt-1", field)}
                value={f.liquidNet}
                onChange={(e) => setF({ ...f, liquidNet: e.target.value })}
              >
                {LIQUID_NET_OPTS.map((o) => (
                  <option key={o.value || "b"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Source of funds to be deposited</label>
              <select
                className={cn("mt-1", field)}
                value={f.source_of_funds}
                onChange={(e) => setF({ ...f, source_of_funds: e.target.value })}
              >
                {SOURCE_FUNDS.map((o) => (
                  <option key={o.value || "b"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Overall trading / investing experience</label>
              <select
                className={cn("mt-1", field)}
                value={f.investment_experience}
                onChange={(e) => setF({ ...f, investment_experience: e.target.value })}
              >
                {INV_EXP.map((o) => (
                  <option key={o.value || "b"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Risk tolerance</label>
              <select
                className={cn("mt-1", field)}
                value={f.risk_tolerance}
                onChange={(e) => setF({ ...f, risk_tolerance: e.target.value })}
              >
                {RISK.map((o) => (
                  <option key={o.value || "b"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <h3 className={sectionTitle}>Investment objectives (select all that apply)</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {INVESTOR_GOAL_OPTIONS.map((g) => (
                <label key={g.id} className="flex items-center gap-2">
                  <input type="checkbox" checked={f.investment_objectives.includes(g.id)} onChange={() => toggleGoal(g.id)} />
                  {g.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <h3 className={sectionTitle}>Contract applied for (optional)</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={label}>Number of contracts</label>
                <input className={cn("mt-1", field)} value={f.contractCount} onChange={(e) => setF({ ...f, contractCount: e.target.value })} />
              </div>
              <div>
                <label className={label}>Name of contract(s)</label>
                <input className={cn("mt-1", field)} value={f.contractNames} onChange={(e) => setF({ ...f, contractNames: e.target.value })} />
              </div>
            </div>
          </div>
          <div>
            <h3 className={sectionTitle}>Application monies (optional)</h3>
            <input
              className={cn("mt-1 max-w-md", field)}
              placeholder="Enter the application amount you intend to fund"
              value={f.applicationMonies}
              onChange={(e) => setF({ ...f, applicationMonies: e.target.value })}
            />
          </div>
          <div>
            <h3 className={sectionTitle}>How will you fund your account?</h3>
            <textarea
              className={cn("mt-1 min-h-[80px]", field)}
              placeholder="Bank name, region, expected transfer size, timing, etc."
              value={f.fundingSourceDetail}
              onChange={(e) => setF({ ...f, fundingSourceDetail: e.target.value })}
            />
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-5 text-sm">
          <h3 className={sectionTitle}>Attach supporting document (optional)</h3>
          <p className="text-muted-foreground">
            For regulatory-grade uploads, use{" "}
            <Link to="/portal/investor/kyc" className="text-brand hover:underline">
              Investor → KYC
            </Link>{" "}
            after you submit this application. You may note what you plan to upload below.
          </p>
          <input
            type="file"
            className={cn("mt-1 block w-full text-xs text-muted-foreground", field)}
            onChange={(e) => {
              const file = e.target.files?.[0];
              setF({ ...f, supportingDocName: file ? file.name : "" });
            }}
          />
          <textarea
            className={cn("min-h-[72px]", field)}
            placeholder="Describe any documents you will upload via KYC (optional)"
            value={f.supportingNotes}
            onChange={(e) => setF({ ...f, supportingNotes: e.target.value })}
          />
          <div className="rounded-md border border-dashed border-border bg-muted/10 p-4 text-xs text-muted-foreground">
            Automated abuse protection is enforced on our APIs. A legacy visual CAPTCHA is not shown here; do not
            submit this form using automated tools.
          </div>
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={f.agreedTerms} onChange={(e) => setF({ ...f, agreedTerms: e.target.checked })} />
            <span>
              I have read and agree to the{" "}
              <Link to="/terms" className="text-brand hover:underline">
                Terms of Service
              </Link>{" "}
              and representations made in this application.
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={f.agreedRisk} onChange={(e) => setF({ ...f, agreedRisk: e.target.checked })} />
            <span>
              I understand trading involves substantial risk of loss and that past performance is not indicative of
              future results.
            </span>
          </label>
        </div>
      )}

      <div
        className={cn(
          "flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border",
          step === 0 ? "pt-2.5" : "pt-4",
        )}
      >
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
            {busy ? (mode === "signup" ? "Creating account…" : "Submitting…") : mode === "signup" ? "Create account" : "Submit application"}{" "}
            <Check className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
