-- 1. Add metadata column for application financial profile
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS metadata jsonb;

-- 2. Allow users to insert their own pending account applications.
--    Admins remain the only ones who can update status to 'active'.
CREATE POLICY "Users submit own pending accounts"
  ON public.accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'::account_status
  );