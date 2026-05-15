import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { SectionCard } from "@/lib/portalShared";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const field = cn(
  "w-full rounded-lg border border-border/70 bg-surface/90 px-3 py-2 text-sm text-foreground shadow-sm",
  "transition-[border-color,box-shadow] placeholder:text-muted-foreground/65",
  "focus:border-brand/45 focus:outline-none focus:ring-2 focus:ring-brand/15",
);
const label =
  "mb-0.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/90";
const req = <span className="text-destructive"> *</span>;

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (c: string | number) => {
    const s = String(c);
    if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const body = [headers.join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type ParsedWire = {
  accountName: string;
  accountNumber: string;
  bankName: string;
  country: string;
  swift: string;
  bsb: string;
  iban: string;
};

function parseWithdrawalDestination(dest: string | null | undefined): ParsedWire {
  const empty: ParsedWire = {
    accountName: "",
    accountNumber: "",
    bankName: "",
    country: "",
    swift: "",
    bsb: "",
    iban: "",
  };
  if (!dest?.trim()) return empty;
  const out: ParsedWire = { ...empty };
  for (const part of dest.split(" | ")) {
    const idx = part.indexOf(": ");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 2).trim();
    if (key === "Beneficiary") out.accountName = val;
    else if (key === "Acct") out.accountNumber = val;
    else if (key === "Bank") out.bankName = val;
    else if (key === "Country") out.country = val;
    else if (key === "SWIFT") out.swift = val;
    else if (key === "BSB") out.bsb = val;
    else if (key === "IBAN") out.iban = val;
  }
  return out;
}

function fmtMoney(n: unknown, c: string) {
  return Number(n ?? 0).toLocaleString(undefined, { style: "currency", currency: c || "USD" });
}

const walletExportBtn =
  "gap-1.5 bg-gradient-brand px-3 text-brand-foreground shadow-md shadow-brand/15 hover:opacity-95 sm:px-4";

/**
 * CrossOcean-style funding record, wire withdrawal order, and transfer history
 * for the classic (Dashboard 1) investor wallet route only.
 */
export function ClassicWalletFundingPanels({ onWireSubmitted }: { onWireSubmitted?: () => void }) {
  const [data, setData] = useState<any>(null);
  const [form, setForm] = useState({
    accountName: "",
    accountNumber: "",
    bankName: "",
    country: "",
    swift: "",
    bsb: "",
    iban: "",
    amount: "",
  });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/my-wallets");
      if (res.ok) setData(await res.json());
      else setData({ deposits: [], withdrawals: [], accounts: [] });
    } catch {
      setData({ deposits: [], withdrawals: [], accounts: [] });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const deposits: any[] = data?.deposits ?? [];
  const withdrawals: any[] = data?.withdrawals ?? [];
  const accounts: any[] = data?.accounts ?? [];
  const activeAcct = accounts.find((a) => a.status === "active");

  const exportFundingRecordExcel = () => {
    downloadCsv(
      "funding-record.csv",
      ["Deposit Credit", "Trade Ref.No.", "Transaction Date", "Status"],
      deposits.map((d: any) => [
        fmtMoney(d.amount, d.currency),
        d.id?.slice(0, 8) ?? "—",
        d.created_at ? new Date(d.created_at).toLocaleString() : "—",
        d.status ?? "—",
      ]),
    );
    toast.success("Spreadsheet exported");
  };

  const exportFundTransferExcel = () => {
    downloadCsv(
      "fund-transfer.csv",
      [
        "Account Name",
        "Account Number",
        "Bank Name",
        "Country",
        "Swift Code",
        "BSB Number",
        "IBAN",
        "Amount",
        "Currency",
        "Created",
      ],
      withdrawals.map((w: any) => {
        const p = parseWithdrawalDestination(w.destination);
        return [
          p.accountName,
          p.accountNumber,
          p.bankName,
          p.country,
          p.swift,
          p.bsb,
          p.iban,
          w.amount,
          w.currency,
          w.created_at ? new Date(w.created_at).toLocaleString() : "—",
        ];
      }),
    );
    toast.success("Spreadsheet exported");
  };

  const submit = async () => {
    if (!activeAcct) return toast.error("No active account available for withdrawal requests.");
    const amt = Number(form.amount);
    if (!Number.isFinite(amt) || amt <= 0) return toast.error("Enter a valid amount.");
    const destination = [
      `Beneficiary: ${form.accountName}`,
      `Acct: ${form.accountNumber}`,
      `Bank: ${form.bankName}`,
      `Country: ${form.country}`,
      `SWIFT: ${form.swift}`,
      `BSB: ${form.bsb}`,
      `IBAN: ${form.iban}`,
    ].join(" | ");
    setBusy(true);
    try {
      const res = await fetch("/api/portal/wallet-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "withdraw",
          payload: {
            accountId: activeAcct.id,
            amount: amt,
            method: "wire",
            destination,
          },
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Request failed");
      toast.success("Withdrawal request submitted for review.");
      void load();
      onWireSubmitted?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const depositTotal = deposits.length;
  const withdrawalTotal = withdrawals.length;
  const depositRange =
    depositTotal === 0 ? "Showing 0 to 0 of 0 entries." : `Showing 1 to ${depositTotal} of ${depositTotal} entries.`;
  const transferRange =
    withdrawalTotal === 0
      ? "Showing 0 to 0 of 0 entries."
      : `Showing 1 to ${withdrawalTotal} of ${withdrawalTotal} entries.`;

  const th =
    "border-b border-border/80 bg-muted/35 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground";

  if (!data) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-brand" aria-hidden />
        Loading funding desk…
      </div>
    );
  }

  return (
    <div className="space-y-8 print:space-y-6">
      <SectionCard
        className="shadow-md ring-1 ring-border/40"
        title="Funding record list"
        right={
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" size="sm" className={walletExportBtn} onClick={() => window.print()}>
              <FileText className="h-4 w-4" aria-hidden />
              Export PDF
            </Button>
            <Button type="button" size="sm" className={walletExportBtn} onClick={exportFundingRecordExcel}>
              <FileSpreadsheet className="h-4 w-4" aria-hidden />
              Export EXCEL
            </Button>
          </div>
        }
      >
        <div className="overflow-hidden rounded-xl border border-border/60 shadow-sm">
          <div className="overflow-x-auto text-sm">
            <table className="w-full border-collapse">
              <thead>
                <tr className={th}>
                  <th className="px-3 py-3 pr-3">Deposit credit</th>
                  <th className="py-3 pr-3">Trade ref.no.</th>
                  <th className="py-3 pr-3">Transaction date</th>
                  <th className="px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {depositTotal === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-12 text-center text-sm font-medium text-destructive">
                      No available record
                    </td>
                  </tr>
                ) : (
                  deposits.map((d: any) => (
                    <tr key={d.id} className="transition-colors hover:bg-muted/25">
                      <td className="px-3 py-2.5 pr-3 font-medium tabular-nums">{fmtMoney(d.amount, d.currency)}</td>
                      <td className="py-2.5 pr-3 font-mono text-xs text-muted-foreground">{d.id?.slice(0, 8) ?? "—"}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">
                        {d.created_at ? new Date(d.created_at).toLocaleString() : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-xs font-medium capitalize">
                          {d.status ?? "—"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-3 text-xs font-medium text-muted-foreground">{depositRange}</p>
      </SectionCard>

      <SectionCard
        className="shadow-md ring-1 ring-border/40"
        title="Money withdrawal order"
        description="In order to transfer funds to your bank account, we require accurate and complete telegraphic transfer instructions. Kindly fill out the information below."
      >
        <div className="mx-auto mt-2 max-w-xl space-y-3">
          {(
            [
              ["accountName", "Account name"],
              ["accountNumber", "Account number"],
              ["bankName", "Bank name"],
              ["country", "Country"],
              ["swift", "Swift code"],
              ["bsb", "BSB number"],
              ["iban", "IBAN"],
            ] as const
          ).map(([k, lab]) => (
            <div key={k} className="grid gap-1.5 sm:grid-cols-[minmax(0,160px)_1fr] sm:items-center sm:gap-4">
              <label className={cn(label, "sm:mb-0")}>{lab}</label>
              <input
                className={field}
                value={(form as Record<string, string>)[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                autoComplete="off"
              />
            </div>
          ))}
          <div className="grid gap-1.5 sm:grid-cols-[minmax(0,160px)_1fr] sm:items-center sm:gap-4">
            <label className={cn(label, "sm:mb-0")}>
              Amount (USD)
              {req}
            </label>
            <input
              className={field}
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Submitted amounts are applied in your active funding account&apos;s currency when processing.
        </p>
        <Button
          type="button"
          disabled={busy}
          onClick={() => void submit()}
          className="mt-5 gap-2 bg-gradient-brand px-8 text-brand-foreground shadow-md shadow-brand/15 hover:opacity-95"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Sending…
            </>
          ) : (
            "Send"
          )}
        </Button>
      </SectionCard>

      <SectionCard
        className="shadow-md ring-1 ring-border/40"
        title="Fund transfer"
        description="Prior withdrawal instructions submitted from this portal."
        right={
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" size="sm" className={walletExportBtn} onClick={() => window.print()}>
              <FileText className="h-4 w-4" aria-hidden />
              Export PDF
            </Button>
            <Button type="button" size="sm" className={walletExportBtn} onClick={exportFundTransferExcel}>
              <FileSpreadsheet className="h-4 w-4" aria-hidden />
              Export EXCEL
            </Button>
          </div>
        }
      >
        <div className="overflow-hidden rounded-xl border border-border/60 shadow-sm">
          <div className="overflow-x-auto text-xs">
            <table className="w-full min-w-[880px] border-collapse">
              <thead>
                <tr className={th}>
                  <th className="px-2 py-3">Account name</th>
                  <th className="py-3 pr-2">Account number</th>
                  <th className="py-3 pr-2">Bank name</th>
                  <th className="py-3 pr-2">Country</th>
                  <th className="py-3 pr-2">Swift code</th>
                  <th className="py-3 pr-2">BSB number</th>
                  <th className="py-3 pr-2">IBAN</th>
                  <th className="py-3 pr-2">Amount (USD)</th>
                  <th className="px-2 py-3 text-center">PDF report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {withdrawalTotal === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-12 text-center text-sm font-medium text-destructive">
                      No available record
                    </td>
                  </tr>
                ) : (
                  withdrawals.map((w: any) => {
                    const p = parseWithdrawalDestination(w.destination);
                    const showRaw = !p.accountName && !p.bankName && Boolean(w.destination);
                    return (
                      <tr key={w.id} className="transition-colors hover:bg-muted/25">
                        <td className="px-2 py-2.5 font-medium">{showRaw ? "—" : p.accountName || "—"}</td>
                        <td className="py-2.5 pr-2 font-mono text-[11px]">{p.accountNumber || "—"}</td>
                        <td className="max-w-[140px] truncate py-2.5 pr-2" title={p.bankName}>
                          {showRaw ? String(w.destination) : p.bankName || "—"}
                        </td>
                        <td className="py-2.5 pr-2">{p.country || "—"}</td>
                        <td className="py-2.5 pr-2 font-mono text-[11px]">{p.swift || "—"}</td>
                        <td className="py-2.5 pr-2 font-mono text-[11px]">{p.bsb || "—"}</td>
                        <td className="py-2.5 pr-2 font-mono text-[11px]">{p.iban || "—"}</td>
                        <td className="py-2.5 pr-2 tabular-nums font-medium">{fmtMoney(w.amount, w.currency)}</td>
                        <td className="px-2 py-2.5 text-center">
                          <Button
                            type="button"
                            variant="link"
                            className="h-auto p-0 text-[11px] font-semibold text-brand underline-offset-4 hover:text-brand"
                            onClick={() => {
                              toast.message("PDF report", {
                                description: "Use your browser print dialog to save this view as PDF.",
                              });
                              window.print();
                            }}
                          >
                            PDF
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-3 text-xs font-medium text-muted-foreground">{transferRange}</p>
      </SectionCard>
    </div>
  );
}
