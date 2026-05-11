import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { PageHeader, SectionCard } from "@/lib/portalShared";

export const Route = createFileRoute("/portal/investor/settings")({
  component: SettingsPage,
});

const field = "bg-surface border border-border rounded-md px-3 py-2 text-sm text-foreground w-full";
const btn = "text-sm px-3 py-2 rounded-md bg-gradient-brand text-brand-foreground hover:opacity-90";
const btnSecondary = "text-sm px-3 py-2 rounded-md border border-border hover:bg-surface-elevated";

function SettingsPage() {
  const [mfa, setMfa] = useState<{ enabled: boolean; enrolled_at: string | null } | null>(null);

  const refresh = async () => {
    try {
      const res = await fetch("/api/portal/profile");
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const d = await res.json();
      setMfa(d.mfa);
    } catch (e: any) {
      toast.error(e?.message);
    }
  };
  useEffect(() => {
    void refresh();
  }, []);

  return (
    <>
      <PageHeader title="Settings" subtitle="Security and account preferences." />
      <PasswordCard />
      <MfaCard mfa={mfa} onChange={refresh} />
      <Toaster />
    </>
  );
}

function PasswordCard() {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pw !== pw2) return toast.error("Passwords do not match");
    if (pw.length < 8) return toast.error("Password must be at least 8 characters");
    setBusy(true);
    try {
      const res = await fetch("/api/portal/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "changePassword", payload: { newPassword: pw } }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      toast.success("Password changed");
      setPw("");
      setPw2("");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard title="Change Password" description="Use at least 8 characters.">
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          className={field}
          type="password"
          placeholder="New password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          required
        />
        <input
          className={field}
          type="password"
          placeholder="Confirm new password"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          required
        />
        <div className="md:col-span-2">
          <button className={btn} disabled={busy}>
            {busy ? "Updating…" : "Update Password"}
          </button>
        </div>
      </form>
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
    } catch (e: any) {
      toast.error(e?.message);
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
    } catch (e: any) {
      toast.error(e?.message);
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
    } catch (e: any) {
      toast.error(e?.message);
    }
  };

  return (
    <SectionCard
      title="Two-Factor Authentication"
      description="Protect your account with an authenticator app (Google Authenticator, 1Password, Authy)."
    >
      {mfa?.enabled ? (
        <div className="flex flex-col gap-3">
          <div className="text-sm text-success">
            ✓ MFA enabled · enrolled{" "}
            {mfa.enrolled_at ? new Date(mfa.enrolled_at).toLocaleDateString() : ""}
          </div>
          <div className="flex gap-2 items-center">
            <input
              className={`${field} max-w-[200px]`}
              placeholder="6-digit code or recovery code"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value)}
            />
            <button className={btnSecondary} onClick={off}>
              Disable MFA
            </button>
          </div>
        </div>
      ) : enroll ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Scan the QR code with your authenticator app, then enter the 6-digit code.
          </p>
          <img src={enroll.qr} alt="MFA QR" className="h-48 w-48 bg-white p-2 rounded" />
          <code className="text-xs text-muted-foreground break-all">
            Manual key: {enroll.secret}
          </code>
          <div className="flex gap-2">
            <input
              className={`${field} max-w-[200px]`}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button className={btn} onClick={verify}>
              Verify & Enable
            </button>
          </div>
        </div>
      ) : recovery ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-foreground">
            Save these recovery codes. Each can be used once if you lose your device.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
            {recovery.map((c) => (
              <div key={c} className="bg-surface px-2 py-1 rounded border border-border">
                {c}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <button className={btn} onClick={start}>
          Enable MFA
        </button>
      )}
    </SectionCard>
  );
}
