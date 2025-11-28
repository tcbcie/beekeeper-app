# Code Review Report - HiveCraic Beekeeping Application

**Date:** November 27, 2025
**Version:** v1.4.1
**Reviewer:** Claude Code

---

## Executive Summary

This is a well-structured Next.js application with solid fundamentals but several critical security issues that must be addressed before production deployment. The application shows good security awareness (RLS policies, secure OAuth, webhook verification) but has gaps in operational security (logging, rate limiting, audit trails).

---

## CRITICAL ISSUES (Must Fix Immediately)

### 1. Test Endpoint Exposed in Production
**File:** `src/app/api/stripe/test-activation/route.ts`
**Severity:** CRITICAL
**Issue:** There's a comment on line 9 stating "THIS IS A TEST ENDPOINT - REMOVE IN PRODUCTION" but the endpoint is active. This allows anyone to manually activate subscriptions for any user without payment, completely bypassing Stripe verification.
**Risk:** Revenue loss, subscription fraud, unauthorized access.
**Fix Required:** Remove this endpoint immediately or add strict role-based access control.

---

### 2. Insufficient Authorization in Admin Routes
**File:** `src/app/api/admin/update-user-role/route.ts` (Lines 16-50)
**Severity:** CRITICAL
**Issue:** The authorization check relies on a single token verification. If a token is compromised, an attacker can:
- Change any user's role to Admin
- Escalate privileges for themselves or allies
- Modify the roles table and gain permanent access

The check at line 30 uses `getUser(token)` which could be vulnerable to token manipulation.
**Additional Risk:** Line 75 prevents admin from changing their own role, but doesn't prevent sideways privilege escalation among admins.
**Fix Required:** Implement multi-factor admin operations, add audit logging, use service role verification for sensitive operations.

---

### 3. Full Database Export Without Proper Restrictions
**File:** `src/app/api/admin/export-all-data/route.ts` (Lines 1-190)
**Severity:** CRITICAL
**Issue:** Any admin can export ALL user data including:
- Personal information (names, emails, phone numbers)
- Sensitive beekeeping data
- Subscription information
- All user profiles regardless of their data sensitivity

The endpoint returns unencrypted SQL INSERT statements that could be distributed. No rate limiting, no audit logging of who exported what data.
**Risk:** GDPR/data privacy violations, data breaches, regulatory fines.
**Fix Required:**
- Implement data masking/anonymization
- Add audit logging with export records
- Require additional authentication (MFA) for admin exports
- Implement rate limiting
- Consider email alerts to all admins about exports

---

### 4. Console Logging of Sensitive Data
**Files:**
- `src/app/api/stripe/webhook/route.ts` (Lines 45-63)
- `src/app/api/stripe/checkout/route.ts` (Lines 30-35, 102, 138)
- `src/app/auth/callback/route.ts` (Lines 39, 51, 55)
- `src/app/dashboard/page.tsx` (Lines 36-40, 64)

**Severity:** CRITICAL
**Issue:** Sensitive data is logged to console including:
- User IDs
- Stripe payment IDs
- Subscription metadata
- Session information
- Association codes

In production, these logs could be exposed via error tracking services, log aggregation tools, or server logs accessible to attackers. The `associationCode` should especially never be logged.
**Fix Required:** Remove all console.log statements or implement structured logging that redacts sensitive fields in production.

---

### 5. Missing HTTPS Enforcement and HSTS Headers
**File:** `next.config.ts`
**Severity:** CRITICAL
**Issue:**
- No HTTPS redirect enforcement
- No HSTS (Strict-Transport-Security) headers configured
- `NEXT_PUBLIC_APP_URL` could be http:// in development environment vars
- Sensitive Stripe webhook could be called over HTTP

**Risk:** Man-in-the-middle attacks, credential theft, payment information interception.
**Fix Required:**
- Add `next-secure-headers` middleware
- Force HTTPS in production
- Add HSTS headers (minimum 1 year)
- Validate `NEXT_PUBLIC_APP_URL` is https in production

---

## HIGH PRIORITY ISSUES

### 6. Weak Input Validation on API Routes
**Files:** `src/app/api/stripe/checkout/route.ts`, `src/app/api/admin/update-user-role/route.ts`
**Severity:** HIGH
**Issue:**
- Line 28 (checkout): No validation that `isAssociationMember` is boolean before using
- Line 55 (update-role): Only checks if fields exist, not their types or format
- Line 66 (update-role): Role validation is a simple array check, not enum validation
- No validation of email format, user ID format, or association ID format

**Example:**
```typescript
// Line 28 in checkout/route.ts
const { userId, isAssociationMember, associationId, associationCode } = body
// Could pass string "false" which is truthy in JS
```

**Fix Required:** Implement Zod or similar schema validation library for all API inputs.

---

### 7. Authentication/Authorization Cache Timing Attack
**File:** `src/lib/auth.ts` (Lines 129-187)
**Severity:** HIGH
**Issue:**
- Account active status cached for 5 seconds
- During those 5 seconds, a disabled account can still make requests
- Fail-open pattern on line 169 (assumes active if error occurs)
- Comment on lines 167-168 states this is intentional but creates security gap

**Risk:** Disabled/deleted accounts can perform actions during cache window.
**Fix Required:** Reduce TTL to 1-2 seconds or implement real-time status check for critical operations.

---

### 8. Missing Rate Limiting on Authentication Endpoints
**Files:** `src/app/login/page.tsx`, `src/app/api/stripe/webhook/route.ts`
**Severity:** HIGH
**Issue:**
- No rate limiting on login attempts (brute force vulnerability)
- No rate limiting on Stripe webhook endpoint
- No CAPTCHA or other bot protection
- Password reset form has no rate limiting

**Risk:** Credential stuffing, account takeover, webhook replay attacks.
**Fix Required:**
- Implement rate limiting using Redis or middleware
- Add CAPTCHA after 5 failed login attempts
- Implement exponential backoff
- Add IP-based rate limiting

---

### 9. Stripe Webhook Signature Verification Missing Timing Check
**File:** `src/app/api/stripe/webhook/route.ts` (Lines 28-37)
**Severity:** HIGH
**Issue:** While signature verification is present, there's no check for webhook timestamp to prevent replay attacks. An attacker could intercept and replay a valid webhook indefinitely.
**Risk:** Repeated subscription activations for one payment.
**Fix Required:** Add timestamp validation:
```typescript
const timestamp = parseInt(request.headers.get('stripe-signature')?.split('t=')[1] || '0', 10);
if (Date.now() - timestamp * 1000 > 300000) { // 5 minutes
  return NextResponse.json({ error: 'Webhook too old' }, { status: 400 });
}
```

---

### 10. SQL Injection Risk in Query Building
**File:** `src/app/dashboard/hives/page.tsx`
**Severity:** HIGH
**Issue:** While using Supabase PostgREST (which is parameterized), there's dynamic query building with string interpolation:
```typescript
query = query.or(`user_id.eq.${currentUserId},and(apiary_id.in.(${sharedApiaryIds.join(',')}),user_id.neq.${currentUserId})`)
```

Although Supabase escapes this, the pattern is dangerous and could be misused elsewhere.
**Risk:** SQL injection if pattern is copied to unsafe contexts.
**Fix Required:** Use parameterized queries exclusively, document safe patterns.

---

### 11. Missing CSRF Protection
**Files:** All POST/PUT/DELETE API routes
**Severity:** HIGH
**Issue:** No CSRF token verification on any state-changing operations. An attacker could craft a form that changes user settings when visited.
**Risk:** Unauthorized account modifications, subscription changes.
**Fix Required:** Implement Next.js built-in CSRF protection or custom token verification.

---

### 12. Unvalidated URL Redirects
**File:** `src/app/login/page.tsx` (Lines 15, 40-41, 87, 147)
**Severity:** HIGH
**Issue:** The `redirect` parameter from URL is trusted without validation:
```typescript
const redirectUrl = searchParams.get('redirect') || '/dashboard'
// Later: router.push(redirectUrl)
```

An attacker could redirect users to `?redirect=https://attacker.com/phishing`
**Fix Required:** Validate redirects against allowlist of internal routes only.

---

## MEDIUM PRIORITY ISSUES

### 13. XSS Vulnerability in Error Messages
**File:** `src/app/api/stripe/checkout/route.ts` (Line 166)
**Severity:** MEDIUM
**Issue:** Error details from exceptions are directly returned:
```typescript
{ error: 'Failed to create checkout session', message: errorMessage }
```
If an error message contains user-controlled input, it could enable XSS.
**Fix Required:** Sanitize error messages, never return raw exception details.

---

### 14. Password Reset Token Not Validated
**Files:** `src/app/reset-password/page.tsx`, `src/app/forgot-password/page.tsx`
**Severity:** MEDIUM
**Issue:** These files implement password reset but:
- No verification that tokens are temporary
- No expiration check visible
- Could be vulnerable if Supabase tokens are too long-lived

**Fix Required:** Verify Supabase password reset tokens expire in reasonable time (< 1 hour).

---

### 15. Account Deletion Soft-Delete Only
**File:** `src/app/dashboard/profile/page.tsx`
**Severity:** MEDIUM
**Issue:** User accounts are soft-deleted (deleted_at is set) but:
- PII is not fully removed
- Users can "reactivate" deleted accounts
- No GDPR right-to-be-forgotten implementation

**Risk:** GDPR non-compliance.
**Fix Required:** Implement true account deletion with PII removal after 30-day grace period.

---

### 16. Missing Dependency on Account Status for All Operations
**File:** `src/app/dashboard/layout.tsx` (Lines 46-65)
**Severity:** MEDIUM
**Issue:** Account status is checked every 30 seconds, but only alerts user. Between checks, disabled accounts could:
- Make API requests
- Modify data
- Complete transactions

The dashboard checks it but API routes don't enforce it consistently.
**Fix Required:** Check account status on every API route using middleware.

---

### 17. Observable Time Differences in Authentication
**File:** `src/lib/auth.ts` (Lines 62-81, 146-187)
**Severity:** MEDIUM
**Issue:** Time taken to check user role vs. subscription varies based on whether queries succeed. An attacker could measure timing to determine if a user exists.
**Risk:** User enumeration.
**Fix Required:** Add constant-time response regardless of result.

---

### 18. Missing Content Security Policy (CSP)
**File:** `src/app/layout.tsx`
**Severity:** MEDIUM
**Issue:** No CSP headers set. With external analytics (Vercel Analytics on line 51) and third-party scripts, CSP should be enforced.
**Risk:** Malicious script injection.
**Fix Required:** Add CSP headers via middleware or next-secure-headers.

---

### 19. Image Upload Validation Missing
**File:** `src/app/dashboard/records/page.tsx`
**Severity:** MEDIUM
**Issue:** Image uploads to Supabase Storage but:
- No file type validation (could upload executable files)
- No file size limits visible
- No antivirus scan
- Direct path used without sanitization

**Risk:** Malware distribution, DoS via large files.
**Fix Required:**
- Validate MIME types (whitelist only image/* types)
- Enforce file size limits (max 5MB)
- Rename files with UUID to prevent traversal
- Consider image optimization

---

### 20. Team Member Data Exposure
**File:** `src/app/dashboard/page.tsx` (Lines 563-603)
**Severity:** MEDIUM
**Issue:** Team members query includes email addresses and full names which could be used for phishing:
```typescript
.select('user_id, team_id, role, teams(name)')
// Later fetches: 'id, full_name, email'
```

No indication that team owners have legitimate need for this data or that members consented.
**Risk:** Phishing attacks using leaked team member contact info.
**Fix Required:**
- Implement member consent flag
- Mask emails in UI (user@***.com)
- Add audit logging for who views member lists

---

### 21. Missing Data Encryption at Rest
**Severity:** MEDIUM
**Issue:** Sensitive data like subscription info, association codes, etc. stored in plain text in Supabase.
**Risk:** Data breach exposure.
**Fix Required:** Implement encryption for sensitive fields at application layer (PII, subscription codes).

---

### 22. Insufficient Input Validation in Forms
**File:** `src/app/dashboard/profile/page.tsx`
**Severity:** MEDIUM
**Issue:** 77 placeholder attributes found but limited validation visible:
- Phone number format not validated
- Eircode format not validated (Irish postcode)
- Name fields accept any input
- No XSS protection on text fields

**Fix Required:** Add client-side validation and server-side sanitization.

---

## LOW PRIORITY ISSUES

### 23. Accessibility Issues
**Issue:** Only 21 aria-label/role attributes found in extensive component library.
**Affected Areas:**
- Modal dialogs missing role="dialog"
- Many buttons missing aria-label
- Form inputs missing proper label associations
- Color-only indicators without text alternatives

**Impact:** Fails WCAG 2.1 AA standards.
**Fix Required:** Audit all interactive components against WCAG checklist.

---

### 24. Performance Issues

#### N+1 Query Problem
**File:** `src/app/dashboard/page.tsx` (Lines 149-193)
**Issue:** Fetches from multiple tables in parallel which is good, but later fetches team member counts with potential loop queries.

#### Missing Image Optimization
**File:** `src/app/dashboard/records/page.tsx`
**Issue:** Uses Next.js Image component but `unoptimized: true` in next.config.ts disables optimization.
**Fix Required:** Remove `unoptimized: true`, configure proper image sizes.

#### Excessive Re-renders
**File:** `src/contexts/AuthContext.tsx` (Lines 58-80)
**Issue:** Auth state changes trigger full app re-render.
**Fix Required:** Split auth state into smaller contexts.

---

### 25. Dead Code and Code Duplication
**Issue:** Similar logic appears in multiple places:
- User role checking (auth.ts, multiple pages)
- Subscription checking (multiple components)
- Profile fetching (multiple locations)

**Impact:** Maintenance burden, inconsistency risk.
**Fix Required:** Extract to utility functions/hooks.

---

### 26. Missing Error Boundaries
**Files:** Dashboard pages
**Severity:** LOW
**Issue:** Client components have try/catch but no Error Boundary wrapper. Single component error crashes entire dashboard.
**Fix Required:** Add error boundary at layout level.

---

### 27. Inconsistent Error Handling
**Issue:** Some API routes return `{ error: '...' }`, others return `{ message: '...' }` or `{ details: '...' }`.
**Fix Required:** Standardize API response format.

---

### 28. Missing Audit Logging
**Severity:** LOW (but important for security)
**Issue:** Critical operations have no audit trail:
- Admin role changes
- Data exports
- Subscription activations
- Account deletions

**Risk:** Can't investigate security incidents.
**Fix Required:** Implement comprehensive audit logging table.

---

### 29. Environment Variable Validation Missing
**Files:** All API routes
**Severity:** LOW
**Issue:** While non-existent env vars cause errors, there's no startup validation to fail fast.
**Fix Required:** Add env var validation in app startup.

---

### 30. Missing Backup/Disaster Recovery Plan
**Severity:** LOW
**Issue:** No visible backup strategy documented.
**Fix Required:** Document backup retention, test recovery procedures.

---

## POSITIVE OBSERVATIONS

1. **Strong TypeScript Usage**: Full strict mode enabled, good type safety throughout
2. **Supabase RLS (Row Level Security)**: Appears to be properly configured
3. **PKCE Flow**: Using secure PKCE flow for OAuth
4. **Service Role Separation**: Good separation between user and admin clients
5. **Session Management**: Proper session persistence and refresh token handling
6. **Database Migrations**: Comprehensive migration system with versioning
7. **Stripe Integration**: Proper webhook signature verification implemented
8. **Account Status Caching**: Smart caching strategy to reduce database load
9. **Team Access Control**: Good team-based sharing with role hierarchy
10. **Mobile Responsive**: Proper responsive design with dark mode support

---

## REMEDIATION PRIORITY CHECKLIST

### IMMEDIATE (This Week)
- [ ] Remove test activation endpoint
- [ ] Stop logging sensitive data
- [ ] Add HTTPS enforcement
- [ ] Remove console.log statements in production code
- [ ] Add input validation to API routes

### SHORT TERM (This Sprint)
- [ ] Implement rate limiting on auth endpoints
- [ ] Add admin operation MFA requirement
- [ ] Implement CSRF protection
- [ ] Add redirect URL validation
- [ ] Implement audit logging

### MEDIUM TERM (Next Sprint)
- [ ] Add file upload validation
- [ ] Implement CSP headers
- [ ] Add WCAG a11y fixes
- [ ] Implement data encryption at rest
- [ ] Add proper error boundaries

### ONGOING
- [ ] Regular security audits
- [ ] Dependency updates
- [ ] Penetration testing
- [ ] GDPR compliance review
- [ ] Performance optimization

---

## Summary Table

| Priority | Count | Examples |
|----------|-------|----------|
| Critical | 5 | Test endpoint, admin auth, data export, logging, HTTPS |
| High | 7 | Input validation, rate limiting, CSRF, redirects |
| Medium | 10 | XSS, CSP, image upload, encryption |
| Low | 8 | Accessibility, performance, error handling |

**Total Issues Found:** 30

---

*Report generated by Claude Code on November 27, 2025*
