import type { AssetListing } from "@/lib/asset-listings.types";
import { displayNameOfAsset, displaySymbolOfAsset } from "@/lib/asset-listings.types";

export type InsightPack = {
  title: string;
  intro: string;
  bullets: string[];
};

function genericBullets(theme: string): string[] {
  return [
    `Liquidity and volatility around “${theme}” can shift quickly as positioning and macro data surprise markets.`,
    `Use multiple sources — prices, filings, and news — before sizing risk; past themes are not a guide to future returns.`,
    `ETFs and majors often move first; juniors and suppliers can lag or overshoot when sentiment turns.`,
    `Central-bank and rates expectations remain a key swing factor for cross‑asset flows tied to this theme.`,
    `Execution, spreads, and venue rules still apply: this view is for discovery, not a trade recommendation.`,
  ];
}

/** Template “insights” for Discover — not a live LLM; copy is factual and theme-tuned. */
export function buildInsightPack(raw: string): InsightPack | null {
  const idea = raw.trim();
  if (idea.length < 2) return null;
  const t = idea.toLowerCase();

  if (/\bgold\b|bullion|mining|precious/.test(t)) {
    return {
      title: "Gold's safe-haven glow",
      intro: `You are exploring ${idea} as a theme. Below we summarise common drivers investors watch — majors, refiners, jewellery/industrial demand, and listed vehicles (including ETFs) that often sit in the same narrative.`,
      bullets: [
        "Real yields and USD strength historically matter for bullion: when financing conditions ease, non-yielding assets can draw incremental flows.",
        "Official-sector buying and reserve diversification headlines have repeatedly featured in recent gold narratives.",
        "Miners can offer operating leverage to spot moves but carry idiosyncratic risks (cost curves, jurisdictions, hedging).",
        "ETFs and royalty/streaming names can express the theme with different risk profiles than single-mine producers.",
        "Geopolitical stress episodes often increase short-term safe-haven demand; mean reversion can be sharp when fear fades.",
      ],
    };
  }

  if (/\boil\b|crude|energy|wti|brent/.test(t)) {
    return {
      title: "Energy balances & policy",
      intro: `For ${idea}, markets typically weigh inventories, OPEC+ guidance, refining margins, and recession odds — plus currency moves in which oil is quoted.`,
      bullets: [
        "Inventory surprises vs expectations often dominate short-term crude reactions.",
        "Refining and product cracks can diverge from flat price when demand mix shifts.",
        "Producers, services, and integrated majors sit at different points on the cost and margin curve.",
        "Macro growth indicators and freight/logistics data feed into the demand side of the story.",
        "Policy responses (SPR releases, sanctions) can dominate fundamentals for stretches of time.",
      ],
    };
  }

  if (/\bai\b|semiconductor|chip|nvidia|robot/.test(t)) {
    return {
      title: "AI infrastructure & adoption",
      intro: `${idea} ties to capex cycles, hyperscaler demand, power and cooling constraints, and the regulatory tone around automation and data.`,
      bullets: [
        "Hardware spend can be lumpy; backlog commentary often moves the group ahead of reported revenue.",
        "Memory pricing and foundry utilisation are traditional cyclical tells within semis.",
        "Software adoption curves and enterprise budgets influence the downstream revenue mix.",
        "Competition and export controls can reshape supply chains faster than spot prices imply.",
        "Valuation dispersion within the theme is usually wide — differentiation matters.",
      ],
    };
  }

  return {
    title: `Themes around “${idea}”`,
    intro: `We are surfacing listings and headlines that match ${idea}. Treat this as a starting point for research — not advice, forecasts, or a suitability assessment.`,
    bullets: genericBullets(idea),
  };
}

export function buildListingReason(listing: AssetListing, idea: string): string {
  const i = idea.trim().toLowerCase();
  const hay =
    `${displayNameOfAsset(listing)} ${displaySymbolOfAsset(listing)} ${listing.category ?? ""} ${listing.asset_type} ${listing.asset_class}`.toLowerCase();
  const hit = i.split(/\s+/).some((w) => w.length > 2 && hay.includes(w));
  if (listing.asset_class === "commodities") {
    return hit
      ? `Listed exposure tied to your “${idea.trim()}” search within commodities.`
      : "Commodity-linked listing that may sit adjacent to your theme (verify underlying).";
  }
  if (listing.asset_class === "etfs") {
    return hit
      ? `ETF / basket exposure that textually aligns with “${idea.trim()}”.`
      : "ETF structure — check factsheet for actual holdings vs your theme.";
  }
  if (listing.asset_class === "shares") {
    return hit
      ? `Equity match for “${idea.trim()}” via name, symbol, or category metadata.`
      : "Equity in results set — review fundamentals and liquidity before trading.";
  }
  if (listing.asset_class === "cryptocurrency") {
    return "Digital asset listing — volatility and custody rules differ from equities.";
  }
  if (listing.asset_class === "fx") {
    return "FX pair — drivers are macro and rate differentials rather than single-stock fundamentals.";
  }
  return `${listing.asset_type || "Instrument"} — verify fit with your “${idea.trim()}” thesis.`;
}
