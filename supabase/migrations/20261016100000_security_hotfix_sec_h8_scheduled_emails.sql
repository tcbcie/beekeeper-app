-- SEC-H8 (16/10/2026): weekly-email-digest and task-event-reminders now require the internal
-- webhook secret (x-webhook-secret) and run with verify_jwt=false. Applied via MCP as
-- security_hotfix_sec_h8_vault_secret + security_hotfix_sec_h8_cron_headers.

-- 1. Copy the internal webhook secret from the notify_admin_new_user trigger into Vault
--    (server-side, so the value never leaves the database).
SELECT vault.create_secret(
  (regexp_match(pg_get_triggerdef(t.oid), 'x-webhook-secret":"([0-9a-f]{64})"'))[1],
  'internal_webhook_secret',
  'Shared secret for pg_cron/trigger calls to internal edge functions (x-webhook-secret)'
)
FROM pg_trigger t
WHERE t.tgname = 'notify_admin_new_user' AND t.tgrelid = 'public.profiles'::regclass;

-- 2. Both pg_cron jobs send the secret from Vault. The anon Authorization header is kept only
--    until the batch 3 API key migration; the redeployed functions no longer need it.
SELECT cron.schedule(
  'weekly-queen-rearing-digest',
  '0 8 * * 1',
  $job$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/weekly-email-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key'),
      'x-webhook-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_webhook_secret')
    ),
    timeout_milliseconds := 60000
  ) AS request_id;
  $job$
);

SELECT cron.schedule(
  'send-task-event-reminders',
  '*/15 * * * *',
  $job$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/task-event-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key'),
      'x-webhook-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_webhook_secret')
    ),
    body := jsonb_build_object('time', now()),
    timeout_milliseconds := 60000
  ) AS request_id;
  $job$
);
