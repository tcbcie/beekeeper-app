# Auto-Accept Team Invitations - Setup Guide

**Issue**: `ERROR: 42501: must be owner of relation users` when creating trigger

**Solution**: Choose one of three alternative approaches below.

---

## Background

Supabase restricts direct access to the `auth.users` table for security. This means you cannot create triggers on it using regular SQL. Here are three working alternatives:

---

## ✅ OPTION 1: Use Profiles Table Trigger (RECOMMENDED - EASIEST)

Most Supabase projects auto-create a `profiles` record when users sign up. We can trigger on that instead.

### Setup Steps:

1. **Run SQL file**:
   - Open Supabase Dashboard → SQL Editor
   - Copy contents of `sql/create_auto_accept_invitation_alternative.sql`
   - Paste and run

2. **Verify it worked**:
   ```sql
   -- Should return true
   SELECT EXISTS (
     SELECT 1 FROM pg_trigger t
     JOIN pg_class c ON t.tgrelid = c.oid
     WHERE t.tgname = 'on_profile_created_auto_accept_invitations'
       AND c.relname = 'profiles'
   );
   ```

3. **Test**:
   - Invite `test@youremail.com` to a team
   - Sign up with that email
   - Check if user was auto-added to team

### Pros:
- ✅ Easiest setup (one SQL file)
- ✅ Works immediately
- ✅ No external dependencies

### Cons:
- ⚠️ Only works if your Supabase project has `profiles` table
- ⚠️ Only works if profiles are auto-created on signup

### Check if this will work for you:

```sql
-- Check if profiles table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'profiles'
);

-- Check if you have any profiles
SELECT COUNT(*) FROM public.profiles;
```

If both return `true`/count > 0, this method will work!

---

## ✅ OPTION 2: Use Edge Function Webhook (MOST RELIABLE)

Use Supabase's webhook system to call an Edge Function when users sign up.

### Setup Steps:

1. **Deploy Edge Function**:
   ```bash
   supabase functions deploy auto-accept-invitations
   ```

2. **Configure webhook in Supabase Dashboard**:
   - Go to **Authentication** → **Hooks**
   - Click **Add Webhook** or **Enable Auth Hooks**
   - Configure:
     - **Event**: `user.created` or `INSERT on auth.users`
     - **URL**: `https://YOUR_PROJECT_ID.supabase.co/functions/v1/auto-accept-invitations`
     - **Method**: POST
     - **Enabled**: ✅

   **Note**: Webhook UI location varies by Supabase version. Check:
   - Authentication → Hooks
   - Settings → Webhooks
   - Database → Webhooks

3. **Test**:
   - Invite `test@youremail.com` to a team
   - Sign up with that email
   - Check Edge Function logs:
     ```bash
     supabase functions logs auto-accept-invitations --limit 20
     ```
   - Should see: "🎉 Auto-accepted X invitation(s)"

### Pros:
- ✅ Works with ANY Supabase project
- ✅ No database trigger permissions needed
- ✅ Easy to debug (clear logs)
- ✅ Can add retry logic
- ✅ Full TypeScript flexibility

### Cons:
- ⚠️ Requires configuring webhook (UI varies by Supabase version)
- ⚠️ Slightly more setup than Option 1

### Files:
- `supabase/functions/auto-accept-invitations/index.ts`
- `supabase/functions/auto-accept-invitations/README.md`

---

## ⚠️ OPTION 3: Manual Database Admin Trigger (ADVANCED)

Contact Supabase support to create the trigger with admin permissions.

### When to use:
- You have direct database admin access
- You're self-hosting Supabase
- Options 1 & 2 don't work for your setup

### Steps:

1. **Contact Supabase support** or use admin database access

2. **Run as database admin**:
   ```sql
   -- File: sql/create_auto_accept_invitation_trigger.sql
   -- Must be run with postgres/admin role
   ```

3. **OR** if self-hosting:
   ```bash
   # Connect as postgres user
   psql -U postgres -d your_database

   # Run the SQL file
   \i sql/create_auto_accept_invitation_trigger.sql
   ```

### Pros:
- ✅ Cleanest solution (direct trigger on auth.users)
- ✅ Most performant

### Cons:
- ❌ Requires database admin access
- ❌ Not available on standard Supabase projects

---

## Comparison Table

| Feature | Option 1: Profiles Trigger | Option 2: Webhook | Option 3: Admin Trigger |
|---------|---------------------------|-------------------|------------------------|
| **Setup Difficulty** | ⭐ Easy | ⭐⭐ Medium | ⭐⭐⭐ Hard |
| **Permissions Needed** | User (you have this) | User (you have this) | Admin only |
| **Works on all projects** | ⚠️ Only if profiles exist | ✅ Yes | ❌ Needs admin |
| **Debugging** | Database logs | ✅ Clear Edge Function logs | Database logs |
| **Reliability** | ✅ Immediate | ⚠️ Depends on webhook delivery | ✅ Immediate |
| **Flexibility** | SQL only | ✅ Full TypeScript | SQL only |
| **Maintenance** | None | Update function as needed | None |

---

## Which Option Should You Choose?

### Choose **Option 1** if:
- ✅ Your project has a `profiles` table (check with SQL above)
- ✅ You want the easiest setup
- ✅ You want it working in under 2 minutes

### Choose **Option 2** if:
- ✅ Option 1 doesn't work (no profiles table)
- ✅ You want the most reliable solution
- ✅ You want easy debugging with logs
- ✅ You might want to add custom logic later

### Choose **Option 3** if:
- ✅ You're self-hosting Supabase
- ✅ You have admin database access
- ✅ Options 1 & 2 don't meet your needs

---

## Recommended Approach

**TRY THIS ORDER**:

1. **First**, try Option 1 (Profiles Trigger)
   - Run `sql/create_auto_accept_invitation_alternative.sql`
   - Test with a signup
   - If works → ✅ Done!

2. **If Option 1 fails**, use Option 2 (Webhook)
   - Deploy Edge Function
   - Configure webhook
   - Test
   - ✅ Guaranteed to work!

3. **Only if both fail**, contact support for Option 3

---

## Testing Your Setup

Regardless of which option you chose, test with:

### 1. Create Invitation
```sql
-- Manually create test invitation
INSERT INTO team_invitations (team_id, email, invited_by, status, expires_at)
VALUES (
  (SELECT id FROM teams WHERE owner_id = auth.uid() LIMIT 1), -- Your team
  'test@youremail.com', -- Use YOUR email
  auth.uid(),
  'pending',
  NOW() + INTERVAL '7 days'
);
```

### 2. Sign Up New User
- Use incognito/private browser
- Sign up with `test@youremail.com`
- Complete signup

### 3. Verify Auto-Accept
```sql
-- Check invitation was accepted
SELECT status, accepted_at FROM team_invitations
WHERE email = 'test@youremail.com'
ORDER BY invited_at DESC LIMIT 1;
-- Should show: status = 'accepted', accepted_at = NOW()

-- Check user added to team
SELECT tm.*, t.name as team_name
FROM team_members tm
JOIN teams t ON t.id = tm.team_id
WHERE tm.user_id = (
  SELECT id FROM auth.users WHERE email = 'test@youremail.com'
);
-- Should show: One row with role = 'member'
```

### 4. Check Logs

**Option 1 (Profiles Trigger)**:
- Supabase Dashboard → Database → Logs
- Look for NOTICE messages with 🔔 🎉 emojis

**Option 2 (Webhook)**:
```bash
supabase functions logs auto-accept-invitations --limit 20
```
- Look for "🎉 Auto-accepted X invitation(s)"

---

## Troubleshooting

### Option 1: "relation profiles does not exist"

**Solution**: Your project doesn't have a profiles table. Use Option 2 instead.

### Option 2: Webhook not firing

**Check**:
1. Supabase Dashboard → Authentication → Hooks → Verify enabled
2. Check webhook URL is correct
3. Test Edge Function directly:
   ```bash
   curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/auto-accept-invitations \
     -H "Content-Type: application/json" \
     -d '{"type":"INSERT","table":"users","record":{"id":"test","email":"test@test.com"}}'
   ```

### Option 1 & 2: User not auto-added

**Check**:
1. Invitation exists and not expired:
   ```sql
   SELECT * FROM team_invitations
   WHERE email = 'test@youremail.com'
     AND status = 'pending'
     AND expires_at > NOW();
   ```

2. User signed up with EXACT email (case-insensitive but must match)

3. Check logs (see above)

---

## Files Reference

```
beekeeper-app/
├── sql/
│   ├── create_auto_accept_invitation_trigger.sql          # Option 3 (admin only)
│   └── create_auto_accept_invitation_alternative.sql      # Option 1 (profiles)
├── supabase/
│   └── functions/
│       └── auto-accept-invitations/                       # Option 2 (webhook)
│           ├── index.ts
│           └── README.md
└── AUTO_ACCEPT_SETUP_GUIDE.md                             # This file
```

---

## Need Help?

1. Check this guide first
2. Review the specific README for your chosen option
3. Check Supabase docs: https://supabase.com/docs
4. Check logs for error messages
5. Ask in HiveCraic issues/discussions

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Last Updated: 2025-10-30
