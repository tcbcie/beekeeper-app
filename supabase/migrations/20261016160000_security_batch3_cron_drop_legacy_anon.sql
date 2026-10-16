-- Batch 3 step 3 (16/10/2026): the scheduled jobs authenticate with the internal webhook
-- secret only; the legacy anon key header and its Vault entry are no longer needed.
-- Applied via MCP as security_batch3_cron_drop_legacy_anon.
SELECT cron.schedule(
  'weekly-queen-rearing-digest',
  '0 8 * * 1',
  $job$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/weekly-email-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
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
      'x-webhook-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_webhook_secret')
    ),
    body := jsonb_build_object('time', now()),
    timeout_milliseconds := 60000
  ) AS request_id;
  $job$
);

DELETE FROM vault.secrets WHERE name = 'anon_key';
