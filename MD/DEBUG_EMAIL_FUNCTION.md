# Debug Email Function - Step by Step

Run these commands to diagnose why the email function is failing.

## Step 1: Check if function is deployed

```bash
supabase functions list
```

**Expected**: Should show `send-team-invitation` in the list

---

## Step 2: Check if secret is set

```bash
supabase secrets list
```

**Expected**: Should show `RESEND_API_KEY` in the list

---

## Step 3: Check Edge Function logs

```bash
supabase functions logs send-team-invitation --limit 20
```

**Look for**:
- What error is actually happening
- "RESEND_API_KEY" missing errors
- Resend API errors
- "from" email address errors

---

## Step 4: Test the function directly

```bash
# Replace YOUR_PROJECT_ID with your actual project ID
# Replace YOUR_ANON_KEY with your anon key from Supabase dashboard

curl -i --location --request POST \
  'https://YOUR_PROJECT_ID.supabase.co/functions/v1/send-team-invitation' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "invitationId": "test-id-123",
    "inviteeEmail": "your@email.com",
    "teamName": "Test Team",
    "inviterName": "Test User",
    "inviterEmail": "inviter@example.com",
    "expiresAt": "2025-11-06T12:00:00Z"
  }'
```

**Expected**: Should return 200 OK and send email to `your@email.com`

---

## Step 5: Common Issues

### Issue: "from address not verified"

**Symptoms**: Resend returns 403 or similar error

**Fix**:
1. Go to Resend dashboard → Domains
2. For testing: Use your own verified email
3. Update Edge Function:
   ```typescript
   from: 'Beekeeper App <your-verified@email.com>'
   ```
4. Redeploy:
   ```bash
   supabase functions deploy send-team-invitation
   ```

### Issue: "RESEND_API_KEY not found"

**Symptoms**: Logs show "undefined" for API key

**Fix**:
```bash
# Set the secret again
supabase secrets set RESEND_API_KEY=re_your_actual_key_here

# Secrets take a few seconds to propagate
# Wait 10 seconds then test again
```

### Issue: "Function not found"

**Symptoms**: 404 error when calling function

**Fix**:
```bash
# Make sure you're linked to the correct project
supabase projects list
supabase link --project-ref YOUR_PROJECT_ID

# Deploy again
supabase functions deploy send-team-invitation
```

### Issue: "Deployment failed"

**Fix**:
```bash
# Check if Deno is installed and function syntax is valid
cd supabase/functions/send-team-invitation
deno run --allow-net index.ts

# If errors, there's a syntax issue in the TypeScript file
```

---

## Step 6: Check what "from" email you're using

```bash
# Show the current "from" email in the Edge Function
grep -n "from:" supabase/functions/send-team-invitation/index.ts
```

**Should show** something like:
```
line 130: from: 'Beekeeper App <your@email.com>',
```

**Must be**:
- An email you verified in Resend, OR
- An email from a domain you verified in Resend

---

## Step 7: Verify Resend API key is correct

1. Go to https://resend.com/api-keys
2. Copy the API key
3. Make sure it starts with `re_`
4. Set it again:
   ```bash
   supabase secrets set RESEND_API_KEY=re_paste_key_here
   ```

---

## Step 8: Check browser console for actual error

When you try to invite someone, open browser console (F12) and look for:

```javascript
❌ Failed to send invitation email: [ERROR DETAILS HERE]
Error details: [MORE INFO]
```

**Share this error** - it will tell us exactly what's failing.

---

## Quick Test (Bypass Function)

Test if Resend API works at all:

```bash
curl -X POST 'https://api.resend.com/emails' \
  -H 'Authorization: Bearer re_your_api_key_here' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "Beekeeper App <your@email.com>",
    "to": ["your@email.com"],
    "subject": "Test Email",
    "html": "<p>Test from Resend API</p>"
  }'
```

**Expected**: Returns `{"id":"..."}` and you receive email

If this fails, the problem is with Resend setup (API key or email verification).

---

## What to Check in Edge Function File

Open `supabase/functions/send-team-invitation/index.ts` and verify:

1. **Line ~5**: `const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')`
2. **Line ~130**: `from: 'Beekeeper App <your-verified@email.com>'`
3. **Line ~131**: `to: [inviteeEmail]` (should be array)

After any changes:
```bash
supabase functions deploy send-team-invitation
```

---

## Next Steps

Run commands above in order and share:
1. Output of `supabase functions logs send-team-invitation --limit 20`
2. The actual error from browser console (F12)
3. Output of Resend API direct test

This will show exactly what's failing! 🔍
