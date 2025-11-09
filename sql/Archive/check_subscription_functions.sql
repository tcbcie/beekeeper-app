-- Check which subscription functions exist
SELECT
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname LIKE '%subscription%'
ORDER BY p.proname;

-- Check the actual definition of activate_credit_card_subscription if it exists
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'activate_credit_card_subscription'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
