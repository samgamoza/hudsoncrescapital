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
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function ClientSubPortfolios({
  userId,
  accounts,
  onChanged,
}: {
  userId: string;
  accounts: Account[];
  onChanged?: () => void;
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
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Sub-Portfolios</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Create one sleeve per asset class. Each sleeve has its own holdings and metrics.
          </p>
        </div>
        {!creating && accounts.length > 0 && (
          <button className={btnPrimary} onClick={() => setCreating(true)}>
            <Plus className="h-3 w-3" /> Add sub-portfolio
          </button>
        )}
      </div>

      {creating && (
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
        <div className="text-sm text-muted-foreground">No sub-portfolios yet.</div>
      ) : (
        <div className="space-y-4">
          {rows.map((sp) => (
            <SubPortfolioCard key={sp.id} sp={sp} busy={busy} wrap={wrap} />
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
}: {
  sp: SP;
  busy: boolean;
  wrap: (label: string, fn: () => Promise<unknown>) => Promise<void>;
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
          <button className={btnGhost} onClick={() => setAdding((v) => !v)}>
            <Plus className="h-3 w-3" /> Position
          </button>
          <button
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
        </div>
      </div>

      {adding && (
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
              <th className="py-2 w-16" />
            </tr>
          </thead>
          <tbody>
            {sp.sub_portfolio_holdings.length === 0 && (
              <tr>
                <td
                  colSpan={meta.columns.length + 1}
                  className="py-3 text-xs text-muted-foreground"
                >
                  No positions. Add one to populate the client's portfolio view.
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
                  <td className="py-2 text-right">
                    <div className="flex gap-1 justify-end">
                      <button className={btnGhost} onClick={() => setEditingId(h.id)}>
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
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
  const [f, setF, clearF] = usePersistedState(`sp:newHolding:${subId}`, {
    symbol: "",
    display_name: "",
    quantity: 0,
    avg_cost: 0,
    mark_price: 0,
    unit_label: meta.defaultUnit,
    currency,
    details: Object.fromEntries(meta.detailFields.map((d) => [d.key, ""])) as Record<
      string,
      string
    >,
  });
  const [saving, setSaving] = useState(false);

  return (
    <div className="mt-3 p-3 rounded-md border border-brand/40 bg-surface-elevated/40 space-y-2">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <input
          className={field}
          placeholder={meta.symbolHint}
          value={f.symbol}
          onChange={(e) => setF({ ...f, symbol: e.target.value })}
        />
        <input
          className={field}
          placeholder="Display name (optional)"
          value={f.display_name}
          onChange={(e) => setF({ ...f, display_name: e.target.value })}
        />
        <input
          className={field}
          type="number"
          step="any"
          placeholder="Quantity"
          value={f.quantity}
          onChange={(e) => setF({ ...f, quantity: Number(e.target.value) })}
        />
        <input
          className={field}
          type="number"
          step="any"
          placeholder="Avg cost"
          value={f.avg_cost}
          onChange={(e) => setF({ ...f, avg_cost: Number(e.target.value) })}
        />
        <input
          className={field}
          type="number"
          step="any"
          placeholder="Mark / NAV"
          value={f.mark_price}
          onChange={(e) => setF({ ...f, mark_price: Number(e.target.value) })}
        />
        <input
          className={field}
          placeholder="Unit (shares/coins/oz)"
          value={f.unit_label}
          onChange={(e) => setF({ ...f, unit_label: e.target.value })}
        />
        <input
          className={field}
          maxLength={3}
          placeholder="Currency"
          value={f.currency}
          onChange={(e) => setF({ ...f, currency: e.target.value.toUpperCase() })}
        />
      </div>
      {meta.detailFields.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
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
          disabled={saving || !f.symbol.trim()}
          onClick={async () => {
            setSaving(true);
            try {
              const cleanedDetails = cleanDetails(meta, f.details);
              await onSave({
                sub_portfolio_id: subId,
                symbol: f.symbol.trim(),
                display_name: f.display_name.trim() || undefined,
                quantity: f.quantity,
                avg_cost: f.avg_cost,
                mark_price: f.mark_price > 0 ? f.mark_price : undefined,
                unit_label: f.unit_label || meta.defaultUnit,
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
  const [f, setF] = useState({
    symbol: holding.symbol,
    display_name: holding.display_name ?? "",
    quantity: holding.quantity,
    avg_cost: holding.avg_cost,
    mark_price: holding.mark_price ?? 0,
    details: { ...(holding.details ?? {}) } as Record<string, unknown>,
  });
  const [saving, setSaving] = useState(false);

  return (
    <tr className="border-b border-border/40 bg-surface-elevated/40">
      <td colSpan={meta.columns.length + 1} className="p-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <input
            className={field}
            value={f.symbol}
            onChange={(e) => setF({ ...f, symbol: e.target.value })}
          />
          <input
            className={field}
            value={f.display_name}
            onChange={(e) => setF({ ...f, display_name: e.target.value })}
          />
          <input
            className={field}
            type="number"
            step="any"
            value={f.quantity}
            onChange={(e) => setF({ ...f, quantity: Number(e.target.value) })}
          />
          <input
            className={field}
            type="number"
            step="any"
            value={f.avg_cost}
            onChange={(e) => setF({ ...f, avg_cost: Number(e.target.value) })}
          />
          <input
            className={field}
            type="number"
            step="any"
            value={f.mark_price}
            onChange={(e) => setF({ ...f, mark_price: Number(e.target.value) })}
          />
          {meta.detailFields.map((d) => (
            <DetailFieldInput
              key={d.key}
              field={d}
              value={String(f.details[d.key] ?? "")}
              onChange={(v) => setF({ ...f, details: { ...f.details, [d.key]: v } })}
            />
          ))}
        </div>
        <div className="mt-2 flex gap-2 justify-end">
          <button className={btnGhost} onClick={onCancel}>
            <X className="h-3 w-3" /> Cancel
          </button>
          <button
            className={btnPrimary}
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave({
                  symbol: f.symbol.trim(),
                  display_name: f.display_name.trim() || undefined,
                  quantity: f.quantity,
                  avg_cost: f.avg_cost,
                  mark_price: f.mark_price > 0 ? f.mark_price : undefined,
                  details: cleanDetails(meta, f.details),
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
