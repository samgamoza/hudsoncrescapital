-- Enums
CREATE TYPE public.ticket_status AS ENUM ('open', 'pending_user', 'pending_staff', 'resolved', 'closed');
CREATE TYPE public.ticket_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE public.ticket_category AS ENUM ('account', 'funding', 'trading', 'kyc', 'technical', 'other');

-- tickets
CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid,
  subject text NOT NULL,
  category public.ticket_category NOT NULL DEFAULT 'other',
  priority public.ticket_priority NOT NULL DEFAULT 'normal',
  status public.ticket_status NOT NULL DEFAULT 'open',
  assigned_to uuid,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tickets_user_id ON public.tickets(user_id);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_last_activity ON public.tickets(last_activity_at DESC);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users create own tickets" ON public.tickets
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own tickets" ON public.tickets
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users close own tickets" ON public.tickets
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Staff view all tickets" ON public.tickets
  FOR SELECT TO authenticated
  USING (app_private.is_staff(auth.uid()));

CREATE POLICY "Staff update tickets" ON public.tickets
  FOR UPDATE TO authenticated
  USING (app_private.is_staff(auth.uid()));

CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ticket_messages
CREATE TABLE public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  author_role text NOT NULL,
  body text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_messages_ticket_id ON public.ticket_messages(ticket_id);

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Users can view non-internal messages on their own tickets
CREATE POLICY "Users view own ticket messages" ON public.ticket_messages
  FOR SELECT TO authenticated
  USING (
    is_internal = false
    AND EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
  );

-- Users can post non-internal messages on their own open tickets
CREATE POLICY "Users reply own tickets" ON public.ticket_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND is_internal = false
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
        AND t.status NOT IN ('closed')
    )
  );

-- Staff view all messages
CREATE POLICY "Staff view all ticket messages" ON public.ticket_messages
  FOR SELECT TO authenticated
  USING (app_private.is_staff(auth.uid()));

-- Staff post messages (internal or public)
CREATE POLICY "Staff post ticket messages" ON public.ticket_messages
  FOR INSERT TO authenticated
  WITH CHECK (app_private.is_staff(auth.uid()) AND author_id = auth.uid());

-- Trigger: bump tickets.last_activity_at when a message is posted
CREATE OR REPLACE FUNCTION public.bump_ticket_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.tickets
  SET last_activity_at = now(),
      updated_at = now()
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ticket_messages_bump_activity
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_ticket_activity();