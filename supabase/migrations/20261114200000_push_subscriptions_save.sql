-- Push notifications, batch A (docs/features/push-notifications-plan.md).
--
-- 1. Records push_subscriptions as it already exists in the live database (created outside the
--    migrations, never used: 0 rows on 13/11/2026). Every statement is a no-op when it exists.
-- 2. save_push_subscription(): the only way the app saves a phone's subscription. A phone has one
--    endpoint whoever is signed in, so a second account on the same phone must take the row over;
--    the own-rows-only policies would refuse that, so the function does it.
-- 3. Takes away table rights logged-in users never need (TRUNCATE ignores RLS), and anon's SELECT.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL CONSTRAINT push_subscriptions_endpoint_unique UNIQUE,
  p256dh_key text NOT NULL,
  auth_key text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON public.push_subscriptions (user_id);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_push_subscriptions_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public', 'extensions' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'push_subscriptions_updated_at'
                 AND tgrelid = 'public.push_subscriptions'::regclass) THEN
    CREATE TRIGGER push_subscriptions_updated_at BEFORE UPDATE ON public.push_subscriptions
      FOR EACH ROW EXECUTE FUNCTION public.update_push_subscriptions_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'push_subscriptions'
                 AND policyname = 'Users can view their own push subscriptions') THEN
    CREATE POLICY "Users can view their own push subscriptions" ON public.push_subscriptions
      FOR SELECT USING ((SELECT auth.uid()) = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'push_subscriptions'
                 AND policyname = 'Users can insert their own push subscriptions') THEN
    CREATE POLICY "Users can insert their own push subscriptions" ON public.push_subscriptions
      FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'push_subscriptions'
                 AND policyname = 'Users can update their own push subscriptions') THEN
    CREATE POLICY "Users can update their own push subscriptions" ON public.push_subscriptions
      FOR UPDATE USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'push_subscriptions'
                 AND policyname = 'Users can delete their own push subscriptions') THEN
    CREATE POLICY "Users can delete their own push subscriptions" ON public.push_subscriptions
      FOR DELETE USING ((SELECT auth.uid()) = user_id);
  END IF;
END $$;

REVOKE ALL ON public.push_subscriptions FROM anon;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.push_subscriptions FROM authenticated;

CREATE OR REPLACE FUNCTION public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501';
  END IF;
  -- Push services hand out https addresses; the keys are short base64url strings.
  IF p_endpoint IS NULL OR p_endpoint !~ '^https://' OR length(p_endpoint) > 2000
     OR coalesce(length(p_p256dh), 0) NOT BETWEEN 1 AND 200
     OR coalesce(length(p_auth), 0) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Invalid push subscription' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh_key, auth_key)
  VALUES (auth.uid(), p_endpoint, p_p256dh, p_auth)
  ON CONFLICT (endpoint) DO UPDATE
    SET user_id = EXCLUDED.user_id,
        p256dh_key = EXCLUDED.p256dh_key,
        auth_key = EXCLUDED.auth_key;
END $$;

REVOKE EXECUTE ON FUNCTION public.save_push_subscription(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_push_subscription(text, text, text) TO authenticated;
