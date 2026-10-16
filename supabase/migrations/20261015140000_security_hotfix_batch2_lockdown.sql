-- Security hotfix batch 2, lockdown part (full application audit, 15/10/2026)
-- Apply only after the app code that stops using select('*') / token columns / the anon
-- deleted-profile read is deployed. See docs/features/security-hotfix-batch2-plan.md.

-- ============================================================
-- SEC-H3: app users can no longer read the third-party scale tokens
-- ============================================================
-- Column-level grants: a table-wide SELECT grant would override any column revoke.
-- NOTE: a new profiles column is invisible to the app until it is added to this grant.
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (
  id, email, role, created_at, first_name, last_name, mobile_number, full_name, is_active,
  used_registration_code_id, subscription_expires_at, current_subscription_code_id,
  last_subscription_reminder_sent, subscription_type, subscription_price, is_association_member,
  association_id, stripe_customer_id, deleted_at, original_email, member_fibka, member_iba,
  member_nihbs, enable_task_email_reminders, enable_event_email_reminders, task_reminder_frequency,
  beep_connected_at, wolf_connected_at, is_uk_ni_resident, enable_label_printing, producer_address,
  breeder_code, enable_crm, enable_logbook, enable_yard_map, enable_jar_payments, sales_revolut_url,
  sales_currency
) ON public.profiles TO anon, authenticated;

-- ============================================================
-- SEC-L1: replaced by is_deleted_account(text)
-- ============================================================
DROP POLICY IF EXISTS "Allow anon to check deleted accounts" ON public.profiles;

