import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { PageHeader, SectionCard, DataTable } from "@/lib/portalShared";
import { CountrySelect, IntlPhoneInput } from "@/components/portal/IntlPhoneInput";
import { isValidE164 } from "@/lib/countries";

export const Route = createFileRoute("/portal/admin/admins")({
  component: AdminsPage,
});

const field = "bg-surface border border-border rounded-md px-3 py-2 text-sm text-foreground";
const btn = "text-xs px-2.5 py-1.5 rounded-md border border-border hover:bg-surface-elevated";
const btnPrimary =
  "text-sm px-3 py-2 rounded-md bg-gradient-brand text-brand-foreground hover:opacity-90";
const btnDanger =
  "text-xs px-2.5 py-1.5 rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10";

function AdminsPage() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [myRoles, setMyRoles] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"admin" | "support">("support");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      const res = await fetch("/api/portal/admin-staff");
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const data = await res.json();
      setRows(data.admins as any[]);
      setMyRoles(data.roles as any[]);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load");
    }
  };
  useEffect(() => {
    void refresh();
  }, []);

  const isSuper = myRoles.includes("super_admin");

  const grant = async (e: FormEvent) => {
    e.preventDefault();
    if (phone && !isValidE164(phone)) {
      toast.error("Invalid international phone number");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/portal/admin-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "grant",
          payload: {
            email,
            role,
            password: password || undefined,
            legal_first_name: firstName.trim() || undefined,
            legal_last_name: lastName.trim() || undefined,
            phone: phone || undefined,
            country_of_residence: country || undefined,
          },
        }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      toast.success(
        password
          ? `Created ${role} ${email} with password. They can sign in immediately.`
          : `Invited ${email} as ${role}. They must accept the email invite.`,
      );
      setEmail("");
      setPassword("");
      setFirstName("");
      setLastName("");
      setCountry("");
      setPhone("");
      void refresh();
    } catch (e: any) {
      toast.error(e?.message);
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (uid: string, r: "admin" | "support" | "super_admin") => {
    if (!confirm(`Revoke ${r} from this user?`)) return;
    try {
      const res = await fetch("/api/portal/admin-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke", payload: { userId: uid, role: r } }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      toast.success("Revoked");
      void refresh();
    } catch (e: any) {
      toast.error(e?.message);
    }
  };

  return (
    <>
      <PageHeader
        title="Staff & Admins"
        subtitle={
          isSuper
            ? "Super admin: invite and manage admin and support staff."
            : "Read only: only super admins can grant roles."
        }
      />

      {isSuper && (
        <SectionCard title="Create or Grant Staff Role">
          <form onSubmit={grant} className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              className={field}
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              className={field}
              type="text"
              placeholder="Password (optional: sets immediately)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
            />
            <input
              className={field}
              type="text"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <input
              className={field}
              type="text"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
            <CountrySelect value={country} onChange={setCountry} />
            <IntlPhoneInput value={phone} onChange={setPhone} country={country || undefined} />
            <select className={field} value={role} onChange={(e) => setRole(e.target.value as any)}>
              <option value="support">Support</option>
              <option value="admin">Admin</option>
            </select>
            <button className={btnPrimary} disabled={busy}>
              {busy ? "Working…" : password ? "Create & Grant" : "Invite & Grant"}
            </button>
          </form>
          <p className="text-xs text-muted-foreground mt-2">
            Provide a password to provision the account immediately (email auto-confirmed). Leave
            blank to send an email invite instead.
          </p>
        </SectionCard>
      )}

      <SectionCard title={`Staff (${rows?.length ?? 0})`}>
        <DataTable
          rows={rows ?? []}
          columns={[
            { key: "email", label: "Email" },
            {
              key: "roles",
              label: "Roles",
              render: (r) => (
                <div className="flex gap-1 flex-wrap">
                  {r.roles.map((x: string) => (
                    <span
                      key={x}
                      className="text-[10px] uppercase px-1.5 py-0.5 rounded border border-border"
                    >
                      {x}
                    </span>
                  ))}
                </div>
              ),
            },
            {
              key: "last_sign_in_at",
              label: "Last sign-in",
              render: (r) =>
                r.last_sign_in_at ? new Date(r.last_sign_in_at).toLocaleString() : "—",
            },
            {
              key: "actions",
              label: "",
              render: (r) =>
                isSuper ? (
                  <div className="flex gap-1 flex-wrap">
                    {r.roles.map((x: string) => (
                      <button key={x} className={btnDanger} onClick={() => revoke(r.id, x as any)}>
                        Revoke {x}
                      </button>
                    ))}
                  </div>
                ) : null,
            },
          ]}
        />
      </SectionCard>
      <Toaster />
    </>
  );
}
