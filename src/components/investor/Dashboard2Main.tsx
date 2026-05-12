import { useCallback, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Download,
  FileSpreadsheet,
  Inbox,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import type { TradeHistoryRow } from "@/lib/trade-history.types";
import type { Dashboard2Tab } from "@/components/investor/InvestorDashboard2Shell";
import { CountrySelect } from "@/components/portal/IntlPhoneInput";
import { SectionCard } from "@/lib/portalShared";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const field = cn(
  "w-full rounded-lg border border-border/70 bg-surface/90 px-3.5 py-2.5 text-sm text-foreground shadow-sm",
  "transition-[border-color,box-shadow] placeholder:text-muted-foreground/65",
  "focus:border-brand/45 focus:outline-none focus:ring-2 focus:ring-brand/15",
);
const fieldReadonly = cn(
  field,
  "cursor-not-allowed bg-muted/30 text-muted-foreground shadow-none focus:ring-0",
);
const label =
  "mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/90";
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

function D2Empty({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border/55 bg-gradient-to-b from-muted/12 via-transparent to-transparent px-6 py-14 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand/12 text-brand ring-1 ring-brand/20">
        <Icon className="h-6 w-6 opacity-90" aria-hidden />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {hint ? (
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function Dashboard2Main({ tab }: { tab: Dashboard2Tab }) {
  return (
    <div className="space-y-8">
      {tab === "profile" && <ProfileTab />}
      {tab === "trading-buy" && <TradesTab mode="buy" />}
      {tab === "trading-sell" && <TradesTab mode="sell" />}
      {tab === "trade-order" && <TradeOrderTab />}
      {tab === "funding-record" && <FundingRecordTab />}
      {tab === "funding-transfer" && <FundingTransferTab />}
      {tab === "help-desk" && <HelpDeskTab />}
    </div>
  );
}

function ProfileSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border/55 bg-card/35 p-4 shadow-sm ring-1 ring-black/[0.03] sm:p-5 dark:ring-white/[0.05]">
      <header className="mb-4 border-b border-border/50 pb-3">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">{title}</h3>
        {subtitle ? <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}

const EXP_OPTIONS = (
  <>
    <option value="none">None</option>
    <option value="u1">Under 1 year</option>
    <option value="1_3">1–3 years</option>
    <option value="4p">4+ years</option>
  </>
);

function ExperienceMatrix<T extends Record<string, string | number | boolean>>({
  f,
  setF,
}: {
  f: T;
  setF: Dispatch<SetStateAction<T>>;
}) {
  const assets = ["stocks", "options", "funds", "futures", "forex"] as const;
  const labels: Record<(typeof assets)[number], string> = {
    stocks: "Stocks",
    options: "Options",
    funds: "Mutual funds",
    futures: "Futures",
    forex: "Forex",
  };
  const cols = [
    { prefix: "p" as const, label: "Years experience", optional: false },
    { prefix: "m" as const, label: "Avg trades / mo.", optional: true },
    { prefix: "k" as const, label: "Knowledge", optional: true },
  ];

  return (
    <section className="rounded-xl border border-border/55 bg-card/35 p-4 shadow-sm ring-1 ring-black/[0.03] sm:p-5 dark:ring-white/[0.05]">
      <header className="mb-4 border-b border-border/50 pb-3">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">Trading & suitability</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          One row per asset class. Values are used for desk review only unless separately attested in onboarding.
        </p>
      </header>
      <div className="overflow-x-auto rounded-lg border border-border/50">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border/70 bg-muted/30 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <th className="whitespace-nowrap px-3 py-2.5 pr-4">Asset</th>
              {cols.map((c) => (
                <th key={c.prefix} className="min-w-[140px] px-2 py-2.5">
                  {c.label}
                  {!c.optional && <span className="text-destructive"> *</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {assets.map((asset) => (
              <tr key={asset} className="bg-background/30 transition-colors hover:bg-muted/15">
                <td className="whitespace-nowrap px-3 py-2 pr-4 text-xs font-semibold text-foreground">
                  {labels[asset]}
                </td>
                {cols.map((c) => {
                  const key = `${c.prefix}_${asset}` as keyof T;
                  const raw = (f as Record<string, string | undefined>)[key as string] ?? "";
                  return (
                    <td key={c.prefix} className="p-2 align-middle">
                      <select
                        className={cn(
                          field,
                          "h-9 min-w-0 w-full text-xs",
                          "border-border/60 bg-surface/90",
                        )}
                        value={String(raw)}
                        onChange={(e) =>
                          setF((prev) => ({ ...prev, [key as string]: e.target.value } as T))
                        }
                      >
                        <option value="">{c.optional ? "None" : "— Choose one —"}</option>
                        {EXP_OPTIONS}
                      </select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ProfileTab() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [f, setF] = useState({
    accountType: "individual",
    salesRep: "",
    first: "",
    middle: "",
    last: "",
    dob: "",
    ukCitizen: true,
    citizenCountry: "",
    idType: "",
    idNumber: "",
    addr1: "",
    addr2: "",
    city: "",
    state: "",
    country: "GB",
    postal: "",
    phoneDay: "",
    phoneEve: "",
    phoneCell: "",
    fax: "",
    mailEmail: "",
    filing: "Single",
    dependents: "",
    jFirst: "",
    jMiddle: "",
    jLast: "",
    jAddr1: "",
    jCity: "",
    jState: "",
    jCountry: "",
    jPostal: "",
    jPhone: "",
    jEmail: "",
    income: "",
    bracket: "",
    netWorth: "",
    liquidNet: "",
    incomeSource: "",
    contractN: "",
    contractNames: "",
    appMonies: "",
    fundSource: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portal/profile");
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error ?? "Load failed");
      const p = j.profile as Record<string, string | null> | null;
      setEmail(j.email ?? "");
      setF((prev) => ({
        ...prev,
        first: p?.legal_first_name ?? "",
        last: p?.legal_last_name ?? "",
        dob: (p?.date_of_birth as string) ?? "",
        phoneDay: p?.phone ?? "",
        mailEmail: j.email ?? "",
        country: (p?.country_of_residence as string) || prev.country,
      }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/portal/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          payload: {
            legal_first_name: f.first.trim(),
            legal_last_name: f.last.trim(),
            phone: f.phoneDay.trim(),
            date_of_birth: f.dob || undefined,
            country_of_residence: f.country,
            nationality: f.ukCitizen ? f.country : f.citizenCountry || f.country,
          },
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Update failed");
      toast.success("Profile updated");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border/50 bg-card/50 py-20 shadow-inner">
        <Loader2 className="h-9 w-9 animate-spin text-brand" aria-hidden />
        <p className="text-sm font-medium text-muted-foreground">Loading profile…</p>
      </div>
    );

  return (
    <div className="space-y-8">
      <SectionCard className="shadow-md ring-1 ring-border/40"
        title="Account profile"
        description="Balanced layout: identity & mailing on the left; contact, filing, joint holder, and financial disclosures on the right. Trading suitability is a single matrix below."
        right={
          <Button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="min-w-[108px] gap-2 bg-gradient-brand text-brand-foreground shadow-md shadow-brand/15 hover:opacity-95"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving
              </>
            ) : (
              "Update"
            )}
          </Button>
        }
      >
        <div className="space-y-8">
          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <div className="space-y-6">
              <ProfileSection title="Account">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={label}>Select type of account{req}</label>
                    <select
                      className={field}
                      value={f.accountType}
                      onChange={(e) => setF({ ...f, accountType: e.target.value })}
                    >
                      <option value="individual">Individual</option>
                      <option value="joint">Joint</option>
                      <option value="corporate">Corporate</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={label}>Sales / coverage rep</label>
                    <input
                      className={field}
                      placeholder="Relationship manager or desk"
                      value={f.salesRep}
                      onChange={(e) => setF({ ...f, salesRep: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={label}>First name{req}</label>
                    <input className={field} value={f.first} onChange={(e) => setF({ ...f, first: e.target.value })} />
                  </div>
                  <div>
                    <label className={label}>Middle name</label>
                    <input className={field} value={f.middle} onChange={(e) => setF({ ...f, middle: e.target.value })} />
                  </div>
                  <div>
                    <label className={label}>Last name{req}</label>
                    <input className={field} value={f.last} onChange={(e) => setF({ ...f, last: e.target.value })} />
                  </div>
                  <div>
                    <label className={label}>Date of birth{req}</label>
                    <input type="date" className={field} value={f.dob} onChange={(e) => setF({ ...f, dob: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <span className={label}>Citizenship{req}</span>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm">
                      <label className="flex items-center gap-2">
                        <input type="radio" checked={f.ukCitizen} onChange={() => setF({ ...f, ukCitizen: true })} />
                        U.S. / UK citizen (simplified)
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="radio" checked={!f.ukCitizen} onChange={() => setF({ ...f, ukCitizen: false })} />
                        Other nationality
                      </label>
                    </div>
                    {!f.ukCitizen && (
                      <input
                        className={cn("mt-2", field)}
                        placeholder="Country of citizenship"
                        value={f.citizenCountry}
                        onChange={(e) => setF({ ...f, citizenCountry: e.target.value })}
                      />
                    )}
                  </div>
                  <div>
                    <label className={label}>Type of ID{req}</label>
                    <select className={field} value={f.idType} onChange={(e) => setF({ ...f, idType: e.target.value })}>
                      <option value="">— Select —</option>
                      <option value="drivers_license">Driver&apos;s license</option>
                      <option value="passport">Passport</option>
                      <option value="national_id">National ID</option>
                    </select>
                  </div>
                  <div>
                    <label className={label}>ID number{req}</label>
                    <input className={field} value={f.idNumber} onChange={(e) => setF({ ...f, idNumber: e.target.value })} />
                  </div>
                </div>
              </ProfileSection>

              <ProfileSection title="Mailing address">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={label}>Address line 1{req}</label>
                    <input className={field} value={f.addr1} onChange={(e) => setF({ ...f, addr1: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={label}>Address line 2</label>
                    <input className={field} value={f.addr2} onChange={(e) => setF({ ...f, addr2: e.target.value })} />
                  </div>
                  <div>
                    <label className={label}>City{req}</label>
                    <input className={field} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
                  </div>
                  <div>
                    <label className={label}>State / region{req}</label>
                    <input className={field} value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })} />
                  </div>
                  <div>
                    <label className={label}>Country{req}</label>
                    <CountrySelect value={f.country} onChange={(c) => setF({ ...f, country: c })} />
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      <span className="text-brand">What&apos;s this?</span> Country of record for statements and tax reporting.
                    </p>
                  </div>
                  <div>
                    <label className={label}>Postal code{req}</label>
                    <input className={field} value={f.postal} onChange={(e) => setF({ ...f, postal: e.target.value })} />
                  </div>
                </div>
              </ProfileSection>
            </div>

            <div className="space-y-6">
              <ProfileSection title="Contact">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={label}>Primary / daytime phone{req}</label>
                    <input className={field} value={f.phoneDay} onChange={(e) => setF({ ...f, phoneDay: e.target.value })} />
                  </div>
                  <div>
                    <label className={label}>Home / evening phone</label>
                    <input className={field} value={f.phoneEve} onChange={(e) => setF({ ...f, phoneEve: e.target.value })} />
                  </div>
                  <div>
                    <label className={label}>Mobile phone</label>
                    <input className={field} value={f.phoneCell} onChange={(e) => setF({ ...f, phoneCell: e.target.value })} />
                  </div>
                  <div>
                    <label className={label}>Fax</label>
                    <input className={field} value={f.fax} onChange={(e) => setF({ ...f, fax: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={label}>Email address{req}</label>
                    <input
                      type="email"
                      className={field}
                      value={f.mailEmail || email}
                      onChange={(e) => setF({ ...f, mailEmail: e.target.value })}
                    />
                  </div>
                </div>
              </ProfileSection>

              <ProfileSection title="Filing & household">
                <div className="flex flex-wrap gap-4 text-sm">
                  {["Single", "Married", "Other"].map((x) => (
                    <label key={x} className="flex items-center gap-2">
                      <input type="radio" name="fil" checked={f.filing === x} onChange={() => setF({ ...f, filing: x })} />
                      {x}
                    </label>
                  ))}
                </div>
                <div className="mt-4">
                  <label className={label}>Number of dependents{req}</label>
                  <input
                    className={cn("mt-1 max-w-[140px]", field)}
                    value={f.dependents}
                    onChange={(e) => setF({ ...f, dependents: e.target.value })}
                  />
                </div>
              </ProfileSection>

              <ProfileSection
                title="Joint account owner"
                subtitle="Optional — complete when opening a joint profile. Desk review may request additional signatures."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={label}>First name</label>
                    <input className={field} value={f.jFirst} onChange={(e) => setF({ ...f, jFirst: e.target.value })} />
                  </div>
                  <div>
                    <label className={label}>Last name</label>
                    <input className={field} value={f.jLast} onChange={(e) => setF({ ...f, jLast: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={label}>Mailing address line 1</label>
                    <input className={field} value={f.jAddr1} onChange={(e) => setF({ ...f, jAddr1: e.target.value })} />
                  </div>
                  <div>
                    <label className={label}>City</label>
                    <input className={field} value={f.jCity} onChange={(e) => setF({ ...f, jCity: e.target.value })} />
                  </div>
                  <div>
                    <label className={label}>Country</label>
                    <CountrySelect value={f.jCountry} onChange={(c) => setF({ ...f, jCountry: c })} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={label}>Email</label>
                    <input className={field} value={f.jEmail} onChange={(e) => setF({ ...f, jEmail: e.target.value })} />
                  </div>
                </div>
              </ProfileSection>

              <ProfileSection title="Financial disclosures">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-1">
                    <label className={label}>Approximate annual income</label>
                    <select className={field} value={f.income} onChange={(e) => setF({ ...f, income: e.target.value })}>
                      <option value="">— Choose one —</option>
                      <option value="under50">Under USD 50,000</option>
                      <option value="50_100">USD 50,000 – 99,999</option>
                      <option value="100_250">USD 100,000 – 249,999</option>
                      <option value="250p">USD 250,000+</option>
                    </select>
                  </div>
                  <div className="sm:col-span-1">
                    <label className={label}>Nested marginal bracket</label>
                    <select className={field} value={f.bracket} onChange={(e) => setF({ ...f, bracket: e.target.value })}>
                      <option value="">— Choose one —</option>
                      <option value="10">10%</option>
                      <option value="12">12%</option>
                      <option value="22">22%</option>
                      <option value="24">24%</option>
                      <option value="32">32%</option>
                      <option value="35">35%</option>
                      <option value="37">37%</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={label}>Approximate total net worth</label>
                    <select className={field} value={f.netWorth} onChange={(e) => setF({ ...f, netWorth: e.target.value })}>
                      <option value="">— Choose one —</option>
                      <option value="u50">Under USD 50,000</option>
                      <option value="50_250">USD 50,000 – 249,999</option>
                      <option value="250_1m">USD 250,000 – 999,999</option>
                      <option value="1m">USD 1,000,000+</option>
                    </select>
                    <p className="mt-1 text-[10px] text-muted-foreground leading-snug">
                      Total net worth includes investments, cash, property, and other assets minus liabilities (primary
                      residence rules vary).
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={label}>Approximate liquid net worth</label>
                    <select className={field} value={f.liquidNet} onChange={(e) => setF({ ...f, liquidNet: e.target.value })}>
                      <option value="">— Choose one —</option>
                      <option value="u50">Under USD 50,000</option>
                      <option value="50_250">USD 50,000 – 249,999</option>
                      <option value="250p">USD 250,000+</option>
                    </select>
                    <p className="mt-1 text-[10px] text-muted-foreground leading-snug">
                      Liquid net worth is cash and readily marketable securities minus short-term obligations.
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={label}>What is your source of income?</label>
                    <select className={field} value={f.incomeSource} onChange={(e) => setF({ ...f, incomeSource: e.target.value })}>
                      <option value="">— Choose one —</option>
                      <option value="employment">Employment</option>
                      <option value="inheritance">Inheritance</option>
                      <option value="business">Business / sale</option>
                      <option value="investments">Investments</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className={label}>Number of contracts</label>
                    <input className={field} value={f.contractN} onChange={(e) => setF({ ...f, contractN: e.target.value })} />
                  </div>
                  <div>
                    <label className={label}>Name of contract(s)</label>
                    <input className={field} value={f.contractNames} onChange={(e) => setF({ ...f, contractNames: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={label}>Application monies</label>
                    <input className={field} value={f.appMonies} onChange={(e) => setF({ ...f, appMonies: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={label}>Source of assets to be deposited</label>
                    <select className={field} value={f.fundSource} onChange={(e) => setF({ ...f, fundSource: e.target.value })}>
                      <option value="">— Choose one —</option>
                      <option value="savings">Savings</option>
                      <option value="securities">Sale of securities</option>
                      <option value="business">Business cash flow</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </ProfileSection>
            </div>
          </div>

          <ExperienceMatrix f={f} setF={setF} />
        </div>
      </SectionCard>
    </div>
  );
}


function TradesTab({ mode }: { mode: "buy" | "sell" }) {
  const [rows, setRows] = useState<TradeHistoryRow[] | null>(null);
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/trade-history");
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error("Failed to load");
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const r = rows ?? [];
    return r.filter((x) =>
      mode === "buy" ? String(x.side).toLowerCase().includes("buy") : String(x.side).toLowerCase().includes("sell"),
    );
  }, [rows, mode]);

  const title = mode === "buy" ? "Trading record — buy" : "Trading record — sell";

  const exportCsv = () => {
    downloadCsv(
      `trades-${mode}.csv`,
      ["Executed", "Symbol", "Name", "Side", "Qty", "Price", "Gross", "Fees", "Commission", "Currency"],
      filtered.map((t) => [
        t.executed_at,
        t.symbol,
        t.instrument_name,
        t.side,
        t.quantity,
        t.price,
        t.gross_amount,
        t.fees,
        t.commission,
        t.currency,
      ]),
    );
    toast.success("CSV downloaded");
  };

  return (
    <SectionCard className="shadow-md ring-1 ring-border/40"
      title={title}
      description="Confirmed fills from your linked brokerage accounts."
      right={
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 border-border/70 shadow-sm"
            onClick={exportCsv}
            title="Spreadsheet format"
          >
            <FileSpreadsheet className="h-4 w-4" /> Export CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 border-border/70 shadow-sm"
            onClick={() => window.print()}
            title="Use browser print to PDF"
          >
            <Download className="h-4 w-4" /> Print
          </Button>
        </div>
      }
    >
      {rows === null ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-brand" aria-hidden />
          Loading records…
        </div>
      ) : filtered.length === 0 ? (
        <D2Empty
          icon={Inbox}
          title="No records for this side"
          hint="Confirmed fills from your linked brokerage accounts will appear here when available."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/60 shadow-sm">
          <div className="overflow-x-auto text-sm">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-muted/35 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-3 pr-3">Trade date</th>
                  <th className="py-3 pr-3">Time</th>
                  <th className="py-3 pr-3">Ref</th>
                  <th className="py-3 pr-3">Symbol</th>
                  <th className="py-3 pr-3">Qty</th>
                  <th className="py-3 pr-3">Price</th>
                  <th className="py-3 pr-3">Gross</th>
                  <th className="py-3 pr-3">Fees</th>
                  <th className="py-3 pr-3">Total</th>
                  <th className="px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((t) => (
                  <tr
                    key={t.id}
                    className="transition-colors hover:bg-muted/25"
                  >
                    <td className="px-3 py-2.5 pr-3 whitespace-nowrap">{new Date(t.executed_at).toLocaleDateString()}</td>
                    <td className="py-2.5 pr-3 whitespace-nowrap">{new Date(t.executed_at).toLocaleTimeString()}</td>
                    <td className="py-2.5 pr-3 font-mono text-xs text-muted-foreground">{t.order_id.slice(0, 8)}</td>
                    <td className="py-2.5 pr-3 font-medium">{t.symbol}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{t.quantity}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{t.price}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{t.gross_amount}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{t.fees}</td>
                    <td className="py-2.5 pr-3 tabular-nums">
                      {Number(t.gross_amount) - Number(t.fees) - Number(t.commission)}
                    </td>
                    <td className="px-3 py-2.5 text-success text-xs font-semibold uppercase tracking-wide">Filled</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <p className="mt-4 text-xs font-medium text-muted-foreground">
        Showing <span className="tabular-nums text-foreground">{filtered.length}</span> entr
        {filtered.length === 1 ? "y" : "ies"}.
      </p>
      <div className="mt-4 rounded-lg border border-border/50 bg-muted/15 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
        <span className="font-semibold text-foreground">Note:</span> Cross-listed and ADR securities may carry
        additional market and currency risks. Confirm settlement currency with your desk.
      </div>
    </SectionCard>
  );
}

function TradeOrderTab() {
  const navigate = useNavigate();
  const [side, setSide] = useState("buy");
  const [positions, setPositions] = useState("1");
  const [opt, setOpt] = useState("call");
  const [commodity, setCommodity] = useState("currencies");
  const [contract, setContract] = useState("sample");
  const [strike, setStrike] = useState("");
  const [premium, setPremium] = useState("1.00");
  const contractSize = 1000;
  const pricePer = contractSize * Number(premium || 0);
  const fees = 35;
  const totalInv = 0;

  return (
    <SectionCard className="shadow-md ring-1 ring-border/40"
      title="Trade order"
      description="Structured request form. Live equities and options tickets are submitted through the modern trading ticket."
    >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground border-b border-border/60 pb-2">
              Order entry
            </h3>
            <div>
              <label className={label}>Trade order{req}</label>
              <select className={cn("mt-1", field)} value={side} onChange={(e) => setSide(e.target.value)}>
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </div>
            <div>
              <label className={label}>Position(s){req}</label>
              <select className={cn("mt-1", field)} value={positions} onChange={(e) => setPositions(e.target.value)}>
                {[1, 2, 3, 4, 5, 10].map((n) => (
                  <option key={n} value={String(n)}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Option{req}</label>
              <select className={cn("mt-1", field)} value={opt} onChange={(e) => setOpt(e.target.value)}>
                <option value="call">Call</option>
                <option value="put">Put</option>
              </select>
            </div>
            <div>
              <label className={label}>Select a commodity / sleeve</label>
              <select className={cn("mt-1", field)} value={commodity} onChange={(e) => setCommodity(e.target.value)}>
                <option value="currencies">Currencies</option>
                <option value="equities">Equities</option>
                <option value="commodities">Commodities</option>
              </select>
            </div>
            <div>
              <label className={label}>Contract</label>
              <select className={cn("mt-1", field)} value={contract} onChange={(e) => setContract(e.target.value)}>
                <option value="sample">Sample contract (illustrative)</option>
                <option value="es">ES front month</option>
              </select>
            </div>
            <div>
              <label className={label}>Strike price</label>
              <input className={cn("mt-1", field)} value={strike} onChange={(e) => setStrike(e.target.value)} />
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground border-b border-border/60 pb-2">
              Economics (illustrative)
            </h3>
            <div>
              <label className={label}>Premium</label>
              <input className={cn("mt-1", field)} value={premium} onChange={(e) => setPremium(e.target.value)} />
            </div>
            <div>
              <label className={label}>Contract size</label>
              <input className={cn("mt-1", fieldReadonly)} readOnly value={String(contractSize.toLocaleString())} />
            </div>
            <div>
              <label className={label}>Price per contract</label>
              <input className={cn("mt-1", fieldReadonly)} readOnly value={pricePer.toFixed(2)} />
            </div>
            <div>
              <label className={label}>Trade value</label>
              <input className={cn("mt-1", fieldReadonly)} readOnly value={String(totalInv.toFixed(2))} />
            </div>
            <div>
              <label className={label}>Trade fees (est.)</label>
              <input className={cn("mt-1", fieldReadonly)} readOnly value={fees.toFixed(2)} />
            </div>
            <div>
              <label className={label}>Total invoiced</label>
              <input className={cn("mt-1", fieldReadonly)} readOnly value={totalInv.toFixed(2)} />
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-4 rounded-xl border border-border/60 bg-gradient-to-br from-brand/[0.07] via-card to-card p-5 shadow-inner ring-1 ring-border/30 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Order preview</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {side.toUpperCase()} {positions}× {opt.toUpperCase()}
              <span className="font-normal text-muted-foreground"> · est. notional </span>
              <span className="tabular-nums">{pricePer.toFixed(2)}</span>
            </p>
          </div>
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
            Trade requests are reviewed by operations. For listed equities and options, use the live ticket for
            immediate routing and risk checks.
          </p>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            className="gap-2 bg-gradient-brand px-6 text-brand-foreground shadow-md shadow-brand/15 hover:opacity-95"
            onClick={() => {
              toast.message("Desk review", {
                description:
                  "Complex derivative requests are logged for broker callback. Opening the live ticket next.",
              });
              void navigate({ to: "/portal/investor/trade" });
            }}
          >
            Request trade
          </Button>
          <Button variant="outline" className="border-border/70 shadow-sm" asChild>
            <Link to="/portal/investor/trade">Open live ticket</Link>
          </Button>
        </div>
    </SectionCard>
  );
}

function FundingRecordTab() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/portal/my-wallets");
        if (res.ok) setData(await res.json());
      } catch {
        setData({ deposits: [], withdrawals: [] });
      }
    })();
  }, []);

  const deposits = data?.deposits ?? [];

  const exportCsv = () => {
    downloadCsv(
      "funding-record.csv",
      ["Type", "Amount", "Currency", "Status", "Created"],
      deposits.map((d: any) => [d.method ?? "deposit", d.amount, d.currency, d.status, d.created_at]),
    );
    toast.success("CSV downloaded");
  };

  return (
    <SectionCard className="shadow-md ring-1 ring-border/40"
      title="Funding record"
      description="Deposit credits and related reference numbers."
      right={
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 border-border/70 shadow-sm"
            onClick={exportCsv}
          >
            <FileSpreadsheet className="h-4 w-4" /> Export CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 border-border/70 shadow-sm"
            onClick={() => window.print()}
          >
            <Download className="h-4 w-4" /> Print
          </Button>
        </div>
      }
    >
      {!data ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-brand" aria-hidden />
          Loading funding data…
        </div>
      ) : deposits.length === 0 ? (
        <D2Empty
          icon={Inbox}
          title="No funding records on file"
          hint="Deposit credits and reference numbers will show here after you submit funding instructions."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/60 shadow-sm">
          <div className="overflow-x-auto text-sm">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-muted/35 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-3 pr-3">Deposit credit</th>
                  <th className="py-3 pr-3">Reference</th>
                  <th className="py-3 pr-3">Transaction date</th>
                  <th className="px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {deposits.map((d: any) => (
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <p className="mt-4 text-xs font-medium text-muted-foreground">
        Showing <span className="tabular-nums text-foreground">{deposits.length}</span> entries.
      </p>
    </SectionCard>
  );
}

function fmtMoney(n: any, c: string) {
  return Number(n ?? 0).toLocaleString(undefined, { style: "currency", currency: c || "USD" });
}

function FundingTransferTab() {
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
    const res = await fetch("/api/portal/my-wallets");
    if (res.ok) setData(await res.json());
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const accounts: any[] = data?.accounts ?? [];
  const withdrawals: any[] = data?.withdrawals ?? [];
  const activeAcct = accounts.find((a) => a.status === "active");

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
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const exportHist = () => {
    downloadCsv(
      "fund-transfers.csv",
      ["Status", "Amount", "Currency", "Destination", "Created"],
      withdrawals.map((w: any) => [w.status, w.amount, w.currency, w.destination, w.created_at]),
    );
    toast.success("CSV downloaded");
  };

  return (
    <div className="space-y-6">
      <SectionCard className="shadow-md ring-1 ring-border/40"
        title="Money withdrawal order"
        description="Telegraphic transfer instructions. Operations will verify bank details before releasing funds."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["accountName", "Account name"],
              ["accountNumber", "Account number"],
              ["bankName", "Bank name"],
              ["country", "Country"],
              ["swift", "SWIFT code"],
              ["bsb", "BSB number"],
              ["iban", "IBAN"],
            ] as const
          ).map(([k, lab]) => (
            <div key={k}>
              <label className={label}>{lab}</label>
              <input
                className={cn("mt-1", field)}
                value={(form as any)[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              />
            </div>
          ))}
          <div>
            <label className={label}>Amount (account currency){req}</label>
            <input
              className={cn("mt-1", field)}
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>
        </div>
        <Button
          type="button"
          disabled={busy}
          onClick={() => void submit()}
          className="mt-5 gap-2 bg-gradient-brand px-8 text-brand-foreground shadow-md shadow-brand/15 hover:opacity-95"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            "Send request"
          )}
        </Button>
      </SectionCard>

      <SectionCard className="shadow-md ring-1 ring-border/40"
        title="Fund transfer history"
        description="Prior withdrawal instructions submitted from this portal."
        right={
          <Button type="button" variant="outline" size="sm" className="gap-1.5 border-border/70 shadow-sm" onClick={exportHist}>
            <FileSpreadsheet className="h-4 w-4" /> Export CSV
          </Button>
        }
      >
        {!data ? (
          <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-brand" aria-hidden />
            Loading…
          </div>
        ) : withdrawals.length === 0 ? (
          <D2Empty
            icon={Inbox}
            title="No transfer history yet"
            hint="Submitted withdrawal instructions will appear here after you send a money withdrawal order."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/60 shadow-sm">
            <div className="overflow-x-auto text-xs">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/35 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-3 pr-2">Status</th>
                    <th className="py-3 pr-2">Amount</th>
                    <th className="py-3 pr-2">Currency</th>
                    <th className="py-3 pr-2">Destination</th>
                    <th className="px-3 py-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {withdrawals.map((w: any) => (
                    <tr key={w.id} className="transition-colors hover:bg-muted/25">
                      <td className="px-3 py-2.5 pr-2">
                        <span className="inline-flex rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-[11px] font-medium capitalize">
                          {w.status}
                        </span>
                      </td>
                      <td className="py-2.5 pr-2 tabular-nums">{w.amount}</td>
                      <td className="py-2.5 pr-2">{w.currency}</td>
                      <td className="py-2.5 pr-2 max-w-[220px] truncate text-muted-foreground">{w.destination}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                        {new Date(w.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function HelpDeskTab() {
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
  const [toDept, setToDept] = useState<"account" | "funding" | "trading" | "kyc" | "technical" | "other">("account");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (subject.trim().length < 3) return toast.error("Subject is too short.");
    if (message.trim().length < 5) return toast.error("Message is too short.");
    setBusy(true);
    try {
      const res = await fetch("/api/portal/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          payload: { subject: subject.trim(), body: message.trim(), category: toDept, priority },
        }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      toast.success("Message sent. You can track replies under Support inbox.");
      setSubject("");
      setMessage("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard className="shadow-md ring-1 ring-border/40" title="Help desk — account support" description="Priority routing to the Hudson Crest service desk.">
      <div className="mb-5 rounded-lg border border-brand/20 bg-brand/[0.06] px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground">Response time:</span> normal priority is typically within one
        business day. Use <span className="font-medium text-foreground">high</span> only for time-sensitive account or
        funding issues.
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Priority{req}</label>
          <select className={cn("mt-1", field)} value={priority} onChange={(e) => setPriority(e.target.value as any)}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </div>
        <div>
          <label className={label}>To (team){req}</label>
          <select className={cn("mt-1", field)} value={toDept} onChange={(e) => setToDept(e.target.value as any)}>
            <option value="account">Account services</option>
            <option value="funding">Funding / treasury</option>
            <option value="trading">Trading support</option>
            <option value="kyc">KYC / compliance</option>
            <option value="technical">Technical</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Subject{req}</label>
          <input className={cn("mt-1", field)} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Message{req}</label>
          <textarea
            className={cn("mt-1 min-h-[140px]", field)}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
      </div>
      <Button
        type="button"
        disabled={busy}
        onClick={() => void send()}
        className="mt-5 gap-2 bg-gradient-brand px-8 text-brand-foreground shadow-md shadow-brand/15 hover:opacity-95"
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending…
          </>
        ) : (
          "Send message"
        )}
      </Button>
    </SectionCard>
  );
}
