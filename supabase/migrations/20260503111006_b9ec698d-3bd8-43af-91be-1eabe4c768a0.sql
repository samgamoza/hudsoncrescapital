
-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.account_type AS ENUM ('cash', 'margin', 'retirement');
CREATE TYPE public.account_status AS ENUM ('pending', 'active', 'restricted', 'closed');
CREATE TYPE public.kyc_doc_type AS ENUM ('passport', 'driver_license', 'national_id', 'utility_bill', 'bank_statement', 'tax_form_w8ben', 'tax_form_w9', 'proof_of_address', 'selfie');
CREATE TYPE public.kyc_status AS ENUM ('pending', 'approved', 'rejected', 'expired');
CREATE TYPE public.kyc_check_type AS ENUM ('identity', 'aml', 'pep', 'sanctions', 'adverse_media', 'accreditation');
CREATE TYPE public.kyc_check_status AS ENUM ('pending', 'passed', 'failed', 'manual_review');
CREATE TYPE public.asset_class AS ENUM ('equity', 'etf', 'crypto', 'fx', 'commodity', 'bond', 'option', 'future');
CREATE TYPE public.ledger_entry_type AS ENUM ('deposit', 'withdrawal', 'trade_buy', 'trade_sell', 'fee', 'commission', 'dividend', 'interest', 'tax', 'transfer_in', 'transfer_out', 'adjustment');
CREATE TYPE public.order_side AS ENUM ('buy', 'sell');
CREATE TYPE public.order_type AS ENUM ('market', 'limit', 'stop', 'stop_limit');
CREATE TYPE public.time_in_force AS ENUM ('day', 'gtc', 'ioc', 'fok');
CREATE TYPE public.order_status AS ENUM ('pending', 'working', 'partially_filled', 'filled', 'cancelled', 'rejected', 'expired');

-- =========================================================
-- TIMESTAMP TRIGGER (reusable)
-- =========================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  legal_first_name TEXT,
  legal_last_name TEXT,
  phone TEXT,
  date_of_birth DATE,
  country_of_residence TEXT,
  nationality TEXT,
  tax_id_last4 TEXT,
  status TEXT NOT NULL DEFAULT 'incomplete',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins update profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- ACCOUNTS
-- =========================================================
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  account_number TEXT NOT NULL UNIQUE,
  account_type public.account_type NOT NULL DEFAULT 'cash',
  base_currency TEXT NOT NULL DEFAULT 'USD',
  status public.account_status NOT NULL DEFAULT 'pending',
  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_accounts_user ON public.accounts(user_id);
CREATE TRIGGER trg_accounts_updated BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: account ownership check (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.owns_account(_user_id UUID, _account_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.accounts WHERE id = _account_id AND user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.account_is_active(_account_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.accounts WHERE id = _account_id AND status = 'active');
$$;

CREATE POLICY "Users view own accounts" ON public.accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all accounts" ON public.accounts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert accounts" ON public.accounts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update accounts" ON public.accounts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- KYC DOCUMENTS
-- =========================================================
CREATE TABLE public.kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type public.kyc_doc_type NOT NULL,
  storage_path TEXT NOT NULL,
  status public.kyc_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  review_notes TEXT,
  expires_at DATE,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_kyc_docs_user ON public.kyc_documents(user_id);
CREATE TRIGGER trg_kyc_docs_updated BEFORE UPDATE ON public.kyc_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Users view own kyc docs" ON public.kyc_documents FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all kyc docs" ON public.kyc_documents FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own kyc docs" ON public.kyc_documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update kyc docs" ON public.kyc_documents FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- KYC CHECKS (provider results: identity, AML, PEP, sanctions)
-- =========================================================
CREATE TABLE public.kyc_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  check_type public.kyc_check_type NOT NULL,
  status public.kyc_check_status NOT NULL DEFAULT 'pending',
  risk_score NUMERIC(5,2),
  raw_payload JSONB,
  decided_by UUID REFERENCES auth.users(id),
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.kyc_checks ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_kyc_checks_user ON public.kyc_checks(user_id);
CREATE TRIGGER trg_kyc_checks_updated BEFORE UPDATE ON public.kyc_checks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Users view own kyc checks" ON public.kyc_checks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage kyc checks select" ON public.kyc_checks FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert kyc checks" ON public.kyc_checks FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update kyc checks" ON public.kyc_checks FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- INSTRUMENTS
-- =========================================================
CREATE TABLE public.instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  asset_class public.asset_class NOT NULL,
  exchange TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  tick_size NUMERIC(20,10) NOT NULL DEFAULT 0.01,
  lot_size NUMERIC(20,10) NOT NULL DEFAULT 1,
  is_tradable BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_instruments_class ON public.instruments(asset_class);
CREATE TRIGGER trg_instruments_updated BEFORE UPDATE ON public.instruments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Anyone authenticated reads instruments" ON public.instruments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert instruments" ON public.instruments FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update instruments" ON public.instruments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete instruments" ON public.instruments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- CASH LEDGER (append-only)
-- =========================================================
CREATE TABLE public.cash_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  currency TEXT NOT NULL,
  entry_type public.ledger_entry_type NOT NULL,
  amount NUMERIC(20,4) NOT NULL,
  balance_after NUMERIC(20,4) NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  description TEXT,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  posted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cash_ledger ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_ledger_account_posted ON public.cash_ledger(account_id, posted_at DESC);
CREATE INDEX idx_ledger_reference ON public.cash_ledger(reference_type, reference_id);

CREATE POLICY "Users view own ledger" ON public.cash_ledger FOR SELECT TO authenticated USING (public.owns_account(auth.uid(), account_id));
CREATE POLICY "Admins view all ledger" ON public.cash_ledger FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins post ledger" ON public.cash_ledger FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- No UPDATE / DELETE policies => append-only

-- =========================================================
-- ORDERS
-- =========================================================
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  instrument_id UUID NOT NULL REFERENCES public.instruments(id) ON DELETE RESTRICT,
  parent_order_id UUID REFERENCES public.orders(id),
  client_order_id TEXT,
  side public.order_side NOT NULL,
  order_type public.order_type NOT NULL,
  time_in_force public.time_in_force NOT NULL DEFAULT 'day',
  quantity NUMERIC(20,8) NOT NULL CHECK (quantity > 0),
  limit_price NUMERIC(20,8),
  stop_price NUMERIC(20,8),
  status public.order_status NOT NULL DEFAULT 'pending',
  filled_quantity NUMERIC(20,8) NOT NULL DEFAULT 0,
  avg_fill_price NUMERIC(20,8),
  rejection_reason TEXT,
  placed_by UUID NOT NULL REFERENCES auth.users(id),
  placed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  filled_at TIMESTAMPTZ,
  broker_order_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_orders_account_status ON public.orders(account_id, status);
CREATE INDEX idx_orders_instrument ON public.orders(instrument_id);
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Users view own orders" ON public.orders FOR SELECT TO authenticated USING (public.owns_account(auth.uid(), account_id));
CREATE POLICY "Admins view all orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users place orders on active accounts" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (public.owns_account(auth.uid(), account_id) AND public.account_is_active(account_id) AND placed_by = auth.uid());
CREATE POLICY "Admins place orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users cancel own working orders" ON public.orders FOR UPDATE TO authenticated
  USING (public.owns_account(auth.uid(), account_id) AND status IN ('pending', 'working', 'partially_filled'));
CREATE POLICY "Admins update orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- TRADES (executions, append-only)
-- =========================================================
CREATE TABLE public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  instrument_id UUID NOT NULL REFERENCES public.instruments(id) ON DELETE RESTRICT,
  side public.order_side NOT NULL,
  quantity NUMERIC(20,8) NOT NULL CHECK (quantity > 0),
  price NUMERIC(20,8) NOT NULL CHECK (price >= 0),
  gross_amount NUMERIC(20,4) NOT NULL,
  fees NUMERIC(20,4) NOT NULL DEFAULT 0,
  commission NUMERIC(20,4) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  broker_execution_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_trades_account_time ON public.trades(account_id, executed_at DESC);
CREATE INDEX idx_trades_order ON public.trades(order_id);

CREATE POLICY "Users view own trades" ON public.trades FOR SELECT TO authenticated USING (public.owns_account(auth.uid(), account_id));
CREATE POLICY "Admins view all trades" ON public.trades FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins record trades" ON public.trades FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- No UPDATE / DELETE => append-only

-- =========================================================
-- POSITIONS (current holdings, one row per account+instrument)
-- =========================================================
CREATE TABLE public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  instrument_id UUID NOT NULL REFERENCES public.instruments(id) ON DELETE RESTRICT,
  quantity NUMERIC(20,8) NOT NULL DEFAULT 0,
  avg_cost NUMERIC(20,8) NOT NULL DEFAULT 0,
  realized_pnl NUMERIC(20,4) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  opened_at TIMESTAMPTZ,
  last_trade_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, instrument_id)
);
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_positions_account ON public.positions(account_id);
CREATE TRIGGER trg_positions_updated BEFORE UPDATE ON public.positions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Users view own positions" ON public.positions FOR SELECT TO authenticated USING (public.owns_account(auth.uid(), account_id));
CREATE POLICY "Admins view all positions" ON public.positions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert positions" ON public.positions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update positions" ON public.positions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete positions" ON public.positions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- MARGIN SNAPSHOTS (audit trail of buying power / margin state)
-- =========================================================
CREATE TABLE public.margin_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  equity NUMERIC(20,4) NOT NULL,
  cash_balance NUMERIC(20,4) NOT NULL,
  buying_power NUMERIC(20,4) NOT NULL,
  margin_used NUMERIC(20,4) NOT NULL DEFAULT 0,
  maintenance_margin NUMERIC(20,4) NOT NULL DEFAULT 0,
  excess_liquidity NUMERIC(20,4) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.margin_snapshots ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_margin_account_time ON public.margin_snapshots(account_id, snapshot_at DESC);

CREATE POLICY "Users view own margin" ON public.margin_snapshots FOR SELECT TO authenticated USING (public.owns_account(auth.uid(), account_id));
CREATE POLICY "Admins view all margin" ON public.margin_snapshots FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins write margin" ON public.margin_snapshots FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
