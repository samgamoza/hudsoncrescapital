CREATE OR REPLACE FUNCTION public.ensure_user_portal_role()
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_role public.app_role;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT role INTO resolved_role
  FROM public.user_roles
  WHERE user_id = auth.uid()
  ORDER BY CASE WHEN role = 'admin' THEN 0 ELSE 1 END
  LIMIT 1;

  IF resolved_role IS NOT NULL THEN
    RETURN resolved_role;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'investor')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN 'investor'::public.app_role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_user_portal_role() TO authenticated;