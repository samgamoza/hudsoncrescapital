import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { PageHeader, SectionCard, MetricCard, DataTable } from "@/lib/portalShared";
import {
  FundingEligibilityCallout,
  activeFundingAccounts,
  pendingFundingAccounts,
} from "@/components/portal/FundingEligibilityCallout";
import { assignLocationHref } from "@/lib/assign-location-href";
import { ProfileGate } from "@/components/portal/ProfileGateLock";
import { ClassicWalletFundingPanels } from "@/components/investor/ClassicWalletFundingPanels";

export const Route = createFileRoute("/portal/investor/wallet")({
  component: GuardedWalletPage,
});

function GuardedWalletPage() {
  return (
    <ProfileGate
      feature="Wallet"
      hint="Deposits and withdrawals open up once your profile is submitted and our desk approves your account."
    >
      <WalletPage />
    </ProfileGate>
  );
}

type Data = {
  wallets: any[];
  transactions: any[];
  deposits: any[];
  withdrawals: any[];
  accounts: any[];
};
const field = "bg-surface border border-border rounded-md px-3 py-2 text-sm text-foreground w-full";
const btn = "text-xs px-2.5 py-1.5 rounded-md border border-border hover:bg-surface-elevated";
const btnPrimary =
  "text-sm px-3 py-2 rounded-md bg-gradient-brand text-brand-foreground hover:opacity-90";

function fmt(n: any, c = "USD") {
  return Number(n ?? 0).toLocaleString(undefined, { style: "currency", currency: c });
}

function WalletPage() {
  const [d, setD] = useState<Data | null>(null);
  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");

  const refresh = async () => {
    try {
      const res = await fetch("/api/portal/wallet-actions");
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      setD(await res.json());
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load wallet");
    }
  };
  useEffect(() => {
    void refresh();
  }, []);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("deposit");
    if (p === "success") toast.success("Payment received. Your deposit will be credited shortly.");
    if (p === "cancel") toast.message("Payment cancelled.");
    if (p) window.history.replaceState({}, "", window.location.pathname);
  }, []);

  const totalAvailable = (d?.wallets ?? []).reduce(
    (s, w: any) => s + Number(w.available_balance),
    0,
  );
  const totalHold = (d?.wallets ?? []).reduce((s, w: any) => s + Number(w.on_hold), 0);
  const acctRows = d?.accounts ?? [];
  const activeAcctCount = activeFundingAccounts(acctRows).length;
  const pendingAcctCount = pendingFundingAccounts(acctRows).length;

  return (
    <>
      <PageHeader
        title="Wallet"
        subtitle="Manage your account balance, deposits and withdrawals."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard title="Available Balance" value={fmt(totalAvailable)} />
        <MetricCard title="On Hold" value={fmt(totalHold)} />
        <MetricCard
          title="Active Accounts"
          value={String(activeAcctCount)}
          helper={
            pendingAcctCount > 0
              ? `${pendingAcctCount} pending approval (Admin → Clients → Accounts — not Funding Review)`
              : activeAcctCount === 0 && acctRows.length > 0
                ? "None active — see message under Deposit"
                : undefined
          }
        />
      </div>

      <ClassicWalletFundingPanels onWireSubmitted={refresh} />

      <SectionCard
        title="Request Funds"
        description="Manual deposits and withdrawals are reviewed by our operations team."
      >
        <div className="flex gap-2 mb-4">
          <button
            className={`${btn} ${tab === "deposit" ? "bg-surface-elevated" : ""}`}
            onClick={() => setTab("deposit")}
          >
            Deposit
          </button>
          <button
            className={`${btn} ${tab === "withdraw" ? "bg-surface-elevated" : ""}`}
            onClick={() => setTab("withdraw")}
          >
            Withdraw
          </button>
        </div>
        {tab === "deposit" ? (
          <DepositForm accounts={d?.accounts ?? []} onDone={refresh} />
        ) : (
          <WithdrawForm accounts={d?.accounts ?? []} wallets={d?.wallets ?? []} onDone={refresh} />
        )}
      </SectionCard>

      <SectionCard title="Pending Requests">
        <DataTable
          rows={[
            ...(d?.deposits ?? []).map((r: any) => ({ ...r, kind: "Deposit" })),
            ...(d?.withdrawals ?? []).map((r: any) => ({ ...r, kind: "Withdrawal" })),
          ].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))}
          columns={[
            {
              key: "created_at",
              label: "Date",
              render: (r) => new Date(r.created_at).toLocaleString(),
            },
            { key: "kind", label: "Type" },
            { key: "amount", label: "Amount", render: (r) => fmt(r.amount, r.currency) },
            { key: "method", label: "Method" },
            {
              key: "status",
              label: "Status",
              render: (r) => <span className="capitalize">{r.status}</span>,
            },
            {
              key: "actions",
              label: "",
              render: (r) =>
                r.status === "pending" ? (
                  <button
                    className={btn}
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/portal/wallet-actions", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            action: "cancel",
                            payload: {
                              requestId: r.id,
                              kind: r.kind === "Deposit" ? "deposit" : "withdrawal",
                            },
                          }),
                        });
                        if (!res.ok) throw new Error(`Failed (${res.status})`);
                        toast.success("Cancelled");
                        await refresh();
                      } catch (e: any) {
                        toast.error(e?.message);
                      }
                    }}
                  >
                    Cancel
                  </button>
                ) : null,
            },
          ]}
        />
      </SectionCard>

      <SectionCard title="Recent Wallet Activity">
        <DataTable
          rows={d?.transactions ?? []}
          columns={[
            {
              key: "created_at",
              label: "Date",
              render: (r) => new Date(r.created_at).toLocaleString(),
            },
            {
              key: "txn_type",
              label: "Type",
              render: (r) => <span className="capitalize">{r.txn_type}</span>,
            },
            { key: "description", label: "Description" },
            {
              key: "amount",
              label: "Amount",
              render: (r) => (
                <span className={Number(r.amount) >= 0 ? "text-success" : "text-destructive"}>
                  {fmt(r.amount, r.currency)}
                </span>
              ),
            },
            {
              key: "balance_after",
              label: "Balance After",
              render: (r) => fmt(r.balance_after, r.currency),
            },
          ]}
        />
      </SectionCard>

      <Toaster />
    </>
  );
}

function DepositForm({ accounts, onDone }: { accounts: any[]; onDone: () => void }) {
  const active = activeFundingAccounts(accounts);
  const [accountId, setAccountId] = useState(active[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [providers, setProviders] = useState<{ stripe: boolean; paypal: boolean }>({
    stripe: false,
    paypal: false,
  });

  useEffect(() => {
    if (!accountId && active[0]) setAccountId(String(active[0].id ?? ""));
  }, [active.length]);
  useEffect(() => {
    void fetch("/api/portal/wallet-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "providers" }),
    })
      .then((r) => (r.ok ? r.json() : { stripe: false, paypal: false }))
      .then(setProviders)
      .catch(() => {});
  }, []);

  const payHosted = async (provider: "stripe" | "paypal") => {
    if (!accountId || !amount) {
      toast.error("Select an account and amount");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/portal/wallet-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "hosted-deposit",
          payload: { accountId, amount: Number(amount), provider, origin: window.location.origin },
        }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const { url } = await res.json();
      assignLocationHref(url);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to start checkout");
      setBusy(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/portal/wallet-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deposit",
          payload: {
            accountId,
            amount: Number(amount),
            method,
            reference: reference || undefined,
            notes: notes || undefined,
          },
        }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      toast.success("Deposit request submitted for review");
      setAmount("");
      setReference("");
      setNotes("");
      onDone();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to submit");
    } finally {
      setBusy(false);
    }
  };

  if (!active.length) return <FundingEligibilityCallout accounts={accounts} />;

  return (
    <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <select className={field} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
        {active.map((a: any) => (
          <option key={a.id} value={a.id}>
            {a.account_number} ({a.base_currency})
          </option>
        ))}
      </select>
      <select className={field} value={method} onChange={(e) => setMethod(e.target.value)}>
        <option value="bank_transfer">Bank Transfer</option>
        <option value="wire">Wire</option>
        <option value="crypto">Crypto</option>
        <option value="other">Other</option>
      </select>
      <input
        className={field}
        type="number"
        step="0.01"
        min="0"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />
      <input
        className={field}
        placeholder="Reference (e.g. transfer ID)"
        value={reference}
        onChange={(e) => setReference(e.target.value)}
      />
      <textarea
        className={`${field} md:col-span-2`}
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <div className="md:col-span-2 flex flex-wrap gap-2 items-center">
        <button type="submit" className={btnPrimary} disabled={busy}>
          {busy ? "Submitting…" : "Submit Manual Request"}
        </button>
        {providers.stripe && (
          <button
            type="button"
            className={btnPrimary}
            disabled={busy}
            onClick={() => payHosted("stripe")}
          >
            Pay with Card (Stripe)
          </button>
        )}
        {providers.paypal && (
          <button
            type="button"
            className={btnPrimary}
            disabled={busy}
            onClick={() => payHosted("paypal")}
          >
            Pay with PayPal
          </button>
        )}
        {!providers.stripe && !providers.paypal && (
          <span className="text-xs text-muted-foreground">
            Card / PayPal checkout will appear here once payment keys are configured.
          </span>
        )}
      </div>
    </form>
  );
}

function WithdrawForm({
  accounts,
  wallets,
  onDone,
}: {
  accounts: any[];
  wallets: any[];
  onDone: () => void;
}) {
  const active = activeFundingAccounts(accounts);
  const [accountId, setAccountId] = useState(active[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [destination, setDestination] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!accountId && active[0]) setAccountId(String(active[0].id ?? ""));
  }, [active.length]);
  const wallet = wallets.find((w: any) => w.account_id === accountId);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/portal/wallet-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "withdraw",
          payload: {
            accountId,
            amount: Number(amount),
            method,
            destination,
            notes: notes || undefined,
          },
        }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      toast.success("Withdrawal request submitted for review");
      setAmount("");
      setDestination("");
      setNotes("");
      onDone();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to submit");
    } finally {
      setBusy(false);
    }
  };

  if (!active.length) return <FundingEligibilityCallout accounts={accounts} />;

  return (
    <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <select className={field} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
        {active.map((a: any) => (
          <option key={a.id} value={a.id}>
            {a.account_number}
          </option>
        ))}
      </select>
      <select className={field} value={method} onChange={(e) => setMethod(e.target.value)}>
        <option value="bank_transfer">Bank Transfer</option>
        <option value="wire">Wire</option>
        <option value="crypto">Crypto</option>
        <option value="other">Other</option>
      </select>
      <input
        className={field}
        type="number"
        step="0.01"
        min="0"
        placeholder={`Amount (avail ${fmt(wallet?.available_balance ?? 0)})`}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />
      <input
        className={field}
        placeholder="Destination (account / address)"
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
        required
      />
      <textarea
        className={`${field} md:col-span-2`}
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <div className="md:col-span-2">
        <button className={btnPrimary} disabled={busy}>
          {busy ? "Submitting…" : "Submit Withdrawal Request"}
        </button>
      </div>
    </form>
  );
}
