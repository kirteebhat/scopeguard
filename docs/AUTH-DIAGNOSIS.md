# Authentication System Diagnosis Report

**Date:** October 18, 2026  
**Scope:** Authentication Flow, Supabase Auth Integration, Session Persistence, Port Configuration, and Error Handling.  
**Target Environment:** Local application running at `http://localhost:3001`, connected to hosted Supabase Auth.

---

## 1. Executive Summary

We conducted a forensic diagnosis of the authentication system across the codebase, the running application on `http://localhost:3001`, and the hosted Supabase project.

### Key Diagnostic Outcomes:
1. **The Supabase Auth and SSR setup functions correctly for valid credentials:** An automated test against an existing confirmed account (`baseline_ui_1792335205744@test.com`) on `http://localhost:3001/login` succeeded, set the session cookie `sb-doxlujhgrbklsgwjyidc-auth-token`, redirected to `/dashboard`, and persisted across browser reloads.
2. **The Supabase built-in mailer is throwing `429 over_email_send_rate_limit`:** Direct testing of `supabase.auth.resetPasswordForEmail` returned `status: 429`, `code: over_email_send_rate_limit`. The built-in email service is exhausted. Meanwhile, `forgotPasswordAction` swallows this error and tells users an email was sent, leaving users waiting for emails that never arrive.
3. **Login error masking obscures real causes:** Any error from `supabase.auth.signInWithPassword` (wrong password, unconfirmed email, rate limit, network timeout) is mapped to the single generic string `"Invalid email or password. Please check your credentials and try again."` Real Supabase error codes are never logged server-side, making troubleshooting impossible and leading users with unconfirmed accounts to believe their password was deleted or incorrect.
4. **Port 3000 vs 3001 Mismatch:** `.env.local` specifies `NEXT_PUBLIC_APP_URL=http://localhost:3000` while the dev server runs on `http://localhost:3001`. Fallback headers in `app/actions/auth.ts` also hardcode `localhost:3000`. If Supabase Auth's Redirect URLs whitelist does not include `http://localhost:3001/**`, auth callbacks and email links fail or redirect to port 3000.
5. **No Password Visibility or Actionable Recovery on Login:** `LoginForm.tsx` lacks a show/hide password toggle (leading to mistyped password frustrations) and provides no "Resend verification email" action when an unconfirmed account attempts to log in.

---

## 2. Detailed Findings Against the 7 Diagnostic Checks

### Check 1: Environment & Project Verification
- **Supabase Project URL:** `https://doxlujhgrbklsgwjyidc.supabase.co`
- **Project Ref:** `doxlujhgrbklsgwjyidc`
- **Keys Verification:**
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Present (`sb_pub...x47j`), successfully authenticates client calls against `doxlujhgrbklsgwjyidc`.
  - `SUPABASE_SERVICE_ROLE_KEY`: Present (`sb_sec...oDJ5`), restricted to server actions and server data access layer. Verified working via administrative user list query.
- **Environment Files:**
  - Only `.env.local` and `.env.example` exist. No conflicting `.env`, `.env.development`, or `.env.production` files.
  - No leftover local Supabase port `54321` in active configuration.
- **Port Conflict Identified:**
  - `.env.local` has `NEXT_PUBLIC_APP_URL=http://localhost:3000` instead of `http://localhost:3001`.
- **User Location:** All user accounts must reside in hosted Supabase project `doxlujhgrbklsgwjyidc`.

### Check 2: Login Code Path Analysis
- **Password Transformation:** Passwords are never trimmed or altered. In `lib/validation/auth.ts`, `loginSchema` uses `z.string().min(1, "Password is required")`. No transformations exist in `LoginForm.tsx` or `loginAction`.
- **Password Strength Rules:** `signUpSchema` and `resetPasswordSchema` enforce length $\ge 8$, uppercase, and digit. `loginSchema` enforces only non-empty string. Strength rules are correctly omitted from login.
- **Email Normalization:** Handled via shared `emailSchema` using `.trim().toLowerCase()`.
- **Swallowed Errors in `loginAction` (`app/actions/auth.ts`):**
  ```typescript
  const { data: signInData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !signInData?.user) {
    // Generic error message: do not reveal whether the email exists or password was wrong
    return {
      success: false,
      message: "Invalid email or password. Please check your credentials and try again.",
    };
  }
  ```
  - **Critical Flaw:** If `error` is `email_not_confirmed`, `over_request_rate_limit`, or a network glitch, it returns the exact same string as wrong password.
  - Server-side logging is absent: neither `error.code`, `error.status`, nor `error.message` is logged to the server console.

### Check 3: Error Handling & User Visibility
Testing live error responses directly against `doxlujhgrbklsgwjyidc`:

| Scenario | Supabase Code | Current User Message | Recommended Actionable UX |
|---|---|---|---|
| Wrong password or non-existent user | `invalid_credentials` (400) | "Invalid email or password..." | Keep generic message, add "Forgot password?" link |
| Unconfirmed email with valid password | `email_not_confirmed` (400) | "Invalid email or password..." *(Misleading!)* | "Your email has not been verified yet. [Resend verification email]" |
| Rate limited login attempts | `over_request_rate_limit` (429) | "Invalid email or password..." *(Misleading!)* | "Too many failed login attempts. Please wait a few minutes before trying again." |
| Email send rate limit (Forgot PW) | `over_email_send_rate_limit` (429) | "If an account exists, instructions were sent" *(False!)* | Server-side alert; inform user if mail service is temporarily throttled or retry later |
| Internal server / network error | Fetch error / 500 | "An unexpected error occurred." | "Unable to connect to authentication server. Please check your connection and retry." |

### Check 4: Email Confirmation & Database User Inventory
An administrative audit of project `doxlujhgrbklsgwjyidc` revealed:
- **Total Registered Users:** 50
- **Confirmed Users:** 48
- **Unconfirmed Users:** 2
  - `ad991f06-b075-4c5f-b4fd-cdf6d0cfcee2` (`e2e_alex_...`)
  - `1246403e-f9c6-4588-af03-14ea06dc28b9` (`e2e_alex_...`)
- **Primary Developer Account:** `kirt...@gmail.com` is `confirmed: true`, created `2026-10-18T09:42:01Z`, last signed in `2026-10-18T14:15:56Z`.
- **Workspaces:** All 48 confirmed users have corresponding workspace records and `workspace_members` entries.
- **Mailer Status:** Invoking `resetPasswordForEmail` returned:
  `{ message: "email rate limit exceeded", status: 429, code: "over_email_send_rate_limit" }`.

### Check 5: Session, Cookies & Middleware Architecture
- **`@supabase/ssr` Compliance:** `lib/supabase/client.ts`, `server.ts`, and `middleware.ts` follow current official Next.js App Router conventions.
- **Middleware Refresh:** `lib/supabase/middleware.ts` invokes `supabase.auth.getUser()`, refreshes expiring sessions, and synchronizes cookies across requests.
- **Live Test on Port 3001:**
  - Login succeeded via HTTP 303 redirect.
  - Browser cookie `sb-doxlujhgrbklsgwjyidc-auth-token` was correctly set.
  - Access to `/dashboard` succeeded. Full page reload preserved the session.
  - Visiting `/login` while logged in redirected directly to `/dashboard`.
  - Unauthenticated access to `/projects` redirected to `/login?next=%2Fprojects`.
- **Hardcoded Port 3000 Findings:**
  - `.env.local`: `NEXT_PUBLIC_APP_URL=http://localhost:3000`
  - `.env.example`: `NEXT_PUBLIC_APP_URL=http://localhost:3000`
  - `app/actions/auth.ts`: Fallback host string `localhost:3000` on lines 135, 358, 421.

### Check 6: Redirect URLs & Allow-List
- **Code Values:**
  - Signup: `${appUrl}/auth/callback?next=/dashboard`
  - Resend: `${appUrl}/auth/callback?next=/dashboard`
  - Forgot Password: `${appUrl}/auth/callback?next=/reset-password`
- **Allow-List Requirement:** In the Supabase Dashboard under **Authentication > URL Configuration**:
  - If **Site URL** is `http://localhost:3000`, and **Redirect URLs** does NOT contain `http://localhost:3001/**`, Supabase will reject redirects to `http://localhost:3001` or redirect users to port 3000.

### Check 7: Live Reproduction
1. **Confirmed Account Login:** Successfully reproduced. Test user `baseline_ui_1792335205744@test.com` with `Password123!` logs in cleanly on port 3001.
2. **Unconfirmed Account Login:** Reproduces error masking. Account `ad991f06-b075-4c5f-b4fd-cdf6d0cfcee2` is rejected with `"Invalid email or password..."` with zero indicator that the email is unconfirmed.
3. **Password Reset Request:** Calling password reset triggers `429 over_email_send_rate_limit` on Supabase, while the UI displays false success.

---

## 3. Root Causes Ranked by Likelihood

### Rank 1: Supabase Built-in Email Rate Limiting (`over_email_send_rate_limit`)
- **Evidence:** Tested live via script; returned `status: 429`, `code: 'over_email_send_rate_limit'`.
- **Impact:** Users attempting password recovery or email verification receive no email. `forgotPasswordAction` reports false success, leaving users unable to regain access to their accounts.

### Rank 2: Error Masking in `loginAction` Hiding `email_not_confirmed` & Rate Limits
- **Evidence:** `app/actions/auth.ts` lines 57-63 returns `"Invalid email or password"` for all failures without checking `error.code`.
- **Impact:** Any user whose email was never confirmed (or who is temporarily rate-limited) receives a wrong-password error. Users assume their account is corrupted or password was reset.

### Rank 3: Port Mismatch (3000 vs 3001) & Supabase Allowed Redirect URLs
- **Evidence:** `.env.local` sets `NEXT_PUBLIC_APP_URL=http://localhost:3000`, and `auth.ts` has `localhost:3000` fallbacks.
- **Impact:** Password recovery links and verification links specify port 3000 or are dropped by Supabase if `http://localhost:3001/**` is omitted from the Supabase dashboard redirect allow-list.

### Rank 4: Lack of Password Visibility & Actionable Login Recovery in UI
- **Evidence:** `LoginForm.tsx` lacks a show/hide password toggle and does not offer a "Resend verification email" link on login error.
- **Impact:** Users who mistype their password cannot inspect it, and users with unconfirmed accounts have no direct recovery path from `/login`.

---

## 4. Proposed Step 2 Implementation Plan

Upon your approval, we will implement the following minimal, focused fixes strictly in the authentication presentation and action layer:

1. **Precision Error Mapping & Server-Side Logging:**
   - Map Supabase error codes safely:
     - `invalid_credentials` $\rightarrow$ Generic "Invalid email or password. Please check your credentials."
     - `email_not_confirmed` $\rightarrow$ "Your email address has not been confirmed. [Resend verification email]"
     - `over_request_rate_limit` / `over_email_send_rate_limit` $\rightarrow$ "Too many requests. Please wait a few moments before trying again."
     - Network / 500 $\rightarrow$ "Unable to connect to authentication server. Please try again."
   - Log masked server-side diagnostics (`error.code`, `error.status`, masked email identifier `u***@domain`) without ever logging passwords, tokens, or plaintext secrets.
2. **Login Page Enhancements (`LoginForm.tsx`):**
   - Add accessible Show/Hide password toggle.
   - Display contextual "Resend verification email" action when `email_not_confirmed` is detected.
   - Add double-submit prevention.
   - Ensure proper HTML `autocomplete="email"` and `autocomplete="current-password"`.
3. **Environment & Port Harmonization:**
   - Update `NEXT_PUBLIC_APP_URL` to `http://localhost:3001` in `.env.local` and update `.env.example` with clear documentation.
   - Remove hardcoded `localhost:3000` fallbacks across `app/actions/auth.ts`, deriving the origin from `NEXT_PUBLIC_APP_URL` or dynamic request headers.
4. **Dev-Only Diagnostic Endpoint:**
   - Add `/api/dev/auth-health` (accessible only in non-production, zero secret exposure) to report:
     - Configured project ref (e.g. `doxluj...`)
     - Supabase Auth ping status
     - Cookie presence
5. **Documentation (`docs/AUTH-SETUP.md`):**
   - Step-by-step checklist for the Supabase Dashboard:
     - Adding `http://localhost:3001/**` and production URLs to **Redirect URLs**.
     - How to inspect user confirmation status and trigger "Send password recovery" directly from the dashboard if email rate limits are active.
     - Custom SMTP integration guide (Resend / AWS SES / SendGrid) to overcome Supabase free-tier 3-email/hr rate limits.

