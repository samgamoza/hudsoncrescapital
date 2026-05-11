-- Catalog of tradable/reference instruments for the trade workspace (IG-style metadata).
-- Runs before 20260506163000_update_asset_listings_commodities_ig.sql, which assumes this table exists.

CREATE TABLE IF NOT EXISTS public.asset_listings (
  id BIGSERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  display_symbol TEXT,
  company_name TEXT NOT NULL,
  security_name TEXT,
  instrument_name TEXT,
  asset_class TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT '',
  exchange_code TEXT,
  exchange_name TEXT,
  market_category_code TEXT,
  market_category_name TEXT,
  is_etf BOOLEAN DEFAULT false,
  is_test_issue BOOLEAN DEFAULT false,
  financial_status_code TEXT,
  round_lot_size NUMERIC(20, 8),
  cqs_symbol TEXT,
  nasdaq_symbol TEXT,
  slug TEXT,
  source TEXT,
  source_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  base_asset TEXT,
  quote_asset TEXT,
  category TEXT,
  sub_category TEXT,
  contract_unit TEXT,
  pricing_unit TEXT,
  settlement_type TEXT,
  underlying_symbol TEXT,
  option_style TEXT,
  option_type TEXT,
  expiration_rule TEXT,
  rate_tenor TEXT,
  country_code TEXT,
  currency_code TEXT,
  issuer TEXT,
  CONSTRAINT asset_listings_symbol_key UNIQUE (symbol)
);

CREATE INDEX IF NOT EXISTS idx_asset_listings_active_class ON public.asset_listings (is_active, asset_class);
CREATE INDEX IF NOT EXISTS idx_asset_listings_exchange ON public.asset_listings (exchange_name) WHERE exchange_name IS NOT NULL;

ALTER TABLE public.asset_listings ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_asset_listings_updated ON public.asset_listings;
CREATE TRIGGER trg_asset_listings_updated
BEFORE UPDATE ON public.asset_listings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.asset_listings IS 'Reference catalog for portal asset picker; server routes use service role.';
