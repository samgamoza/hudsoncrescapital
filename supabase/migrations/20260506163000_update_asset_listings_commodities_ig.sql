-- Refresh commodity catalog to align with IG-style workspace list.
-- Safe to rerun: updates existing rows by symbol, inserts missing rows.

WITH src AS (
  SELECT *
  FROM (
    VALUES
      -- Metals / industrial
      ('CMDTY_COPPER', 'Copper', 'Copper', 'commodities', 'spot', 'Metals', 'Industrial Metals', 'USD per tonne', 'spot'),
      ('CMDTY_ALUMINIUM', 'Aluminium', 'Aluminium', 'commodities', 'spot', 'Metals', 'Industrial Metals', 'USD per tonne', 'spot'),
      ('CMDTY_IRON_ORE', 'Iron Ore', 'Iron Ore', 'commodities', 'spot', 'Metals', 'Industrial Metals', 'USD per tonne', 'spot'),
      ('CMDTY_LEAD', 'Lead', 'Lead', 'commodities', 'spot', 'Metals', 'Industrial Metals', 'USD per tonne', 'spot'),
      ('CMDTY_ZINC', 'Zinc', 'Zinc', 'commodities', 'spot', 'Metals', 'Industrial Metals', 'USD per tonne', 'spot'),

      -- Soft commodities / agri
      ('CMDTY_SOYBEANS', 'Soybeans', 'Soybeans', 'commodities', 'futures', 'Soft Commodities', 'Grains', 'US cents per bushel', 'cash'),
      ('CMDTY_WHEAT_CHICAGO', 'Wheat - Chicago', 'Wheat - Chicago', 'commodities', 'futures', 'Soft Commodities', 'Grains', 'US cents per bushel', 'cash'),
      ('CMDTY_COFFEE_NY_ARABICA', 'Coffee - New York (Arabica)', 'Coffee - New York (Arabica)', 'commodities', 'futures', 'Soft Commodities', 'Coffee', 'US cents per pound', 'cash'),
      ('CMDTY_COCOA_NEW_YORK', 'Cocoa - New York', 'Cocoa - New York', 'commodities', 'futures', 'Soft Commodities', 'Cocoa', 'USD per tonne', 'cash'),
      ('CMDTY_COTTON', 'Cotton', 'Cotton', 'commodities', 'futures', 'Soft Commodities', 'Fibers', 'US cents per pound', 'cash'),
      ('CMDTY_COCOA_LONDON', 'Cocoa - London', 'Cocoa - London', 'commodities', 'futures', 'Soft Commodities', 'Cocoa', 'GBP per tonne', 'cash'),
      ('CMDTY_CORN', 'Corn', 'Corn', 'commodities', 'futures', 'Soft Commodities', 'Grains', 'US cents per bushel', 'cash'),
      ('CMDTY_COFFEE_LONDON_ROBUSTA', 'Coffee - London (Robusta)', 'Coffee - London (Robusta)', 'commodities', 'futures', 'Soft Commodities', 'Coffee', 'USD per tonne', 'cash'),
      ('CMDTY_SUGAR_NY_11', 'Sugar - New York No. 11', 'Sugar - New York No. 11', 'commodities', 'futures', 'Soft Commodities', 'Sugar', 'US cents per pound', 'cash'),
      ('CMDTY_SOYBEAN_OIL', 'Soybean Oil', 'Soybean Oil', 'commodities', 'futures', 'Soft Commodities', 'Oilseeds', 'US cents per pound', 'cash'),
      ('CMDTY_ORANGE_JUICE', 'Orange Juice', 'Orange Juice', 'commodities', 'futures', 'Soft Commodities', 'Citrus', 'US cents per pound', 'cash'),
      ('CMDTY_LIVE_CATTLE', 'Live Cattle', 'Live Cattle', 'commodities', 'futures', 'Soft Commodities', 'Livestock', 'US cents per pound', 'cash'),
      ('CMDTY_LEAN_HOGS', 'Lean Hogs', 'Lean Hogs', 'commodities', 'futures', 'Soft Commodities', 'Livestock', 'US cents per pound', 'cash'),
      ('CMDTY_SUGAR_LONDON_5', 'Sugar - London No. 5', 'Sugar - London No. 5', 'commodities', 'futures', 'Soft Commodities', 'Sugar', 'USD per tonne', 'cash'),
      ('CMDTY_LUMBER', 'Lumber', 'Lumber', 'commodities', 'futures', 'Soft Commodities', 'Forestry', 'USD per 1,000 board feet', 'cash'),
      ('CMDTY_OATS', 'Oats', 'Oats', 'commodities', 'futures', 'Soft Commodities', 'Grains', 'US cents per bushel', 'cash'),
      ('CMDTY_ROUGH_RICE', 'Rough Rice', 'Rough Rice', 'commodities', 'futures', 'Soft Commodities', 'Grains', 'USD per hundredweight', 'cash'),
      ('CMDTY_SOYBEAN_MEAL', 'Soybean Meal', 'Soybean Meal', 'commodities', 'futures', 'Soft Commodities', 'Oilseeds', 'USD per short ton', 'cash'),
      ('CMDTY_WHEAT_LONDON', 'Wheat - London', 'Wheat - London', 'commodities', 'futures', 'Soft Commodities', 'Grains', 'GBP per tonne', 'cash')
  ) AS t(
    symbol,
    display_symbol,
    instrument_name,
    asset_class,
    asset_type,
    category,
    sub_category,
    pricing_unit,
    settlement_type
  )
),
upd AS (
  UPDATE public.asset_listings a
  SET
    display_symbol = s.display_symbol,
    company_name = COALESCE(a.company_name, s.instrument_name),
    instrument_name = s.instrument_name,
    asset_class = s.asset_class,
    asset_type = s.asset_type,
    category = s.category,
    sub_category = s.sub_category,
    pricing_unit = s.pricing_unit,
    settlement_type = s.settlement_type,
    source = 'manual_ig_reference',
    source_url = 'https://www.ig.com/',
    is_active = true,
    updated_at = now()
  FROM src s
  WHERE a.symbol = s.symbol
  RETURNING a.symbol
)
INSERT INTO public.asset_listings (
  symbol,
  display_symbol,
  company_name,
  instrument_name,
  asset_class,
  asset_type,
  category,
  sub_category,
  pricing_unit,
  settlement_type,
  source,
  source_url,
  is_active,
  created_at,
  updated_at
)
SELECT
  s.symbol,
  s.display_symbol,
  s.instrument_name, -- company_name fallback remains NOT NULL
  s.instrument_name,
  s.asset_class,
  s.asset_type,
  s.category,
  s.sub_category,
  s.pricing_unit,
  s.settlement_type,
  'manual_ig_reference',
  'https://www.ig.com/',
  true,
  now(),
  now()
FROM src s
WHERE NOT EXISTS (
  SELECT 1 FROM public.asset_listings a WHERE a.symbol = s.symbol
);
