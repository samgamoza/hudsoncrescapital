/**
 * Shared desk trade ticket options — keep Trade order form, trade history tables,
 * and portfolio views aligned on the same vocabulary.
 */
export const DESK_CONTRACT_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "— Select —" },
  { value: "g14", label: "G14 (28 Jan 14)" },
  { value: "h15", label: "H15 (15 Mar 15)" },
  { value: "m16", label: "M16 (20 Jun 16)" },
  { value: "es", label: "ES front month" },
  { value: "sample", label: "Sample contract (illustrative)" },
];

export const DESK_COMMODITY_GROUPS: { group: string; options: { value: string; label: string }[] }[] = [
  {
    group: "Currencies",
    options: [
      { value: "currencies", label: "Currencies" },
      { value: "majors", label: "Major pairs" },
    ],
  },
  {
    group: "Commodities",
    options: [
      { value: "metals", label: "Metals" },
      { value: "energy", label: "Energy" },
      { value: "ag", label: "Agricultural" },
    ],
  },
  {
    group: "Equities",
    options: [{ value: "equities", label: "Equities" }],
  },
  {
    group: "Other",
    options: [{ value: "indices", label: "Indices" }],
  },
];

export function deskCommodityLabel(value: string): string {
  for (const g of DESK_COMMODITY_GROUPS) {
    const hit = g.options.find((o) => o.value === value);
    if (hit) return hit.label;
  }
  return value ? value : "—";
}

export function deskContractLabel(value: string): string {
  return DESK_CONTRACT_OPTIONS.find((o) => o.value === value)?.label ?? "—";
}
