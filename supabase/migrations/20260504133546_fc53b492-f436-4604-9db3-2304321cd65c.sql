-- Asset class enum (Essentials 4)
DO $$ BEGIN
  CREATE TYPE public.asset_class_kind AS ENUM ('equities', 'crypto', 'commodities', 'managed_strategy');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.sub_portfolio_status AS ENUM ('active', 'paused', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Sub-portfolios (named sleeves under an account)
CREATE TABLE IF NOT EXISTS public.sub_portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  asset_class public.asset_class_kind NOT NULL,
  base_currency text NOT NULL DEFAULT 'USD',
  target_allocation_pct numeric(6,3) DEFAULT 0,
  risk_band text,
  status public.sub_portfolio_status NOT NULL DEFAULT 'active',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sub_portfolios_account ON public.sub_portfolios(account_id);
CREATE INDEX IF NOT EXISTS idx_sub_portfolios_user ON public.sub_portfolios(user_id);

ALTER TABLE public.sub_portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sub-portfolios"
  ON public.sub_portfolios FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all sub-portfolios"
  ON public.sub_portfolios FOR SELECT
  TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert sub-portfolios"
  ON public.sub_portfolios FOR INSERT
  TO authenticated
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update sub-portfolios"
  ON public.sub_portfolios FOR UPDATE
  TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete sub-portfolios"
  ON public.sub_portfolios FOR DELETE
  TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_sub_portfolios_updated
  BEFORE UPDATE ON public.sub_portfolios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Holdings (per-asset-class flexible)
CREATE TABLE IF NOT EXISTS public.sub_portfolio_holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_portfolio_id uuid NOT NULL REFERENCES public.sub_portfolios(id) ON DELETE CASCADE,
  account_id uuid NOT NULL,
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  display_name text,
  quantity numeric(28,8) NOT NULL DEFAULT 0,
  avg_cost numeric(28,8) NOT NULL DEFAULT 0,
  mark_price numeric(28,8),
  unit_label text DEFAULT 'shares',
  currency text NOT NULL DEFAULT 'USD',
  details jsonb DEFAULT '{}'::jsonb,
  opened_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_holdings_sub ON public.sub_portfolio_holdings(sub_portfolio_id);
CREATE INDEX IF NOT EXISTS idx_holdings_user ON public.sub_portfolio_holdings(user_id);

ALTER TABLE public.sub_portfolio_holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own holdings"
  ON public.sub_portfolio_holdings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all holdings"
  ON public.sub_portfolio_holdings FOR SELECT
  TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert holdings"
  ON public.sub_portfolio_holdings FOR INSERT
  TO authenticated
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update holdings"
  ON public.sub_portfolio_holdings FOR UPDATE
  TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete holdings"
  ON public.sub_portfolio_holdings FOR DELETE
  TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_holdings_updated
  BEFORE UPDATE ON public.sub_portfolio_holdings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();