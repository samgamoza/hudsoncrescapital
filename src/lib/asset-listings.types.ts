export type AssetClass =
  | "shares"
  | "commodities"
  | "fx"
  | "cryptocurrency"
  | "indices"
  | "etfs"
  | "bonds_rates"
  | "options";

export interface AssetListing {
  id: number;
  asset_class: string;
  asset_type: string;
  symbol: string;
  display_symbol?: string | null;
  company_name: string;
  security_name?: string | null;
  instrument_name?: string | null;
  exchange_code?: string | null;
  exchange_name?: string | null;
  market_category_code?: string | null;
  market_category_name?: string | null;
  is_etf?: boolean | null;
  is_test_issue?: boolean | null;
  financial_status_code?: string | null;
  round_lot_size?: number | null;
  cqs_symbol?: string | null;
  nasdaq_symbol?: string | null;
  slug?: string | null;
  source?: string | null;
  source_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  base_asset?: string | null;
  quote_asset?: string | null;
  category?: string | null;
  sub_category?: string | null;
  contract_unit?: string | null;
  pricing_unit?: string | null;
  settlement_type?: string | null;
  underlying_symbol?: string | null;
  option_style?: string | null;
  option_type?: string | null;
  expiration_rule?: string | null;
  rate_tenor?: string | null;
  country_code?: string | null;
  currency_code?: string | null;
  issuer?: string | null;
}

export type AssetListingsResponse = {
  rows: AssetListing[];
  total: number;
};

export const ASSET_CLASS_TABS: { key: "all" | AssetClass; label: string }[] = [
  { key: "all", label: "All" },
  { key: "shares", label: "Stocks" },
  { key: "etfs", label: "ETFs" },
  { key: "fx", label: "FX" },
  { key: "cryptocurrency", label: "Crypto" },
  { key: "commodities", label: "Commodities" },
  { key: "indices", label: "Indices" },
  { key: "bonds_rates", label: "Bonds & Rates" },
  { key: "options", label: "Options" },
];

export function displayNameOfAsset(asset: AssetListing): string {
  return (
    asset.instrument_name ||
    asset.security_name ||
    asset.company_name ||
    asset.symbol
  );
}

export function displaySymbolOfAsset(asset: AssetListing): string {
  return asset.display_symbol || asset.symbol;
}

export function isDirectlyTradableAsset(asset: AssetListing): boolean {
  return (
    ["shares", "etfs", "fx", "cryptocurrency"].includes(asset.asset_class) ||
    asset.asset_class === "commodities"
  );
}

export function isReferenceOnlyAsset(asset: AssetListing): boolean {
  return ["indices", "bonds_rates"].includes(asset.asset_class);
}

export function isOptionsChainAsset(asset: AssetListing): boolean {
  return asset.asset_class === "options";
}
