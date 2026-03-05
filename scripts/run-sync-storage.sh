#!/bin/bash

# Set these environment variables before running, or create a .env.local file
# PROD_SUPABASE_URL="https://your-project.supabase.co"
# PROD_SERVICE_ROLE_KEY="your-service-role-key"

if [ -z "$PROD_SUPABASE_URL" ] || [ -z "$PROD_SERVICE_ROLE_KEY" ]; then
  echo "Error: PROD_SUPABASE_URL and PROD_SERVICE_ROLE_KEY must be set as environment variables"
  exit 1
fi

LOCAL_SUPABASE_URL="${LOCAL_SUPABASE_URL:-http://127.0.0.1:54321}"

export PROD_SUPABASE_URL PROD_SERVICE_ROLE_KEY LOCAL_SUPABASE_URL

node scripts/sync-storage.mjs
