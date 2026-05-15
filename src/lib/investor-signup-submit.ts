import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isValidE164 } from "@/lib/countries";
import { formatPortalAuthError } from "@/lib/portal-auth";
import { getPublicAppOrigin } from "@/lib/site-origin";
import {
  getEmailDomain,
  getReservedStaffDomains,
  isStrictAccountSeparationEnabled,
} from "@/lib/portal-signup-email-guard";
/** Matches `signupBootstrapSchema` on the server (plus optional application blob). */
export type SignupBootstrapPayload = {
  legal_first_name: string;
  legal_last_name: string;
  country_of_residence: string;
  phone: string;
  agreed_terms: true;
  agreed_risk: true;
};

/** sessionStorage key used by the post-confirmation bootstrap to finish signup. */
export const PENDING_SIGNUP_BOOTSTRAP_KEY = "hcc_pending_signup_bootstrap_v1";

export type SignupBootstrapPayloadWithApplication = SignupBootstrapPayload & {
  open_account_application?: Record<string, unknown>;
};

export function validateInvestorSignupCredentials(input: {
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  phone: string;
  password: string;
  passwordConfirm: string;
  agreedTerms: boolean;
  agreedRisk: boolean;
}): string | null {
  if (!input.firstName.trim() || !input.lastName.trim()) return "First and last name are required.";
  if (!input.email.includes("@")) return "A valid email is required.";
  if (!input.country) return "Country of residence is required.";
  if (!input.phone.trim() || !isValidE164(input.phone))
    return "A valid international phone number is required.";
  if (input.password.length < 8) return "Password must be at least 8 characters.";
  if (input.password !== input.passwordConfirm) return "Passwords do not match.";
  if (!input.agreedTerms) return "You must agree to the Terms of Service to continue.";
  if (!input.agreedRisk) return "You must acknowledge the trading-risk disclosure to continue.";
  if (isStrictAccountSeparationEnabled()) {
    const reserved = getReservedStaffDomains();
    const domain = getEmailDomain(input.email.trim());
    if (domain && reserved.includes(domain)) {
      return "This email domain is reserved for staff accounts. Please use a personal investor email.";
    }
  }
  return null;
}

/**
 * Creates the Supabase auth user and either stashes the bootstrap payload for
 * post-email-confirmation flush, or POSTs it immediately when a session exists.
 */
export async function submitInvestorPortalSignup(input: {
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  phone: string;
  password: string;
  openAccountApplication?: Record<string, unknown>;
  navigate: (opts: { to: string }) => void;
}): Promise<void> {
  const loginEmail = input.email.trim();
  const country = input.country.toUpperCase().slice(0, 2);
  const phone = input.phone.trim();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const appOrigin = getPublicAppOrigin();

  const { data: signUpData, error: signErr } = await supabase.auth.signUp({
    email: loginEmail,
    password: input.password,
    options: {
      emailRedirectTo: `${appOrigin}/auth/confirm?next=${encodeURIComponent("/portal/login/investor")}`,
      data: {
        legal_first_name: firstName,
        legal_last_name: lastName,
        display_name: `${firstName} ${lastName}`,
        phone,
        country_of_residence: country,
      },
    },
  });
  if (signErr) throw signErr;

  const bootstrapPayload: SignupBootstrapPayloadWithApplication = {
    legal_first_name: firstName,
    legal_last_name: lastName,
    country_of_residence: country,
    phone,
    agreed_terms: true,
    agreed_risk: true,
    ...(input.openAccountApplication && Object.keys(input.openAccountApplication).length > 0
      ? { open_account_application: input.openAccountApplication }
      : {}),
  };

  if (!signUpData.session) {
    try {
      sessionStorage.setItem(
        PENDING_SIGNUP_BOOTSTRAP_KEY,
        JSON.stringify({ email: loginEmail.toLowerCase(), payload: bootstrapPayload }),
      );
    } catch {
      /* ignore storage quota */
    }
    toast.success(
      "Account created. Check your email to confirm, then sign in to finish setting up your portal.",
    );
    window.setTimeout(() => {
      const verifyPath = `/portal/login/investor?verify=required&email=${encodeURIComponent(loginEmail)}`;
      window.location.replace(`${appOrigin}${verifyPath}`);
    }, 600);
    return;
  }

  const res = await fetch("/api/portal/signup-bootstrap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bootstrapPayload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error ?? body?.details ?? `Signup bootstrap failed (${res.status})`);
  }

  toast.success("Welcome to Hudson Crest. Let's complete your profile next.");
  window.setTimeout(() => {
    input.navigate({ to: "/portal/investor" });
  }, 400);
}

export function toastSignupSubmitError(e: unknown) {
  toast.error(formatPortalAuthError(e instanceof Error ? e.message : String(e)));
}
