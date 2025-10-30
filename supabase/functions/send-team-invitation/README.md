# Team Invitation Email Edge Function

Sends email invitations to users invited to join a team on Beekeeper App.

## Features

- 📧 Beautiful HTML email with team details
- ✅ Accept/Decline buttons (links to app)
- ⏰ Expiration date display
- 🎨 Branded with Beekeeper App purple theme
- 📱 Responsive design for mobile email clients
- 📝 Plain text fallback for email clients without HTML support

## Setup

### 1. Deploy the Edge Function

```bash
# Deploy to Supabase
supabase functions deploy send-team-invitation

# Or deploy with environment variables
supabase secrets set RESEND_API_KEY=your_resend_api_key_here
supabase functions deploy send-team-invitation
```

### 2. Set Environment Variables

In your Supabase Dashboard → Project Settings → Edge Functions:

- `RESEND_API_KEY` - Your Resend API key (get from https://resend.com)
- `SUPABASE_URL` - Automatically set by Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Automatically set by Supabase

### 3. Update Email "From" Address

In `index.ts`, update this line with your verified domain:

```typescript
from: 'Beekeeper App <noreply@yourdomain.com>', // Update with your domain
```

**Note**: You need to verify your domain in Resend before you can send from it.
For testing, you can use Resend's test mode which allows sending to your own email.

### 4. Create Accept/Decline Pages (Optional)

The email includes links to:
- `/accept-invitation?id={invitationId}`
- `/decline-invitation?id={invitationId}`

You can create these pages in your Next.js app to handle one-click accept/decline.

## Usage

### From Client-Side Code

```typescript
// Call the Edge Function
const response = await supabase.functions.invoke('send-team-invitation', {
  body: {
    invitationId: 'uuid-here',
    inviteeEmail: 'user@example.com',
    teamName: 'My Beekeeping Team',
    inviterName: 'John Doe',
    inviterEmail: 'john@example.com',
    expiresAt: '2025-11-06T12:00:00Z',
  },
})

if (response.error) {
  console.error('Failed to send invitation:', response.error)
} else {
  console.log('Invitation sent:', response.data)
}
```

### Request Body

```typescript
{
  invitationId: string      // UUID of the invitation record
  inviteeEmail: string      // Email address of person being invited
  teamName: string          // Name of the team
  inviterName: string       // Name of person sending invitation (optional)
  inviterEmail: string      // Email of person sending invitation
  expiresAt: string         // ISO 8601 date string (e.g., '2025-11-06T12:00:00Z')
}
```

### Response

Success (200):
```json
{
  "success": true,
  "message": "Invitation email sent successfully",
  "emailId": "resend-email-id"
}
```

Error (400/500):
```json
{
  "error": "Failed to send invitation email",
  "details": "Error message"
}
```

## Email Template

The email includes:

### Header
- Purple gradient banner with Beekeeper App branding

### Body
- Personalized greeting with inviter's name
- Team name highlighted
- Invitation details (team, inviter, expiry date)
- Accept and Decline buttons (green and gray)
- Note about creating account first if needed
- Expiration reminder

### Footer
- Explanation of why they received the email
- Link to Beekeeper App
- Branding/attribution

## Testing

### Local Testing

```bash
# Serve locally
supabase functions serve send-team-invitation

# Test with curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/send-team-invitation' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "invitationId": "123e4567-e89b-12d3-a456-426614174000",
    "inviteeEmail": "test@example.com",
    "teamName": "Test Team",
    "inviterName": "Test User",
    "inviterEmail": "inviter@example.com",
    "expiresAt": "2025-11-06T12:00:00Z"
  }'
```

### Production Testing

```bash
curl -i --location --request POST 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/send-team-invitation' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{...}'
```

## Resend Configuration

### Free Tier Limits
- 100 emails per day
- 3,000 emails per month

### Domain Verification
1. Go to https://resend.com/domains
2. Add your domain
3. Add DNS records (SPF, DKIM, DMARC)
4. Verify domain
5. Update `from` address in Edge Function

### Testing Without Domain
For development, Resend allows sending to your own verified email without domain verification.

## Integration with Profile Page

Update the `handleSendInvite` function in `src/app/dashboard/profile/page.tsx`:

```typescript
// After creating invitation record
if (!existingUser) {
  // Create pending invitation
  const { data: newInvite, error: inviteError } = await supabase
    .from('team_invitations')
    .insert({
      team_id: selectedTeam.id,
      email: inviteEmail.toLowerCase(),
      invited_by: userId,
      status: 'pending',
    })
    .select()
    .single()

  if (inviteError) throw inviteError

  // Send invitation email via Edge Function
  const { error: emailError } = await supabase.functions.invoke('send-team-invitation', {
    body: {
      invitationId: newInvite.id,
      inviteeEmail: inviteEmail.toLowerCase(),
      teamName: selectedTeam.name,
      inviterName: userProfile?.first_name && userProfile?.last_name
        ? `${userProfile.first_name} ${userProfile.last_name}`
        : undefined,
      inviterEmail: userEmail,
      expiresAt: newInvite.expires_at,
    },
  })

  if (emailError) {
    console.error('Failed to send invitation email:', emailError)
    // Don't fail the whole operation if email fails
    alert(`Invitation created but email failed to send. Please contact ${inviteEmail} directly.`)
  } else {
    alert(`Invitation email sent to ${inviteEmail}!`)
  }
}
```

## Troubleshooting

### Email not sending
- Check Resend API key is set correctly
- Verify domain in Resend dashboard
- Check Edge Function logs: `supabase functions logs send-team-invitation`

### Email in spam
- Verify SPF, DKIM, DMARC records
- Warm up your domain (start with small volumes)
- Use a verified domain (not free email providers)

### CORS errors
- Edge Function includes CORS headers by default
- If issues persist, check Supabase dashboard CORS settings

## License

Part of Beekeeper App - see main project LICENSE

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
