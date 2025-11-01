# HiveCraic Email Templates

This directory contains customized email templates for Supabase authentication emails.

## Available Templates

### 1. confirm_signup.html
Welcome email sent to new users to confirm their email address.

**Variables Available:**
- `{{ .ConfirmationURL }}` - The confirmation link
- `{{ .SiteURL }}` - Your site URL (https://www.hivecraic.com)
- `{{ .Email }}` - User's email address
- `{{ .Token }}` - Confirmation token
- `{{ .TokenHash }}` - Hashed token

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

## Other Available Email Templates

You can customize these templates in the Supabase Dashboard:

- **Confirm signup** - Welcome email with confirmation link
- **Invite user** - Team member invitation (we use custom edge function instead)
- **Magic link** - Passwordless login email
- **Change email address** - Email change confirmation
- **Reset password** - Password reset instructions

## Additional Resources

- [Supabase Email Templates Documentation](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Email Template Best Practices](https://documentation.mjml.io/)
- [Test Email Rendering](https://litmus.com/)
