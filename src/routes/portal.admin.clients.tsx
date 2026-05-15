import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { PageHeader, SectionCard } from "@/lib/portalShared";
import { CountrySelect, IntlPhoneInput } from "@/components/portal/IntlPhoneInput";
import { ClientSubPortfolios } from "@/components/portal/ClientSubPortfolios";
import { usePersistedState } from "@/hooks/usePersistedState";

export const Route = createFileRoute("/portal/admin/clients")({
  component: ClientsPage,
});

type ClientRow = any;
type ClientDetail = any;

const field = "bg-surface border border-border rounded-md px-3 py-2 text-sm text-foreground w-full";
const btn = "text-xs px-2.5 py-1.5 rounded-md border border-border hover:bg-surface-elevated";
const btnPrimary =
  "text-xs px-2.5 py-1.5 rounded-md bg-gradient-brand text-brand-foreground hover:opacity-90";
const btnDanger =
  "text-xs px-2.5 py-1.5 rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10";

async function apiJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  const text = await res.text();
  if (!res.ok) {
    let message = text || `Request failed (${res.status})`;
    try {
      const parsed = text ? JSON.parse(text) : {};
      if (parsed && typeof parsed === "object") {
        const err = typeof (parsed as any).error === "string" ? (parsed as any).error : "";
        const hint = typeof (parsed as any).hint === "string" ? (parsed as any).hint : "";
        const rawDetails = (parsed as any).details;
        const detailsStr =
          typeof rawDetails === "string"
            ? rawDetails
            : rawDetails && typeof rawDetails === "object" && rawDetails.fieldErrors
              ? JSON.stringify(rawDetails.fieldErrors)
              : "";
        message = [err, hint, detailsStr].filter(Boolean).join(" — ") || message;
      }
    } catch {
      // keep raw text fallback
    }
    throw new Error(message);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

function statusTone(status: string) {
  switch (status) {
    case "active":
      return "border-success/40 text-success bg-success/10";
    case "pending":
      return "border-yellow-500/40 text-yellow-500 bg-yellow-500/10";
    case "suspended":
      return "border-orange-500/40 text-orange-500 bg-orange-500/10";
    case "rejected":
    case "closed":
      return "border-destructive/40 text-destructive bg-destructive/10";
    default:
      return "border-border text-muted-foreground";
  }
}

function ClientsPage() {
  const [rows, setRows] = useState<ClientRow[] | null>(null);
  const [filter, setFilter] = usePersistedState<string>("admin:clients:filter", "");
  const [statusFilter, setStatusFilter] = usePersistedState<string>("admin:clients:status", "all");
  const [selectedId, setSelectedId] = usePersistedState<string | null>(
    "admin:clients:selected",
    null,
  );
  const [myRoles, setMyRoles] = useState<string[]>([]);
  const isSuper = myRoles.includes("super_admin");
  const [resetting, setResetting] = useState(false);

  const refresh = async () => {
    try {
      const r = await apiJson<ClientRow[]>("/api/portal/clients-admin?action=list");
      setRows(Array.isArray(r) ? r : []);
    } catch (e: any) {
      setRows([]);
      toast.error(e?.message ?? "Failed to load clients");
    }
  };

  useEffect(() => {
    void refresh();
    void apiJson<string[]>("/api/portal/clients-admin?action=roles")
      .then((r) => setMyRoles(r as any[]))
      .catch((e: any) => {
        console.error("[clients-admin] roles fetch failed:", e?.message ?? e);
      });
  }, []);

  const doReset = async () => {
    const c = window.prompt(
      'This will permanently delete EVERY client user and all their data. Type "RESET ALL CLIENTS" to confirm.',
    );
    if (c !== "RESET ALL CLIENTS") return;
    setResetting(true);
    try {
      const res = await apiJson<{ deleted: number }>("/api/portal/clients-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resetAllClients",
          payload: { confirm: "RESET ALL CLIENTS" },
        }),
      });
      toast.success(
        `Reset complete. ${res.deleted} client${res.deleted === 1 ? "" : "s"} removed.`,
      );
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Reset failed");
    } finally {
      setResetting(false);
    }
  };

  const filtered = (rows ?? []).filter((r) => {
    if (statusFilter !== "all") {
      const hasStatus = r.accounts.some((a: any) => a.status === statusFilter);
      const isPendingProfile = statusFilter === "pending" && r.accounts.length === 0;
      if (!hasStatus && !isPendingProfile) return false;
    }
    if (!filter) return true;
    const f = filter.toLowerCase();
    const name =
      `${r.profile?.legal_first_name ?? ""} ${r.profile?.legal_last_name ?? ""}`.toLowerCase();
    return r.email.toLowerCase().includes(f) || name.includes(f);
  });

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle="Manage existing clients: verification (KYC) status, account lifecycle, profile, notes."
      />

      <div className="flex flex-wrap gap-3 items-center">
        <input
          className={`${field} max-w-sm`}
          placeholder="Search email or name…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <select
          className={field + " max-w-[180px]"}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="rejected">Rejected</option>
          <option value="closed">Closed</option>
        </select>
        <div className="ml-auto flex gap-2">
          <button className={btn} onClick={() => void refresh()}>
            Refresh
          </button>
          <Link
            to="/portal/signup/investor"
            target="_blank"
            rel="noopener noreferrer"
            className={btnPrimary}
            title="Opens the same investor online account application used on the public Investor Portal (new browser tab)."
          >
            + Online account application
          </Link>
          {isSuper && (
            <button disabled={resetting} className={btnDanger} onClick={() => void doReset()}>
              {resetting ? "Resetting…" : "⚠ Reset all clients"}
            </button>
          )}
        </div>
      </div>

      <SectionCard title={`${filtered.length} client${filtered.length === 1 ? "" : "s"}`}>
        {!rows ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Accounts</th>
                  <th className="py-2 pr-4 font-medium">Verification</th>
                  <th className="py-2 pr-4 font-medium">Login</th>
                  <th className="py-2 pr-4 font-medium">Joined</th>
                  <th className="py-2 pr-4 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const banned = r.banned_until && new Date(r.banned_until) > new Date();
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-border/50 hover:bg-surface-elevated/40"
                    >
                      <td className="py-3 pr-4">
                        {r.profile?.legal_first_name ?? r.profile?.display_name ?? "—"}{" "}
                        {r.profile?.legal_last_name ?? ""}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{r.email}</td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {r.accounts.length === 0 && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                          {r.accounts.map((a: any) => (
                            <span
                              key={a.id}
                              className={`text-xs px-2 py-0.5 rounded-full border ${statusTone(a.status)}`}
                            >
                              {a.account_number} · {a.status}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full border ${statusTone(r.profile?.status === "approved" ? "active" : r.profile?.status === "rejected" ? "rejected" : "pending")}`}
                        >
                          {r.profile?.status ?? "incomplete"}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs ${banned ? "text-destructive" : "text-success"}`}>
                          {banned ? "Disabled" : "Enabled"}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground text-xs">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 pr-4">
                        <button className={btn} onClick={() => setSelectedId(r.id)}>
                          Manage
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {selectedId && (
        <ClientDrawer
          userId={selectedId}
          isSuper={isSuper}
          onClose={() => setSelectedId(null)}
          onChanged={() => void refresh()}
          onDeleted={() => {
            setSelectedId(null);
            void refresh();
          }}
        />
      )}

      <Toaster />
    </>
  );
}

function ClientDrawer({
  userId,
  isSuper,
  onClose,
  onChanged,
  onDeleted,
}: {
  userId: string;
  isSuper: boolean;
  onClose: () => void;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [data, setData] = useState<ClientDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [profile, setProfile] = useState<any>({});

  const load = async () => {
    try {
      const d = await apiJson<ClientDetail>(
        `/api/portal/clients-admin?action=detail&userId=${encodeURIComponent(userId)}`,
      );
      setData(d);
      setProfile(d.profile ?? {});
    } catch (e: any) {
      toast.error(e?.message ?? "Load failed");
    }
  };

  useEffect(() => {
    void load();
  }, [userId]);

  const wrap = async (label: string, fn: () => Promise<any>) => {
    setBusy(true);
    try {
      await fn();
      toast.success(label);
      await load();
      onChanged();
    } catch (e: any) {
      toast.error(e?.message ?? "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const acctAction = (accountId: string, action: any) => {
    let reason: string | undefined;
    if (action === "suspend" || action === "reject" || action === "close") {
      reason = window.prompt(`Reason for ${action}?`) ?? undefined;
      if (action === "suspend" && !reason) return;
    }
    void wrap(`Account ${action}d`, () =>
      apiJson("/api/portal/clients-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateAccountStatus",
          payload: { accountId, action, reason },
        }),
      }),
    );
  };

  const banned = data?.banned_until && new Date(data.banned_until) > new Date();

  const verificationToastShown = useRef(false);
  useEffect(() => {
    verificationToastShown.current = false;
  }, [userId]);

  useEffect(() => {
    if (!data || verificationToastShown.current) return;
    const st = (data.profile?.status as string | undefined) ?? "incomplete";
    if (st !== "approved") {
      verificationToastShown.current = true;
      toast.message("Verification not approved", {
        description:
          "This client’s profile status is still incomplete or pending approval. Use the alert below or Verification status in Profile to mark Approved after KYC. Deposits also need an active brokerage account.",
        duration: 14_000,
      });
    }
  }, [data, userId]);

  const verificationState =
    data != null
      ? ((profile?.status as string | undefined) ??
          (data.profile?.status as string | undefined) ??
          "incomplete")
      : "incomplete";
  const hasActiveAccount = !!(data?.accounts ?? []).some((a: any) => a.status === "active");
  const hasPendingAccount = !!(data?.accounts ?? []).some((a: any) => a.status === "pending");
  const noAccounts = (data?.accounts ?? []).length === 0;
  const isInvestor = !!(data?.roles ?? []).includes("investor");
  const depositReady = hasActiveAccount;
  const verificationApproved = verificationState === "approved";

  const approveVerificationNow = () => {
    if (
      !window.confirm(
        "Mark this client’s verification as Approved? Only confirm after required KYC/AML checks are satisfied. Deposits still require an active brokerage account.",
      )
    )
      return;
    void wrap("Verification approved", () =>
      apiJson("/api/portal/clients-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateProfile",
          payload: { userId, patch: { status: "approved" } },
        }),
      }),
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-end" onClick={onClose}>
      <div
        className="bg-background border-l border-border w-full max-w-2xl h-full overflow-y-auto p-6 flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        {!data ? (
          <div className="text-muted-foreground text-sm">Loading…</div>
        ) : (
          <>
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold">
                  {data.profile?.legal_first_name ?? ""} {data.profile?.legal_last_name ?? ""}
                </h2>
                <div className="text-sm text-muted-foreground">{data.email}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Joined {new Date(data.created_at).toLocaleDateString()} · Last sign-in{" "}
                  {data.last_sign_in_at ? new Date(data.last_sign_in_at).toLocaleString() : "never"}
                </div>
              </div>
              <button className={btn} onClick={onClose}>
                Close
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                disabled={busy}
                className={btn}
                onClick={() =>
                  void wrap("Reset email sent", () =>
                    apiJson("/api/portal/clients-admin", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "sendPasswordReset",
                        payload: { email: data.email },
                      }),
                    }),
                  )
                }
              >
                Send password reset
              </button>
              <button
                disabled={busy}
                className={btn}
                onClick={() =>
                  void wrap(banned ? "Login enabled" : "Login disabled", () =>
                    apiJson("/api/portal/clients-admin", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "setClientLoginEnabled",
                        payload: { userId, enabled: !!banned },
                      }),
                    }),
                  )
                }
              >
                {banned ? "Enable login" : "Disable login"}
              </button>
              <button
                disabled={busy}
                className={btnDanger}
                onClick={() => {
                  if (
                    !window.confirm(
                      "Deactivate client? This closes all accounts and disables login.",
                    )
                  )
                    return;
                  void wrap("Client deactivated", () =>
                    apiJson("/api/portal/clients-admin", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "deactivateClient", payload: { userId } }),
                    }),
                  );
                }}
              >
                Deactivate client
              </button>
              {isSuper && (
                <button
                  disabled={busy}
                  className={btnDanger}
                  onClick={async () => {
                    const c = window.prompt(
                      'PERMANENTLY delete this client and ALL their data? Type "DELETE" to confirm.',
                    );
                    if (c !== "DELETE") return;
                    setBusy(true);
                    try {
                      await apiJson("/api/portal/clients-admin", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          action: "deleteClient",
                          payload: { userId, confirm: "DELETE" },
                        }),
                      });
                      toast.success("Client permanently deleted");
                      onDeleted();
                    } catch (e: any) {
                      toast.error(e?.message ?? "Delete failed");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  ⚠ Delete permanently
                </button>
              )}
            </div>

            {data && (!verificationApproved || !depositReady) && (
              <div
                className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground/95 space-y-2"
                role="status"
              >
                <p className="font-semibold text-foreground">Funding & verification checklist</p>
                {!verificationApproved && (
                  <p className="text-muted-foreground leading-relaxed">
                    <span className="text-foreground font-medium">Verification</span> is{" "}
                    <span className="text-foreground capitalize">{verificationState}</span> (this is
                    what the client list column shows). The investor portal treats anything other than{" "}
                    <span className="text-foreground font-medium">Approved</span> as not fully cleared.
                    Set <strong className="text-foreground">Verification status</strong> below to
                    Approved and click <strong className="text-foreground">Save profile</strong>, or use
                    the shortcut.
                  </p>
                )}
                {!verificationApproved && (
                  <button
                    type="button"
                    disabled={busy}
                    className={btnPrimary}
                    onClick={() => void approveVerificationNow()}
                  >
                    Approve verification now
                  </button>
                )}
                {!depositReady && (
                  <p className="text-muted-foreground leading-relaxed pt-1 border-t border-amber-500/25 mt-2">
                    <span className="text-foreground font-medium">Deposits</span> (wallet / hosted
                    checkout) only unlock when at least one brokerage account here is{" "}
                    <span className="text-foreground font-medium">active</span> — that is separate from
                    profile verification.
                    {noAccounts && (
                      <>
                        {" "}
                        This client has <span className="text-foreground font-medium">no brokerage account
                        row yet</span>, so there is nothing to Approve until a{" "}
                        <span className="text-foreground font-medium">pending</span> account appears under
                        Accounts. Typical paths: they complete the{" "}
                        <Link
                          to="/portal/signup/investor"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand underline-offset-2 hover:underline font-medium"
                        >
                          online account application
                        </Link>{" "}
                        (Investor Portal signup), or desk uses{" "}
                        <span className="text-foreground font-medium">Create pending brokerage account</span>{" "}
                        in Accounts below, then clicks <span className="text-foreground font-medium">Approve</span>.
                      </>
                    )}
                    {hasPendingAccount && !hasActiveAccount && (
                      <>
                        {" "}
                        Use <span className="text-foreground font-medium">Approve</span> under{" "}
                        <span className="text-foreground font-medium">Accounts</span> below when ready.
                      </>
                    )}
                    {!noAccounts && !hasPendingAccount && !hasActiveAccount && (
                      <>
                        {" "}
                        Review account rows under <strong className="text-foreground">Accounts</strong>{" "}
                        — none are active yet.
                      </>
                    )}
                  </p>
                )}
              </div>
            )}

            <SectionCard title="Profile">
              <div className="grid grid-cols-2 gap-3">
                <input
                  className={field}
                  placeholder="First name"
                  value={profile.legal_first_name ?? ""}
                  onChange={(e) => setProfile({ ...profile, legal_first_name: e.target.value })}
                />
                <input
                  className={field}
                  placeholder="Last name"
                  value={profile.legal_last_name ?? ""}
                  onChange={(e) => setProfile({ ...profile, legal_last_name: e.target.value })}
                />
                <div className="col-span-2">
                  <IntlPhoneInput
                    value={profile.phone ?? ""}
                    onChange={(v) => setProfile({ ...profile, phone: v })}
                    defaultCountry={profile.country_of_residence ?? "US"}
                  />
                </div>
                <input
                  className={field}
                  type="date"
                  value={profile.date_of_birth ?? ""}
                  onChange={(e) => setProfile({ ...profile, date_of_birth: e.target.value })}
                />
                <input
                  className={field}
                  maxLength={4}
                  placeholder="Tax ID last 4"
                  value={profile.tax_id_last4 ?? ""}
                  onChange={(e) => setProfile({ ...profile, tax_id_last4: e.target.value })}
                />
                <CountrySelect
                  value={profile.country_of_residence}
                  onChange={(c) => setProfile({ ...profile, country_of_residence: c })}
                  includeBlank
                />
                <CountrySelect
                  value={profile.nationality}
                  onChange={(c) => setProfile({ ...profile, nationality: c })}
                  includeBlank
                />
                <div className="col-span-2 rounded-md border border-border bg-surface/40 p-3 space-y-2">
                  <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Verification status (client list / KYC gate)
                  </label>
                  <select
                    className={field + " w-full"}
                    value={profile.status ?? "incomplete"}
                    onChange={(e) => setProfile({ ...profile, status: e.target.value })}
                  >
                    <option value="incomplete">Incomplete — not cleared for full onboarding</option>
                    <option value="submitted">Submitted — awaiting staff review</option>
                    <option value="approved">Approved — verification complete (manual attestation)</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    This field updates the <strong className="text-foreground">Verification</strong> badge
                    on the client list. Choosing <strong className="text-foreground">Approved</strong> does
                    not by itself enable deposits — the investor still needs an{" "}
                    <strong className="text-foreground">active</strong> account under Accounts.
                  </p>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  disabled={busy}
                  className={btnPrimary}
                  onClick={() =>
                    void wrap("Profile saved", () =>
                      apiJson("/api/portal/clients-admin", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          action: "updateProfile",
                          payload: { userId, patch: profile },
                        }),
                      }),
                    )
                  }
                >
                  Save profile
                </button>
              </div>
            </SectionCard>

            <ClientSubPortfolios
              userId={userId}
              accounts={data.accounts as any[]}
              onChanged={() => void load()}
              readonly
            />

            <SectionCard
              title="Accounts"
              description="Approve onboarding so the account becomes active. Deposits require at least one active account (separate from profile verification above)."
            >
              {data.accounts.length === 0 && (
                <div className="rounded-md border border-amber-500/35 bg-amber-500/10 px-3 py-3 text-sm space-y-3 mb-3">
                  <p className="text-muted-foreground leading-relaxed">
                    <span className="font-medium text-foreground">No account on file.</span> The Approve
                    button only appears for a row in <span className="text-foreground font-medium">pending</span>{" "}
                    status. If the investor never finished signup bootstrap, create a pending row here (or have
                    them finish{" "}
                    <Link
                      to="/portal/signup/investor"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand underline-offset-2 hover:underline font-medium"
                    >
                      Investor signup
                    </Link>
                    ).
                  </p>
                  {isInvestor ? (
                    <button
                      type="button"
                      disabled={busy}
                      className={btnPrimary}
                      onClick={() => {
                        if (
                          !window.confirm(
                            "Create a pending cash brokerage account (USD) for this client? You can then Approve it when due diligence is complete.",
                          )
                        )
                          return;
                        void wrap("Pending brokerage account created", () =>
                          apiJson("/api/portal/clients-admin", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              action: "provisionPendingBrokerageAccount",
                              payload: { userId },
                            }),
                          }),
                        );
                      }}
                    >
                      Create pending brokerage account
                    </button>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      This user is not flagged as an investor. Use Staff onboarding or assign the investor role
                      before creating an account.
                    </p>
                  )}
                </div>
              )}
              <div className="flex flex-col gap-3">
                {data.accounts.map((a: any) => (
                  <div key={a.id} className="border border-border rounded-md p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-sm">
                          {a.account_number}{" "}
                          <span className="text-muted-foreground">
                            · {a.account_type} · {a.base_currency}
                          </span>
                        </div>
                        <span
                          className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full border ${statusTone(a.status)}`}
                        >
                          {a.status}
                        </span>
                        {a.suspension_reason && (
                          <div className="text-xs text-orange-400 mt-1">
                            Suspension: {a.suspension_reason}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        {a.status === "pending" && (
                          <>
                            <button
                              disabled={busy}
                              className={btnPrimary}
                              onClick={() => acctAction(a.id, "approve")}
                            >
                              Approve
                            </button>
                            <button
                              disabled={busy}
                              className={btnDanger}
                              onClick={() => acctAction(a.id, "reject")}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {a.status === "active" && (
                          <button
                            disabled={busy}
                            className={btn}
                            onClick={() => acctAction(a.id, "suspend")}
                          >
                            Suspend
                          </button>
                        )}
                        {a.status === "suspended" && (
                          <button
                            disabled={busy}
                            className={btnPrimary}
                            onClick={() => acctAction(a.id, "reactivate")}
                          >
                            Reactivate
                          </button>
                        )}
                        {a.status !== "closed" && (
                          <button
                            disabled={busy}
                            className={btnDanger}
                            onClick={() => acctAction(a.id, "close")}
                          >
                            Close
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="KYC documents">
              {data.kyc_documents.length === 0 && (
                <div className="text-sm text-muted-foreground">No documents submitted.</div>
              )}
              <div className="flex flex-col gap-2">
                {data.kyc_documents.map((d: any) => (
                  <div
                    key={d.id}
                    className="flex justify-between items-center border-b border-border/50 py-2 text-sm"
                  >
                    <div>
                      <div>{d.doc_type}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(d.submitted_at).toLocaleString()}
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${statusTone(d.status === "approved" ? "active" : d.status === "rejected" ? "rejected" : "pending")}`}
                    >
                      {d.status}
                    </span>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Internal notes">
              <div className="flex gap-2 mb-3">
                <input
                  className={field}
                  placeholder="Add note (admin-only)…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <button
                  disabled={busy || !note.trim()}
                  className={btnPrimary}
                  onClick={() =>
                    void wrap("Note added", async () => {
                      await apiJson("/api/portal/clients-admin", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          action: "addClientNote",
                          payload: { userId, note },
                        }),
                      });
                      setNote("");
                    })
                  }
                >
                  Add
                </button>
              </div>
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                {data.notes.length === 0 && (
                  <div className="text-xs text-muted-foreground">No notes yet.</div>
                )}
                {data.notes.map((n: any) => (
                  <div key={n.id} className="text-sm border border-border rounded-md p-2">
                    <div>{n.note}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </>
        )}
      </div>
    </div>
  );
}
