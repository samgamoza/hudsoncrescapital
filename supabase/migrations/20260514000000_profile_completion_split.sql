-- Profile-completion split: minimal signup + in-portal full application.
--
-- This migration adds the small amount of structured storage we need to:
--   1. Track whether a user has already seen the "complete your profile" pop-up.
--   2. Persist the in-portal "Profile completion" wizard payload alongside their
--      account row, distinct from the legacy lite-onboarding metadata.
--
-- Storage strategy:
--   * `profiles.metadata jsonb`  -> non-PII flags (e.g. completion_modal_seen_at).
--   * `accounts.metadata.profile_completion`  -> structured wizard payload (no new column needed; jsonb already exists).
--   * `accounts.metadata.address`  -> mailing/residential address (already used today; reused here).
--   * KYC uploads continue to live in `public.kyc_documents` + `kyc-documents` bucket.
--
-- The wizard payload schema is enforced application-side (zod) so we can iterate
-- without further migrations.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Backfill any rows that already have status NULL or empty.
UPDATE public.profiles SET status = 'incomplete' WHERE status IS NULL OR status = '';

COMMENT ON COLUMN public.profiles.metadata IS
  'Free-form per-profile flags (e.g. completion_modal_seen_at). No PII; user-readable via RLS.';
