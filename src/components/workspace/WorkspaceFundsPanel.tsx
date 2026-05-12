import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CreditCard, Landmark, Link2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DataTable } from "@/lib/portalShared";

const field = "bg-surface border border-border rounded-md px-3 py-2 text-sm text-foreground w-full";
const btn = "text-xs px-2.5 py-1.5 rounded-md border border-border hover:bg-surface-elevated";
const btnPrimary =
  "text-sm px-3 py-2 rounded-md bg-gradient-brand text-brand-foreground hover:opacity-90 disabled:opacity-50";

type WalletPayload = {
  wallets: Array<Record<string, unknown>>;
  transactions: unknown[];
  deposits: Array<Record<string, unknown> & { id?: string; created_at?: string }>;
  withdrawals: Array<Record<string, unknown> & { id?: string; created_at?: string }>;
  accounts: Array<
    Record<string, unknown> & {
      id?: string;
      status?: string;
      account_number?: string;
      base_currency?: string;
    }
  >;
};

function fmt(n: unknown, c = "USD") {
  return Number(n ?? 0).toLocaleString(undefined, { style: "currency", currency: c });
}

function activeAccounts(accounts: WalletPayload["accounts"]) {
  return accounts.filter((a) => a.status === "active");
}

/** Disabled fields mirroring Stripe Elements layout — swap for `<PaymentElement />` when wiring Stripe.js */
function CardGatewayShell({
  stripeCheckoutEnabled,
  busy,
  onStripeCheckout,
}: {
  stripeCheckoutEnabled: boolean;
  busy: boolean;
  onStripeCheckout: () => void;
}) {
  const pk = (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined)?.trim();
  const pkReady = Boolean(pk && pk.startsWith("pk_"));

  return (
    <section className="rounded-xl border border-border bg-gradient-to-br from-violet-500/5 via-background to-background p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CreditCard className="h-4 w-4 text-violet-600 dark:text-violet-400" aria-hidden />
            Card payment (gateway-ready)
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            This block is a visual shell for{" "}
            <span className="font-medium text-foreground">Stripe Elements</span> or your PSP. Hook
            <code className="mx-1 rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
              PaymentIntent
            </code>
            on the server (see{" "}
            <code className="font-mono text-[10px]">startHostedDepositForApi</code>
            ). Client publishable key:{" "}
            {pkReady ? (
              <span className="text-success">VITE_STRIPE_PUBLISHABLE_KEY set</span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400">not set in env</span>
            )}
            .
          </p>
        </div>
      </div>

      <fieldset
        disabled
        className="mt-4 space-y-3 rounded-lg border border-dashed border-border/80 bg-muted/20 p-3"
      >
        <legend className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Placeholder fields (replace with Elements)
        </legend>
        <label className="block text-[11px] font-medium text-muted-foreground">
          Name on card
          <input className={cn(field, "mt-1 opacity-70")} placeholder="Jane Investor" readOnly />
        </label>
        <label className="block text-[11px] font-medium text-muted-foreground">
          Card number
          <input
            className={cn(field, "mt-1 font-mono opacity-70")}
            placeholder="4242 4242 4242 4242"
            readOnly
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-[11px] font-medium text-muted-foreground">
            Expires
            <input className={cn(field, "mt-1 opacity-70")} placeholder="MM / YY" readOnly />
          </label>
          <label className="block text-[11px] font-medium text-muted-foreground">
            CVC
            <input className={cn(field, "mt-1 opacity-70")} placeholder="•••" readOnly />
          </label>
        </div>
      </fieldset>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={btnPrimary}
          disabled={busy || !stripeCheckoutEnabled}
          onClick={() => onStripeCheckout()}
        >
          {stripeCheckoutEnabled ? "Pay with Stripe Checkout" : "Stripe Checkout (configure keys)"}
        </button>
        {!stripeCheckoutEnabled ? (
          <span className="text-xs text-muted-foreground">
            Set <code className="font-mono text-[10px]">STRIPE_SECRET_KEY</code> on the server to
            enable hosted checkout.
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            You will return to the wallet page after payment; refresh this workspace to update
            balances.
          </span>
        )}
      </div>
    </section>
  );
}

function DepositRequestForm({
  accounts,
  onDone,
  stripeEnabled,
  paypalEnabled,
}: {
  accounts: WalletPayload["accounts"];
  onDone: () => void;
  stripeEnabled: boolean;
  paypalEnabled: boolean;
}) {
  const active = activeAccounts(accounts);
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyHosted, setBusyHosted] = useState(false);

  useEffect(() => {
    if (!accountId && active[0]?.id) setAccountId(String(active[0].id));
  }, [accountId, active]);

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
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      toast.success("Deposit request submitted for operations review.");
      setAmount("");
      setReference("");
      setNotes("");
      onDone();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit deposit");
    } finally {
      setBusy(false);
    }
  };

  const startHosted = async (provider: "stripe" | "paypal") => {
    if (!accountId || !amount) {
      toast.error("Choose an account and amount before starting hosted checkout.");
      return;
    }
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    setBusyHosted(true);
    try {
      const res = await fetch("/api/portal/wallet-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "hosted-deposit",
          payload: { accountId, amount: n, provider, origin: window.location.origin },
        }),
      });
      if (!res.ok) throw new Error(`Hosted deposit failed (${res.status})`);
      const body = (await res.json()) as { url?: string; error?: string };
      if (body.error) throw new Error(body.error);
      if (!body.url) throw new Error("No redirect URL returned");
      window.location.href = body.url;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not start checkout");
      setBusyHosted(false);
    }
  };

  if (!active.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No active brokerage accounts. Contact support to activate funding.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="md:col-span-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Landmark className="h-4 w-4" aria-hidden />
          Manual deposit request
        </div>
        <select
          className={field}
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          required
        >
          {active.map((a) => (
            <option key={String(a.id)} value={String(a.id)}>
              {String(a.account_number ?? a.id)} ({String(a.base_currency ?? "USD")})
            </option>
          ))}
        </select>
        <select className={field} value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="bank_transfer">Bank transfer</option>
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
          className={cn(field, "md:col-span-2 min-h-[72px]")}
          placeholder="Notes for operations (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2 md:col-span-2">
          <button type="submit" className={btnPrimary} disabled={busy}>
            {busy ? "Submitting…" : "Submit deposit request"}
          </button>
          {paypalEnabled ? (
            <button
              type="button"
              className={btnPrimary}
              disabled={busy || busyHosted}
              onClick={() => void startHosted("paypal")}
            >
              PayPal hosted deposit
            </button>
          ) : null}
        </div>
      </form>

      <CardGatewayShell
        stripeCheckoutEnabled={stripeEnabled}
        busy={busyHosted}
        onStripeCheckout={() => void startHosted("stripe")}
      />
    </div>
  );
}

function WithdrawRequestForm({
  accounts,
  wallets,
  onDone,
}: {
  accounts: WalletPayload["accounts"];
  wallets: WalletPayload["wallets"];
  onDone: () => void;
}) {
  const active = activeAccounts(accounts);
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [destination, setDestination] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!accountId && active[0]?.id) setAccountId(String(active[0].id));
  }, [accountId, active]);

  const wallet = wallets.find((w) => String(w.account_id) === accountId);
  const avail = Number(wallet?.available_balance ?? 0);

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
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      toast.success("Withdrawal request submitted for review.");
      setAmount("");
      setDestination("");
      setNotes("");
      onDone();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit withdrawal");
    } finally {
      setBusy(false);
    }
  };

  if (!active.length) {
    return <p className="text-sm text-muted-foreground">No active accounts.</p>;
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <select className={field} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
        {active.map((a) => (
          <option key={String(a.id)} value={String(a.id)}>
            {String(a.account_number ?? a.id)}
          </option>
        ))}
      </select>
      <select className={field} value={method} onChange={(e) => setMethod(e.target.value)}>
        <option value="bank_transfer">Bank transfer</option>
        <option value="wire">Wire</option>
        <option value="crypto">Crypto</option>
        <option value="other">Other</option>
      </select>
      <input
        className={field}
        type="number"
        step="0.01"
        min="0"
        placeholder={`Amount (available ${fmt(avail)})`}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />
      <input
        className={field}
        placeholder="Destination (IBAN / wallet / instructions)"
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
        required
      />
      <textarea
        className={cn(field, "md:col-span-2 min-h-[72px]")}
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <div className="md:col-span-2">
        <button type="submit" className={btnPrimary} disabled={busy}>
          {busy ? "Submitting…" : "Submit withdrawal request"}
        </button>
      </div>
    </form>
  );
}

export function WorkspaceFundsPanel() {
  const [data, setData] = useState<WalletPayload | null>(null);
  const [tab, setTab] = useState<"deposit" | "withdraw" | "pending">("deposit");
  const [providers, setProviders] = useState({ stripe: false, paypal: false });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/wallet-actions");
      if (!res.ok) throw new Error(`Wallet API failed (${res.status})`);
      setData((await res.json()) as WalletPayload);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load funding data");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    void fetch("/api/portal/wallet-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "providers" }),
    })
      .then((r) => (r.ok ? r.json() : { stripe: false, paypal: false }))
      .then((j) =>
        setProviders({
          stripe: Boolean((j as { stripe?: boolean }).stripe),
          paypal: Boolean((j as { paypal?: boolean }).paypal),
        }),
      )
      .catch(() => {});
  }, []);

  const wallets = data?.wallets ?? [];
  const accounts = data?.accounts ?? [];
  const totalAvailable = wallets.reduce((s, w) => s + Number(w.available_balance ?? 0), 0);
  const currency = String(wallets[0]?.currency ?? accounts[0]?.base_currency ?? "USD");

  const pendingRows = [
    ...(data?.deposits ?? []).map((r) => ({ ...r, kind: "Deposit" as const })),
    ...(data?.withdrawals ?? []).map((r) => ({ ...r, kind: "Withdrawal" as const })),
  ].sort((a, b) => +new Date(String(b.created_at ?? 0)) - +new Date(String(a.created_at ?? 0))) as Array<
    Record<string, unknown> & { kind: "Deposit" | "Withdrawal" }
  >;

  const cancelRequest = async (
    row: Record<string, unknown> & { kind: "Deposit" | "Withdrawal" },
  ) => {
    try {
      const res = await fetch("/api/portal/wallet-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          payload: {
            requestId: row.id,
            kind: row.kind === "Deposit" ? "deposit" : "withdrawal",
          },
        }),
      });
      if (!res.ok) throw new Error(`Cancel failed (${res.status})`);
      toast.success("Request cancelled");
      await refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Cancel failed");
    }
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Manage funds</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Submit deposit and withdrawal requests, start hosted card checkout when configured, and
          track pending reviews—without leaving the workspace.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface/40 p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Wallet className="h-4 w-4" aria-hidden />
            Available
          </div>
          <div className="mt-2 text-xl font-semibold text-foreground">
            {fmt(totalAvailable, currency)}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface/40 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Active accounts
          </div>
          <div className="mt-2 text-xl font-semibold text-foreground">
            {activeAccounts(accounts).length}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface/40 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Full wallet
          </div>
          <Link
            to="/portal/investor/wallet"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
          >
            Open investor wallet
            <Link2 className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-1">
        <button
          type="button"
          className={cn(btn, tab === "deposit" && "bg-surface-elevated text-foreground")}
          onClick={() => setTab("deposit")}
        >
          Deposit
        </button>
        <button
          type="button"
          className={cn(btn, tab === "withdraw" && "bg-surface-elevated text-foreground")}
          onClick={() => setTab("withdraw")}
        >
          Withdraw
        </button>
        <button
          type="button"
          className={cn(btn, tab === "pending" && "bg-surface-elevated text-foreground")}
          onClick={() => setTab("pending")}
        >
          Pending requests
        </button>
      </div>

      <div className="rounded-xl border border-border bg-background p-4 md:p-5">
        {!data ? (
          <p className="text-sm text-muted-foreground">Loading wallet…</p>
        ) : tab === "deposit" ? (
          <DepositRequestForm
            accounts={accounts}
            onDone={() => void refresh()}
            stripeEnabled={providers.stripe}
            paypalEnabled={providers.paypal}
          />
        ) : tab === "withdraw" ? (
          <WithdrawRequestForm
            accounts={accounts}
            wallets={wallets}
            onDone={() => void refresh()}
          />
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Combined deposit and withdrawal requests awaiting operations review.
            </p>
            {pendingRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending requests.</p>
            ) : (
              <DataTable
                rows={pendingRows}
                columns={[
                  {
                    key: "created_at",
                    label: "Date",
                    render: (r) => new Date(String(r.created_at ?? "")).toLocaleString(),
                  },
                  { key: "kind", label: "Type" },
                  {
                    key: "amount",
                    label: "Amount",
                    render: (r) => fmt(r.amount, String(r.currency ?? currency)),
                  },
                  { key: "method", label: "Method", render: (r) => String(r.method ?? "—") },
                  {
                    key: "status",
                    label: "Status",
                    render: (r) => <span className="capitalize">{String(r.status ?? "—")}</span>,
                  },
                  {
                    key: "actions",
                    label: "",
                    render: (r) =>
                      String(r.status) === "pending" ? (
                        <button type="button" className={btn} onClick={() => void cancelRequest(r)}>
                          Cancel
                        </button>
                      ) : null,
                  },
                ]}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
