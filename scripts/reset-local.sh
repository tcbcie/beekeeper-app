#!/bin/bash
set -e

# Edit these values before running
PROD_SUPABASE_URL="https://tbhofdmfzwibysnnssnx.supabase.co"
PROD_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiaG9mZG1mendpYnlzbm5zc254Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDc2NzYyOCwiZXhwIjoyMDc2MzQzNjI4fQ.6j1OTuC-9-dkPo8aiu5XnMTTdfglzdKeJcxvf4dweps"
LOCAL_SUPABASE_URL="http://127.0.0.1:54321"

echo "=== Step 1: Reset local database ==="
supabase db reset --local

echo ""
echo "=== Step 2: Sync storage images from production ==="
export PROD_SUPABASE_URL PROD_SERVICE_ROLE_KEY LOCAL_SUPABASE_URL
node scripts/sync-storage.mjs

echo ""
echo "=== Local reset complete ==="
