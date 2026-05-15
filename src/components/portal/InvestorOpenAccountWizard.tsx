import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowRight, ChevronLeft, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CountrySelect, IntlPhoneInput } from "@/components/portal/IntlPhoneInput";
import { cn } from "@/lib/utils";
import {
  ACCOUNT_TYPES,
  EXP_YEARS,
  GBP_INCOME,
  GBP_NET,
  ID_TYPES,
  KNOWLEDGE,
  MAIL_COUNTRIES,
  MARGINAL,
  SALES_REPS,
  SOURCE_ASSETS,
  SOURCE_INCOME,
  TRADES_MONTH,
} from "@/lib/accountOpeningConstants";
import {
  submitInvestorPortalSignup,
  toastSignupSubmitError,
  validateInvestorSignupCredentials,
} from "@/lib/investor-signup-submit";

const CHOOSE = "-- Choose One --";

const fieldClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export type OpenAccountDraft = {
  accountType: string;
  salesRep: string;
  legalFirst: string;
  legalMiddle: string;
  legalLast: string;
  dateOfBirth: string;
  ukCitizen: "uk" | "non";
  idType: string;
  idNumber: string;
  mailAddress1: string;
  mailAddress2: string;
  mailCity: string;
  mailState: string;
  mailCountry: string;
  mailPostal: string;
  phonePrimary: string;
  phoneHome: string;
  phoneCell: string;
  fax: string;
  contactEmail: string;
  filingStatus: "single" | "married";
  dependents: string;
  expStocks: string;
  expOptions: string;
  expFunds: string;
  expFutures: string;
  expForex: string;
  tradesStocks: string;
  tradesOptions: string;
  tradesFunds: string;
  tradesFutures: string;
  tradesForex: string;
  knowStocks: string;
  knowOptions: string;
  knowFunds: string;
  knowFutures: string;
  knowForex: string;
  jointFirst: string;
  jointMiddle: string;
  jointLast: string;
  jointDob: string;
  jointIdNumber: string;
  annualIncome: string;
  marginalBracket: string;
  totalNetWorth: string;
  liquidNetWorth: string;
  sourceIncome: string;
  contractAppliedFor: string;
  contractCount: string;
  contractNames: string;
  applicationMonies: string;
  fundingSource: string;
  email: string;
  country: string;
  phone: string;
  password: string;
  passwordConfirm: string;
  agreedTerms: boolean;
  agreedRisk: boolean;
};

function initialDraft(): OpenAccountDraft {
  return {
    accountType: "Individual",
    salesRep: SALES_REPS[0],
    legalFirst: "",
    legalMiddle: "",
    legalLast: "",
    dateOfBirth: "",
    ukCitizen: "uk",
    idType: ID_TYPES[0],
    idNumber: "",
    mailAddress1: "",
    mailAddress2: "",
    mailCity: "",
    mailState: "",
    mailCountry: MAIL_COUNTRIES[0],
    mailPostal: "",
    phonePrimary: "",
    phoneHome: "",
    phoneCell: "",
    fax: "",
    contactEmail: "",
    filingStatus: "single",
    dependents: "0",
    expStocks: "None",
    expOptions: "None",
    expFunds: "None",
    expFutures: "None",
    expForex: "None",
    tradesStocks: "None",
    tradesOptions: "None",
    tradesFunds: "None",
    tradesFutures: "None",
    tradesForex: "None",
    knowStocks: "None",
    knowOptions: "None",
    knowFunds: "None",
    knowFutures: "None",
    knowForex: "None",
    jointFirst: "",
    jointMiddle: "",
    jointLast: "",
    jointDob: "",
    jointIdNumber: "",
    annualIncome: CHOOSE,
    marginalBracket: CHOOSE,
    totalNetWorth: CHOOSE,
    liquidNetWorth: CHOOSE,
    sourceIncome: CHOOSE,
    contractAppliedFor: "",
    contractCount: "",
    contractNames: "",
    applicationMonies: "",
    fundingSource: CHOOSE,
    email: "",
    country: "US",
    phone: "",
    password: "",
    passwordConfirm: "",
    agreedTerms: false,
    agreedRisk: false,
  };
}

function buildOpenAccountApplication(d: OpenAccountDraft): Record<string, unknown> {
  return {
    account_type: d.accountType,
    sales_rep: d.salesRep,
    primary_owner: {
      first_name: d.legalFirst.trim(),
      middle_name: d.legalMiddle.trim(),
      last_name: d.legalLast.trim(),
      date_of_birth: d.dateOfBirth.trim(),
      uk_citizen: d.ukCitizen,
      id_type: d.idType,
      id_number: d.idNumber.trim(),
    },
    mailing_address: {
      line1: d.mailAddress1.trim(),
      line2: d.mailAddress2.trim(),
      city: d.mailCity.trim(),
      state: d.mailState.trim(),
      country: d.mailCountry,
      postal_code: d.mailPostal.trim(),
    },
    contact: {
      phone_primary: d.phonePrimary.trim(),
      phone_home: d.phoneHome.trim(),
      phone_cell: d.phoneCell.trim(),
      fax: d.fax.trim(),
      email: d.contactEmail.trim(),
    },
    tax_household: {
      filing_status: d.filingStatus,
      dependents: d.dependents.trim(),
    },
    experience_years: {
      stocks: d.expStocks,
      options: d.expOptions,
      mutual_funds: d.expFunds,
      futures: d.expFutures,
      forex: d.expForex,
    },
    trades_per_month: {
      stocks: d.tradesStocks,
      options: d.tradesOptions,
      funds: d.tradesFunds,
      futures: d.tradesFutures,
      forex: d.tradesForex,
    },
    knowledge: {
      stocks: d.knowStocks,
      options: d.knowOptions,
      funds: d.knowFunds,
      futures: d.knowFutures,
      forex: d.knowForex,
    },
    joint_owner:
      d.accountType === "Joint"
        ? {
            first_name: d.jointFirst.trim(),
            middle_name: d.jointMiddle.trim(),
            last_name: d.jointLast.trim(),
            date_of_birth: d.jointDob.trim(),
            id_number: d.jointIdNumber.trim(),
          }
        : null,
    financial: {
      annual_income: d.annualIncome,
      marginal_bracket: d.marginalBracket,
      total_net_worth: d.totalNetWorth,
      liquid_net_worth: d.liquidNetWorth,
      source_of_income: d.sourceIncome,
    },
    contracts: {
      applied_for: d.contractAppliedFor.trim(),
      count: d.contractCount.trim(),
      names: d.contractNames.trim(),
      application_monies: d.applicationMonies.trim(),
      funding_source: d.fundingSource,
    },
  };
}

function validateStep1(d: OpenAccountDraft): string | null {
  if (!d.legalFirst.trim() || !d.legalLast.trim()) return "Primary owner first and last name are required.";
  if (!d.dateOfBirth.trim()) return "Date of birth is required.";
  if (!d.idNumber.trim()) return "ID number is required.";
  if (!d.mailAddress1.trim()) return "Mailing address line 1 is required.";
  if (!d.mailCity.trim()) return "City is required.";
  if (!d.mailPostal.trim()) return "Postal code is required.";
  if (!d.phonePrimary.trim()) return "Primary phone is required.";
  if (!d.contactEmail.includes("@")) return "A valid contact email is required.";
  return null;
}

function validateStep2(d: OpenAccountDraft): string | null {
  if (d.accountType === "Joint") {
    if (!d.jointFirst.trim() || !d.jointLast.trim()) return "Joint owner first and last name are required.";
    if (!d.jointDob.trim()) return "Joint owner date of birth is required.";
    if (!d.jointIdNumber.trim()) return "Joint owner ID number is required.";
  }
  if (d.annualIncome === CHOOSE) return "Please select approximate annual income.";
  if (d.marginalBracket === CHOOSE) return "Please select your marginal tax bracket.";
  if (d.totalNetWorth === CHOOSE) return "Please select approximate total net worth.";
  if (d.liquidNetWorth === CHOOSE) return "Please select approximate liquid net worth.";
  if (d.sourceIncome === CHOOSE) return "Please select your primary source of income.";
  return null;
}

export function InvestorOpenAccountWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [d, setD] = useState<OpenAccountDraft>(initialDraft);
  const [busy, setBusy] = useState(false);

  const update = <K extends keyof OpenAccountDraft>(key: K, value: OpenAccountDraft[K]) =>
    setD((prev) => ({ ...prev, [key]: value }));

  const onNext = () => {
    if (step === 1) {
      const err = validateStep1(d);
      if (err) {
        toast.error(err);
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      const err = validateStep2(d);
      if (err) {
        toast.error(err);
        return;
      }
      setStep(3);
    }
  };

  const onBack = () => {
    if (step === 2) setStep(1);
    if (step === 3) setStep(2);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const credErr = validateInvestorSignupCredentials({
      firstName: d.legalFirst,
      lastName: d.legalLast,
      email: d.email,
      country: d.country,
      phone: d.phone,
      password: d.password,
      passwordConfirm: d.passwordConfirm,
      agreedTerms: d.agreedTerms,
      agreedRisk: d.agreedRisk,
    });
    if (credErr) {
      toast.error(credErr);
      return;
    }
    if (d.fundingSource === CHOOSE) {
      toast.error("Please select how you will fund your account.");
      return;
    }

    setBusy(true);
    try {
      await submitInvestorPortalSignup({
        firstName: d.legalFirst.trim(),
        lastName: d.legalLast.trim(),
        email: d.email.trim(),
        country: d.country,
        phone: d.phone.trim(),
        password: d.password,
        openAccountApplication: buildOpenAccountApplication(d),
        navigate,
      });
    } catch (err) {
      toastSignupSubmitError(err);
    } finally {
      setBusy(false);
    }
  };

  const jointDisabled = d.accountType !== "Joint";

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="flex flex-wrap items-center gap-2" aria-label="Progress">
        {([1, 2, 3] as const).map((n) => (
          <button
            key={n}
            type="button"
            disabled={n > step || busy}
            onClick={() => {
              if (n < step) setStep(n);
            }}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
              step === n
                ? "bg-primary text-primary-foreground"
                : n < step
                  ? "bg-muted text-foreground hover:bg-muted/80"
                  : "bg-muted/50 text-muted-foreground",
            )}
          >
            Step {n}
          </button>
        ))}
        <span className="ml-2 text-xs text-muted-foreground">
          {step === 1 && "Owner, address & experience"}
          {step === 2 && "Joint (if applicable) & financial profile"}
          {step === 3 && "Contracts, funding & portal access"}
        </span>
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground">Account</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="accountType">Type of account</Label>
                <select
                  id="accountType"
                  className={cn("mt-1.5", fieldClass)}
                  value={d.accountType}
                  onChange={(e) => update("accountType", e.target.value)}
                  disabled={busy}
                >
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="salesRep">Sales representative</Label>
                <select
                  id="salesRep"
                  className={cn("mt-1.5", fieldClass)}
                  value={d.salesRep}
                  onChange={(e) => update("salesRep", e.target.value)}
                  disabled={busy}
                >
                  {SALES_REPS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground">Primary account owner</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="legalFirst">First name</Label>
                <Input
                  id="legalFirst"
                  className="mt-1.5"
                  value={d.legalFirst}
                  onChange={(e) => update("legalFirst", e.target.value)}
                  disabled={busy}
                  autoComplete="given-name"
                />
              </div>
              <div>
                <Label htmlFor="legalMiddle">Middle name</Label>
                <Input
                  id="legalMiddle"
                  className="mt-1.5"
                  value={d.legalMiddle}
                  onChange={(e) => update("legalMiddle", e.target.value)}
                  disabled={busy}
                />
              </div>
              <div>
                <Label htmlFor="legalLast">Last name</Label>
                <Input
                  id="legalLast"
                  className="mt-1.5"
                  value={d.legalLast}
                  onChange={(e) => update("legalLast", e.target.value)}
                  disabled={busy}
                  autoComplete="family-name"
                />
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="dob">Date of birth</Label>
                <Input
                  id="dob"
                  className="mt-1.5"
                  value={d.dateOfBirth}
                  onChange={(e) => update("dateOfBirth", e.target.value)}
                  disabled={busy}
                  placeholder="DD/MM/YYYY or MM/DD/YYYY"
                />
              </div>
              <div>
                <span className="text-sm font-medium">Citizenship</span>
                <div className="mt-2 flex flex-wrap gap-4 text-sm">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="ukc"
                      checked={d.ukCitizen === "uk"}
                      onChange={() => update("ukCitizen", "uk")}
                      disabled={busy}
                    />
                    U.K. citizen
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="ukc"
                      checked={d.ukCitizen === "non"}
                      onChange={() => update("ukCitizen", "non")}
                      disabled={busy}
                    />
                    Non-U.K. citizen
                  </label>
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="idType">Type of ID</Label>
                <select
                  id="idType"
                  className={cn("mt-1.5", fieldClass)}
                  value={d.idType}
                  onChange={(e) => update("idType", e.target.value)}
                  disabled={busy}
                >
                  {ID_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="idNumber">ID number</Label>
                <Input
                  id="idNumber"
                  className="mt-1.5"
                  value={d.idNumber}
                  onChange={(e) => update("idNumber", e.target.value)}
                  disabled={busy}
                />
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground">Mailing address</h2>
            <div className="mt-4 space-y-4">
              <div>
                <Label htmlFor="addr1">Address line 1</Label>
                <Input
                  id="addr1"
                  className="mt-1.5"
                  value={d.mailAddress1}
                  onChange={(e) => update("mailAddress1", e.target.value)}
                  disabled={busy}
                />
              </div>
              <div>
                <Label htmlFor="addr2">Address line 2</Label>
                <Input
                  id="addr2"
                  className="mt-1.5"
                  value={d.mailAddress2}
                  onChange={(e) => update("mailAddress2", e.target.value)}
                  disabled={busy}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    className="mt-1.5"
                    value={d.mailCity}
                    onChange={(e) => update("mailCity", e.target.value)}
                    disabled={busy}
                  />
                </div>
                <div>
                  <Label htmlFor="state">State / region</Label>
                  <Input
                    id="state"
                    className="mt-1.5"
                    value={d.mailState}
                    onChange={(e) => update("mailState", e.target.value)}
                    disabled={busy}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="mailCountry">Country</Label>
                  <select
                    id="mailCountry"
                    className={cn("mt-1.5", fieldClass)}
                    value={d.mailCountry}
                    onChange={(e) => update("mailCountry", e.target.value)}
                    disabled={busy}
                  >
                    {MAIL_COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="postal">Postal code</Label>
                  <Input
                    id="postal"
                    className="mt-1.5"
                    value={d.mailPostal}
                    onChange={(e) => update("mailPostal", e.target.value)}
                    disabled={busy}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground">Contact</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="phonePrimary">Primary / daytime phone</Label>
                <Input
                  id="phonePrimary"
                  className="mt-1.5"
                  value={d.phonePrimary}
                  onChange={(e) => update("phonePrimary", e.target.value)}
                  disabled={busy}
                />
              </div>
              <div>
                <Label htmlFor="phoneHome">Home / evening phone</Label>
                <Input
                  id="phoneHome"
                  className="mt-1.5"
                  value={d.phoneHome}
                  onChange={(e) => update("phoneHome", e.target.value)}
                  disabled={busy}
                />
              </div>
              <div>
                <Label htmlFor="phoneCell">Cellular</Label>
                <Input
                  id="phoneCell"
                  className="mt-1.5"
                  value={d.phoneCell}
                  onChange={(e) => update("phoneCell", e.target.value)}
                  disabled={busy}
                />
              </div>
              <div>
                <Label htmlFor="fax">Fax</Label>
                <Input id="fax" className="mt-1.5" value={d.fax} onChange={(e) => update("fax", e.target.value)} disabled={busy} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="contactEmail">Email (application contact)</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  className="mt-1.5"
                  value={d.contactEmail}
                  onChange={(e) => update("contactEmail", e.target.value)}
                  disabled={busy}
                />
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <span className="text-sm font-medium">Filing status</span>
                <div className="mt-2 flex flex-wrap gap-4 text-sm">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="fil"
                      checked={d.filingStatus === "single"}
                      onChange={() => update("filingStatus", "single")}
                      disabled={busy}
                    />
                    Single
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="fil"
                      checked={d.filingStatus === "married"}
                      onChange={() => update("filingStatus", "married")}
                      disabled={busy}
                    />
                    Married
                  </label>
                </div>
              </div>
              <div>
                <Label htmlFor="deps">Number of dependents</Label>
                <Input
                  id="deps"
                  type="number"
                  min={0}
                  className="mt-1.5 max-w-[140px]"
                  value={d.dependents}
                  onChange={(e) => update("dependents", e.target.value)}
                  disabled={busy}
                />
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground">Experience & activity</h2>
            <div className="mt-4 space-y-4">
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Years of experience</h3>
                <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(
                    [
                      ["expStocks", "Stocks"],
                      ["expOptions", "Options"],
                      ["expFunds", "Mutual funds"],
                      ["expFutures", "Futures"],
                      ["expForex", "Forex"],
                    ] as const
                  ).map(([key, lab]) => (
                    <div key={key}>
                      <Label htmlFor={key}>{lab}</Label>
                      <select
                        id={key}
                        className={cn("mt-1.5", fieldClass)}
                        value={d[key]}
                        onChange={(e) => update(key, e.target.value)}
                        disabled={busy}
                      >
                        {EXP_YEARS.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Average trades per month</h3>
                <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(
                    [
                      ["tradesStocks", "Stocks"],
                      ["tradesOptions", "Options"],
                      ["tradesFunds", "Funds"],
                      ["tradesFutures", "Futures"],
                      ["tradesForex", "Forex"],
                    ] as const
                  ).map(([key, lab]) => (
                    <div key={key}>
                      <Label htmlFor={key}>{lab}</Label>
                      <select
                        id={key}
                        className={cn("mt-1.5", fieldClass)}
                        value={d[key]}
                        onChange={(e) => update(key, e.target.value)}
                        disabled={busy}
                      >
                        {TRADES_MONTH.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Trading knowledge</h3>
                <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(
                    [
                      ["knowStocks", "Stocks"],
                      ["knowOptions", "Options"],
                      ["knowFunds", "Funds"],
                      ["knowFutures", "Futures"],
                      ["knowForex", "Forex"],
                    ] as const
                  ).map(([key, lab]) => (
                    <div key={key}>
                      <Label htmlFor={key}>{lab}</Label>
                      <select
                        id={key}
                        className={cn("mt-1.5", fieldClass)}
                        value={d[key]}
                        onChange={(e) => update(key, e.target.value)}
                        disabled={busy}
                      >
                        {KNOWLEDGE.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <section
            className={cn(
              "rounded-lg border border-border p-5 shadow-sm",
              jointDisabled ? "bg-muted/40 opacity-80" : "bg-card",
            )}
          >
            <h2 className="text-sm font-semibold text-foreground">Joint account owner</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Required when account type is Joint. Leave blank for individual and other account types.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="jf">First name</Label>
                <Input
                  id="jf"
                  className="mt-1.5"
                  value={d.jointFirst}
                  onChange={(e) => update("jointFirst", e.target.value)}
                  disabled={busy || jointDisabled}
                />
              </div>
              <div>
                <Label htmlFor="jm">Middle name</Label>
                <Input
                  id="jm"
                  className="mt-1.5"
                  value={d.jointMiddle}
                  onChange={(e) => update("jointMiddle", e.target.value)}
                  disabled={busy || jointDisabled}
                />
              </div>
              <div>
                <Label htmlFor="jl">Last name</Label>
                <Input
                  id="jl"
                  className="mt-1.5"
                  value={d.jointLast}
                  onChange={(e) => update("jointLast", e.target.value)}
                  disabled={busy || jointDisabled}
                />
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="jdob">Date of birth</Label>
                <Input
                  id="jdob"
                  className="mt-1.5"
                  value={d.jointDob}
                  onChange={(e) => update("jointDob", e.target.value)}
                  disabled={busy || jointDisabled}
                />
              </div>
              <div>
                <Label htmlFor="jid">ID number</Label>
                <Input
                  id="jid"
                  className="mt-1.5"
                  value={d.jointIdNumber}
                  onChange={(e) => update("jointIdNumber", e.target.value)}
                  disabled={busy || jointDisabled}
                />
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground">Financial profile</h2>
            <div className="mt-4 space-y-4">
              <div>
                <Label htmlFor="inc">Approximate annual income</Label>
                <select
                  id="inc"
                  className={cn("mt-1.5", fieldClass)}
                  value={d.annualIncome}
                  onChange={(e) => update("annualIncome", e.target.value)}
                  disabled={busy}
                >
                  {GBP_INCOME.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="marg">Marginal tax bracket</Label>
                <select
                  id="marg"
                  className={cn("mt-1.5", fieldClass)}
                  value={d.marginalBracket}
                  onChange={(e) => update("marginalBracket", e.target.value)}
                  disabled={busy}
                >
                  {MARGINAL.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="tnw">Approximate total net worth</Label>
                <select
                  id="tnw"
                  className={cn("mt-1.5", fieldClass)}
                  value={d.totalNetWorth}
                  onChange={(e) => update("totalNetWorth", e.target.value)}
                  disabled={busy}
                >
                  {GBP_NET.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Include property, investments, business interests, and personal property.
                </p>
              </div>
              <div>
                <Label htmlFor="lnw">Approximate liquid net worth</Label>
                <select
                  id="lnw"
                  className={cn("mt-1.5", fieldClass)}
                  value={d.liquidNetWorth}
                  onChange={(e) => update("liquidNetWorth", e.target.value)}
                  disabled={busy}
                >
                  {GBP_NET.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">Cash, listed securities, and assets readily convertible to cash.</p>
              </div>
              <div>
                <Label htmlFor="soi">Primary source of income</Label>
                <select
                  id="soi"
                  className={cn("mt-1.5", fieldClass)}
                  value={d.sourceIncome}
                  onChange={(e) => update("sourceIncome", e.target.value)}
                  disabled={busy}
                >
                  {SOURCE_INCOME.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground">Contract & funding</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="cap">Contract applied for</Label>
                <Input
                  id="cap"
                  className="mt-1.5"
                  value={d.contractAppliedFor}
                  onChange={(e) => update("contractAppliedFor", e.target.value)}
                  disabled={busy}
                />
              </div>
              <div>
                <Label htmlFor="ccn">Number of contracts</Label>
                <Input
                  id="ccn"
                  className="mt-1.5"
                  value={d.contractCount}
                  onChange={(e) => update("contractCount", e.target.value)}
                  disabled={busy}
                />
              </div>
              <div>
                <Label htmlFor="cna">Name of contract(s)</Label>
                <Input
                  id="cna"
                  className="mt-1.5"
                  value={d.contractNames}
                  onChange={(e) => update("contractNames", e.target.value)}
                  disabled={busy}
                />
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="appmon">Application amount</Label>
                <Input
                  id="appmon"
                  className="mt-1.5"
                  placeholder="Amount"
                  value={d.applicationMonies}
                  onChange={(e) => update("applicationMonies", e.target.value)}
                  disabled={busy}
                />
              </div>
              <div>
                <Label htmlFor="fund">Source of assets to be deposited</Label>
                <select
                  id="fund"
                  className={cn("mt-1.5", fieldClass)}
                  value={d.fundingSource}
                  onChange={(e) => update("fundingSource", e.target.value)}
                  disabled={busy}
                >
                  {SOURCE_ASSETS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground">Portal login</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Your legal name on file is taken from the primary owner in step 1. Use the email below to sign in after
              confirmation.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <Label htmlFor="loginEmail">Login email</Label>
                <Input
                  id="loginEmail"
                  type="email"
                  className="mt-1.5"
                  value={d.email}
                  onChange={(e) => update("email", e.target.value)}
                  disabled={busy}
                  autoComplete="email"
                />
              </div>
              <div>
                <Label>Country of residence</Label>
                <div className="mt-1.5">
                  <CountrySelect value={d.country} onChange={(c) => update("country", c)} disabled={busy} />
                </div>
              </div>
              <div>
                <Label>Mobile number (E.164)</Label>
                <IntlPhoneInput
                  className="mt-1.5"
                  value={d.phone}
                  onChange={(v) => update("phone", v)}
                  country={d.country}
                  disabled={busy}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="pw">Password</Label>
                  <Input
                    id="pw"
                    type="password"
                    className="mt-1.5"
                    value={d.password}
                    onChange={(e) => update("password", e.target.value)}
                    disabled={busy}
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">At least 8 characters.</p>
                </div>
                <div>
                  <Label htmlFor="pwc">Confirm password</Label>
                  <Input
                    id="pwc"
                    type="password"
                    className="mt-1.5"
                    value={d.passwordConfirm}
                    onChange={(e) => update("passwordConfirm", e.target.value)}
                    disabled={busy}
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <div className="space-y-3 rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-input"
                    checked={d.agreedTerms}
                    onChange={(e) => update("agreedTerms", e.target.checked)}
                    disabled={busy}
                  />
                  <span>
                    I have read and agree to the{" "}
                    <Link to="/terms" className="font-medium text-primary underline-offset-4 hover:underline">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link to="/privacy" className="font-medium text-primary underline-offset-4 hover:underline">
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-input"
                    checked={d.agreedRisk}
                    onChange={(e) => update("agreedRisk", e.target.checked)}
                    disabled={busy}
                  />
                  <span>
                    I understand trading involves substantial risk of loss and that past performance is not indicative of
                    future results.
                  </span>
                </label>
              </div>
            </div>
          </section>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
        <div>
          {step > 1 && (
            <button
              type="button"
              onClick={onBack}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {step < 3 ? (
            <button
              type="button"
              onClick={onNext}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow hover:opacity-90 disabled:opacity-50"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow hover:opacity-90 disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating account…
                </>
              ) : (
                <>
                  Create account <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
