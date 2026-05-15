import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { PageHeader, SectionCard } from "@/lib/portalShared";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PasswordSecurityBanner } from "@/components/investor/PasswordSecurityBanner";

export const Route = createFileRoute("/portal/investor/settings")({
  component: SettingsPage,
});

const field = cn(
  "w-full rounded-lg border border-border/70 bg-surface/90 px-3 py-2 text-sm text-foreground shadow-sm",
  "transition-[border-color,box-shadow] placeholder:text-muted-foreground/65",
  "focus:border-brand/45 focus:outline-none focus:ring-2 focus:ring-brand/15",
);
const label =
  "block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/90";
const btnSecondary = "text-sm px-3 py-2 rounded-md border border-border hover:bg-surface-elevated";

function SettingsPage() {
  const [mfa, setMfa] = useState<{ enabled: boolean; enrolled_at: string | null } | null>(null);
  const [pwBannerKey, setPwBannerKey] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/profile");
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const d = await res.json();
      setMfa(d.mfa);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load settings");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <>
      <PageHeader title="Settings" subtitle="Security and account preferences." />
      <div className="space-y-6">
        <PasswordSecurityBanner reloadKey={pwBannerKey} />
        <PasswordChangeCard
          onPasswordChanged={() => {
            void refresh();
            setPwBannerKey((k) => k + 1);
          }}
        />
        <MfaCard mfa={mfa} onChange={refresh} />
      </div>
      <Toaster />
    </>
  );
}

function PasswordChangeCard({ onPasswordChanged }: { onPasswordChanged: () => void }) {
  const [oldPw, setOldPw] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pw !== pw2) return toast.error("New passwords do not match.");
    if (pw.length < 8) return toast.error("New password must be at least 8 characters.");
    if (!oldPw) return toast.error("Enter your current password.");

    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email;
      if (!email) throw new Error("No email on session; use password reset if you sign in with SSO.");

      const { error: signErr } = await supabase.auth.signInWithPassword({
        email,
        password: oldPw,
      });
      if (signErr) {
        toast.error(signErr.message.includes("Invalid login") ? "Old password is incorrect." : signErr.message);
        return;
      }

      const res = await fetch("/api/portal/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "changePassword", payload: { newPassword: pw } }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);

      await supabase.auth.refreshSession().catch(() => {
        /* non-fatal */
      });

      toast.success("Password updated.");
      setOldPw("");
      setPw("");
      setPw2("");
      void onPasswordChanged();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard
      className="shadow-md ring-1 ring-border/40"
      title="Change your account log in password"
      description={
        <span className="block border-b border-border/60 pb-3">
          Use a strong password you have not used elsewhere. Operations staff will never ask you for
          your password by phone or email.
        </span>
      }
    >
      <div className="mt-4 space-y-4">
        <div className="rounded-lg border border-destructive/25 bg-destructive/6 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-destructive">Important notes</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-muted-foreground">
            <li>Maintain the confidentiality of your password at all times.</li>
            <li>Never write or record your password where it can be retained by another person, software, or computer.</li>
            <li>Avoid obvious password combinations based on personal details.</li>
          </ul>
        </div>

        <form onSubmit={(ev) => void submit(ev)} className="mx-auto max-w-xl space-y-3">
          <div className="grid gap-1.5 sm:grid-cols-[minmax(0,160px)_1fr] sm:items-center sm:gap-4">
            <label className={cn(label, "sm:mb-0")} htmlFor="settings-old-pw">
              Old password
            </label>
            <input
              id="settings-old-pw"
              className={field}
              type="password"
              autoComplete="current-password"
              value={oldPw}
              onChange={(e) => setOldPw(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-1.5 sm:grid-cols-[minmax(0,160px)_1fr] sm:items-center sm:gap-4">
            <label className={cn(label, "sm:mb-0")} htmlFor="settings-new-pw">
              New password
            </label>
            <input
              id="settings-new-pw"
              className={field}
              type="password"
              autoComplete="new-password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-1.5 sm:grid-cols-[minmax(0,160px)_1fr] sm:items-center sm:gap-4">
            <label className={cn(label, "sm:mb-0")} htmlFor="settings-confirm-pw">
              Confirm new password
            </label>
            <input
              id="settings-confirm-pw"
              className={field}
              type="password"
              autoComplete="new-password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              required
            />
          </div>
          <Button
            type="submit"
            disabled={busy}
            className="mt-2 gap-2 bg-gradient-brand px-8 text-brand-foreground shadow-md shadow-brand/15 hover:opacity-95"
          >
            {busy ? "Updating…" : "Update password"}
          </Button>
        </form>
      </div>
    </SectionCard>
  );
}

function MfaCard({
  mfa,
  onChange,
}: {
  mfa: { enabled: boolean; enrolled_at: string | null } | null;
  onChange: () => void;
}) {
  const [enroll, setEnroll] = useState<{ qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState<string[] | null>(null);
  const [disableCode, setDisableCode] = useState("");

  const start = async () => {
    try {
      const res = await fetch("/api/portal/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const r = await res.json();
      setEnroll({ qr: r.qr, secret: r.secret });
      setRecovery(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const verify = async () => {
    try {
      const res = await fetch("/api/portal/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", payload: { code } }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const r = await res.json();
      setRecovery(r.recoveryCodes);
      setEnroll(null);
      setCode("");
      toast.success("Two-factor authentication enabled");
      onChange();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const off = async () => {
    try {
      const res = await fetch("/api/portal/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disable", payload: { code: disableCode } }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      toast.success("MFA disabled");
      setDisableCode("");
      onChange();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <SectionCard
      className="shadow-md ring-1 ring-border/40"
      title="Two-factor authentication"
      description="Protect your account with an authenticator app (Google Authenticator, 1Password, Authy)."
    >
      {mfa?.enabled ? (
        <div className="flex flex-col gap-3">
          <div className="text-sm text-success">
            ✓ MFA enabled · enrolled{" "}
            {mfa.enrolled_at ? new Date(mfa.enrolled_at).toLocaleDateString() : ""}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              className={cn(field, "max-w-[220px]")}
              placeholder="6-digit code or recovery code"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value)}
            />
            <button type="button" className={btnSecondary} onClick={() => void off()}>
              Disable MFA
            </button>
          </div>
        </div>
      ) : enroll ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Scan the QR code with your authenticator app, then enter the 6-digit code.
          </p>
          <img src={enroll.qr} alt="MFA QR" className="h-48 w-48 bg-white p-2 rounded-lg border border-border/60" />
          <code className="text-xs text-muted-foreground break-all">Manual key: {enroll.secret}</code>
          <div className="flex flex-wrap gap-2">
            <input
              className={cn(field, "max-w-[200px]")}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Button type="button" className="bg-gradient-brand text-brand-foreground hover:opacity-95" onClick={() => void verify()}>
              Verify & Enable
            </Button>
          </div>
        </div>
      ) : recovery ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-foreground">
            Save these recovery codes. Each can be used once if you lose your device.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
            {recovery.map((c) => (
              <div key={c} className="bg-surface px-2 py-1 rounded border border-border/60">
                {c}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <Button type="button" className="bg-gradient-brand text-brand-foreground hover:opacity-95" onClick={() => void start()}>
          Enable MFA
        </Button>
      )}
    </SectionCard>
  );
}
