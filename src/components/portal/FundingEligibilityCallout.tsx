import { Link } from "@tanstack/react-router";

/** Minimal account fields used for funding eligibility (wallet + workspace). */
export type FundingAccountRow = {
  id?: string;
  status?: string;
  account_number?: string;
  base_currency?: string;
};

export function activeFundingAccounts(accounts: FundingAccountRow[]) {
  return accounts.filter((a) => a.status === "active");
}

export function pendingFundingAccounts(accounts: FundingAccountRow[]) {
  return accounts.filter((a) => a.status === "pending");
}

/** When the user cannot fund yet: explain DB rules and where staff act (Clients vs Funding). */
export function FundingEligibilityCallout({ accounts }: { accounts: FundingAccountRow[] }) {
  const pending = pendingFundingAccounts(accounts);
  const restricted = accounts.filter((a) => a.status === "restricted");

  if (accounts.length === 0) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-relaxed text-muted-foreground">
        <p className="font-medium text-foreground">No brokerage account on file yet</p>
        <p className="mt-2">
          Deposits are attached to an <strong className="text-foreground">active</strong> account
          row in the database. If you have not finished onboarding, complete{" "}
          <Link
            to="/portal/investor/apply"
            className="text-brand underline-offset-2 hover:underline"
          >
            Open an account
          </Link>{" "}
          (that creates a <strong className="text-foreground">pending</strong> account for staff
          review). If you were invited by the firm, complete the{" "}
          <Link
            to="/portal/signup/investor"
            className="text-brand underline-offset-2 hover:underline"
          >
            online account application
          </Link>{" "}
          (Investor Portal). Staff approve your brokerage account under{" "}
          <strong className="text-foreground">Admin → Clients</strong> when it appears as{" "}
          <strong className="text-foreground">pending</strong>.
        </p>
        <p className="mt-2 text-xs">
          <strong className="text-foreground">Admin note:</strong> pending account approval is not
          listed under <strong className="text-foreground">Funding Review</strong> (that queue is
          only for deposit/withdrawal <em>requests</em>). Approve the brokerage account under{" "}
          <strong className="text-foreground">Admin → Clients</strong> → select the investor →{" "}
          <strong className="text-foreground">Accounts</strong> → <strong>Approve</strong>.
        </p>
      </div>
    );
  }

  if (pending.length > 0) {
    return (
      <div className="rounded-lg border border-brand/30 bg-brand/5 p-4 text-sm leading-relaxed text-muted-foreground">
        <p className="font-medium text-foreground">Brokerage account awaiting activation</p>
        <p className="mt-2">
          You have {pending.length} account{pending.length > 1 ? "s" : ""} in{" "}
          <strong className="text-foreground">pending</strong> status. Funding and hosted card
          checkout are allowed only after staff set the account to{" "}
          <strong className="text-foreground">active</strong>.
        </p>
        <ul className="mt-2 list-inside list-disc text-xs">
          {pending.map((a) => (
            <li key={String(a.id)}>
              <span className="font-mono text-foreground">{String(a.account_number ?? a.id)}</span>{" "}
              · {String(a.base_currency ?? "—")}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs">
          <strong className="text-foreground">Staff:</strong> <strong>Admin → Clients</strong> →
          open this client → <strong>Accounts</strong> → <strong>Approve</strong>. (Funding Review
          does not show this step.)
        </p>
      </div>
    );
  }

  if (restricted.length > 0) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Account not available for funding</p>
        <p className="mt-2">
          Your account is marked <strong className="text-foreground">restricted</strong>. Please
          contact support; deposits stay disabled until the account is returned to active status.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
      <p className="font-medium text-foreground">No active brokerage accounts</p>
      <p className="mt-2">
        None of your accounts are in <strong className="text-foreground">active</strong> status, so
        funding is blocked. Contact support or ask staff to review your account in{" "}
        <strong className="text-foreground">Admin → Clients</strong>.
      </p>
    </div>
  );
}
