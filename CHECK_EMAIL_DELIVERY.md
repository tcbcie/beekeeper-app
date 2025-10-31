# Check Email Delivery - Troubleshooting Guide

The email is sending without errors, but recipients aren't receiving it.

## Step 1: Check Resend Dashboard

1. Go to https://resend.com/emails
2. Log in with your account
3. Look at the recent emails list

**What to check**:
- ✅ **Status: Delivered** - Email was sent successfully
- ⚠️ **Status: Bounced** - Email address invalid or mailbox full
- ⚠️ **Status: Complained** - Marked as spam
- ⚠️ **Status: Queued/Sending** - Still being sent (wait a few seconds)

## Step 2: Common Issues

### Issue 1: Email in Spam/Junk Folder

**Solution**: Tell recipient to check spam folder

**Why it happens**:
- `info@hivecraic.com` domain might not be fully verified
- SPF/DKIM/DMARC records not set up
- First time sending from this domain

**Fix for future emails**:
1. Go to Resend → Domains
2. Verify `hivecraic.com` domain
3. Add DNS records:
   - SPF record
   - DKIM record
   - DMARC record
4. Wait 24-48 hours for DNS propagation

### Issue 2: Domain Not Verified

**Check**: Go to https://resend.com/domains

**If `hivecraic.com` is NOT verified**:
- Emails may be blocked or go to spam
- Free Resend accounts have limitations on unverified domains

**Solution**:
1. Click "Add Domain" in Resend
2. Add `hivecraic.com`
3. Add DNS records they provide
4. Click "Verify"

### Issue 3: Using Free Resend Account

**Limitations**:
- Free accounts: Can only send to verified email addresses
- Paid accounts: Can send to any email

**Check**:
1. Go to https://resend.com/settings/billing
2. If on free plan, you can ONLY send to:
   - Email addresses you've added and verified in Resend
   - Your own email address

**Solution for testing**:
- Send test invitation to YOUR OWN email first
- Once you verify it works, upgrade Resend or verify recipient's email

### Issue 4: Rate Limiting

**Free account limits**:
- 100 emails per day
- 3,000 emails per month

**Check**: Resend dashboard shows "429 Too Many Requests"

**Solution**: Wait or upgrade plan

## Step 3: Test Email Directly

Send a test email using Resend API directly:

```bash
curl -X POST 'https://api.resend.com/emails' \
  -H 'Authorization: Bearer YOUR_RESEND_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "HiveCraic <info@hivecraic.com>",
    "to": ["YOUR_EMAIL@example.com"],
    "subject": "Test Email from HiveCraic",
    "html": "<p>If you receive this, email delivery is working!</p>"
  }'
```

**Expected response**:
```json
{
  "id": "abc123..."
}
```

**Then check**:
1. Your inbox (within 1 minute)
2. Spam folder (if not in inbox)
3. Resend dashboard status

## Step 4: Check Email Content

The invitation email might be triggering spam filters. Check:

1. Subject line: "You've been invited to join [Team] on Beekeeper App"
2. Has HTML content with links
3. First email from this domain

**To check the actual email**:
1. Invite your own email address
2. See what arrives (or doesn't)
3. Check spam score if it goes to spam

## Step 5: Verify DNS Records

If `hivecraic.com` is your domain, you need DNS records:

### SPF Record
Add TXT record to `hivecraic.com`:
```
v=spf1 include:_spf.resend.com ~all
```

### DKIM Records
Resend provides these when you add your domain:
- Add the CNAME records they provide

### DMARC Record
Add TXT record to `_dmarc.hivecraic.com`:
```
v=DMARC1; p=none; rua=mailto:dmarc@hivecraic.com
```

**After adding DNS records**:
- Wait 1-24 hours for propagation
- Verify in Resend dashboard
- Test again

## Step 6: What to Check Right Now

Run these checks in order:

1. **Resend Dashboard**:
   - Go to https://resend.com/emails
   - Find the recent invitation email
   - What's the status?
   - Click on it to see details

2. **Domain Verification**:
   - Go to https://resend.com/domains
   - Is `hivecraic.com` listed?
   - Is it verified (green checkmark)?
   - If not, follow verification steps

3. **Account Plan**:
   - Go to https://resend.com/settings/billing
   - Free or paid plan?
   - If free: Can only send to verified recipients

4. **Recipient Email**:
   - Did they check spam/junk folder?
   - Is the email address valid?
   - Can they receive emails normally?

## Most Likely Cause

**If on Free Resend Plan**: You can only send to email addresses that you've verified in Resend settings.

**Solution**:
1. Go to https://resend.com/settings/sending
2. Add the recipient's email and verify it, OR
3. Upgrade to paid plan ($20/month), OR
4. Test with your own email first

**If Domain Not Verified**: Emails are being sent but going to spam.

**Solution**:
1. Verify domain in Resend
2. Add DNS records
3. Wait for propagation
4. Recipients should check spam in meantime

## Quick Test

**Send to your own email**:
1. Go to your app
2. Invite YOUR email address to a team
3. Check if YOU receive it
4. Check spam folder if not in inbox

If you receive it: ✅ Email system works, recipient needs to check spam
If you don't: ❌ Check Resend dashboard for the actual error

---

## Next Steps

1. Check Resend dashboard NOW: https://resend.com/emails
2. Tell me what status shows for the email
3. Check if domain is verified
4. Check if you're on free plan

This will tell us exactly what's blocking delivery! 🔍
