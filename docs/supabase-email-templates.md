# Supabase Auth Email Templates

Copy these templates into **Supabase Dashboard** → **Project Settings** → **Auth** → **Email Templates**

---

## 1. Confirm Signup

**Subject:** `Confirm your HiveCraic account`

**Body:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Logo -->
          <tr>
            <td style="padding: 40px 40px 24px; text-align: center;">
              <img src="https://www.hivecraic.com/logo.png" alt="HiveCraic" width="64" height="64">
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <h1 style="margin: 0 0 16px; color: #1e293b; font-size: 22px; font-weight: 600; text-align: center;">Welcome to HiveCraic!</h1>
              <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6; text-align: center;">Thanks for signing up. Please confirm your email address to get started with managing your apiaries.</p>
              <div style="text-align: center;">
                <a href="https://www.hivecraic.com/auth/verify?token={{ .TokenHash }}&type=signup&redirect_to={{ .RedirectTo }}" style="display: inline-block; padding: 14px 32px; background-color: #f59e0b; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">Confirm Email</a>
              </div>
              <p style="margin: 32px 0 0; color: #94a3b8; font-size: 14px; line-height: 1.5; text-align: center;">If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="margin: 8px 0 0; word-break: break-all; color: #64748b; font-size: 13px; text-align: center;">https://www.hivecraic.com/auth/verify?token={{ .TokenHash }}&type=signup&redirect_to={{ .RedirectTo }}</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; color: #94a3b8; font-size: 13px;">Crafted with honeyed hearts by tcbc.ie</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 2. Reset Password

**Subject:** `Reset your HiveCraic password`

**Body:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Logo -->
          <tr>
            <td style="padding: 40px 40px 24px; text-align: center;">
              <img src="https://www.hivecraic.com/logo.png" alt="HiveCraic" width="64" height="64">
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <h1 style="margin: 0 0 16px; color: #1e293b; font-size: 22px; font-weight: 600; text-align: center;">Reset Your Password</h1>
              <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6; text-align: center;">We received a request to reset your password. Click the button below to choose a new password.</p>
              <div style="text-align: center;">
                <a href="https://www.hivecraic.com/auth/verify?token={{ .TokenHash }}&type=recovery&redirect_to={{ .RedirectTo }}" style="display: inline-block; padding: 14px 32px; background-color: #f59e0b; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">Reset Password</a>
              </div>
              <p style="margin: 32px 0 0; color: #94a3b8; font-size: 14px; line-height: 1.5; text-align: center;">If you didn't request this, you can safely ignore this email.</p>
              <p style="margin: 16px 0 0; color: #94a3b8; font-size: 14px; line-height: 1.5; text-align: center;">If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="margin: 8px 0 0; word-break: break-all; color: #64748b; font-size: 13px; text-align: center;">https://www.hivecraic.com/auth/verify?token={{ .TokenHash }}&type=recovery&redirect_to={{ .RedirectTo }}</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; color: #94a3b8; font-size: 13px;">Crafted with honeyed hearts by tcbc.ie</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 3. Magic Link

**Subject:** `Your HiveCraic login link`

**Body:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Logo -->
          <tr>
            <td style="padding: 40px 40px 24px; text-align: center;">
              <img src="https://www.hivecraic.com/logo.png" alt="HiveCraic" width="64" height="64">
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <h1 style="margin: 0 0 16px; color: #1e293b; font-size: 22px; font-weight: 600; text-align: center;">Sign In to HiveCraic</h1>
              <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6; text-align: center;">Click the button below to sign in to your account. This link will expire in 24 hours.</p>
              <div style="text-align: center;">
                <a href="https://www.hivecraic.com/auth/verify?token={{ .TokenHash }}&type=magiclink&redirect_to={{ .RedirectTo }}" style="display: inline-block; padding: 14px 32px; background-color: #f59e0b; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">Sign In</a>
              </div>
              <p style="margin: 32px 0 0; color: #94a3b8; font-size: 14px; line-height: 1.5; text-align: center;">If you didn't request this link, you can safely ignore this email.</p>
              <p style="margin: 16px 0 0; color: #94a3b8; font-size: 14px; line-height: 1.5; text-align: center;">If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="margin: 8px 0 0; word-break: break-all; color: #64748b; font-size: 13px; text-align: center;">https://www.hivecraic.com/auth/verify?token={{ .TokenHash }}&type=magiclink&redirect_to={{ .RedirectTo }}</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; color: #94a3b8; font-size: 13px;">Crafted with honeyed hearts by tcbc.ie</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 4. Change Email Address

**Subject:** `Confirm your new email for HiveCraic`

**Body:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Logo -->
          <tr>
            <td style="padding: 40px 40px 24px; text-align: center;">
              <img src="https://www.hivecraic.com/logo.png" alt="HiveCraic" width="64" height="64">
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <h1 style="margin: 0 0 16px; color: #1e293b; font-size: 22px; font-weight: 600; text-align: center;">Confirm Your New Email</h1>
              <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6; text-align: center;">Please confirm that you want to change your email address for your HiveCraic account.</p>
              <div style="text-align: center;">
                <a href="https://www.hivecraic.com/auth/verify?token={{ .TokenHash }}&type=email_change&redirect_to={{ .RedirectTo }}" style="display: inline-block; padding: 14px 32px; background-color: #f59e0b; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">Confirm Email Change</a>
              </div>
              <p style="margin: 32px 0 0; color: #94a3b8; font-size: 14px; line-height: 1.5; text-align: center;">If you didn't request this change, please contact support immediately.</p>
              <p style="margin: 16px 0 0; color: #94a3b8; font-size: 14px; line-height: 1.5; text-align: center;">If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="margin: 8px 0 0; word-break: break-all; color: #64748b; font-size: 13px; text-align: center;">https://www.hivecraic.com/auth/verify?token={{ .TokenHash }}&type=email_change&redirect_to={{ .RedirectTo }}</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; color: #94a3b8; font-size: 13px;">Crafted with honeyed hearts by tcbc.ie</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## How to Apply

1. Go to **Supabase Dashboard** → **Project Settings** → **Auth** → **Email Templates**
2. For each template type:
   - Click to edit
   - Replace the **Subject** line
   - Replace the entire **Body** with the HTML above
   - Click **Save**

## Notes

- Logo is hosted at `https://www.hivecraic.com/logo.png` (64x64)
- Clean design with centered logo (no header banner)
- Amber button color: `#f59e0b`
- All links use the custom `/auth/verify` endpoint
- Templates are mobile-responsive
