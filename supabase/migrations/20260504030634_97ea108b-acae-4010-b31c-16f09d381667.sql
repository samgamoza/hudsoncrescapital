DROP FUNCTION IF EXISTS public.ensure_user_portal_role();

CREATE POLICY "Users can create their own investor role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND role = 'investor'::public.app_role);