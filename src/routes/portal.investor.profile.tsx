import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Pencil, HelpCircle, Check, X } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { PageHeader, SectionCard } from "@/lib/portalShared";
import { CountrySelect, IntlPhoneInput } from "@/components/portal/IntlPhoneInput";
import { isValidE164 } from "@/lib/countries";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/portal/investor/profile")({
  component: ProfilePage,
});

const field = "bg-surface border border-border rounded-md px-3 py-2 text-sm text-foreground w-full";
const btn =
  "text-sm px-3 py-2 rounded-md bg-gradient-brand text-brand-foreground hover:opacity-90 disabled:opacity-50";
const linkBtn = "text-sm text-brand hover:underline inline-flex items-center gap-1";

function fmt(v: any) {
  if (v == null || v === "") return "—";
  if (typeof v === "string") return v.replace(/_/g, " ");
  return String(v);
}

type EditKey = "username" | "first" | "last" | "password" | null;

function ProfilePage() {
  const navigate = useNavigate();
  const [data, setData] = useState<any | null>(null);
  const [form, setForm] = useState<any>({});
  const [addr, setAddr] = useState<any>({});
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<EditKey>(null);
  const [draft, setDraft] = useState<{
    username?: string;
    first?: string;
    last?: string;
    pw1?: string;
    pw2?: string;
  }>({});

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const load = async () => {
    try {
      const res = await fetch("/api/portal/profile");
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const d = await res.json();
      setData(d);
      setForm(d.profile ?? {});
      const accounts = (d.accounts ?? []) as any[];
      const primary = accounts.find((a) => a.status === "active") ?? accounts[0];
      setAddr(primary?.metadata?.address ?? {});
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load profile");
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const set = (k: string) => (e: any) => setForm((f: any) => ({ ...f, [k]: e.target.value }));
  const setA = (k: string) => (e: any) => setAddr((a: any) => ({ ...a, [k]: e.target.value }));

  const beginEdit = (k: EditKey) => {
    setDraft({
      username: data?.profile?.username ?? "",
      first: data?.profile?.legal_first_name ?? "",
      last: data?.profile?.legal_last_name ?? "",
      pw1: "",
      pw2: "",
    });
    setEdit(k);
  };

  const saveInline = async () => {
    setBusy(true);
    try {
      if (edit === "username") {
        if (!draft.username || !/^[a-zA-Z0-9_.-]{3,32}$/.test(draft.username))
          throw new Error("Username must be 3–32 chars (letters, numbers, . _ -)");
        await fetch("/api/portal/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update", payload: { username: draft.username } }),
        }).then((r) => {
          if (!r.ok) throw new Error(`Failed (${r.status})`);
        });
      } else if (edit === "first") {
        await fetch("/api/portal/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update",
            payload: { legal_first_name: draft.first || undefined },
          }),
        }).then((r) => {
          if (!r.ok) throw new Error(`Failed (${r.status})`);
        });
      } else if (edit === "last") {
        await fetch("/api/portal/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update",
            payload: { legal_last_name: draft.last || undefined },
          }),
        }).then((r) => {
          if (!r.ok) throw new Error(`Failed (${r.status})`);
        });
      } else if (edit === "password") {
        if (!draft.pw1 || draft.pw1.length < 8)
          throw new Error("Password must be at least 8 characters");
        if (draft.pw1 !== draft.pw2) throw new Error("Passwords do not match");
        await fetch("/api/portal/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "changePassword", payload: { newPassword: draft.pw1 } }),
        }).then((r) => {
          if (!r.ok) throw new Error(`Failed (${r.status})`);
        });
      }
      toast.success("Updated");
      setEdit(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (form.phone && !isValidE164(form.phone)) {
      toast.error("Phone must be a valid international number");
      return;
    }
    setBusy(true);
    try {
      await fetch("/api/portal/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          payload: {
            display_name: form.display_name || undefined,
            phone: form.phone || undefined,
            date_of_birth: form.date_of_birth || undefined,
            country_of_residence: form.country_of_residence || undefined,
            nationality: form.nationality || undefined,
            tax_id_last4: form.tax_id_last4 || undefined,
            address: {
              line1: addr.line1 || null,
              line2: addr.line2 || null,
              city: addr.city || null,
              state_region: addr.state_region || null,
              postal_code: addr.postal_code || null,
              country: addr.country || form.country_of_residence || null,
            },
          },
        }),
      }).then((r) => {
        if (!r.ok) throw new Error(`Failed (${r.status})`);
      });
      toast.success("Profile updated");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async () => {
    if (!confirm("Suspend your account? You can reactivate it later by signing in again.")) return;
    setBusy(true);
    try {
      await fetch("/api/portal/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deactivate" }),
      }).then((r) => {
        if (!r.ok) throw new Error(`Failed (${r.status})`);
      });
      toast.success("Account deactivated");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  const reactivate = async () => {
    setBusy(true);
    try {
      await fetch("/api/portal/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reactivate" }),
      }).then((r) => {
        if (!r.ok) throw new Error(`Failed (${r.status})`);
      });
      toast.success("Account reactivated");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  const removeAccount = async () => {
    const c = prompt(
      "This will permanently DELETE your account and all data. Type DELETE to confirm.",
    );
    if (c !== "DELETE") return;
    setBusy(true);
    try {
      await fetch("/api/portal/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", payload: { confirm: "DELETE" } }),
      }).then((r) => {
        if (!r.ok) throw new Error(`Failed (${r.status})`);
      });
      await supabase.auth.signOut();
      toast.success("Account deleted");
      navigate({ to: "/portal/login" });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
      setBusy(false);
    }
  };

  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const accounts = (data.accounts ?? []) as any[];
  const primary = accounts.find((a) => a.status === "active") ?? accounts[0];
  const fin = primary?.metadata?.financial ?? null;
  const isInactive = data.profile?.status === "inactive";

  return (
    <>
      <div className="flex items-start justify-between gap-3 mb-2">
        <PageHeader
          title="My Profile"
          subtitle="Your Profile page contains your login, email address, name, and password for your account."
        />
        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
          <span>{today}</span>
          <a className={linkBtn} href="#">
            <HelpCircle className="h-3.5 w-3.5" />
            Help
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* PROFILE */}
        <SectionCard title="PROFILE">
          <div className="divide-y divide-border">
            <Row label="Username">
              {edit === "username" ? (
                <InlineEdit
                  value={draft.username ?? ""}
                  onChange={(v) => setDraft((d) => ({ ...d, username: v }))}
                  onSave={saveInline}
                  onCancel={() => setEdit(null)}
                  busy={busy}
                  placeholder="Username"
                />
              ) : (
                <DisplayRow
                  value={data.profile?.username ?? data.email}
                  onEdit={() => beginEdit("username")}
                />
              )}
            </Row>
            <Row label="First Name">
              {edit === "first" ? (
                <InlineEdit
                  value={draft.first ?? ""}
                  onChange={(v) => setDraft((d) => ({ ...d, first: v }))}
                  onSave={saveInline}
                  onCancel={() => setEdit(null)}
                  busy={busy}
                />
              ) : (
                <DisplayRow
                  value={data.profile?.legal_first_name}
                  onEdit={() => beginEdit("first")}
                />
              )}
            </Row>
            <Row label="Last Name">
              {edit === "last" ? (
                <InlineEdit
                  value={draft.last ?? ""}
                  onChange={(v) => setDraft((d) => ({ ...d, last: v }))}
                  onSave={saveInline}
                  onCancel={() => setEdit(null)}
                  busy={busy}
                />
              ) : (
                <DisplayRow
                  value={data.profile?.legal_last_name}
                  onEdit={() => beginEdit("last")}
                />
              )}
            </Row>
            <Row label="Password">
              {edit === "password" ? (
                <div className="flex flex-col gap-2 w-full">
                  <input
                    className={field}
                    type="password"
                    placeholder="New password"
                    value={draft.pw1 ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, pw1: e.target.value }))}
                  />
                  <input
                    className={field}
                    type="password"
                    placeholder="Confirm new password"
                    value={draft.pw2 ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, pw2: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <button className={btn} onClick={saveInline} disabled={busy}>
                      Save
                    </button>
                    <button
                      className="text-sm px-3 py-2 rounded-md border border-border"
                      onClick={() => setEdit(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <DisplayRow value={"••••••••"} onEdit={() => beginEdit("password")} />
              )}
            </Row>
          </div>
        </SectionCard>

        {/* ACCOUNT EMAIL */}
        <SectionCard title="ACCOUNT EMAIL">
          <p className="text-xs italic text-muted-foreground mb-3">
            Log in with any verified email addresses shown below. Select a primary email to use for
            emailed alerts, end-of-day reports, and password reset communication.
          </p>
          <div className="flex items-center gap-3 mb-4">
            <div className="text-sm font-medium text-foreground">Primary Email:</div>
            <span className="inline-flex items-center gap-2 text-sm">
              <span className="h-3 w-3 rounded-full bg-brand inline-block" />
              {data.email}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input className={field} placeholder="Add another email…" disabled />
            <button className={`${btn} whitespace-nowrap`} disabled title="Coming soon">
              ADD
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Member since {data.created_at ? new Date(data.created_at).toLocaleDateString() : "—"} ·
            Status: <span className="capitalize">{data.profile?.status ?? "incomplete"}</span>
          </p>
        </SectionCard>
      </div>

      {/* DEACTIVATE */}
      <SectionCard title="DEACTIVATE ACCOUNT">
        <p className="text-sm text-muted-foreground mb-3">
          Use this option to <strong className="text-foreground">suspend your account</strong>.
          Deactivating your account will pause email alerts, reports and notifications associated
          with your account. We do not purge your data, so you can reactivate your account later by
          signing in.
        </p>
        {isInactive ? (
          <button className={linkBtn} onClick={reactivate} disabled={busy}>
            Reactivate My Account
          </button>
        ) : (
          <button className={linkBtn} onClick={deactivate} disabled={busy}>
            Deactivate My Account
          </button>
        )}
      </SectionCard>

      {/* DELETE */}
      <SectionCard title="DELETE MY ACCOUNT">
        <p className="text-sm text-muted-foreground mb-3">
          Use this option to{" "}
          <strong className="text-foreground">
            completely remove all data associated with your account
          </strong>
          . Deleting your account will remove your portfolios, transaction history, alerts and all
          your other personalized settings. If you delete your account, you will not be able to
          restore your previous settings.
        </p>
        <button
          className="text-sm text-danger hover:underline"
          onClick={removeAccount}
          disabled={busy}
        >
          Delete My Account
        </button>
      </SectionCard>

      {/* PERSONAL DETAILS (kept comprehensive editing) */}
      <SectionCard
        title="Personal Details"
        description="Editable. Changes are reviewed by compliance."
      >
        <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            className={field}
            placeholder="Display name"
            value={form.display_name ?? ""}
            onChange={set("display_name")}
          />
          <input
            className={field}
            type="date"
            value={form.date_of_birth ?? ""}
            onChange={set("date_of_birth")}
          />
          <input
            className={field}
            maxLength={4}
            placeholder="Tax ID, last 4"
            value={form.tax_id_last4 ?? ""}
            onChange={set("tax_id_last4")}
          />
          <div />
          <div className="md:col-span-2">
            <IntlPhoneInput
              value={form.phone ?? ""}
              onChange={(v) => setForm((f: any) => ({ ...f, phone: v }))}
              country={form.country_of_residence ?? "US"}
              defaultCountry={form.country_of_residence ?? "US"}
            />
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Country of residence</div>
            <CountrySelect
              value={form.country_of_residence}
              onChange={(c) => setForm((f: any) => ({ ...f, country_of_residence: c }))}
              includeBlank
            />
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Nationality</div>
            <CountrySelect
              value={form.nationality}
              onChange={(c) => setForm((f: any) => ({ ...f, nationality: c }))}
              includeBlank
            />
          </div>

          <div className="md:col-span-2 mt-4 pt-4 border-t border-border">
            <h3 className="text-sm font-semibold text-foreground mb-2">Address</h3>
          </div>
          <input
            className={`${field} md:col-span-2`}
            placeholder="Address line 1"
            value={addr.line1 ?? ""}
            onChange={setA("line1")}
          />
          <input
            className={`${field} md:col-span-2`}
            placeholder="Address line 2"
            value={addr.line2 ?? ""}
            onChange={setA("line2")}
          />
          <input
            className={field}
            placeholder="City"
            value={addr.city ?? ""}
            onChange={setA("city")}
          />
          <input
            className={field}
            placeholder="State / Region"
            value={addr.state_region ?? ""}
            onChange={setA("state_region")}
          />
          <input
            className={field}
            placeholder="Postal code"
            value={addr.postal_code ?? ""}
            onChange={setA("postal_code")}
          />
          <div>
            <CountrySelect
              value={addr.country ?? form.country_of_residence}
              onChange={(c) => setAddr((a: any) => ({ ...a, country: c }))}
              includeBlank
            />
          </div>

          <div className="md:col-span-2">
            <button className={btn} disabled={busy}>
              {busy ? "Saving…" : "Save Profile"}
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Accounts on file">
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No accounts yet. Your account manager will set this up.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {accounts.map((a) => (
              <div key={a.id} className="border border-border rounded-md p-3 text-sm">
                <div className="font-medium text-foreground">{a.account_number}</div>
                <div className="text-xs text-muted-foreground capitalize mt-0.5">
                  {a.account_type} · {a.base_currency} · {a.status}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Opened {a.opened_at ? new Date(a.opened_at).toLocaleDateString() : "—"}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {fin && (
        <SectionCard
          title="Suitability Profile"
          description="Read only. Contact your account manager to update."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <KV label="Employment" value={fmt(fin.employment_status)} />
            <KV label="Occupation" value={fmt(fin.occupation)} />
            <KV label="Employer" value={fmt(fin.employer)} />
            <KV label="Source of Funds" value={fmt(fin.source_of_funds)} />
            <KV label="Annual Income" value={fmt(fin.annual_income)} />
            <KV label="Net Worth" value={fmt(fin.net_worth)} />
            <KV label="Investment Experience" value={fmt(fin.investment_experience)} />
            <KV label="Risk Tolerance" value={fmt(fin.risk_tolerance)} />
          </div>
        </SectionCard>
      )}

      <Toaster />
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="text-sm font-medium text-foreground w-32 flex-shrink-0">{label}:</div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function DisplayRow({ value, onEdit }: { value: any; onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-sm text-foreground truncate">
        {value || <span className="text-muted-foreground">—</span>}
      </div>
      <button onClick={onEdit} className={linkBtn}>
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </button>
    </div>
  );
}

function InlineEdit({
  value,
  onChange,
  onSave,
  onCancel,
  busy,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  busy?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        className={field}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        autoFocus
      />
      <button
        onClick={onSave}
        disabled={busy}
        className="p-2 rounded-md bg-gradient-brand text-brand-foreground hover:opacity-90"
      >
        <Check className="h-4 w-4" />
      </button>
      <button onClick={onCancel} className="p-2 rounded-md border border-border">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function KV({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="capitalize text-foreground">{value ?? "—"}</div>
    </div>
  );
}
