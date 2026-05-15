import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ASSET_CLASSES,
  ASSET_CLASS_LIST,
  type AssetClass,
  type AssetClassMeta,
  type HoldingRow,
  type DetailField,
} from "@/lib/assetClasses";
import { COMMODITY_SELECT_GROUPS, COMMODITY_VALUE_TO_LABEL } from "@/lib/commodityTradeOrderSelect";
import { GC_COMEX_CONTRACT_OPTIONS } from "@/lib/gcComexContractOptions";
import { Plus, Trash2, Loader2, Pencil, Check, X } from "lucide-react";
import { usePersistedState } from "@/hooks/usePersistedState";

const field =
  "bg-surface border border-border rounded-md px-2 py-1.5 text-sm text-foreground w-full";
const btnPrimary =
  "text-xs px-2.5 py-1.5 rounded-md bg-gradient-brand text-brand-foreground hover:opacity-90 inline-flex items-center gap-1";
const btnGhost =
  "text-xs px-2.5 py-1.5 rounded-md border border-border hover:bg-surface-elevated inline-flex items-center gap-1";
const btnDanger =
  "text-xs px-2 py-1 rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10";

function DetailFieldInput({
  field: d,
  value,
  onChange,
}: {
  field: DetailField;
  value: string;
  onChange: (v: string) => void;
}) {
  const labelEl = (
    <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
      {d.label}
    </label>
  );
  if (d.type === "select") {
    return (
      <div>
        {labelEl}
        <select className={field} value={value} onChange={(e) => onChange(e.target.value)}>
          {d.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
  if (d.type === "number") {
    return (
      <div>
        {labelEl}
        <input
          className={field}
          type="number"
          inputMode="decimal"
          step={d.step ?? "any"}
          min={d.min}
          max={d.max}
          placeholder={d.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }
  return (
    <div>
      {labelEl}
      <input
        className={field}
        placeholder={d.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function cleanDetails(
  meta: { detailFields: ReadonlyArray<DetailField> },
  raw: Record<string, unknown>,
) {
  const out: Record<string, string | number> = {};
  for (const d of meta.detailFields) {
    const v = raw[d.key];
    if (v == null || v === "") continue;
    if (d.type === "number") {
      const n = Number(v);
      if (!Number.isNaN(n)) out[d.key] = n;
    } else {
      out[d.key] = String(v);
    }
  }
  return out;
}

type Account = { id: string; account_number: string; base_currency: string; status: string };
type RiskBand = "conservative" | "moderate" | "aggressive";
type HoldingPayload = {
  sub_portfolio_id: string;
  symbol: string;
  display_name?: string;
  quantity: number;
  avg_cost: number;
  mark_price?: number;
  unit_label?: string;
  currency: string;
  details: Record<string, string | number>;
};
type HoldingPatch = Omit<HoldingPayload, "sub_portfolio_id" | "unit_label" | "currency"> & {
  unit_label?: string;
  currency?: string;
};
type SP = {
  id: string;
  account_id: string;
  user_id: string;
  name: string;
  asset_class: AssetClass;
  base_currency: string;
  target_allocation_pct: number | null;
  risk_band: string | null;
  status: string;
  sub_portfolio_holdings: HoldingRow[];
};

async function apiJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  const text = await res.text();
  if (!res.ok) {
    let message = text || `Request failed (${res.status})`;
    try {
      const parsed = text ? JSON.parse(text) : {};
      const err = typeof (parsed as any)?.error === "string" ? (parsed as any).error : "";
      const hint = typeof (parsed as any)?.hint === "string" ? (parsed as any).hint : "";
      message = [err, hint].filter(Boolean).join(" — ") || message;
    } catch {
      // keep raw text fallback
    }
    throw new Error(message);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

/** Primary label for the position: prefer full display name, then symbol. */
function holdingPrimaryLabel(h: { symbol: string; display_name?: string | null }) {
  const d = h.display_name?.trim();
  return d || h.symbol;
}

/**
 * Map "Name of contract" into API fields. Symbol is capped at 40 chars (schema); full text stays in display_name.
 * Commodities: mirror full name into details.contract_name for table Contract column.
 */
function buildHoldingNames(trimmed: string, assetClass: AssetClass) {
  const sym = trimmed.slice(0, 40).toUpperCase();
  const detailsExtra: Record<string, string> =
    assetClass === "commodities" && trimmed ? { contract_name: trimmed } : {};
  return {
    symbol: sym,
    display_name: trimmed || undefined,
    detailsExtra,
  };
}

function parseNum(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const roFieldDesk =
  "bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-muted-foreground w-full cursor-not-allowed";

const lbl =
  "block text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5";

export function ClientSubPortfolios({
  userId,
  accounts,
  onChanged,
  /** Increment to force a reload from the parent (e.g. after creating a sleeve outside this component). */
  reloadNonce = 0,
  /** When true (e.g. Clients drawer): show sleeves/positions read-only; desk adds them on Trade Order. */
  readonly = false,
}: {
  userId: string;
  accounts: Account[];
  onChanged?: () => void;
  reloadNonce?: number;
  readonly?: boolean;
}) {
  const [rows, setRows] = useState<SP[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating, clearCreating] = usePersistedState<boolean>(
    `sp:creating:${userId}`,
    false,
  );
  const [draft, setDraft, clearDraft] = usePersistedState(`sp:draft:${userId}`, {
    account_id: accounts[0]?.id ?? "",
    name: "",
    asset_class: "equities" as AssetClass,
    target_allocation_pct: 0,
    risk_band: "moderate" as "conservative" | "moderate" | "aggressive",
  });

  useEffect(() => {
    if (!readonly) return;
    clearCreating();
  }, [readonly, clearCreating]);

  const load = useCallback(async () => {
    try {
      const r = await apiJson<SP[]>(
        `/api/portal/sub-portfolios?userId=${encodeURIComponent(userId)}`,
      );
      setRows((r ?? []) as SP[]);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Load failed"));
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load, reloadNonce]);

  const wrap = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      toast.success(label);
      await load();
      onChanged?.();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Action failed"));
    } finally {
      setBusy(false);
    }
  };

  // Backfill account_id once accounts load if persisted draft has none
  useEffect(() => {
    if (!accounts[0]?.id) return;
    setDraft((prev) => {
      if (prev.account_id) return prev;
      return { ...prev, account_id: accounts[0].id };
    });
  }, [accounts, setDraft]);

  const create = () => {
    if (!draft.account_id) return toast.error("Select an account");
    if (!draft.name.trim()) return toast.error("Name required");
    void wrap("Sub-portfolio created", async () => {
      await apiJson("/api/portal/sub-portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: draft.account_id,
          user_id: userId,
          name: draft.name.trim(),
          asset_class: draft.asset_class,
          base_currency: accounts.find((a) => a.id === draft.account_id)?.base_currency ?? "USD",
          target_allocation_pct: draft.target_allocation_pct,
          risk_band: draft.risk_band,
        }),
      });
      clearCreating();
      clearDraft();
    });
  };

  return (
    <div className="surface-card p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-foreground">Sub-Portfolios</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {readonly
              ? "One sleeve per asset class. Sleeves and positions are maintained on Admin → Trade Order."
              : "Create one sleeve per asset class. Each sleeve has its own holdings and metrics."}
          </p>
        </div>
        {!readonly && !creating && accounts.length > 0 ? (
          <button
            type="button"
            className={`${btnPrimary} shrink-0 self-start sm:self-auto`}
            onClick={() => setCreating(true)}
          >
            <Plus className="h-3 w-3" aria-hidden /> Add sub-portfolio
          </button>
        ) : !readonly && !creating && accounts.length === 0 ? (
          <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300 border border-amber-500/35 rounded-md px-3 py-2 bg-amber-500/10 shrink-0 max-w-md">
            <span className="font-semibold text-foreground">No brokerage account yet.</span> Under{" "}
            <strong className="text-foreground">Clients → Accounts</strong>, use{" "}
            <strong className="text-foreground">Create pending brokerage account</strong> (or open{" "}
            <strong className="text-foreground">Open Investor Account</strong> from Admin → Clients for the legacy
            profile template) so a <strong className="text-foreground">pending</strong> row exists, then{" "}
            <strong className="text-foreground">Approve</strong> — then add sleeves here on{" "}
            <strong className="text-foreground">Admin → Trade Order</strong>.
          </p>
        ) : null}
      </div>

      {creating && !readonly && (
        <div className="border border-brand/40 rounded-md p-3 mb-4 bg-surface-elevated/40">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <select
              className={field}
              value={draft.account_id}
              onChange={(e) => setDraft({ ...draft, account_id: e.target.value })}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.account_number} ({a.base_currency})
                </option>
              ))}
            </select>
            <input
              className={field}
              placeholder="Name (e.g. BTC Allocation)"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
            <select
              className={field}
              value={draft.asset_class}
              onChange={(e) => setDraft({ ...draft, asset_class: e.target.value as AssetClass })}
            >
              {ASSET_CLASS_LIST.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.label}
                </option>
              ))}
            </select>
            <select
              className={field}
              value={draft.risk_band}
              onChange={(e) => setDraft({ ...draft, risk_band: e.target.value as RiskBand })}
            >
              <option value="conservative">Conservative</option>
              <option value="moderate">Moderate</option>
              <option value="aggressive">Aggressive</option>
            </select>
            <input
              className={field}
              type="number"
              min={0}
              max={100}
              placeholder="Target allocation %"
              value={draft.target_allocation_pct}
              onChange={(e) =>
                setDraft({ ...draft, target_allocation_pct: Number(e.target.value) })
              }
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button className={btnGhost} onClick={() => setCreating(false)}>
              Cancel
            </button>
            <button className={btnPrimary} disabled={busy} onClick={create}>
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}{" "}
              Create
            </button>
          </div>
        </div>
      )}

      {rows === null ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-border/80 bg-muted/10 px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">No sub-portfolios yet.</p>
          {readonly ? (
            <p className="mt-3 text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
              Add sleeves and positions from{" "}
              <strong className="text-foreground">Admin → Trade Order</strong> (select this investor in the desk
              panel).
            </p>
          ) : accounts.length > 0 && !creating ? (
            <>
              <p className="mt-3 text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                Limited Risk Options and other listed derivatives do not require a sleeve before you use the Trade
                Order execution ticket. Add a sub-portfolio when you need separate sleeves for additional markets.
              </p>
              <button
                type="button"
                className={`${btnPrimary} mt-4`}
                onClick={() => setCreating(true)}
              >
                <Plus className="h-3 w-3" aria-hidden /> Add your first sub-portfolio
              </button>
            </>
          ) : accounts.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground max-w-md mx-auto">
              Sub-portfolios attach to an account. Add or approve an account on this client record, then use{" "}
              <strong className="text-foreground">Trade Order</strong> to add sleeves.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((sp) => (
            <SubPortfolioCard key={sp.id} sp={sp} busy={busy} wrap={wrap} readonly={readonly} />
          ))}
        </div>
      )}
    </div>
  );
}

function SubPortfolioCard({
  sp,
  busy,
  wrap,
  readonly = false,
}: {
  sp: SP;
  busy: boolean;
  wrap: (label: string, fn: () => Promise<unknown>) => Promise<void>;
  readonly?: boolean;
}) {
  const meta = ASSET_CLASSES[sp.asset_class];
  const [adding, setAdding, clearAdding] = usePersistedState<boolean>(`sp:adding:${sp.id}`, false);
  const [editingId, setEditingId] = usePersistedState<string | null>(`sp:editingId:${sp.id}`, null);

  return (
    <div className="border border-border rounded-md p-3">
      <div className="flex justify-between items-start gap-2">
        <div>
          <div className="text-sm font-semibold text-foreground">{sp.name}</div>
          <div className="text-xs text-muted-foreground capitalize mt-0.5">
            {meta.label} · {sp.base_currency} · {sp.target_allocation_pct ?? 0}% target ·{" "}
            {sp.risk_band ?? "—"} · {sp.status}
          </div>
        </div>
        <div className="flex gap-1.5">
          {!readonly && (
            <>
              <button type="button" className={btnGhost} onClick={() => setAdding((v) => !v)}>
                <Plus className="h-3 w-3" /> Position
              </button>
              <button
                type="button"
                className={btnDanger}
                disabled={busy}
                onClick={() => {
                  if (!window.confirm(`Delete sub-portfolio "${sp.name}" and all its holdings?`))
                    return;
                  void wrap("Sub-portfolio deleted", () =>
                    apiJson("/api/portal/sub-portfolios", {
                      method: "DELETE",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: sp.id }),
                    }),
                  );
                }}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
      </div>

      {adding && !readonly && (
        <NewHoldingRow
          subId={sp.id}
          assetClass={sp.asset_class}
          currency={sp.base_currency}
          onCancel={() => clearAdding()}
          onSave={async (payload) => {
            await wrap("Position added", () =>
              apiJson("/api/portal/sub-portfolio-holdings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              }),
            );
            clearAdding();
          }}
        />
      )}

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
              {meta.columns.map((c) => (
                <th key={c.key} className="py-2 pr-3 font-medium">
                  {c.label}
                </th>
              ))}
              {!readonly ? <th className="py-2 w-16" /> : null}
            </tr>
          </thead>
          <tbody>
            {sp.sub_portfolio_holdings.length === 0 && (
              <tr>
                <td
                  colSpan={meta.columns.length + (readonly ? 0 : 1)}
                  className="py-3 text-xs text-muted-foreground"
                >
                  {readonly
                    ? "No positions in this sleeve (read-only view)."
                    : "No positions. Add one to populate the client's portfolio view."}
                </td>
              </tr>
            )}
            {sp.sub_portfolio_holdings.map((h) =>
              editingId === h.id ? (
                <EditHoldingRow
                  key={h.id}
                  holding={h}
                  assetClass={sp.asset_class}
                  onCancel={() => setEditingId(null)}
                  onSave={async (patch) => {
                    await wrap("Position updated", () =>
                      apiJson("/api/portal/sub-portfolio-holdings", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: h.id, patch }),
                      }),
                    );
                    setEditingId(null);
                  }}
                />
              ) : (
                <tr key={h.id} className="border-b border-border/40 hover:bg-surface-elevated/30">
                  {meta.columns.map((c) => (
                    <td key={c.key} className="py-2 pr-3">
                      {c.render(h)}
                    </td>
                  ))}
                  {!readonly ? (
                    <td className="py-2 text-right">
                      <div className="flex gap-1 justify-end">
                        <button type="button" className={btnGhost} onClick={() => setEditingId(h.id)}>
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          className={btnDanger}
                          disabled={busy}
                          onClick={() => {
                            if (!window.confirm(`Delete position ${h.symbol}?`)) return;
                            void wrap("Position deleted", () =>
                              apiJson("/api/portal/sub-portfolio-holdings", {
                                method: "DELETE",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ id: h.id }),
                              }),
                            );
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type DeskCommodityHoldingForm = {
  nameOfContract: string;
  quantity: string;
  avg_cost: string;
  mark_price: string;
  currency: string;
  desk_trade_order: "buy" | "sell";
  desk_commodity_route: string;
  desk_contract_spec: string;
  desk_trade_fees: string;
  desk_contract_size: string;
  details: Record<string, string>;
};

function emptyDetailsFromMeta(meta: AssetClassMeta): Record<string, string> {
  return Object.fromEntries(meta.detailFields.map((d) => [d.key, ""])) as Record<string, string>;
}

function CommodityTradeOrderNewHolding({
  subId,
  meta,
  currency,
  onCancel,
  onSave,
}: {
  subId: string;
  meta: AssetClassMeta;
  currency: string;
  onCancel: () => void;
  onSave: (payload: HoldingPayload) => Promise<void>;
}) {
  const [f, setF, clearF] = usePersistedState<DeskCommodityHoldingForm>(`sp:newHolding:desk:${subId}`, {
    nameOfContract: "",
    quantity: "",
    avg_cost: "1",
    mark_price: "",
    currency,
    desk_trade_order: "buy",
    desk_commodity_route: "",
    desk_contract_spec: "",
    desk_trade_fees: "35",
    desk_contract_size: "1000",
    details: emptyDetailsFromMeta(meta),
  });
  const [saving, setSaving] = useState(false);

  const premiumNum = parseNum(f.avg_cost);
  const positionsNum = parseNum(f.quantity);
  const contractSizeNum = Math.max(parseNum(f.desk_contract_size) || 1000, 1);
  const feesNum = Math.max(parseNum(f.desk_trade_fees), 0);
  const pricePerContract = useMemo(() => {
    if (!Number.isFinite(premiumNum) || !Number.isFinite(contractSizeNum)) return null;
    return premiumNum * contractSizeNum;
  }, [premiumNum, contractSizeNum]);
  const tradeValue = useMemo(() => {
    if (pricePerContract == null || !Number.isFinite(positionsNum)) return null;
    return positionsNum * pricePerContract;
  }, [pricePerContract, positionsNum]);
  const totalInvoiced = useMemo(() => {
    if (tradeValue == null || !Number.isFinite(feesNum)) return null;
    return tradeValue + feesNum;
  }, [tradeValue, feesNum]);

  const strikeStr = String(f.details.strike ?? "").trim();
  const strikeNum = parseNum(strikeStr);

  const tradeDetailsSummary = useMemo(() => {
    const side = f.desk_trade_order === "sell" ? "SELL" : "BUY";
    const pos = Number.isFinite(positionsNum) && positionsNum > 0 ? String(positionsNum) : "—";
    const opt =
      f.details.option_type === "put" ? "PUT" : f.details.option_type === "call" ? "CALL" : "—";
    let pr = "—";
    if (pricePerContract != null && Number.isFinite(pricePerContract) && pricePerContract > 0) {
      pr = pricePerContract.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } else if (strikeStr && Number.isFinite(strikeNum) && strikeNum > 0) {
      pr = strikeNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (Number.isFinite(premiumNum) && premiumNum > 0) {
      pr = premiumNum.toFixed(2);
    }
    return `${side} ${pos}x ${opt} PR:${pr}`;
  }, [
    f.desk_trade_order,
    f.details.option_type,
    positionsNum,
    pricePerContract,
    strikeStr,
    strikeNum,
    premiumNum,
  ]);

  const secondaryDetailFields = meta.detailFields.filter(
    (d) => !["option_type", "side", "instrument_kind"].includes(d.key),
  );

  return (
    <div className="mt-3 rounded-md border border-brand/40 bg-surface-elevated/40 p-4 space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-foreground">Trade Order</h4>
        <p className="text-xs text-muted-foreground mt-0.5">
          Add a position using the same ticket layout as the admin desk (Limited Risk Options).
        </p>
      </div>

      <div>
        <label className={lbl}>Contract / listing ID (optional override)</label>
        <input
          className={field}
          placeholder={meta.symbolHint}
          value={f.nameOfContract}
          onChange={(e) => setF({ ...f, nameOfContract: e.target.value })}
          autoComplete="off"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <div>
            <label className={lbl}>Trade Order</label>
            <select
              className={field}
              value={f.desk_trade_order}
              onChange={(e) =>
                setF({ ...f, desk_trade_order: e.target.value === "sell" ? "sell" : "buy" })
              }
            >
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Position(s)</label>
            <input
              className={field}
              type="number"
              step="any"
              min={0}
              placeholder="Contracts"
              value={f.quantity}
              onChange={(e) => setF({ ...f, quantity: e.target.value })}
            />
          </div>
          <div>
            <label className={lbl}>Option</label>
            <select
              className={field}
              value={f.details.option_type}
              onChange={(e) =>
                setF({
                  ...f,
                  details: { ...f.details, option_type: e.target.value },
                })
              }
            >
              <option value="">N/A</option>
              <option value="call">Call</option>
              <option value="put">Put</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Select a Commodity</label>
            <select
              className={field}
              value={f.desk_commodity_route}
              onChange={(e) => setF({ ...f, desk_commodity_route: e.target.value })}
            >
              <option value="">Select a Commodity</option>
              {COMMODITY_SELECT_GROUPS.map((g) => (
                <optgroup key={g.groupLabel} label={g.groupLabel}>
                  {g.items.map((it) => (
                    <option key={it.value} value={it.value}>
                      {it.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl}>Contract</label>
            <select
              className={field}
              value={f.desk_contract_spec}
              onChange={(e) => setF({ ...f, desk_contract_spec: e.target.value })}
            >
              {GC_COMEX_CONTRACT_OPTIONS.map((o) => (
                <option key={o.value || "blank"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl}>Strike Price</label>
            <input
              className={field}
              inputMode="decimal"
              placeholder="Strike"
              value={String(f.details.strike ?? "")}
              onChange={(e) =>
                setF({ ...f, details: { ...f.details, strike: e.target.value } })
              }
            />
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className={lbl}>Premium</label>
            <input
              className={field}
              inputMode="decimal"
              placeholder="1.00"
              value={f.avg_cost}
              onChange={(e) => setF({ ...f, avg_cost: e.target.value })}
            />
          </div>
          <div>
            <label className={lbl}>Contract Size</label>
            <input
              className={field}
              type="number"
              inputMode="decimal"
              step="any"
              min={1}
              placeholder="1000"
              value={f.desk_contract_size}
              onChange={(e) => setF({ ...f, desk_contract_size: e.target.value })}
            />
          </div>
          <div>
            <label className={lbl}>Price per Contract</label>
            <input
              className={roFieldDesk}
              readOnly
              tabIndex={-1}
              value={
                pricePerContract != null && Number.isFinite(pricePerContract)
                  ? pricePerContract.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : "—"
              }
            />
          </div>
          <div>
            <label className={lbl}>Trade Value</label>
            <input
              className={roFieldDesk}
              readOnly
              tabIndex={-1}
              value={
                tradeValue != null && Number.isFinite(tradeValue)
                  ? tradeValue.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : "0.00"
              }
            />
          </div>
          <div>
            <label className={lbl}>Trade Fees</label>
            <input
              className={field}
              inputMode="decimal"
              value={f.desk_trade_fees}
              onChange={(e) => setF({ ...f, desk_trade_fees: e.target.value })}
            />
          </div>
          <div>
            <label className={lbl}>Total Invoiced</label>
            <input
              className={roFieldDesk}
              readOnly
              tabIndex={-1}
              value={
                totalInvoiced != null && Number.isFinite(totalInvoiced)
                  ? totalInvoiced.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : "0.00"
              }
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 border-t border-border/60 pt-3 sm:grid-cols-2">
        <div>
          <label className={lbl}>Mark (optional)</label>
          <input
            className={field}
            type="number"
            step="any"
            min={0}
            placeholder="—"
            value={f.mark_price}
            onChange={(e) => setF({ ...f, mark_price: e.target.value })}
          />
        </div>
        <div>
          <label className={lbl}>Currency</label>
          <input
            className={field}
            maxLength={3}
            value={f.currency}
            onChange={(e) => setF({ ...f, currency: e.target.value.toUpperCase() })}
          />
        </div>
        {secondaryDetailFields.map((d) => (
          <DetailFieldInput
            key={d.key}
            field={d}
            value={String(f.details[d.key] ?? "")}
            onChange={(v) => setF({ ...f, details: { ...f.details, [d.key]: v } })}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 border-t border-border/60 pt-4 md:grid-cols-2">
        <div>
          <div className={lbl}>Trade Details</div>
          <p className="text-sm font-medium text-foreground">{tradeDetailsSummary}</p>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground md:text-left">
          Trade requests are submitted to your broker for verification. Upon receiving a request, your broker will
          contact you to verify your trade details.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 justify-end">
        <button type="button" className={btnGhost} onClick={onCancel}>
          <X className="h-3 w-3" /> Cancel
        </button>
        <button
          type="button"
          className={btnPrimary}
          disabled={
            saving ||
            !(f.nameOfContract.trim() || f.desk_contract_spec || f.desk_commodity_route)
          }
          onClick={async () => {
            setSaving(true);
            try {
              const commodityLabel = f.desk_commodity_route
                ? COMMODITY_VALUE_TO_LABEL[f.desk_commodity_route] ?? f.desk_commodity_route
                : "";
              const specLabel =
                GC_COMEX_CONTRACT_OPTIONS.find((o) => o.value === f.desk_contract_spec)?.label ?? "";
              const stem =
                f.nameOfContract.trim() ||
                [commodityLabel, specLabel].filter(Boolean).join(" · ") ||
                specLabel ||
                "POSITION";
              const { symbol, display_name, detailsExtra } = buildHoldingNames(stem, "commodities");
              const detailsForClean: Record<string, string> = { ...f.details };
              detailsForClean.side = f.desk_trade_order === "sell" ? "short" : "long";
              const opt = detailsForClean.option_type;
              detailsForClean.instrument_kind =
                opt === "call" || opt === "put" ? "option" : detailsForClean.instrument_kind || "future";
              if (commodityLabel) detailsForClean.commodity = commodityLabel;
              const baseClean = cleanDetails(meta, detailsForClean);
              const mergedDetails: Record<string, string | number> = {
                ...baseClean,
                ...detailsExtra,
                desk_trade_order: f.desk_trade_order,
                desk_contract_spec: f.desk_contract_spec || "",
                desk_trade_fees: feesNum,
                desk_contract_size: contractSizeNum,
                desk_trade_value: tradeValue ?? 0,
                desk_total_invoiced: totalInvoiced ?? 0,
                desk_trade_summary: tradeDetailsSummary,
              };
              const mark = parseNum(f.mark_price);
              await onSave({
                sub_portfolio_id: subId,
                symbol,
                display_name,
                quantity: positionsNum,
                avg_cost: premiumNum,
                mark_price: mark > 0 ? mark : undefined,
                unit_label: meta.defaultUnit,
                currency: (f.currency || "USD").toUpperCase(),
                details: mergedDetails,
              });
              clearF();
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Save position
        </button>
      </div>
    </div>
  );
}

function NewHoldingRow({
  subId,
  assetClass,
  currency,
  onCancel,
  onSave,
}: {
  subId: string;
  assetClass: AssetClass;
  currency: string;
  onCancel: () => void;
  onSave: (payload: HoldingPayload) => Promise<void>;
}) {
  if (assetClass === "commodities") {
    return (
      <CommodityTradeOrderNewHolding
        subId={subId}
        meta={ASSET_CLASSES.commodities}
        currency={currency}
        onCancel={onCancel}
        onSave={onSave}
      />
    );
  }

  const meta = ASSET_CLASSES[assetClass];
  const qtyLabel =
    assetClass === "crypto"
      ? "Units"
      : assetClass === "managed_strategy"
        ? "Units"
        : "Shares";
  const [f, setF, clearF] = usePersistedState(`sp:newHolding:v2:${subId}`, {
    nameOfContract: "",
    quantity: "",
    avg_cost: "",
    mark_price: "",
    currency,
    details: Object.fromEntries(meta.detailFields.map((d) => [d.key, ""])) as Record<
      string,
      string
    >,
  });
  const [saving, setSaving] = useState(false);

  return (
    <div className="mt-3 p-3 rounded-md border border-brand/40 bg-surface-elevated/40 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <label className={lbl}>Name of contract</label>
          <input
            className={field}
            placeholder={meta.symbolHint}
            value={f.nameOfContract}
            onChange={(e) => setF({ ...f, nameOfContract: e.target.value })}
            autoComplete="off"
          />
        </div>
        <div>
          <label className={lbl}>{qtyLabel}</label>
          <input
            className={field}
            type="number"
            step="any"
            min={0}
            placeholder="0"
            value={f.quantity}
            onChange={(e) => setF({ ...f, quantity: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={lbl}>
            {assetClass === "commodities" ? "Premium / avg price" : "Avg cost"}
          </label>
          <input
            className={field}
            type="number"
            step="any"
            min={0}
            placeholder="0.00"
            value={f.avg_cost}
            onChange={(e) => setF({ ...f, avg_cost: e.target.value })}
          />
        </div>
        <div>
          <label className={lbl}>Mark (optional)</label>
          <input
            className={field}
            type="number"
            step="any"
            min={0}
            placeholder="—"
            value={f.mark_price}
            onChange={(e) => setF({ ...f, mark_price: e.target.value })}
          />
        </div>
        <div>
          <label className={lbl}>Currency</label>
          <input
            className={field}
            maxLength={3}
            placeholder="USD"
            value={f.currency}
            onChange={(e) => setF({ ...f, currency: e.target.value.toUpperCase() })}
          />
        </div>
      </div>
      {meta.detailFields.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 border-t border-border/50">
          {meta.detailFields.map((d) => (
            <DetailFieldInput
              key={d.key}
              field={d}
              value={String(f.details[d.key] ?? "")}
              onChange={(v) => setF({ ...f, details: { ...f.details, [d.key]: v } })}
            />
          ))}
        </div>
      )}
      <div className="flex gap-2 justify-end">
        <button className={btnGhost} onClick={onCancel}>
          <X className="h-3 w-3" /> Cancel
        </button>
        <button
          className={btnPrimary}
          disabled={saving || !f.nameOfContract.trim()}
          onClick={async () => {
            setSaving(true);
            try {
              const trimmed = f.nameOfContract.trim();
              const { symbol, display_name, detailsExtra } = buildHoldingNames(trimmed, assetClass);
              const cleanedDetails = {
                ...cleanDetails(meta, f.details),
                ...detailsExtra,
              };
              const qty = parseNum(f.quantity);
              const avg = parseNum(f.avg_cost);
              const mark = parseNum(f.mark_price);
              await onSave({
                sub_portfolio_id: subId,
                symbol,
                display_name,
                quantity: qty,
                avg_cost: avg,
                mark_price: mark > 0 ? mark : undefined,
                unit_label: meta.defaultUnit,
                currency: (f.currency || "USD").toUpperCase(),
                details: cleanedDetails,
              });
              clearF();
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}{" "}
          Save
        </button>
      </div>
    </div>
  );
}

function EditHoldingRow({
  holding,
  assetClass,
  onCancel,
  onSave,
}: {
  holding: HoldingRow;
  assetClass: AssetClass;
  onCancel: () => void;
  onSave: (patch: HoldingPatch) => Promise<void>;
}) {
  const meta = ASSET_CLASSES[assetClass];
  const qtyLabel =
    assetClass === "commodities"
      ? "No. of contracts"
      : assetClass === "crypto"
        ? "Units"
        : assetClass === "managed_strategy"
          ? "Units"
          : "Shares";

  const detailKeys = new Set(meta.detailFields.map((d) => d.key));
  const initialDetails = { ...(holding.details ?? {}) } as Record<string, unknown>;
  for (const k of Object.keys(initialDetails)) {
    if (!detailKeys.has(k)) delete initialDetails[k];
  }

  const [f, setF] = useState({
    nameOfContract: holdingPrimaryLabel(holding),
    quantity: String(holding.quantity),
    avg_cost: String(holding.avg_cost),
    mark_price: holding.mark_price != null && holding.mark_price > 0 ? String(holding.mark_price) : "",
    currency: holding.currency ?? "USD",
    details: initialDetails as Record<string, unknown>,
  });
  const [saving, setSaving] = useState(false);

  return (
    <tr className="border-b border-border/40 bg-surface-elevated/40">
      <td colSpan={meta.columns.length + 1} className="p-3">
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className={lbl}>Name of contract</label>
              <input
                className={field}
                placeholder={meta.symbolHint}
                value={f.nameOfContract}
                onChange={(e) => setF({ ...f, nameOfContract: e.target.value })}
              />
            </div>
            <div>
              <label className={lbl}>{qtyLabel}</label>
              <input
                className={field}
                type="number"
                step="any"
                min={0}
                value={f.quantity}
                onChange={(e) => setF({ ...f, quantity: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={lbl}>
                {assetClass === "commodities" ? "Premium / avg price" : "Avg cost"}
              </label>
              <input
                className={field}
                type="number"
                step="any"
                min={0}
                value={f.avg_cost}
                onChange={(e) => setF({ ...f, avg_cost: e.target.value })}
              />
            </div>
            <div>
              <label className={lbl}>Mark (optional)</label>
              <input
                className={field}
                type="number"
                step="any"
                min={0}
                placeholder="—"
                value={f.mark_price}
                onChange={(e) => setF({ ...f, mark_price: e.target.value })}
              />
            </div>
            <div>
              <label className={lbl}>Currency</label>
              <input
                className={field}
                maxLength={3}
                value={f.currency}
                onChange={(e) => setF({ ...f, currency: e.target.value.toUpperCase() })}
              />
            </div>
          </div>
          {meta.detailFields.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 border-t border-border/50">
              {meta.detailFields.map((d) => (
                <DetailFieldInput
                  key={d.key}
                  field={d}
                  value={String(f.details[d.key] ?? "")}
                  onChange={(v) => setF({ ...f, details: { ...f.details, [d.key]: v } })}
                />
              ))}
            </div>
          )}
        </div>
        <div className="mt-3 flex gap-2 justify-end">
          <button className={btnGhost} onClick={onCancel}>
            <X className="h-3 w-3" /> Cancel
          </button>
          <button
            className={btnPrimary}
            disabled={saving || !f.nameOfContract.trim()}
            onClick={async () => {
              setSaving(true);
              try {
                const trimmed = f.nameOfContract.trim();
                const { symbol, display_name, detailsExtra } = buildHoldingNames(trimmed, assetClass);
                const mergedDetails = {
                  ...cleanDetails(meta, f.details),
                  ...detailsExtra,
                };
                const mark = parseNum(f.mark_price);
                await onSave({
                  symbol,
                  display_name,
                  quantity: parseNum(f.quantity),
                  avg_cost: parseNum(f.avg_cost),
                  mark_price: mark > 0 ? mark : undefined,
                  currency: (f.currency || "USD").toUpperCase(),
                  details: mergedDetails,
                });
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}{" "}
            Save
          </button>
        </div>
      </td>
    </tr>
  );
}
