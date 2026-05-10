
REVOKE EXECUTE ON FUNCTION public.owns_account(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.account_is_active(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_account(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.account_is_active(UUID) TO authenticated;
