-- Security hotfix batch 2: notify_admin_new_user trigger (16/10/2026)
-- Replaces the hard-coded service-role JWT with a low-privilege webhook secret that
-- notify-admin-new-user checks (deployed with verify_jwt=false).
-- The real value lives in Edge Functions > Secrets as NOTIFY_WEBHOOK_SECRET and was applied
-- via MCP; it is deliberately NOT stored in this file. Replace <NOTIFY_WEBHOOK_SECRET> to re-run.
DROP TRIGGER IF EXISTS notify_admin_new_user ON public.profiles;
CREATE TRIGGER notify_admin_new_user
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request(
    'https://tbhofdmfzwibysnnssnx.supabase.co/functions/v1/notify-admin-new-user',
    'POST',
    '{"Content-type":"application/json","x-webhook-secret":"<NOTIFY_WEBHOOK_SECRET>"}',
    '{}',
    '5000'
  );
