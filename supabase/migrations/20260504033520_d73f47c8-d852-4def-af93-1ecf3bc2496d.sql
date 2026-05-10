CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA app_private TO authenticated;

CREATE OR REPLACE FUNCTION app_private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    WHEN auth.uid() <> _user_id THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
    )
  END
$$;

REVOKE ALL ON FUNCTION app_private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO authenticated;

DROP POLICY IF EXISTS "Admins insert accounts" ON public.accounts;
CREATE POLICY "Admins insert accounts" ON public.accounts FOR INSERT TO authenticated WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admins update accounts" ON public.accounts;
CREATE POLICY "Admins update accounts" ON public.accounts FOR UPDATE TO authenticated USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admins view all accounts" ON public.accounts;
CREATE POLICY "Admins view all accounts" ON public.accounts FOR SELECT TO authenticated USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins post ledger" ON public.cash_ledger;
CREATE POLICY "Admins post ledger" ON public.cash_ledger FOR INSERT TO authenticated WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admins view all ledger" ON public.cash_ledger;
CREATE POLICY "Admins view all ledger" ON public.cash_ledger FOR SELECT TO authenticated USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins insert client notes" ON public.client_notes;
CREATE POLICY "Admins insert client notes" ON public.client_notes FOR INSERT TO authenticated WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role) AND author_id = auth.uid());
DROP POLICY IF EXISTS "Admins read client notes" ON public.client_notes;
CREATE POLICY "Admins read client notes" ON public.client_notes FOR SELECT TO authenticated USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins delete instruments" ON public.instruments;
CREATE POLICY "Admins delete instruments" ON public.instruments FOR DELETE TO authenticated USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admins insert instruments" ON public.instruments;
CREATE POLICY "Admins insert instruments" ON public.instruments FOR INSERT TO authenticated WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admins update instruments" ON public.instruments;
CREATE POLICY "Admins update instruments" ON public.instruments FOR UPDATE TO authenticated USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins insert kyc checks" ON public.kyc_checks;
CREATE POLICY "Admins insert kyc checks" ON public.kyc_checks FOR INSERT TO authenticated WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admins manage kyc checks select" ON public.kyc_checks;
CREATE POLICY "Admins manage kyc checks select" ON public.kyc_checks FOR SELECT TO authenticated USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admins update kyc checks" ON public.kyc_checks;
CREATE POLICY "Admins update kyc checks" ON public.kyc_checks FOR UPDATE TO authenticated USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins update kyc docs" ON public.kyc_documents;
CREATE POLICY "Admins update kyc docs" ON public.kyc_documents FOR UPDATE TO authenticated USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admins view all kyc docs" ON public.kyc_documents;
CREATE POLICY "Admins view all kyc docs" ON public.kyc_documents FOR SELECT TO authenticated USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins view all margin" ON public.margin_snapshots;
CREATE POLICY "Admins view all margin" ON public.margin_snapshots FOR SELECT TO authenticated USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admins write margin" ON public.margin_snapshots;
CREATE POLICY "Admins write margin" ON public.margin_snapshots FOR INSERT TO authenticated WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins place orders" ON public.orders;
CREATE POLICY "Admins place orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admins update orders" ON public.orders;
CREATE POLICY "Admins update orders" ON public.orders FOR UPDATE TO authenticated USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admins view all orders" ON public.orders;
CREATE POLICY "Admins view all orders" ON public.orders FOR SELECT TO authenticated USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins delete positions" ON public.positions;
CREATE POLICY "Admins delete positions" ON public.positions FOR DELETE TO authenticated USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admins insert positions" ON public.positions;
CREATE POLICY "Admins insert positions" ON public.positions FOR INSERT TO authenticated WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admins update positions" ON public.positions;
CREATE POLICY "Admins update positions" ON public.positions FOR UPDATE TO authenticated USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admins view all positions" ON public.positions;
CREATE POLICY "Admins view all positions" ON public.positions FOR SELECT TO authenticated USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins update profiles" ON public.profiles;
CREATE POLICY "Admins update profiles" ON public.profiles FOR UPDATE TO authenticated USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT TO authenticated USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins record trades" ON public.trades;
CREATE POLICY "Admins record trades" ON public.trades FOR INSERT TO authenticated WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admins view all trades" ON public.trades;
CREATE POLICY "Admins view all trades" ON public.trades FOR SELECT TO authenticated USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;