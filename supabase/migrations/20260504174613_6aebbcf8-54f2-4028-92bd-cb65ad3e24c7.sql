-- Auto-create profile from auth signup metadata (name, phone, country)
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  m jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
BEGIN
  INSERT INTO public.profiles (
    user_id,
    legal_first_name,
    legal_last_name,
    display_name,
    phone,
    country_of_residence,
    nationality,
    status
  )
  VALUES (
    NEW.id,
    NULLIF(m->>'legal_first_name', ''),
    NULLIF(m->>'legal_last_name', ''),
    NULLIF(m->>'display_name', ''),
    NULLIF(m->>'phone', ''),
    UPPER(NULLIF(m->>'country_of_residence', '')),
    UPPER(NULLIF(m->>'nationality', '')),
    'incomplete'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    legal_first_name = COALESCE(public.profiles.legal_first_name, EXCLUDED.legal_first_name),
    legal_last_name  = COALESCE(public.profiles.legal_last_name,  EXCLUDED.legal_last_name),
    display_name     = COALESCE(public.profiles.display_name,     EXCLUDED.display_name),
    phone            = COALESCE(public.profiles.phone,            EXCLUDED.phone),
    country_of_residence = COALESCE(public.profiles.country_of_residence, EXCLUDED.country_of_residence),
    nationality      = COALESCE(public.profiles.nationality,      EXCLUDED.nationality);
  RETURN NEW;
END;
$$;

-- Ensure unique constraint exists on profiles.user_id (needed for ON CONFLICT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_key'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();
