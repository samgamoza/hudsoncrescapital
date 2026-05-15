-- KYC file uploads hit storage.objects RLS. Admin policies on `kyc-documents` still referenced
-- `public.has_role`, but EXECUTE on that function was revoked from `authenticated` in
-- 20260504033520 — evaluating those policies could fail or deny inserts for all users.
-- Recreate policies using `app_private.has_role` (granted to authenticated) and a stable
-- first-segment path check for investor-owned objects.

DROP POLICY IF EXISTS "Users upload own kyc files" ON storage.objects;
DROP POLICY IF EXISTS "Users read own kyc files" ON storage.objects;
DROP POLICY IF EXISTS "Users update own kyc files" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own kyc files" ON storage.objects;
DROP POLICY IF EXISTS "Admins read all kyc files" ON storage.objects;
DROP POLICY IF EXISTS "Admins upload any kyc files" ON storage.objects;
DROP POLICY IF EXISTS "Admins update any kyc files" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete any kyc files" ON storage.objects;

-- Investors: object path must be `{auth.uid()}/...` (matches ProfileCompletionWizard + portal.investor.kyc).
CREATE POLICY "Users upload own kyc files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND split_part(name, '/', 1) = (select auth.uid()::text)
);

CREATE POLICY "Users read own kyc files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND split_part(name, '/', 1) = (select auth.uid()::text)
);

CREATE POLICY "Users update own kyc files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND split_part(name, '/', 1) = (select auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND split_part(name, '/', 1) = (select auth.uid()::text)
);

CREATE POLICY "Users delete own kyc files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND split_part(name, '/', 1) = (select auth.uid()::text)
);

-- Staff: full bucket access (uses security definer helper; executable by authenticated).
CREATE POLICY "Admins read all kyc files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND app_private.has_role((select auth.uid()), 'admin'::public.app_role)
);

CREATE POLICY "Admins upload any kyc files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND app_private.has_role((select auth.uid()), 'admin'::public.app_role)
);

CREATE POLICY "Admins update any kyc files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND app_private.has_role((select auth.uid()), 'admin'::public.app_role)
)
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND app_private.has_role((select auth.uid()), 'admin'::public.app_role)
);

CREATE POLICY "Admins delete any kyc files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND app_private.has_role((select auth.uid()), 'admin'::public.app_role)
);
