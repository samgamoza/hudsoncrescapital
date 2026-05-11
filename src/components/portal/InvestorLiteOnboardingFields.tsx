import type { FormEvent, ReactNode } from "react";
import { CountrySelect, IntlPhoneInput } from "@/components/portal/IntlPhoneInput";
import { INVESTOR_GOAL_OPTIONS } from "@/lib/investor-lite-goals";

export type InvestorLitePayload = {
  legal_first_name: string;
  legal_last_name: string;
  phone: string;
  country_of_residence: string;
  nationality: string;
  employment_status:
    | ""
    | "employed"
    | "self_employed"
    | "retired"
    | "student"
    | "unemployed"
    | "other";
  investment_experience: "" | "none" | "limited" | "moderate" | "extensive";
  investor_background: string;
  investment_goals: string;
  investment_goal_tags: string[];
  base_currency: "USD" | "EUR" | "GBP";
};

const inputClass =
  "w-full bg-surface border border-border rounded-md px-3 py-2 text-foreground placeholder:text-muted-foreground";

/** `identity` / `investment` split the form for multi-step signup wizards. */
export type InvestorLiteSections = "all" | "identity" | "investment";

type Props = {
  values: InvestorLitePayload;
  onChange: (next: InvestorLitePayload) => void;
  disabled?: boolean;
  showCurrency?: boolean;
  formId?: string;
  onSubmit?: (e: FormEvent) => void;
  submitLabel?: string;
  busy?: boolean;
  /** Extra controls associated with the same form (use `form` attribute matching `formId`). */
  top?: ReactNode;
  /** When set, only render that slice (omit submit unless `showSubmit`). */
  sections?: InvestorLiteSections;
  showSubmit?: boolean;
  /** When false, render a div so fields can live inside a parent `<form>` (multi-step wizards). */
  asForm?: boolean;
};

export function InvestorLiteOnboardingFields({
  values,
  onChange,
  disabled,
  showCurrency = true,
  formId,
  onSubmit,
  submitLabel,
  busy,
  top,
  sections = "all",
  showSubmit,
  asForm = true,
}: Props) {
  const set = <K extends keyof InvestorLitePayload>(key: K, v: InvestorLitePayload[K]) =>
    onChange({ ...values, [key]: v });

  const toggleTag = (tag: string) => {
    const setTags = new Set(values.investment_goal_tags);
    if (setTags.has(tag)) setTags.delete(tag);
    else setTags.add(tag);
    set("investment_goal_tags", [...setTags]);
  };

  const showIdentity = sections === "all" || sections === "identity";
  const showInvestment = sections === "all" || sections === "investment";
  const renderSubmit = (showSubmit ?? sections === "all") && onSubmit && submitLabel;

  const inner = (
    <>
      {top ? <div className="flex flex-col gap-4">{top}</div> : null}
      {showIdentity ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              First name
            </label>
            <input
              required
              disabled={disabled}
              value={values.legal_first_name}
              onChange={(e) => set("legal_first_name", e.target.value)}
              className={`mt-1 ${inputClass}`}
              placeholder="Jane"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Last name
            </label>
            <input
              required
              disabled={disabled}
              value={values.legal_last_name}
              onChange={(e) => set("legal_last_name", e.target.value)}
              className={`mt-1 ${inputClass}`}
              placeholder="Doe"
            />
          </div>
        </div>
      ) : null}

      {showIdentity ? (
        <>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Country of residence
            </label>
            <div className="mt-1">
              <CountrySelect
                value={values.country_of_residence}
                onChange={(c) => set("country_of_residence", c)}
                disabled={disabled}
              />
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Nationality
            </label>
            <div className="mt-1">
              <CountrySelect
                value={values.nationality}
                onChange={(c) => set("nationality", c)}
                disabled={disabled}
              />
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Phone</label>
            <IntlPhoneInput
              className="mt-1"
              value={values.phone}
              onChange={(p) => set("phone", p)}
              country={values.country_of_residence || undefined}
              disabled={disabled}
            />
          </div>
        </>
      ) : null}

      {showIdentity && showCurrency ? (
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">
            Primary account currency
          </label>
          <select
            disabled={disabled}
            value={values.base_currency}
            onChange={(e) =>
              set("base_currency", e.target.value as InvestorLitePayload["base_currency"])
            }
            className={`mt-1 ${inputClass}`}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
        </div>
      ) : null}

      {showInvestment ? (
        <>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Employment status <span className="normal-case font-normal">(optional)</span>
            </label>
            <select
              disabled={disabled}
              value={values.employment_status}
              onChange={(e) =>
                set("employment_status", e.target.value as InvestorLitePayload["employment_status"])
              }
              className={`mt-1 ${inputClass}`}
            >
              <option value="">Prefer not to say</option>
              <option value="employed">Employed</option>
              <option value="self_employed">Self employed</option>
              <option value="retired">Retired</option>
              <option value="student">Student</option>
              <option value="unemployed">Unemployed</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Investment experience <span className="normal-case font-normal">(optional)</span>
            </label>
            <select
              disabled={disabled}
              value={values.investment_experience}
              onChange={(e) =>
                set(
                  "investment_experience",
                  e.target.value as InvestorLitePayload["investment_experience"],
                )
              }
              className={`mt-1 ${inputClass}`}
            >
              <option value="">Prefer not to say</option>
              <option value="none">None</option>
              <option value="limited">Limited</option>
              <option value="moderate">Moderate</option>
              <option value="extensive">Extensive</option>
            </select>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Investor background <span className="normal-case font-normal">(optional)</span>
            </label>
            <textarea
              disabled={disabled}
              value={values.investor_background}
              onChange={(e) => set("investor_background", e.target.value)}
              rows={4}
              className={`mt-1 resize-y min-h-[96px] ${inputClass}`}
              placeholder="Brief context on your professional background or investing history."
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Investment goals <span className="normal-case font-normal">(optional)</span>
            </label>
            <textarea
              disabled={disabled}
              value={values.investment_goals}
              onChange={(e) => set("investment_goals", e.target.value)}
              rows={5}
              className={`mt-1 resize-y min-h-[120px] ${inputClass}`}
              placeholder="Optional: describe what you want to achieve with your investments."
            />
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Goal focus <span className="normal-case font-normal">(optional)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {INVESTOR_GOAL_OPTIONS.map((g) => (
                <label
                  key={g.id}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs cursor-pointer"
                >
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={values.investment_goal_tags.includes(g.id)}
                    onChange={() => toggleTag(g.id)}
                    className="rounded border-border"
                  />
                  {g.label}
                </label>
              ))}
            </div>
          </div>
        </>
      ) : null}

      {renderSubmit ? (
        <button
          type="submit"
          disabled={busy || disabled}
          className="mt-2 bg-gradient-brand text-brand-foreground font-medium rounded-md px-4 py-2.5 shadow-glow hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Please wait…" : submitLabel}
        </button>
      ) : null}
    </>
  );

  if (asForm) {
    return (
      <form id={formId} className="flex flex-col gap-4" onSubmit={onSubmit}>
        {inner}
      </form>
    );
  }
  return <div className="flex flex-col gap-4">{inner}</div>;
}

/** Default form state — exported for signup / onboarding routes. */
// eslint-disable-next-line react-refresh/only-export-components -- colocated factory
export const defaultInvestorLiteValues = (): InvestorLitePayload => ({
  legal_first_name: "",
  legal_last_name: "",
  phone: "",
  country_of_residence: "",
  nationality: "",
  employment_status: "",
  investment_experience: "",
  investor_background: "",
  investment_goals: "",
  investment_goal_tags: [],
  base_currency: "USD",
});
