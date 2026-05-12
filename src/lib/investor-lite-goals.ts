export const INVESTOR_GOAL_OPTIONS = [
  { id: "growth" as const, label: "Growth" },
  { id: "income" as const, label: "Income" },
  { id: "capital_preservation" as const, label: "Capital preservation" },
  { id: "speculation" as const, label: "Speculation" },
  { id: "hedging" as const, label: "Hedging" },
  { id: "diversification" as const, label: "Diversification" },
];

/** Checkbox options for “Investor background” (replaces free-text). */
export const INVESTOR_BACKGROUND_OPTIONS = [
  { id: "finance_professional", label: "Finance or investment professional" },
  { id: "business_owner", label: "Business owner or entrepreneur" },
  { id: "retiree", label: "Retired, investing personal assets" },
  { id: "student_early_career", label: "Student or early career" },
  { id: "hnwi", label: "High-net-worth individual" },
  { id: "family_office", label: "Family office or multi-generational wealth" },
  { id: "new_to_investing", label: "Relatively new to investing (under 3 years)" },
  { id: "institutional_experience", label: "Prior institutional or endowment experience" },
] as const;

/** Checkbox options for “Investment goals” narrative (distinct from Goal focus). */
export const INVESTMENT_OUTCOME_OPTIONS = [
  { id: "long_term_growth", label: "Long-term capital growth" },
  { id: "income_generation", label: "Income generation from investments" },
  { id: "diversify_portfolio", label: "Broaden portfolio diversification" },
  { id: "inflation_hedge", label: "Inflation or currency hedge" },
  { id: "legacy_education", label: "Legacy, education, or estate planning" },
  { id: "shorter_horizon", label: "Shorter-term objectives (roughly 1–3 years)" },
  { id: "esg_alignment", label: "Align with ESG or values-based investing" },
  { id: "capital_preservation_priority", label: "Capital preservation as a priority" },
] as const;

type IdLabel = { id: string; label: string };

/** Persist as human-readable list for admin / API (semicolon-separated labels). */
export function serializeInvestorLiteSelections(ids: string[], options: readonly IdLabel[]): string {
  const labels = ids
    .map((id) => options.find((o) => o.id === id)?.label)
    .filter((x): x is string => Boolean(x));
  return labels.join("; ");
}

/** Restore checkbox state from stored submission or legacy text. */
export function hydrateInvestorLiteSelections(
  stored: string | null | undefined,
  options: readonly IdLabel[],
): string[] {
  const raw = (stored ?? "").trim();
  if (!raw) return [];
  const byId = new Map(options.map((o) => [o.id, o.id] as const));
  const byLabel = new Map(options.map((o) => [o.label.trim().toLowerCase(), o.id] as const));
  const parts = raw.split(/[;•]\s*/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  for (const part of parts) {
    if (byId.has(part)) out.push(part);
    else {
      const id = byLabel.get(part.toLowerCase());
      if (id) out.push(id);
    }
  }
  return [...new Set(out)];
}
