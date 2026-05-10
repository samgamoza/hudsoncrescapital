import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import logo from "@/assets/logo.png";
import { CountrySelect, IntlPhoneInput } from "@/components/portal/IntlPhoneInput";
import { isValidE164 } from "@/lib/countries";

export const Route = createFileRoute("/portal/login/admin/create-account")({
  head: () => ({
    meta: [
      { title: "Create Admin Account — Hudson Crest Capital" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminCreateAccountPage,
});

function AdminCreateAccountPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");
  const [token, setToken] = useState("");
  const [role, setRole] = useState<"super_admin" | "admin" | "support">("admin");
  const [superConfirm, setSuperConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (targetRole: "super_admin" | "admin" | "support") => {
    setError(null);
    setInfo(null);
    if (!email.includes("@")) return setError("Valid email is required.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (!firstName.trim() || !lastName.trim()) return setError("First and last name are required.");
    if (!country) return setError("Country is required.");
    if (!phone || !isValidE164(phone))
      return setError("A valid international phone number is required.");
    if (!token.trim()) return setError("Admin signup token is required.");
    if (
      targetRole === "super_admin" &&
      superConfirm.trim().toUpperCase() !== "CREATE SUPER ADMIN"
    ) {
      return setError('Type "CREATE SUPER ADMIN" to confirm.');
    }

    setBusy(true);
    try {
      const res = await fetch("/api/public/admin-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          legal_first_name: firstName.trim(),
          legal_last_name: lastName.trim(),
          phone,
          country_of_residence: country,
          role: targetRole,
          signup_token: token.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const parts = [data?.error, data?.detail].filter(Boolean);
        throw new Error(parts.length ? parts.join(" — ") : `Failed (${res.status})`);
      }
      setInfo(
        `${targetRole.replace("_", " ")} account created. You can now sign in from the admin login page.`,
      );
      setTimeout(() => navigate({ to: "/portal/login/admin" }), 800);
    } catch (e: any) {
      setError(e?.message ?? "Could not create admin account.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background grid-bg flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md surface-card p-8 shadow-elevated">
        <Link to="/" className="flex items-center justify-center mb-6">
          <img src={logo} alt="Hudson Crest Capital" className="h-12 w-auto" />
        </Link>
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-destructive">
          <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
          Admin Account Creation
        </div>
        <h1 className="text-2xl font-semibold text-foreground">Create Admin Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dedicated staff onboarding only. Investor accounts are created in the investor flow.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Policy: after super admin bootstrap, only a signed-in super admin can create admin/support
          users from Admin Console &gt; Staff &amp; Admins.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <input
            className="bg-surface border border-border rounded-md px-3 py-2 text-foreground"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="bg-surface border border-border rounded-md px-3 py-2 text-foreground"
            type="password"
            placeholder="Password (min 8 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className="bg-surface border border-border rounded-md px-3 py-2 text-foreground"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <input
              className="bg-surface border border-border rounded-md px-3 py-2 text-foreground"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <CountrySelect value={country} onChange={setCountry} />
          <IntlPhoneInput value={phone} onChange={setPhone} country={country || undefined} />
          <select
            className="bg-surface border border-border rounded-md px-3 py-2 text-foreground"
            value={role}
            onChange={(e) => setRole(e.target.value as "super_admin" | "admin" | "support")}
          >
            <option value="support">Support</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
          <input
            className="bg-surface border border-border rounded-md px-3 py-2 text-foreground"
            placeholder={role === "super_admin" ? "Super admin signup token" : "Staff signup token"}
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          {role === "super_admin" && (
            <input
              className="bg-surface border border-border rounded-md px-3 py-2 text-foreground"
              placeholder="Type: CREATE SUPER ADMIN"
              value={superConfirm}
              onChange={(e) => setSuperConfirm(e.target.value)}
            />
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

          <button
            type="button"
            onClick={() => submit(role)}
            disabled={busy}
            className="mt-2 bg-gradient-brand text-brand-foreground font-medium rounded-md px-4 py-2.5 shadow-glow hover:opacity-90 disabled:opacity-50"
          >
            {busy
              ? "Please wait…"
              : role === "super_admin"
                ? "Create Super Admin Account"
                : role === "admin"
                  ? "Create Admin Account"
                  : "Create Support Account"}
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            ← Back to website
          </Link>
          <Link to="/portal/login/admin" className="hover:text-foreground">
            Admin login →
          </Link>
        </div>
      </div>
    </div>
  );
}
