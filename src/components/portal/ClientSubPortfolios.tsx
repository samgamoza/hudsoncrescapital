import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ASSET_CLASSES,
  ASSET_CLASS_LIST,
  type AssetClass,
  type HoldingRow,
  type DetailField,
} from "@/lib/assetClasses";
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

const lbl =
  "block text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5";

export function ClientSubPortfolios({
  userId,
  accounts,
  onChanged,
  /** When true (e.g. Clients drawer): show sleeves/positions read-only; desk adds them on Trade Order. */
  readonly = false,
}: {
  userId: string;
  accounts: Account[];
  onChanged?: () => void;
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
  }, [load]);

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
            <strong className="text-foreground">Create pending brokerage account</strong> (or finish Investor signup)
            so a <strong className="text-foreground">pending</strong> row exists, then <strong className="text-foreground">Approve</strong>{" "}
            — then add sleeves here on <strong className="text-foreground">Admin → Trade Order</strong>.
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
            <button
              type="button"
              className={`${btnPrimary} mt-4`}
              onClick={() => setCreating(true)}
            >
              <Plus className="h-3 w-3" aria-hidden /> Add your first sub-portfolio
            </button>
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
  const meta = ASSET_CLASSES[assetClass];
  const qtyLabel =
    assetClass === "commodities"
      ? "No. of contracts"
      : assetClass === "crypto"
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
