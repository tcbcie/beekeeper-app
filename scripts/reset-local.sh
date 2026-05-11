#!/bin/bash
set -e

# Required environment variables:
#   PROD_SUPABASE_URL       e.g. https://tbhofdmfzwibysnnssnx.supabase.co
#   PROD_SERVICE_ROLE_KEY   service-role JWT from Supabase dashboard (Settings -> API).
#                           NEVER hard-code this. The previously committed value has
#                           been removed; if it was in git history, rotate the key
#                           in the Supabase dashboard before continuing.
#   LOCAL_SUPABASE_URL      defaults to http://127.0.0.1:54321 if unset.

: "${PROD_SUPABASE_URL:?Set PROD_SUPABASE_URL before running}"
: "${PROD_SERVICE_ROLE_KEY:?Set PROD_SERVICE_ROLE_KEY before running}"
LOCAL_SUPABASE_URL="${LOCAL_SUPABASE_URL:-http://127.0.0.1:54321}"

echo "=== Step 1: Reset local database ==="
supabase db reset --local

echo ""
echo "=== Step 2: Sync storage images from production ==="
export PROD_SUPABASE_URL PROD_SERVICE_ROLE_KEY LOCAL_SUPABASE_URL
node scripts/sync-storage.mjs

echo ""
echo "=== Local reset complete ==="
