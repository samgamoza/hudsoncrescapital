
-- ============================================================
-- 1. Helper functions in app_private (security definer)
-- ============================================================

CREATE OR REPLACE FUNCTION app_private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    WHEN auth.uid() <> _user_id THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
        AND (
          role = _role
          OR (_role = 'admin'::public.app_role AND role = 'super_admin'::public.app_role)
        )
    )
  END
$$;
REVOKE ALL ON FUNCTION app_private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO authenticated;

CREATE OR REPLACE FUNCTION app_private.has_any_role(_user_id uuid, _roles public.app_role[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    WHEN auth.uid() <> _user_id THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = ANY(_roles)
    )
  END
$$;
REVOKE ALL ON FUNCTION app_private.has_any_role(uuid, public.app_role[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.has_any_role(uuid, public.app_role[]) TO authenticated;

CREATE OR REPLACE FUNCTION app_private.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT app_private.has_any_role(_user_id, ARRAY['super_admin','admin','support']::public.app_role[]) $$;
GRANT EXECUTE ON FUNCTION app_private.is_staff(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION app_private.is_admin_or_higher(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT app_private.has_any_role(_user_id, ARRAY['super_admin','admin']::public.app_role[]) $$;
GRANT EXECUTE ON FUNCTION app_private.is_admin_or_higher(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION app_private.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT app_private.has_role(_user_id, 'super_admin'::public.app_role) $$;
GRANT EXECUTE ON FUNCTION app_private.is_super_admin(uuid) TO authenticated;

-- ============================================================
-- 2. Wallets
-- ============================================================
CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  available_balance numeric NOT NULL DEFAULT 0,
  on_hold numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own wallet" ON public.wallets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff view all wallets" ON public.wallets
  FOR SELECT TO authenticated USING (app_private.is_staff(auth.uid()));
CREATE POLICY "Admins update wallets" ON public.wallets
  FOR UPDATE TO authenticated USING (app_private.is_admin_or_higher(auth.uid()));
CREATE POLICY "Admins insert wallets" ON public.wallets
  FOR INSERT TO authenticated WITH CHECK (app_private.is_admin_or_higher(auth.uid()));

CREATE TRIGGER trg_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_account_wallet()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.wallets (account_id, user_id, currency)
  VALUES (NEW.id, NEW.user_id, NEW.base_currency)
  ON CONFLICT (account_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_account_wallet
  AFTER INSERT ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_account_wallet();

INSERT INTO public.wallets (account_id, user_id, currency)
SELECT a.id, a.user_id, a.base_currency
FROM public.accounts a
LEFT JOIN public.wallets w ON w.account_id = a.id
WHERE w.id IS NULL;

-- ============================================================
-- 3. Wallet transactions (ledger)
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.wallet_txn_type AS ENUM ('deposit','withdrawal','adjustment','fee','transfer_in','transfer_out');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  txn_type public.wallet_txn_type NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL,
  balance_after numeric NOT NULL,
  description text,
  reference_id uuid,
  reference_type text,
  posted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wallet_txn_wallet ON public.wallet_transactions(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_txn_user ON public.wallet_transactions(user_id, created_at DESC);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own wallet txns" ON public.wallet_transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff view all wallet txns" ON public.wallet_transactions
  FOR SELECT TO authenticated USING (app_private.is_staff(auth.uid()));
CREATE POLICY "Admins post wallet txns" ON public.wallet_transactions
  FOR INSERT TO authenticated WITH CHECK (app_private.is_admin_or_higher(auth.uid()));

-- ============================================================
-- 4. Deposit & Withdrawal requests
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM ('bank_transfer','stripe','paypal','crypto','wire','other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.request_status AS ENUM ('pending','approved','rejected','cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.deposit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'USD',
  method public.payment_method NOT NULL,
  reference text,
  notes text,
  status public.request_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own deposit reqs" ON public.deposit_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff view all deposit reqs" ON public.deposit_requests
  FOR SELECT TO authenticated USING (app_private.is_staff(auth.uid()));
CREATE POLICY "Users create own deposit reqs" ON public.deposit_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND owns_account(auth.uid(), account_id) AND account_is_active(account_id));
CREATE POLICY "Users cancel own pending deposit" ON public.deposit_requests
  FOR UPDATE TO authenticated USING (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Admins update deposit reqs" ON public.deposit_requests
  FOR UPDATE TO authenticated USING (app_private.is_admin_or_higher(auth.uid()));

CREATE TRIGGER trg_deposit_req_updated_at
  BEFORE UPDATE ON public.deposit_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'USD',
  method public.payment_method NOT NULL,
  destination text NOT NULL,
  notes text,
  status public.request_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own withdrawal reqs" ON public.withdrawal_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff view all withdrawal reqs" ON public.withdrawal_requests
  FOR SELECT TO authenticated USING (app_private.is_staff(auth.uid()));
CREATE POLICY "Users create own withdrawal reqs" ON public.withdrawal_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND owns_account(auth.uid(), account_id) AND account_is_active(account_id));
CREATE POLICY "Users cancel own pending withdrawal" ON public.withdrawal_requests
  FOR UPDATE TO authenticated USING (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Admins update withdrawal reqs" ON public.withdrawal_requests
  FOR UPDATE TO authenticated USING (app_private.is_admin_or_higher(auth.uid()));

CREATE TRIGGER trg_withdrawal_req_updated_at
  BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 5. Audit log
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_role text,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  target_user_id uuid,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.audit_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_target_user ON public.audit_logs(target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.audit_logs(action, created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view audit logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (app_private.is_staff(auth.uid()));
CREATE POLICY "Users view own audit entries" ON public.audit_logs
  FOR SELECT TO authenticated USING (auth.uid() = target_user_id OR auth.uid() = actor_id);
CREATE POLICY "Staff insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (app_private.is_staff(auth.uid()) AND actor_id = auth.uid());

-- ============================================================
-- 6. MFA
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_mfa (
  user_id uuid PRIMARY KEY,
  secret text,
  enabled boolean NOT NULL DEFAULT false,
  recovery_codes text[],
  enrolled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_mfa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own MFA" ON public.user_mfa
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own MFA" ON public.user_mfa
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own MFA" ON public.user_mfa
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own MFA" ON public.user_mfa
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff view MFA status" ON public.user_mfa
  FOR SELECT TO authenticated USING (app_private.is_staff(auth.uid()));

CREATE TRIGGER trg_user_mfa_updated_at
  BEFORE UPDATE ON public.user_mfa
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 7. Tighten user_roles policies for new hierarchy
-- ============================================================
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Super admins manage roles insert" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (app_private.is_super_admin(auth.uid()));
CREATE POLICY "Super admins manage roles delete" ON public.user_roles
  FOR DELETE TO authenticated
  USING (app_private.is_super_admin(auth.uid()));
