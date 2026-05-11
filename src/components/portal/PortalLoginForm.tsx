import { Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ensurePortalRole,
  formatPortalAuthError,
  isStaffRole,
  resolvePortalRedirect,
  type PortalResolvedRole,
} from "@/lib/portal-auth";
import logo from "@/assets/logo.png";
import { CountrySelect, IntlPhoneInput } from "@/components/portal/IntlPhoneInput";
import { isValidE164 } from "@/lib/countries";
import { getPublicAppOrigin } from "@/lib/site-origin";

export type PortalAudience = "investor" | "admin";

interface Props {
  audience: PortalAudience;
  /** route id used for typed useSearch — e.g. "/portal/investor/login" */
  fromRouteId: "/portal/login_/investor" | "/portal/login_/admin" | "/portal/login";
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

async function resolveIdentifierToEmail(identifier: string): Promise<string | null> {
  const res = await fetch("/api/public/resolve-login-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier }),
  });
  if (!res.ok) throw new Error(`Resolver failed (${res.status})`);
  const data = (await res.json()) as { email: string | null };
  return data.email;
}

export function PortalLoginForm({ audience, fromRouteId }: Props) {
  const search = useSearch({ from: fromRouteId }) as {
    redirect?: string;
    mode?: "login" | "signup";
    verify?: "required";
    email?: string;
  };
  const allowSignup = audience === "investor";
  const [mode, setMode] = useState<"login" | "signup">(
    allowSignup ? (search.mode ?? "login") : "login",
  );
  const [email, setEmail] = useState(""); // also accepts username
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [verificationGateOpen, setVerificationGateOpen] = useState(search.verify === "required");

  const defaultRedirect = audience === "admin" ? "/portal/admin" : "/portal/investor";

  const routeToPortal = (role: PortalResolvedRole) => {
    if (audience === "admin" && !isStaffRole(role)) {
      setError(
        "This email is not a staff account. Admin and investor accounts are separate. Create a dedicated admin account, or use investor login.",
      );
      void supabase.auth.signOut();
      return;
    }
    const target = resolvePortalRedirect(role, search.redirect ?? defaultRedirect);
    setInfo("Sign in successful. Redirecting…");
    window.setTimeout(() => window.location.replace(target), 600);
  };

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!active || !data.session?.user) return;
        const role = await ensurePortalRole(supabase as any, data.session.user.id);
        if (active) routeToPortal(role);
      } catch (err: any) {
        if (active) setError(formatPortalAuthError(err?.message));
      }
    })();
    return () => {
      active = false;
    };
  }, [search.redirect]);

  useEffect(() => {
    if (search.email && !email) setEmail(search.email);
    if (search.verify === "required") {
      setVerificationGateOpen(true);
      setMode("login");
      setInfo("Verify your email first. After verification, click \"I've verified my email\" and sign in.");
    }
  }, [search.verify, search.email]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      // Resolve username -> email for login (signup always uses email)
      let loginEmail = email.trim();
      if (mode === "login" && !loginEmail.includes("@")) {
        try {
          const resolved = await resolveIdentifierToEmail(loginEmail);
          if (!resolved) throw new Error("Username not found");
          loginEmail = resolved;
        } catch (err: any) {
          throw new Error(err?.message ?? "Could not resolve username");
        }
      }
      if (mode === "signup") {
        if (!firstName.trim() || !lastName.trim())
          throw new Error("First and last name are required");
        if (!country) throw new Error("Country of residence is required");
        if (!phone || !isValidE164(phone))
          throw new Error("A valid international phone number is required");
        if (audience === "investor" && isStrictAccountSeparationEnabled()) {
          const reserved = getReservedStaffDomains();
          const domain = getEmailDomain(loginEmail);
          if (domain && reserved.includes(domain)) {
            throw new Error(
              "This email domain is reserved for staff/admin accounts. Please use a personal investor email instead.",
            );
          }
        }
        const redirectPath =
          audience === "admin" ? "/portal/login/admin" : "/portal/login/investor";
        const appOrigin = getPublicAppOrigin();
        const { data: signUpData, error: err } = await supabase.auth.signUp({
          email: loginEmail,
          password,
          options: {
            emailRedirectTo: `${appOrigin}/auth/confirm?next=${encodeURIComponent(redirectPath)}`,
            data: {
              legal_first_name: firstName.trim(),
              legal_last_name: lastName.trim(),
              display_name: `${firstName.trim()} ${lastName.trim()}`,
              phone: phone.trim(),
              country_of_residence: country,
              nationality: country,
            },
          },
        });
        if (err) throw err;
        if (!signUpData.session) {
          setInfo(
            audience === "admin"
              ? "Account created. Verify your email, then ask a super admin to grant you staff access before signing in."
              : "Account created. Please check your email to confirm your address, then sign in.",
          );
          setMode("login");
          setVerificationGateOpen(true);
          return;
        }
      } else {
        if (verificationGateOpen) {
          throw new Error("Email verification is required before sign in. Check your inbox first.");
        }
        const { error: err } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password,
        });
        if (err) throw err;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session?.user) {
        setInfo("Please verify your email address from your inbox, then sign in again.");
        return;
      }
      const role = await ensurePortalRole(supabase as any, sess.session.user.id);
      routeToPortal(role);
    } catch (err: any) {
      setError(formatPortalAuthError(err?.message));
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setInfo(null);
    const identifier = email.trim();
    if (!identifier) {
      setError("Enter your email or username above first, then click Forgot password.");
      return;
    }
    setBusy(true);
    try {
      let resetEmail = identifier;
      if (!resetEmail.includes("@")) {
        try {
          const resolved = await resolveIdentifierToEmail(resetEmail);
          if (!resolved) throw new Error("No account found for that username");
          resetEmail = resolved;
        } catch (err: any) {
          throw new Error(err?.message ?? "Could not resolve username");
        }
      }
      const returnTo = audience === "admin" ? "/portal/login/admin" : "/portal/login/investor";
      const appOrigin = getPublicAppOrigin();
      const { error: err } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${appOrigin}/portal/reset-password?return_to=${encodeURIComponent(returnTo)}`,
      });
      if (err) throw err;
      setInfo(
        audience === "admin"
          ? "Password reset email sent. Check your inbox and open the link to set a new admin password."
          : "Password reset email sent. Check your inbox.",
      );
    } catch (err: any) {
      setError(formatPortalAuthError(err?.message ?? "Could not send reset email."));
    } finally {
      setBusy(false);
    }
  };

  const isAdmin = audience === "admin";
  const title = isAdmin
    ? mode === "login"
      ? "Admin Console Login"
      : "Admin sign in"
    : mode === "login"
      ? "Investor Portal Login"
      : "Create your investor account";
  const subtitle = isAdmin
    ? "Restricted access. Staff credentials required."
    : mode === "login"
      ? "Sign in to access your dashboard."
      : "New accounts default to investor access.";

  // Investors should never see the admin entry point. Only show the
  // cross-portal link from the admin side back to the investor login.
  const showOtherPortal = isAdmin;
  const otherPortalHref = "/portal/login/investor";
  const otherPortalLabel = "Investor login";

  return (
    <div className="min-h-screen bg-background grid-bg flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md surface-card p-8 shadow-elevated">
        <Link to="/" className="flex items-center justify-center mb-6">
          <img src={logo} alt="Hudson Crest Capital" className="h-12 w-auto" />
        </Link>
        <div
          className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-widest ${
            isAdmin
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-brand/40 bg-brand/10 text-brand"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${isAdmin ? "bg-destructive" : "bg-brand"}`} />
          {isAdmin ? "Admin Portal" : "Investor Portal"}
        </div>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">
            {mode === "login" ? "Email or Username" : "Email"}
          </label>
          <input
            type={mode === "login" ? "text" : "email"}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-surface border border-border rounded-md px-3 py-2 text-foreground"
            placeholder={mode === "login" ? "you@firm.com or username" : "you@firm.com"}
          />
          <label className="text-xs uppercase tracking-wider text-muted-foreground mt-2">
            Password
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-surface border border-border rounded-md px-3 py-2 text-foreground"
            placeholder="••••••••"
          />

          {mode === "signup" && (
            <>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">
                    First name
                  </label>
                  <input
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-foreground"
                    placeholder="Jane"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Last name
                  </label>
                  <input
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-foreground"
                    placeholder="Doe"
                  />
                </div>
              </div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mt-2">
                Country of residence
              </label>
              <CountrySelect value={country} onChange={setCountry} />
              <label className="text-xs uppercase tracking-wider text-muted-foreground mt-2">
                Contact number
              </label>
              <IntlPhoneInput value={phone} onChange={setPhone} country={country || undefined} />
            </>
          )}

          {error && (
            <div className="text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          {info && (
            <div className="text-sm text-foreground border border-border bg-surface rounded-md px-3 py-2">
              {info}
            </div>
          )}
          {mode === "login" && verificationGateOpen && (
            <div className="text-xs border border-brand/40 bg-brand/10 text-brand rounded-md px-3 py-2">
              Email verification is pending. Confirm your email address first, then continue.
              <button
                type="button"
                onClick={() => setVerificationGateOpen(false)}
                className="ml-2 underline underline-offset-2 hover:opacity-90"
              >
                I've verified my email
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-2 bg-gradient-brand text-brand-foreground font-medium rounded-md px-4 py-2.5 shadow-glow hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        {mode === "login" && (
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={busy}
            className="w-full text-xs text-muted-foreground hover:text-foreground mt-3 text-center disabled:opacity-50"
          >
            Forgot password?
          </button>
        )}

        {allowSignup && (
          <div className="mt-4 flex flex-col gap-2 text-center">
            <Link
              to="/portal/signup/investor"
              className="w-full text-xs text-brand font-medium hover:underline"
            >
              Sign up with onboarding
            </Link>
            <button
              type="button"
              onClick={() => setMode((m) => (m === "login" ? "signup" : "login"))}
              className="w-full text-xs text-muted-foreground hover:text-foreground"
            >
              {mode === "login"
                ? "Don't have an account? Quick signup"
                : "Already have an account? Sign in"}
            </button>
          </div>
        )}

        {isAdmin && (
          <Link
            to="/portal/login/admin/create-account"
            className="w-full block text-xs text-muted-foreground hover:text-foreground mt-4 text-center"
          >
            Need an admin account? Create one here
          </Link>
        )}

        <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            ← Back to website
          </Link>
          {showOtherPortal && (
            <Link to={otherPortalHref} className="hover:text-foreground">
              {otherPortalLabel} →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
