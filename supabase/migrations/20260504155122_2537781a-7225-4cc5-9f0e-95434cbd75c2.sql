REVOKE EXECUTE ON FUNCTION public.email_for_username(text) FROM anon, authenticated, public;
DROP FUNCTION IF EXISTS public.email_for_username(text);
