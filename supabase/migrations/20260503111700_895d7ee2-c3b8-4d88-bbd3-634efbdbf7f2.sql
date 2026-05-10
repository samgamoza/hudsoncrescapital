CREATE OR REPLACE FUNCTION public.owns_account(_user_id uuid, _account_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.accounts WHERE id = _account_id AND user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.account_is_active(_account_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.accounts WHERE id = _account_id AND status = 'active');
$$;