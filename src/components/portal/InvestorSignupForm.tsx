import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";
import { CountrySelect, IntlPhoneInput } from "@/components/portal/IntlPhoneInput";
import { cn } from "@/lib/utils";
import { crossOceanLegacyFieldClass, crossOceanLegacyLabelClass } from "@/lib/crossOceanLegacyUi";
import {
  PENDING_SIGNUP_BOOTSTRAP_KEY,
  submitInvestorPortalSignup,
  toastSignupSubmitError,
  validateInvestorSignupCredentials,
} from "@/lib/investor-signup-submit";

const field = crossOceanLegacyFieldClass;
const label = crossOceanLegacyLabelClass;

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
export function InvestorSignupForm() {
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
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>First Name</label>
          <input
            autoComplete="given-name"
            className={cn("mt-1", field)}
            value={f.firstName}
            onChange={(e) => update("firstName", e.target.value)}
            disabled={busy}
            required
          />
        </div>
        <div>
          <label className={label}>Last Name</label>
          <input
            autoComplete="family-name"
            className={cn("mt-1", field)}
            value={f.lastName}
            onChange={(e) => update("lastName", e.target.value)}
            disabled={busy}
            required
          />
        </div>
      </div>

      <div>
        <label className={label}>Email Address</label>
        <input
          type="email"
          autoComplete="email"
          className={cn("mt-1", field)}
          value={f.email}
          onChange={(e) => update("email", e.target.value)}
          disabled={busy}
          required
        />
      </div>

      <div>
        <label className={label}>Country of Residence</label>
        <div className="mt-1">
          <CountrySelect
            value={f.country}
            onChange={(c) => update("country", c)}
            disabled={busy}
          />
        </div>
      </div>

      <div>
        <label className={label}>Mobile Number</label>
        <IntlPhoneInput
          className="mt-1"
          value={f.phone}
          onChange={(v) => update("phone", v)}
          country={f.country}
          disabled={busy}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Password</label>
          <input
            type="password"
            autoComplete="new-password"
            className={cn("mt-1", field)}
            value={f.password}
            onChange={(e) => update("password", e.target.value)}
            disabled={busy}
            minLength={8}
            required
          />
          <p className="mt-1 text-[11px] text-neutral-600">At least 8 characters.</p>
        </div>
        <div>
          <label className={label}>Confirm Password</label>
          <input
            type="password"
            autoComplete="new-password"
            className={cn("mt-1", field)}
            value={f.passwordConfirm}
            onChange={(e) => update("passwordConfirm", e.target.value)}
            disabled={busy}
            minLength={8}
            required
          />
        </div>
      </div>

      <div className="space-y-3 rounded border border-neutral-300 bg-neutral-50/80 p-3 text-xs text-neutral-800">
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            className="mt-0.5 h-3.5 w-3.5 shrink-0 border-neutral-400 text-blue-700"
            checked={f.agreedTerms}
            onChange={(e) => update("agreedTerms", e.target.checked)}
            disabled={busy}
          />
          <span>
            I have read and agree to the{" "}
            <Link to="/terms" className="font-medium text-blue-800 hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="font-medium text-blue-800 hover:underline">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            className="mt-0.5 h-3.5 w-3.5 shrink-0 border-neutral-400 text-blue-700"
            checked={f.agreedRisk}
            onChange={(e) => update("agreedRisk", e.target.checked)}
            disabled={busy}
          />
          <span>
            I understand trading involves substantial risk of loss and that past performance is not indicative of
            future results.
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 rounded border border-blue-800 bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-800 disabled:opacity-50"
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
    </form>
  );
}
