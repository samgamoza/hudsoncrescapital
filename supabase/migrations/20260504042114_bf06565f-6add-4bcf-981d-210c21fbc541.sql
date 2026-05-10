DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'stripe' AND enumtypid = 'public.payment_method'::regtype) THEN
    ALTER TYPE public.payment_method ADD VALUE 'stripe';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'paypal' AND enumtypid = 'public.payment_method'::regtype) THEN
    ALTER TYPE public.payment_method ADD VALUE 'paypal';
  END IF;
END$$;

ALTER TABLE public.deposit_requests
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS provider_session_id text,
  ADD COLUMN IF NOT EXISTS provider_payment_id text;

CREATE UNIQUE INDEX IF NOT EXISTS deposit_requests_provider_session_uniq
  ON public.deposit_requests (payment_provider, provider_session_id)
  WHERE provider_session_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_id text NOT NULL,
  event_type text NOT NULL,
  deposit_request_id uuid,
  payload jsonb NOT NULL,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, event_id)
);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff view payment events" ON public.payment_events;
CREATE POLICY "Staff view payment events"
  ON public.payment_events FOR SELECT TO authenticated
  USING (app_private.is_staff(auth.uid()));
