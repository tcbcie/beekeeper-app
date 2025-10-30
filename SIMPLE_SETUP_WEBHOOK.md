# Simple Setup: Auto-Accept via Webhook (No SQL Triggers Needed)

**Problem**: SQL trigger approach keeps failing due to permission issues
**Solution**: Use webhook approach - works on ALL Supabase projects

---

## Why Webhook Instead of Trigger?

- ✅ **No database permissions needed**
- ✅ **Works on ALL Supabase projects**
- ✅ **Easy to debug** (clear function logs)
- ✅ **No SQL magic** - just a function that gets called
- ✅ **Already coded and ready**

---

## Setup (10 Minutes)

### Step 1: Deploy the Edge Function

```bash
# Navigate to your project
cd "c:\Users\Rico Zmarzly\OneDrive\Bees\Apps\beekeeper-app"

# Deploy the auto-accept function
supabase functions deploy auto-accept-invitations
```

**Expected output**:
```
Deploying function auto-accept-invitations...
✓ Function deployed successfully
URL: https://YOUR_PROJECT_ID.supabase.co/functions/v1/auto-accept-invitations
```

### Step 2: Configure Webhook

**Option A: Via Supabase Dashboard (Easiest)**

1. Go to Supabase Dashboard
2. Navigate to one of these locations (varies by Supabase version):
   - **Authentication** → **Hooks**
   - **Settings** → **Webhooks**
   - **Database** → **Webhooks**

3. Click **Add Webhook** or **Enable Webhook**

4. Configure:
   - **Event**: `user.created` OR `INSERT on auth.users` OR `User signup`
   - **URL**: `https://YOUR_PROJECT_ID.supabase.co/functions/v1/auto-accept-invitations`
   - **HTTP Method**: `POST`
   - **Enabled**: ✅ Check the box
   - **Secret**: (Leave blank for now)

5. Click **Save** or **Create**

**Option B: Via Supabase CLI (If dashboard doesn't have webhooks)**

If your Supabase dashboard doesn't have a Webhooks section, you may need to use Database Functions or contact support.

**Option C: Test manually first (Skip webhook config)**

You can manually call the function after each signup:
```bash
# After a user signs up, call this
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/auto-accept-invitations \
  -H "Content-Type: application/json" \
  -d '{
    "type": "INSERT",
    "table": "users",
    "record": {
      "id": "USER_ID_HERE",
      "email": "user@example.com",
      "created_at": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
    }
  }'
```

### Step 3: Test It

1. **Create invitation**:
   - Go to your app
   - Invite `test@youremail.com` to a team

2. **Sign up**:
   - Open incognito browser
   - Sign up with `test@youremail.com`

3. **Check logs**:
   ```bash
   supabase functions logs auto-accept-invitations --limit 20
   ```

4. **Verify in database**:
   ```sql
   -- Should show user as team member
   SELECT * FROM team_members
   WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test@youremail.com');

   -- Should show invitation as accepted
   SELECT status FROM team_invitations WHERE email = 'test@youremail.com';
   ```

---

## How It Works

```
User Signs Up
    ↓
Supabase Auth creates account
    ↓
Webhook fires (if configured)
    ↓
Calls auto-accept-invitations Edge Function
    ↓
Function receives: { user_id, email, ... }
    ↓
Function finds pending invitations for email
    ↓
Function adds user to team_members
    ↓
Function updates invitation status to 'accepted'
    ↓
Done! ✅
```

---

## Troubleshooting

### "Webhook not available in dashboard"

**Solution 1**: Your Supabase version might not have webhooks UI yet
- Use manual testing (Option C above)
- After each signup, manually call the function
- Or wait for Supabase to add webhook support

**Solution 2**: Use Database Function trigger (if you're comfortable with SQL)
- But this requires the same permissions that are failing
- Stick with manual testing for now

### "Function deploy failed"

**Check**:
```bash
# Make sure you're logged in
supabase login

# Make sure you're linked to project
supabase link

# Try deploy again
supabase functions deploy auto-accept-invitations
```

### "Webhook fires but nothing happens"

**Check logs**:
```bash
supabase functions logs auto-accept-invitations --limit 50
```

Look for:
- 🔔 "Webhook received" (function is being called)
- ❌ Error messages
- ✅ "Auto-accepted X invitation(s)"

### "User not added to team"

**Verify invitation exists**:
```sql
SELECT * FROM team_invitations
WHERE email = 'test@youremail.com'
  AND status = 'pending'
  AND expires_at > NOW();
```

If no results: Invitation is missing, expired, or already accepted

---

## Manual Testing (No Webhook Needed)

If webhook configuration is too difficult, you can test manually:

1. **Invite user** → Invitation created in database

2. **User signs up** → Get their user_id:
   ```sql
   SELECT id FROM auth.users WHERE email = 'test@youremail.com';
   ```

3. **Manually call function**:
   ```bash
   curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/auto-accept-invitations \
     -H "Content-Type: application/json" \
     -d '{
       "type": "INSERT",
       "table": "users",
       "record": {
         "id": "paste-user-id-here",
         "email": "test@youremail.com",
         "created_at": "2025-10-30T12:00:00Z"
       }
     }'
   ```

4. **Check result** → User should be added to team

This proves the function works, even without automatic webhooks!

---

## Verification

Run these to verify everything is set up:

### Check function is deployed:
```bash
supabase functions list
```
Should show: `auto-accept-invitations`

### Check function works:
```bash
# Test with fake data
curl -i -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/auto-accept-invitations \
  -H "Content-Type: application/json" \
  -d '{"type":"INSERT","table":"users","record":{"id":"test-id","email":"test@test.com"}}'
```

Expected: `200 OK` (even if no invitations found)

### Check pending invitations:
```sql
SELECT email, status, expires_at > NOW() as valid
FROM team_invitations
WHERE status = 'pending';
```

---

## Summary

| Method | Difficulty | Reliability | Setup Time |
|--------|-----------|-------------|------------|
| **SQL Trigger** | Hard | ❌ Keeps failing | N/A |
| **Webhook (This)** | Medium | ✅ Should work | 10 min |
| **Manual Testing** | Easy | ✅ Works | 5 min |

**Recommendation**: Deploy the function now, test manually first, configure webhook later if available.

---

## Next Steps

1. ✅ **Deploy function**: `supabase functions deploy auto-accept-invitations`
2. ✅ **Test manually**: Invite → Signup → Call function manually
3. ⚠️ **Configure webhook**: If available in your dashboard
4. ✅ **Done**: Users will be auto-added to teams!

The function is already coded and ready - just needs deployment! 🚀

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Last Updated: 2025-10-30
