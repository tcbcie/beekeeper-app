#!/bin/bash

# Email Reminders Test Runner
# Automated test execution for email reminder functionality

set -e

echo "============================================"
echo "Email Reminders Test Suite"
echo "============================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check environment variables
echo "Checking environment..."
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo -e "${RED}✗ NEXT_PUBLIC_SUPABASE_URL not set${NC}"
  exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo -e "${RED}✗ SUPABASE_SERVICE_ROLE_KEY not set${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Environment variables configured${NC}"
echo ""

# Run automated tests
echo "Running automated tests..."
echo "============================================"

# Run Jest tests
npm test -- tests/email-reminders/task-event-reminders.test.ts

echo ""
echo "============================================"
echo "Automated tests complete"
echo "============================================"
echo ""

# Manual test reminders
echo ""
echo "MANUAL TESTS REQUIRED:"
echo "======================"
echo ""
echo -e "${YELLOW}Please execute the following manual tests:${NC}"
echo ""
echo "1. Profile Settings UI (TC-1.1 through TC-1.7)"
echo "   - Verify toggles and dropdowns work"
echo "   - Test all frequency options"
echo ""
echo "2. Email Delivery (TC-3.1 through TC-3.7)"
echo "   - Create test tasks/events"
echo "   - Wait for cron execution (top of the hour)"
echo "   - Check email inbox"
echo ""
echo "3. Email Content (TC-5.1 through TC-5.6)"
echo "   - Verify formatting and styling"
echo "   - Check priority and urgency indicators"
echo "   - Verify location context displays"
echo ""
echo "See tests/email-reminders/MANUAL_TEST_CASES.md for detailed steps"
echo ""

# Database verification
echo "============================================"
echo "Database Verification"
echo "============================================"
echo ""

# Check if columns exist
echo "Checking database schema..."
psql $DATABASE_URL -c "
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN (
  'enable_task_email_reminders',
  'enable_event_email_reminders',
  'task_reminder_frequency'
);" 2>/dev/null || echo -e "${YELLOW}⚠ Could not verify database schema (psql not available)${NC}"

echo ""

# Check cron jobs
echo "Checking cron jobs..."
psql $DATABASE_URL -c "
SELECT
  jobname,
  schedule,
  active
FROM cron.job
WHERE jobname LIKE '%reminder%'
OR jobname LIKE '%digest%';" 2>/dev/null || echo -e "${YELLOW}⚠ Could not verify cron jobs (psql not available)${NC}"

echo ""

# Test Edge Function availability
echo "Testing Edge Function availability..."
response=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/task-event-reminders" \
  -H "Authorization: Bearer ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json")

if [ "$response" = "200" ]; then
  echo -e "${GREEN}✓ Edge Function responding (HTTP 200)${NC}"
else
  echo -e "${RED}✗ Edge Function not responding properly (HTTP $response)${NC}"
fi

echo ""
echo "============================================"
echo "Test Execution Complete"
echo "============================================"
echo ""
echo "Next Steps:"
echo "1. Review automated test results above"
echo "2. Execute manual tests from MANUAL_TEST_CASES.md"
echo "3. Check email inbox for test reminder emails"
echo "4. Review Edge Function logs in Supabase Dashboard"
echo ""
