# Auto-Accept Invitations Edge Function (Webhook)

**Alternative to database trigger** - Use this if you cannot create triggers on `auth.users` table.

## Purpose

Automatically accepts team invitations when a new user signs up, triggered by Supabase Auth webhook.

## Why This Approach?

You cannot create triggers on `auth.users` table due to permission restrictions:
```
ERROR: 42501: must be owner of relation users
```

This Edge Function solves that by using Supabase's webhook system instead.

## Setup

### Step 1: Deploy the Edge Function

```bash
supabase functions deploy auto-accept-invitations
```

### Step 2: Get the Function URL

```bash
# Get your project URL
echo "https://YOUR_PROJECT_ID.supabase.co/functions/v1/auto-accept-invitations"
```

Or find it in Supabase Dashboard → Edge Functions → auto-accept-invitations

### Step 3: Configure Auth Webhook

**In Supabase Dashboard**:

1. Go to **Authentication** → **Hooks** (or **Settings** → **Webhooks**)
2. Click **Add Webhook** or **Enable Webhook**
3. Configure:
   - **Event**: `user.created` or `auth.users.INSERT`
   - **URL**: `https://YOUR_PROJECT_ID.supabase.co/functions/v1/auto-accept-invitations`
   - **HTTP Method**: POST
   - **Secret**: (Optional) Set a secret for security
   - **Enabled**: ✅ Yes

**OR via SQL** (if webhook UI is not available):

```sql
-- Note: This requires admin access to insert_http_request extension
-- May not work in all Supabase projects

-- Create webhook configuration
-- This is project-specific, consult Supabase docs for your version
```

**OR via Supabase CLI**:

```bash
# Configure in config.toml
# [auth.hooks.send_sms]
# enabled = false
# uri = "..."

# Add to your project's config
```

### Step 4: Set Service Role Key

The function needs elevated permissions to access team data:

```bash
# Service role key is automatically available as SUPABASE_SERVICE_ROLE_KEY
# No action needed - Supabase sets this automatically
```

### Step 5: Test the Setup

Create a test invitation and sign up:

```bash
# 1. Invite a test email from your app
# 2. Sign up with that email
# 3. Check Edge Function logs
supabase functions logs auto-accept-invitations --limit 20
```

## How It Works

```
User Signs Up
    ↓
Supabase Auth creates auth.users record
    ↓
Supabase triggers webhook → Calls Edge Function
    ↓
Edge Function receives payload with user ID & email
    ↓
Function queries team_invitations for pending invites
    ↓
For each matching invitation:
  - Check if user already a member (skip if yes)
  - Add user to team_members (role: member)
  - Update invitation status to 'accepted'
    ↓
Returns result with acceptance count
    ↓
User is now a team member! ✅
```

## Webhook Payload

Supabase Auth sends this payload when a user signs up:

```json
{
  "type": "INSERT",
  "table": "users",
  "record": {
    "id": "uuid-here",
    "email": "user@example.com",
    "created_at": "2025-10-30T12:00:00Z",
    ...
  },
  "schema": "auth",
  "old_record": null
}
```

## Response Format

Success (200):
```json
{
  "success": true,
  "userId": "uuid",
  "email": "user@example.com",
  "invitationsFound": 2,
  "invitationsAccepted": 2,
  "results": [
    {
      "invitationId": "inv-uuid-1",
      "teamId": "team-uuid-1",
      "status": "accepted"
    },
    {
      "invitationId": "inv-uuid-2",
      "teamId": "team-uuid-2",
      "status": "accepted"
    }
  ]
}
```

No invitations (200):
```json
{
  "message": "No pending invitations",
  "userId": "uuid",
  "email": "user@example.com"
}
```

Error (500):
```json
{
  "error": "Failed to process auto-accept",
  "details": "Error message"
}
```

## Testing

### Local Testing

```bash
# Start local functions server
supabase functions serve auto-accept-invitations

# Simulate webhook call
curl -i --location --request POST 'http://localhost:54321/functions/v1/auto-accept-invitations' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "type": "INSERT",
    "table": "users",
    "record": {
      "id": "test-user-id",
      "email": "test@example.com",
      "created_at": "2025-10-30T12:00:00Z"
    },
    "schema": "auth",
    "old_record": null
  }'
```

### Production Testing

1. Create a pending invitation in your app for `yourtest@email.com`
2. Sign up a new user with that email
3. Check logs:
   ```bash
   supabase functions logs auto-accept-invitations --limit 20
   ```
4. Verify in database:
   ```sql
   -- Check team_members
   SELECT * FROM team_members WHERE user_id = (
     SELECT id FROM auth.users WHERE email = 'yourtest@email.com'
   );

   -- Check invitation status
   SELECT status, accepted_at FROM team_invitations
   WHERE email = 'yourtest@email.com';
   ```

## Troubleshooting

### Webhook not firing

**Check webhook configuration**:
- Go to Supabase Dashboard → Authentication → Hooks
- Verify webhook is enabled
- Verify URL is correct
- Check for error logs

**Test webhook manually**:
```bash
# Get your function URL
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/auto-accept-invitations \
  -H "Content-Type: application/json" \
  -d '{"type":"INSERT","table":"users","record":{"id":"test","email":"test@test.com"}}'
```

### Function errors

**Check logs**:
```bash
supabase functions logs auto-accept-invitations --limit 50
```

Look for:
- 🔔 Webhook received (function is called)
- ❌ Error messages
- ✅ Success messages

### User not added to team

**Verify invitation exists**:
```sql
SELECT * FROM team_invitations
WHERE email ILIKE 'user@example.com'
  AND status = 'pending'
  AND expires_at > NOW();
```

**Check function was called**:
```bash
# Look for log entry with user's email
supabase functions logs auto-accept-invitations | grep "user@example.com"
```

**Manually trigger function**:
```bash
# Call function directly with user data
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/auto-accept-invitations \
  -H "Content-Type: application/json" \
  -d '{
    "type": "INSERT",
    "table": "users",
    "record": {
      "id": "ACTUAL_USER_ID_HERE",
      "email": "user@example.com",
      "created_at": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
    }
  }'
```

## Security

- ✅ Uses SUPABASE_SERVICE_ROLE_KEY for elevated permissions
- ✅ Verifies event type is INSERT on users table
- ✅ Only processes non-expired invitations
- ✅ Checks user not already a member before adding
- ✅ Optional webhook secret for authentication (recommended)

### Add Webhook Secret (Recommended)

1. Generate a secret:
   ```bash
   openssl rand -hex 32
   ```

2. Set in Supabase webhook configuration

3. Update Edge Function to verify secret:
   ```typescript
   const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET')
   const receivedSecret = req.headers.get('x-webhook-secret')

   if (receivedSecret !== WEBHOOK_SECRET) {
     return new Response('Unauthorized', { status: 401 })
   }
   ```

## Comparison: Webhook vs Trigger

| Feature | Database Trigger | Webhook (This) |
|---------|-----------------|----------------|
| Permissions | Needs auth.users owner | ✅ Works with Edge Function |
| Setup | Single SQL file | Deploy + Configure webhook |
| Reliability | ✅ Immediate | Depends on webhook delivery |
| Debugging | Database logs | ✅ Edge Function logs (easier) |
| Flexibility | Limited to SQL | ✅ Full TypeScript/Deno |
| Retry Logic | None | ✅ Can add retry |

## Migration from Trigger

If you were using the trigger approach and need to switch:

1. Drop the old trigger (if it exists):
   ```sql
   DROP TRIGGER IF EXISTS on_auth_user_created_auto_accept_invitations ON auth.users;
   DROP TRIGGER IF EXISTS on_profile_created_auto_accept_invitations ON public.profiles;
   DROP FUNCTION IF EXISTS public.auto_accept_team_invitations();
   ```

2. Deploy this Edge Function

3. Configure webhook

4. Test with new signup

## Cost

Edge Functions on Supabase:
- **Free tier**: 500K function invocations/month
- **Pro tier**: 2M invocations/month

Each user signup = 1 invocation. Very unlikely to hit limits.

## License

Part of Beekeeper App - see main project LICENSE

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
