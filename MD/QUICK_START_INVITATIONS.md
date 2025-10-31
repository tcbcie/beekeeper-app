# Quick Start: Team Invitations System

**Current Status**: ✅ Code deployed, ⚠️ Email & Auto-accept need setup

---

## What's Working Right Now

✅ **Inviting users** - You can invite people via email address
✅ **Pending invitations** - Invitations are saved in database
✅ **Manual accept** - Users can accept invitations via Profile page

⚠️ **Not yet configured**:
- Email notifications (invitees don't receive emails)
- Auto-accept on signup (users must manually accept)

---

## Quick Setup (Choose One Path)

### PATH 1: Get Auto-Accept Working First (5 minutes)

This makes invitations auto-accept when users sign up. No emails, but users are automatically added to teams.

**Step 1: Run SQL**
1. Open Supabase Dashboard → SQL Editor
2. Copy ALL of: `sql/create_auto_accept_invitation_alternative.sql`
3. Paste and click "Run"
4. Should see: "✅ SETUP COMPLETE!"

**Step 2: Test**
1. Invite `test@youremail.com` from your app
2. Sign up with that email (use incognito browser)
3. Check if you're automatically added to the team

**Done!** Users will now auto-join teams when they sign up with invited emails.

---

### PATH 2: Get Emails Working First (15 minutes)

This sends beautiful invitation emails. Users still need to sign up and accept manually.

**Step 1: Get Resend API Key**
1. Go to https://resend.com
2. Sign up (free: 100 emails/day)
3. Go to API Keys → Create
4. Copy the key (starts with `re_`)

**Step 2: Update Email Address**
1. Open `supabase/functions/send-team-invitation/index.ts`
2. Find line ~130: `from: 'HiveCraic <noreply@yourdomain.com>'`
3. For testing, change to: `from: 'HiveCraic <your@email.com>'`
   (Use the email you verified in Resend)

**Step 3: Deploy Edge Function**
```bash
cd "c:\Users\Rico Zmarzly\OneDrive\Bees\Apps\beekeeper-app"

# Deploy function
supabase functions deploy send-team-invitation

# Set API key
supabase secrets set RESEND_API_KEY=re_your_key_here
```

**Step 4: Test**
1. Invite `test@youremail.com` from your app
2. Check your email inbox
3. Should receive beautiful invitation email

**Done!** Invitations now send actual emails.

---

### PATH 3: Set Up Both (20 minutes)

Do PATH 1, then PATH 2. You'll have the complete system:
- ✅ Emails sent to invitees
- ✅ Auto-accept when they sign up
- ✅ Full automation

---

## Testing Without Email Setup

**Current behavior** (no email setup):
1. Invite `user@example.com` → Alert: "Email system not configured"
2. Invitation saved in database
3. User signs up with `user@example.com`
4. If auto-accept setup → User automatically added to team ✅
5. If no auto-accept → User must go to Profile → Accept invitation manually

**With email setup**:
1. Invite `user@example.com` → Email sent
2. User receives beautiful HTML email
3. User clicks Accept or signs up
4. If auto-accept setup → Automatically added ✅
5. If no auto-accept → Must accept manually in Profile

---

## Current Invitation Flow

### Without Any Setup:
```
Invite user → Database record created → Manual notification → User signs up → User accepts manually
```

### With Auto-Accept Only:
```
Invite user → Database record created → Manual notification → User signs up → ✅ AUTO-ADDED
```

### With Email Only:
```
Invite user → ✅ EMAIL SENT → User receives email → User signs up → User accepts manually
```

### With Both (Complete):
```
Invite user → ✅ EMAIL SENT → User receives email → User signs up → ✅ AUTO-ADDED
```

---

## Which Should You Set Up?

| Your Priority | Recommended Path | Time | Benefit |
|--------------|------------------|------|---------|
| "Just make it work" | PATH 1 (Auto-accept) | 5 min | Users auto-added, no manual steps |
| "Professional look" | PATH 2 (Email) | 15 min | Nice emails, still manual accept |
| "Full production" | PATH 3 (Both) | 20 min | Complete automation |
| "Test first" | Neither | 0 min | Manual notification & accept |

---

## Troubleshooting

### "Invitation created but email failed to send"
- **Expected** - Edge Function not deployed yet
- **Fix**: Follow PATH 2 above
- **Workaround**: Manually tell invitee to sign up

### SQL Error: "relation profiles does not exist"
- **Problem**: Your Supabase doesn't have profiles table
- **Fix**: Use PATH 2 (webhook) instead of PATH 1 (trigger)
- **See**: `AUTO_ACCEPT_SETUP_GUIDE.md` → Option 2

### "User signed up but not added to team"
- **Problem**: Auto-accept not set up
- **Fix**: Follow PATH 1 above
- **Workaround**: User can manually accept in Profile page

### Email in spam
- **Problem**: Using unverified domain
- **Fix**: In Resend, verify your domain (add DNS records)
- **Testing**: Use your own verified email for now

---

## Verification Queries

### Check if pending invitations exist:
```sql
SELECT email, status, expires_at
FROM team_invitations
WHERE status = 'pending'
ORDER BY invited_at DESC;
```

### Check if auto-accept is set up:
```sql
-- Should return true
SELECT EXISTS (
  SELECT 1 FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  WHERE t.tgname LIKE '%auto_accept%'
);
```

### Check if user was auto-added:
```sql
SELECT tm.*, t.name as team_name
FROM team_members tm
JOIN teams t ON t.id = tm.team_id
WHERE tm.user_id = (
  SELECT id FROM auth.users WHERE email = 'test@example.com'
);
```

---

## Full Documentation

- **Quick Start** (this file): Overview and fast paths
- **[TEAM_INVITATION_SETUP.md](TEAM_INVITATION_SETUP.md)**: Complete setup with email
- **[AUTO_ACCEPT_SETUP_GUIDE.md](AUTO_ACCEPT_SETUP_GUIDE.md)**: All auto-accept options
- **[TEAM_INVITATION_TEST.md](TEAM_INVITATION_TEST.md)**: Testing and verification

---

## Current File Status

| File | Status | Purpose |
|------|--------|---------|
| `src/app/dashboard/profile/page.tsx` | ✅ Deployed | Invitation UI, improved error messages |
| `sql/create_auto_accept_invitation_alternative.sql` | ⚠️ Not run | Auto-accept trigger (PATH 1) |
| `supabase/functions/send-team-invitation/` | ⚠️ Not deployed | Email sending (PATH 2) |
| `supabase/functions/auto-accept-invitations/` | ⚠️ Not deployed | Webhook alternative (if PATH 1 fails) |

---

## Next Steps

**Recommended order**:

1. ✅ **Done**: Code is committed and ready
2. **Next**: Run `sql/create_auto_accept_invitation_alternative.sql` (5 min)
3. **Then**: Test auto-accept with a signup
4. **Optional**: Set up email notifications (15 min)

**Or just test the current setup**:
- Invite someone → Tell them manually → They sign up → They accept in Profile

The system works now, just without the convenience features! 🎉

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Last Updated: 2025-10-30
