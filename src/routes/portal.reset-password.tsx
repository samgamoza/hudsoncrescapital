import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/portal/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — Hudson Crest Capital" },
      { name: "description", content: "Set a new password for your portal account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Supabase routes the recovery link to this page with a session in the URL hash;
  // the client picks it up automatically via detectSessionInUrl. We just need to
  // confirm a recovery session exists before allowing a password update.
  useEffect(() => {
    let active = true;
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session) {
        setReady(true);
      } else {
        setError("This reset link is invalid or has expired. Request a new password reset email.");
      }
    };
    void checkSession();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setReady(true);
        setError(null);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setInfo("Password updated. Redirecting to sign in…");
      await supabase.auth.signOut();
      const params = new URLSearchParams(window.location.search);
      const returnTo = params.get("return_to") || "/portal/login";
      setTimeout(() => {
        window.location.replace(returnTo);
      }, 1200);
    } catch (err: any) {
      setError(err?.message ?? "Could not update password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background grid-bg flex items-center justify-center px-6">
      <div className="w-full max-w-md surface-card p-8 shadow-elevated">
        <Link to="/" className="flex items-center justify-center mb-6">
          <img src={logo} alt="Hudson Crest Capital" className="h-12 w-auto" />
        </Link>
        <h1 className="text-2xl font-semibold text-foreground text-center">Set a new password</h1>
        <p className="text-sm text-muted-foreground text-center mt-1">
          Choose a strong password you don't use anywhere else.
        </p>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">
            New password
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={!ready || busy}
            className="bg-surface border border-border rounded-md px-3 py-2 text-foreground disabled:opacity-50"
            placeholder="••••••••"
          />
          <label className="text-xs uppercase tracking-wider text-muted-foreground mt-2">
            Confirm new password
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={!ready || busy}
            className="bg-surface border border-border rounded-md px-3 py-2 text-foreground disabled:opacity-50"
            placeholder="••••••••"
          />

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
            type="submit"
            disabled={!ready || busy}
            className="mt-2 bg-gradient-brand text-brand-foreground font-medium rounded-md px-4 py-2.5 shadow-glow hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Please wait…" : "Update password"}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-border text-center">
          <Link to="/portal/login" className="text-xs text-muted-foreground hover:text-foreground">
            ← Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
