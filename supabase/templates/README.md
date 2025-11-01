# HiveCraic Email Templates

This directory contains customized email templates for Supabase authentication emails.

## Available Templates

### 1. confirm_signup.html
Welcome email sent to new users to confirm their email address.

**Supabase Template Name:** Confirm signup

**Variables Available:**
- `{{ .ConfirmationURL }}` - The confirmation link
- `{{ .SiteURL }}` - Your site URL (https://www.hivecraic.com)
- `{{ .Email }}` - User's email address
- `{{ .Token }}` - Confirmation token
- `{{ .TokenHash }}` - Hashed token

### 2. invite_user.html
Email sent when an admin invites a user to create an account.

**Supabase Template Name:** Invite user

**Variables Available:**
- `{{ .ConfirmationURL }}` - The invitation acceptance link
- `{{ .SiteURL }}` - Your site URL
- `{{ .Email }}` - Invited user's email address

### 3. magic_link.html
Passwordless authentication email with a one-time sign-in link.

**Supabase Template Name:** Magic link

**Variables Available:**
- `{{ .ConfirmationURL }}` - The magic link for sign-in
- `{{ .SiteURL }}` - Your site URL
- `{{ .Email }}` - User's email address

### 4. change_email.html
Email sent to the new email address when a user changes their email.

**Supabase Template Name:** Change email address

**Variables Available:**
- `{{ .ConfirmationURL }}` - The email change confirmation link
- `{{ .SiteURL }}` - Your site URL
- `{{ .Email }}` - New email address
- `{{ .NewEmail }}` - New email address

### 5. reset_password.html
Email sent when a user requests to reset their password.

**Supabase Template Name:** Reset password

**Variables Available:**
- `{{ .ConfirmationURL }}` - The password reset link
- `{{ .SiteURL }}` - Your site URL
- `{{ .Email }}` - User's email address

### 6. reauthentication.html
Email sent when a user needs to confirm their identity for sensitive operations.

**Supabase Template Name:** Reauthentication

**Variables Available:**
- `{{ .ConfirmationURL }}` - The reauthentication confirmation link
- `{{ .SiteURL }}` - Your site URL
- `{{ .Email }}` - User's email address

## How to Update Email Templates in Supabase

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/tbhofdmfzwibysnnssnx
2. Navigate to **Authentication** → **Email Templates**
3. Select the template you want to customize (e.g., "Confirm signup")
4. Copy the content from the corresponding `.html` file in this directory
5. Paste it into the template editor
6. Click **Save**

### Option 2: Via Supabase CLI (Not Yet Supported)

Currently, Supabase CLI doesn't support deploying email templates directly. You must use the dashboard.

## Customization Tips

### Styling
- Use inline CSS styles (email clients don't support external stylesheets)
- Test with multiple email clients (Gmail, Outlook, Apple Mail, etc.)
- Keep it simple and mobile-friendly

### Content
- Keep the subject line clear and concise
- Include a clear call-to-action button
- Provide an alternative text link for the confirmation URL
- Add helpful information about what happens next

### Brand Consistency
Current brand colors used:
- Primary Purple: `#9333ea`
- Purple Gradient: `linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)`
- Success Green: `#10b981`
- Text Gray: `#6b7280`

## Testing

Before deploying to production:
1. Test the email by signing up with a test account
2. Check how it renders in different email clients
3. Verify all links work correctly
4. Test on both desktop and mobile views

## Template Mapping

All templates have been created and are ready to deploy:

| Supabase Template Name | File Name | Purpose |
|------------------------|-----------|---------|
| Confirm signup | confirm_signup.html | New user email confirmation |
| Invite user | invite_user.html | Admin invites user to create account |
| Magic link | magic_link.html | Passwordless sign-in |
| Change email address | change_email.html | Confirm new email address |
| Reset password | reset_password.html | Password reset instructions |
| Reauthentication | reauthentication.html | Identity confirmation for sensitive operations |

**Note:** For team invitations (inviting users to join teams), we use a custom edge function (`send-team-invitation`) instead of the Supabase "Invite user" template, as it provides more control and team-specific information.

## Additional Resources

- [Supabase Email Templates Documentation](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Email Template Best Practices](https://documentation.mjml.io/)
- [Test Email Rendering](https://litmus.com/)
