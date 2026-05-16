import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";
import { CountrySelect, IntlPhoneInput } from "@/components/portal/IntlPhoneInput";
import {
  PENDING_SIGNUP_BOOTSTRAP_KEY,
  submitInvestorPortalSignup,
  toastSignupSubmitError,
  validateInvestorSignupCredentials,
} from "@/lib/investor-signup-submit";

const fieldBase =
  "mt-1 w-full rounded-md border border-border bg-surface text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const labelBase = "font-medium text-muted-foreground";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  phone: string;
  password: string;
  passwordConfirm: string;
  agreedTerms: boolean;
  agreedRisk: boolean;
};

const initialForm = (): FormState => ({
  firstName: "",
  lastName: "",
  email: "",
  country: "US",
  phone: "",
  password: "",
  passwordConfirm: "",
  agreedTerms: false,
  agreedRisk: false,
});

export { PENDING_SIGNUP_BOOTSTRAP_KEY };

/**
 * Single-screen investor signup form. Collects only what auth needs (email,
 * password) plus the identity fields we want immediately available in the
 * portal (name, country, phone). Everything else — KYC, financial profile,
 * suitability, declarations — is captured later by the in-portal completion
 * wizard.
 */
type InvestorSignupFormProps = {
  /** Tighter layout for public signup (max ~384px field width). */
  compact?: boolean;
};

export function InvestorSignupForm({ compact = false }: InvestorSignupFormProps) {
  const field = compact
    ? `${fieldBase} px-2.5 py-1.5 text-sm`
    : `${fieldBase} px-3 py-2 text-sm`;
  const label = compact
    ? `${labelBase} text-xs`
    : `${labelBase} text-xs uppercase tracking-wider`;
  const navigate = useNavigate();
  const [f, setF] = useState<FormState>(initialForm);
  const [busy, setBusy] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setF((prev) => ({ ...prev, [key]: value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const err = validateInvestorSignupCredentials({
      firstName: f.firstName,
      lastName: f.lastName,
      email: f.email,
      country: f.country,
      phone: f.phone,
      password: f.password,
      passwordConfirm: f.passwordConfirm,
      agreedTerms: f.agreedTerms,
      agreedRisk: f.agreedRisk,
    });
    if (err) {
      toast.error(err);
      return;
    }
    setBusy(true);
    try {
      await submitInvestorPortalSignup({
        firstName: f.firstName.trim(),
        lastName: f.lastName.trim(),
        email: f.email.trim(),
        country: f.country,
        phone: f.phone.trim(),
        password: f.password,
        navigate,
      });
    } catch (e: unknown) {
      toastSignupSubmitError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className={compact ? "flex flex-col gap-4" : "flex flex-col gap-5"}>
      <div className={compact ? "grid grid-cols-2 gap-3.5" : "grid gap-4 sm:grid-cols-2"}>
        <div>
          <label className={label}>First name</label>
          <input
            autoComplete="given-name"
            className={field}
            value={f.firstName}
            onChange={(e) => update("firstName", e.target.value)}
            disabled={busy}
            required
          />
        </div>
        <div>
          <label className={label}>Last name</label>
          <input
            autoComplete="family-name"
            className={field}
            value={f.lastName}
            onChange={(e) => update("lastName", e.target.value)}
            disabled={busy}
            required
          />
        </div>
      </div>

      <div>
        <label className={label}>Email address</label>
        <input
          type="email"
          autoComplete="email"
          className={field}
          value={f.email}
          onChange={(e) => update("email", e.target.value)}
          disabled={busy}
          required
        />
      </div>

      <div>
        <label className={label}>Country of residence</label>
        <div className="mt-1">
          <CountrySelect value={f.country} onChange={(c) => update("country", c)} disabled={busy} />
        </div>
      </div>

      <div>
        <label className={label}>Mobile number</label>
        <IntlPhoneInput
          className="mt-1"
          dense={compact}
          value={f.phone}
          onChange={(v) => update("phone", v)}
          country={f.country}
          disabled={busy}
        />
      </div>

      <div className={compact ? "grid grid-cols-2 gap-3.5" : "grid gap-4 sm:grid-cols-2"}>
        <div>
          <label className={label}>Password</label>
          <input
            type="password"
            autoComplete="new-password"
            className={field}
            value={f.password}
            onChange={(e) => update("password", e.target.value)}
            disabled={busy}
            minLength={8}
            required
          />
          <p className="mt-1 text-[11px] text-muted-foreground">At least 8 characters.</p>
        </div>
        <div>
          <label className={label}>Confirm password</label>
          <input
            type="password"
            autoComplete="new-password"
            className={field}
            value={f.passwordConfirm}
            onChange={(e) => update("passwordConfirm", e.target.value)}
            disabled={busy}
            minLength={8}
            required
          />
        </div>
      </div>

      <div
        className={
          compact
            ? "space-y-2.5 rounded-md border border-border bg-muted/20 p-2.5 text-[11px] leading-snug text-muted-foreground"
            : "space-y-3 rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground"
        }
      >
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-border text-primary"
            checked={f.agreedTerms}
            onChange={(e) => update("agreedTerms", e.target.checked)}
            disabled={busy}
          />
          <span className="text-foreground/90">
            I have read and agree to the{" "}
            <Link to="/terms" className="font-medium text-brand hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="font-medium text-brand hover:underline">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-border text-primary"
            checked={f.agreedRisk}
            onChange={(e) => update("agreedRisk", e.target.checked)}
            disabled={busy}
          />
          <span className="text-foreground/90">
            I understand trading involves substantial risk of loss and that past performance is not indicative of future
            results.
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={busy}
        className={
          compact
            ? "inline-flex w-full items-center justify-center gap-2 rounded-md bg-gradient-brand px-4 py-2 text-sm font-semibold text-brand-foreground shadow-glow hover:opacity-90 disabled:opacity-50"
            : "inline-flex items-center justify-center gap-2 rounded-md bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground shadow-glow hover:opacity-90 disabled:opacity-50"
        }
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Creating account…
          </>
        ) : (
          <>
            Continue <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
}
