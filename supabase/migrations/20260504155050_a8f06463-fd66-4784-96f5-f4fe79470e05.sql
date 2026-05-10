ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

-- SECURITY DEFINER: allow anonymous login form to resolve username -> email.
-- Returns NULL if not found. Does not leak any other profile data.
CREATE OR REPLACE FUNCTION public.email_for_username(_username text)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.email
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE lower(p.username) = lower(_username)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.email_for_username(text) TO anon, authenticated;
