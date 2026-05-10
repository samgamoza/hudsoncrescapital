REVOKE EXECUTE ON FUNCTION public.owns_account(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.account_is_active(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_account(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.account_is_active(uuid) TO authenticated;