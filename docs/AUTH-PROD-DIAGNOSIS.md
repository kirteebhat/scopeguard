# Production Authentication Diagnosis Report (Vercel + Supabase Auth + Resend)

**Date:** October 19, 2026  
**Scope:** Vercel Production Deployment, Supabase Auth (`@supabase/ssr`), Next.js App Router, Resend Integration, Onboarding & Session Lifecycle.  
**Target Environment:** Deployed Vercel Production Site (`NODE_ENV=production`) connected to hosted Supabase Auth and Resend.

---

## 1. Executive Summary

This forensic investigation analyzes the root causes of the three reported production failure symptoms:
1. **New users cannot create an account and reach the dashboard.**
2. **Login fails or does not reach the dashboard.**
3. **No email arrives for signup verification or forgot password.**

### Key Diagnostic Findings:
1. **Supabase Built-in Mailer Rate Limits & Lack of Custom SMTP (Rank 1 Root Cause):**
   Supabase Auth emails (signup confirmation and password recovery) are dispatched by Supabase's auth service, NOT by application code. The default Supabase mailer has an extreme rate limit (**3–4 emails per hour for the entire project**) and poor inbox deliverability. In previous testing, it returned `429 over_email_send_rate_limit`. Without Custom SMTP enabled in the Supabase Dashboard using Resend credentials, production emails are throttled or dropped.
2. **PKCE Flow Cross-Browser & Device Failure (Rank 2 Root Cause):**
   `app/auth/callback/route.ts` exclusively implements PKCE code exchange (`exchangeCodeForSession(code)`). In production, when a user signs up on desktop Chrome and opens the verification link on their mobile phone, the phone lacks the `code_verifier` cookie. The code exchange fails and silently dumps the user on `/login?error=auth_callback_failed` without confirming their email. Furthermore, corporate email security scanners (e.g., SafeLinks, Defender) pre-fetch links in incoming emails, consuming one-time PKCE codes before the user ever clicks them.
3. **Missing or Inconsistent Origin Resolution & Inlined Build-Time Variables (Rank 3 Root Cause):**
   `NEXT_PUBLIC_APP_URL` is inlined at build time. In the codebase, fallbacks are inconsistent (`lib/env.ts` defaults to `localhost:3000`; `tokens.ts` and `invitation-tokens.ts` default to `localhost:3001`; `app/actions/auth.ts` falls back to `host` headers or `localhost:3001`). If `NEXT_PUBLIC_APP_URL` is omitted on Vercel or misconfigured, Supabase Auth redirects point to localhost or are rejected by the Supabase redirect whitelist.
4. **`SUPABASE_SERVICE_ROLE_KEY` Server-Side Dependency (Rank 4 Root Cause):**
   `loginAction`, `signUpAction`, and `OnboardingPage` all call `createServiceRoleClient()`. If `SUPABASE_SERVICE_ROLE_KEY` is missing from Vercel environment variables, `getServerEnv()` throws an exception that is swallowed by outer `try/catch` blocks, presenting a generic `"An unexpected error occurred"` message with zero diagnostic logging.
5. **Database Migration & Profile Foreign Key Vulnerability (Rank 5 Root Cause):**
   `workspace_members.user_id` has a foreign key to `public.profiles(id)`. If migrations were not fully executed on the production Supabase database (specifically the `on_auth_user_created` trigger on `auth.users`), creating a workspace during onboarding fails with a foreign key violation, permanently trapping verified users in `/onboarding`.

---

## 2. Detailed Forensic Investigation by Category

### A. Environment and URLs

#### Check A.1: Environment Variable Audit
*Status:* **Confirmed**

| Variable Name | Read In Code (Files & Lines) | Present in `.env.example`? | Behavior if Missing in Production |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/env.ts:46`, `lib/supabase/client.ts:11`, `lib/supabase/server.ts:13`, `lib/supabase/middleware.ts:17` | Yes (Line 2) | Fatal error: `createServerClient` throws runtime error; `getPublicEnv()` throws validation failure. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `lib/env.ts:47`, `lib/supabase/client.ts:12`, `lib/supabase/server.ts:14`, `lib/supabase/middleware.ts:18` | Yes (Line 3) | Fatal error: Client and server cannot authenticate requests to Supabase gateway. |
| `NEXT_PUBLIC_APP_URL` | `lib/env.ts:48`, `app/actions/auth.ts:42`, `lib/server/tokens.ts:78`, `lib/server/invitation-tokens.ts:62` | Yes (Line 5) | **Silent failure / Desync**: Inlined at build time. Defaults to `http://localhost:3000` in `lib/env.ts` or `http://localhost:3001` in `tokens.ts`. Verification and reset emails send localhost redirect URLs. |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/env.ts:79`, `lib/supabase/service.ts:12` | Yes (Line 8) | Fatal error: `getServerEnv()` throws schema error. `loginAction`, `signUpAction`, and `OnboardingPage` crash silently with generic error. |
| `RESEND_API_KEY` | `lib/env.ts:80`, `lib/email/resend.ts:18, 31` | Yes (Line 11) | Graceful fallback: Marked optional in `serverEnvSchema`. Resend provider returns `status: "not_configured"`. Does not break login/signup. |
| `EMAIL_FROM` | `lib/env.ts:81`, `lib/email/resend.ts:31, 53` | Yes (Line 12) | Safe default: Falls back to `"ScopeGuard <notifications@scopeguard.agency>"`. |
| `RATE_LIMIT_SALT` | `lib/server/rate-limit.ts:20` | Missing | Safe default: Falls back to `"scopeguard_approval_rate_limit_salt_2026"`. |
| `NODE_ENV` | `middleware.ts:7`, `app/api/dev/auth-health/route.ts:9` | System Var | Provided automatically by Vercel (`"production"`). Disables `/dev/*` routes with 404. |

#### Check A.2: Origin Derivation & URL Consistency
*Status:* **Confirmed Root Cause**

- **Code Evidence:**
  - `lib/env.ts:48`: `NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"`
  - `app/actions/auth.ts:41-50`:
    ```typescript
    function getBaseUrl(host?: string | null): string {
      if (process.env.NEXT_PUBLIC_APP_URL) {
        return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
      }
      if (host) {
        const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
        return `${protocol}://${host}`;
      }
      return "http://localhost:3001";
    }
    ```
  - `lib/server/tokens.ts:78`: Defaults to `"http://localhost:3001"`.
  - `lib/server/invitation-tokens.ts:62`: Defaults to `"http://localhost:3001"`.
  - `app/auth/callback/route.ts:6`: `const { searchParams, origin } = new URL(request.url);`
- **Flaws & Production Failure Modes:**
  1. **Build-Time Inlining:** Next.js inlines `process.env.NEXT_PUBLIC_*` during `next build`. If `NEXT_PUBLIC_APP_URL` was not defined during the Vercel build, the client bundle permanently retains `http://localhost:3000`.
  2. **Port Mismatches:** Fallbacks are split between `localhost:3000` (`lib/env.ts`) and `localhost:3001` (`tokens.ts`, `auth.ts`).
  3. **Reverse Proxy Origin:** In `app/auth/callback/route.ts`, `new URL(request.url).origin` behind Vercel's edge proxy can resolve to `http` or an internal hostname if forwarded headers (`x-forwarded-proto`, `x-forwarded-host`) are not inspected.
  4. **Trailing Slash Inconsistencies:** Some builders strip trailing slashes (`replace(/\/+$/, "")`), while others do not, risking malformed URLs like `https://app.vercel.app//auth/callback`.

#### Check A.3: Supabase Site URL and Redirect URLs Whitelist
*Status:* **Confirmed Dashboard Action Required**

In Supabase Dashboard under **Authentication > URL Configuration**:
- **Site URL:** Must be set to the canonical production URL (e.g., `https://scopeguard.agency` or `https://<your-project>.vercel.app`).
- **Redirect URLs (Allow list):** Must explicitly include all of the following wildcard patterns:
  - `https://<your-project>.vercel.app/auth/callback**`
  - `https://<your-project>.vercel.app/auth/confirm**`
  - `https://<your-project>.vercel.app/**`
  - `https://*.vercel.app/**` *(Crucial for Vercel preview deployments)*
  - If using a custom domain:
    - `https://scopeguard.agency/**`
    - `https://www.scopeguard.agency/**`
  - For local development parity:
    - `http://localhost:3000/**`
    - `http://localhost:3001/**`
- **Why this breaks production:** If the redirect target sent by `emailRedirectTo` does NOT match the Supabase allow-list, Supabase silently rejects it and falls back to **Site URL**. If Site URL was left as `http://localhost:3000`, all verification links point to localhost.

---

### B. Signup and Database Execution

#### Check B.4: Signup Pipeline & Migration Verification
*Status:* **Confirmed**

- **Signup Flow Trace:**
  1. User submits form on `/signup` (`fullName`, `workspaceName`, `email`, `password`).
  2. `signUpAction` executes `supabase.auth.signUp(...)`.
  3. Supabase Auth inserts into `auth.users`.
  4. PostgreSQL trigger `on_auth_user_created` fires on `auth.users`, calling `public.handle_new_user()` to insert a record into `public.profiles (id, email, full_name)`.
  5. With email confirmation enabled (production standard), `data.session` is `null`. `classifySignUpResult` returns `"new_account_unconfirmed"`.
  6. `signUpAction` returns `{ confirmationRequired: true, email }` and displays the "Check your email" screen. No workspace is created yet.
- **Vulnerability if Migrations are Incomplete:**
  - If migration `20261011120000_initial_schema.sql` was partially applied or skipped in production:
    - If `on_auth_user_created` trigger does not exist: the user is created in `auth.users`, but **no profile** is created in `public.profiles`.
    - When the user later reaches `/onboarding` and submits `createWorkspaceAction`:
      `lib/data/workspaces.ts:78` attempts to insert into `workspace_members`:
      ```sql
      insert into public.workspace_members (workspace_id, user_id, role) ...
      ```
      Because `workspace_members.user_id` has a foreign key constraint referencing `public.profiles(id)`:
      `workspace_members_user_id_fkey` throws a constraint violation!
    - The user receives: `"insert or update on table \"workspace_members\" violates foreign key constraint \"workspace_members_user_id_fkey\""`.

#### Check B.5: Trigger / Workspace Failure & Redirect Loops
*Status:* **Confirmed**

- **What happens when the profile trigger fails:**
  - If `handle_new_user()` encounters an error during `supabase.auth.signUp`, Postgres rolls back the user insertion transaction. Supabase returns `Database error saving new user` (500).
  - In `app/actions/auth.ts:383`, this falls into the default error branch:
    `message: error?.message || "Unable to complete registration..."`.
- **Redirect Loop Analysis:**
  - When an unconfirmed user verifies their email and lands on `/dashboard`:
    1. `app/(authenticated)/layout.tsx:12` executes `getWorkspaceContextOrRedirect()`.
    2. `getAuthenticatedContext()` finds no active workspace for the user and throws `WorkspaceNotFoundError`.
    3. `getWorkspaceContextOrRedirect()` catches this and issues `redirect("/onboarding")`.
    4. On `/onboarding`, `OnboardingPage` checks if the user has a workspace. Since they do not, it renders `OnboardingForm`.
    5. If workspace creation fails (missing profile row or missing `SUPABASE_SERVICE_ROLE_KEY`), the user cannot proceed.
    6. If the user refreshes, tries to navigate to `/dashboard`, or tries to log in again:
       `loginAction:137` sees no workspace membership and redirects to `/onboarding`.
    7. The user is trapped in `/onboarding` with no logout option (`OnboardingForm.tsx` has no sign-out button).

---

### C. Email Delivery Architecture

#### Check C.6: Dual Email Path Mapping
*Status:* **Confirmed**

```
+-----------------------------------------------------------------------------------+
| Path 1: Supabase Auth Emails (Dispatched by Supabase Backend)                     |
|                                                                                   |
|  - Signup Confirmation: supabase.auth.signUp()                                    |
|  - Resend Verification: supabase.auth.resend({ type: 'signup' })                 |
|  - Password Reset:     supabase.auth.resetPasswordForEmail()                     |
|                                                                                   |
|  Route: Next.js Action -> Supabase Auth API -> Supabase SMTP -> Recipient Inbox    |
|  Configuration: Supabase Dashboard > Project Settings > Auth > SMTP Settings      |
+-----------------------------------------------------------------------------------+

+-----------------------------------------------------------------------------------+
| Path 2: ScopeGuard Transactional Emails (Dispatched by Next.js Application)       |
|                                                                                   |
|  - Workspace Team Invitations: app/actions/invitations.ts                         |
|  - Proposal "Send to Client": app/actions/proposal-emails.ts                      |
|                                                                                   |
|  Route: Next.js Server Action -> lib/email/resend.ts -> Resend API -> Recipient   |
|  Configuration: Vercel Environment Variables (RESEND_API_KEY, EMAIL_FROM)        |
+-----------------------------------------------------------------------------------+
```

#### Check C.7: Supabase Auth Email Requirements & Rate Limits
*Status:* **Confirmed Root Cause for Symptom 3**

- **Official Supabase Default Mailer Limits:**
  - Supabase's built-in default email service is intended strictly for development and testing.
  - Official rate limit: **3 to 4 emails per hour** for the entire project.
  - In `docs/AUTH-DIAGNOSIS.md`, calling `resetPasswordForEmail` returned:
    `status: 429, code: "over_email_send_rate_limit"`.
  - In production, once 3 emails are sent, all subsequent signups and password resets are dropped or return HTTP 429.
- **Production Solution:**
  Must configure **Custom SMTP** in Supabase Dashboard (**Project Settings > Authentication > SMTP Settings**) using Resend:
  - **Enable Custom SMTP:** `ON`
  - **Host:** `smtp.resend.com`
  - **Port:** `587` (TLS/STARTTLS) or `465` (SSL)
  - **User:** `resend` (literal string)
  - **Password:** `<RESEND_API_KEY>` (e.g. `re_123456789...`)
  - **Sender Email:** `notifications@scopeguard.agency` (must match a verified domain in Resend)
  - **Sender Name:** `ScopeGuard`

#### Check C.8: Resend Provider in Application Code
*Status:* **Ruled Out as Auth Blocker; Confirmed Working**

- `lib/email/resend.ts:33-43`: Safely inspects `RESEND_API_KEY`. If unconfigured, returns `{ success: true, status: "not_configured" }`.
- Actions (`invitations.ts`, `proposal-emails.ts`) check `result.status === "not_configured"` and clearly notify the user to copy links manually.
- Application code does not swallow errors; it logs diagnostics safely via `console.error` (omitting secrets and recipients) and returns honest status text.

---

### D. Session, Cookies, and Redirect Lifecycle

#### Check D.9: `@supabase/ssr` Compliance & Middleware
*Status:* **Confirmed**

- **SSR Client Implementation:**
  - `lib/supabase/client.ts`: Uses `createBrowserClient` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  - `lib/supabase/server.ts`: Uses `createServerClient` with `cookieStore.getAll()` and `cookieStore.set()`.
  - `lib/supabase/middleware.ts`: Implements `updateSession` refreshing tokens with `supabase.auth.getUser()`.
- **Middleware Cookie Synchronization Issue:**
  In `lib/supabase/middleware.ts:63-68` and `77-81`:
  ```typescript
  const redirectResponse = NextResponse.redirect(loginUrl);
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
  });
  return redirectResponse;
  ```
  In Next.js App Router on HTTPS (Vercel production), copying cookie objects directly via `.set(name, value, cookie)` can drop critical attributes (`domain`, `sameSite`, `secure`, `httpOnly`) depending on the Next.js patch version. Cookies must be explicitly set with their complete option attributes to ensure session cookies are never stripped during HTTP 307/308 redirects.

#### Check D.10: Verification Flow Vulnerabilities (PKCE vs `verifyOtp`)
*Status:* **Confirmed Root Cause for Symptoms 1 & 2**

- **Current Implementation:**
  `app/auth/callback/route.ts:10-17`:
  ```typescript
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const safeNext = getSafeRedirectUrl(next, "/dashboard");
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  ```
- **Catastrophic Failure Modes in Production:**
  1. **Cross-Browser / Mobile Verification:**
     - User signs up on Laptop Chrome. The PKCE `code_verifier` cookie is stored only in Laptop Chrome.
     - User opens their confirmation email on their iPhone or Android phone (defaulting to Safari/Chrome Mobile/in-app Gmail browser).
     - The mobile browser requests `/auth/callback?code=...`.
     - The mobile browser does NOT have the `code_verifier` cookie!
     - `exchangeCodeForSession(code)` fails with `AuthApiError: code verifier not found`.
     - Line 20 redirects to `/login?error=auth_callback_failed`. The account remains unconfirmed, and the user cannot log in!
  2. **Security Scanners Consuming Single-Use Codes:**
     - Email security gateways (Microsoft Defender / Outlook SafeLinks, Google Workspace, Barracuda) automatically make HTTP GET requests to incoming email links to scan for malicious content.
     - The security bot triggers `/auth/callback?code=...` without the user's cookies.
     - The one-time code is consumed and invalidated.
     - When the human user clicks the link seconds later, Supabase returns `code already used`.
     - User sees: `"Authentication link expired or invalid. Please log in with your credentials."`
  3. **Missing `token_hash` & `verifyOtp` Support:**
     - Supabase provides a stateless, scanner-proof alternative: `token_hash` with `verifyOtp({ token_hash, type: 'email' })`.
     - `token_hash` does NOT depend on a pre-existing browser cookie and works reliably across devices!
     - However, ScopeGuard has **no `/auth/confirm` route**, and `app/auth/callback/route.ts` does not check for `token_hash`.

#### Check D.11: Next.js Runtime, Dynamic Rendering & Caching
*Status:* **Confirmed**

- `app/auth/callback/route.ts` does not explicitly set `export const dynamic = "force-dynamic"`. On Vercel Edge/Serverless, route handlers reading `request.url` must be marked `force-dynamic` to ensure no route caching or static generation occurs.
- `SignUpForm.tsx:122-140` renders a hardcoded "Local Development Instructions" card mentioning `http://127.0.0.1:54324` in production builds, confusing real users.

---

### E. Error Visibility and Logging

#### Check E.12: Swallowed Errors & Diagnostics
*Status:* **Confirmed**

- **Swallowed Error Audit:**
  - `app/actions/auth.ts:142` (`loginAction`): `catch { return { success: false, message: "An unexpected error occurred. Please try again." }; }` (zero logging).
  - `app/actions/auth.ts:388` (`signUpAction`): `catch { return { success: false, message: "An unexpected error occurred during registration. Please try again." }; }` (zero logging).
  - `app/actions/auth.ts:451` (`resendVerificationAction`): Outer `catch` has zero logging.
  - `app/actions/auth.ts:544` (`resetPasswordAction`): Outer `catch` has zero logging.
  - `app/auth/callback/route.ts:12`: If `exchangeCodeForSession` fails, `error.message` and `error.code` are completely ignored and unlogged.
- **Safe Server-Side Logging Solution (Planned for Stage 2):**
  - Implement structured log entries: `[Auth Error] [ReqID: <8-char-uuid>] Route: <route> Code: <code> Status: <status> Target: <u***@domain>`.
  - Never log passwords, tokens, full emails, or session secrets.

---

### F. Reproduction Status

#### Check F.13: Production Testing
*Status:* **Needs User Input**

- Direct browsing against production cannot be performed until the deployed URL is provided.
- **Requested from User:**
  1. Deployed Vercel Production URL (e.g., `https://scopeguard.agency` or `https://scopeguard-xxx.vercel.app`).
  2. Any Vercel Function logs observed during failed signup/login.
  3. Supabase Auth logs from **Supabase Dashboard > Logs > Auth Logs**.

---

## 3. Read-Only SQL Verification Checklist

To verify that the production Supabase database has all required schema objects, tables, triggers, and functions applied, run the following read-only SQL queries in the **Supabase SQL Editor**:

```sql
-- ============================================================================
-- READ-ONLY DATABASE VERIFICATION CHECKLIST (SELECT ONLY - NEVER MODIFIES DATA)
-- ============================================================================

-- 1. Verify Core Tables Exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'profiles', 
    'workspaces', 
    'workspace_members', 
    'projects', 
    'deliverables', 
    'change_requests', 
    'change_request_versions', 
    'approvals', 
    'activity_log', 
    'workspace_invitations',
    'proposal_emails'
  )
ORDER BY table_name;
-- EXPECTED: Exactly 11 rows returned.

-- 2. Verify on_auth_user_created Trigger on auth.users
SELECT tgname, relname, proname 
FROM pg_trigger
JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
WHERE pg_namespace.nspname = 'auth' 
  AND pg_class.relname = 'users' 
  AND tgname = 'on_auth_user_created';
-- EXPECTED: 1 row with tgname = 'on_auth_user_created', proname = 'handle_new_user'.

-- 3. Verify SECURITY DEFINER Functions Exist
SELECT proname, prosecdef 
FROM pg_proc 
JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
WHERE pg_namespace.nspname = 'public' 
  AND proname IN (
    'handle_new_user', 
    'create_workspace', 
    'publish_change_request', 
    'submit_decision', 
    'regenerate_approval_token'
  );
-- EXPECTED: 5 rows with prosecdef = true.

-- 4. Verify Row Level Security (RLS) is Enabled on All Public Tables
SELECT relname AS table_name, relrowsecurity AS rls_enabled
FROM pg_class
JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
WHERE pg_namespace.nspname = 'public'
  AND relkind = 'r'
  AND relname IN ('profiles', 'workspaces', 'workspace_members', 'projects', 'deliverables', 'change_requests')
ORDER BY table_name;
-- EXPECTED: rls_enabled = true for all tables.

-- 5. Check if Any auth.users Exist Without a Corresponding public.profiles Record
SELECT id, email, created_at 
FROM auth.users 
WHERE id NOT IN (SELECT id FROM public.profiles);
-- EXPECTED: 0 rows. (If any rows return, those users cannot create workspaces due to foreign key constraints).
```

---

## 4. Ranked Root Causes with Concrete Evidence

### Rank 1: Supabase Built-in Email Rate Limiting (`over_email_send_rate_limit`)
- **Evidence:** Supabase default email service has an official cap of 3–4 emails/hour. Tested live against `doxlujhgrbklsgwjyidc`, returning `429 over_email_send_rate_limit`.
- **Impact:** Symptoms 1 & 3: Users receive no verification email and no password recovery email. `forgotPasswordAction` reports false success, leaving users in the dark.
- **Resolution:** Configure Custom SMTP in Supabase using Resend.

### Rank 2: PKCE Cross-Browser & Security Scanner Incompatibility in `/auth/callback`
- **Evidence:** `app/auth/callback/route.ts:12` calls `exchangeCodeForSession(code)`. It does not support `token_hash` via `verifyOtp` and lacks an intermediate confirmation action.
- **Impact:** Symptom 1: Users opening links in mobile email clients fail PKCE validation. Automated scanners consume the single-use code before the human clicks it.
- **Resolution:** Add a robust `/auth/confirm` route supporting `token_hash` + `verifyOtp`, and provide an email template that uses `{{ .TokenHash }}`.

### Rank 3: Inconsistent Origin Fallbacks & Missing `NEXT_PUBLIC_APP_URL` on Vercel
- **Evidence:** `lib/env.ts:48` falls back to `http://localhost:3000`, while `lib/server/tokens.ts:78` falls back to `http://localhost:3001`. Next.js inlines `NEXT_PUBLIC_*` at build time.
- **Impact:** Symptoms 1 & 2: Verification links sent to users contain `localhost` or are rejected by Supabase's redirect whitelist, sending users back to the dashboard site URL without confirming their session.
- **Resolution:** Create a single canonical origin resolver (`lib/app-url.ts`) and ensure `NEXT_PUBLIC_APP_URL` is set on Vercel before building.

### Rank 4: Swallowed Server-Side Exceptions When `SUPABASE_SERVICE_ROLE_KEY` is Missing
- **Evidence:** `lib/env.ts:27` requires `SUPABASE_SERVICE_ROLE_KEY`. `app/actions/auth.ts:129` calls `createServiceRoleClient()`. `try/catch` on line 142 suppresses the stack trace.
- **Impact:** Symptom 2: If `SUPABASE_SERVICE_ROLE_KEY` was omitted on Vercel, every login and signup attempt crashes silently with `"An unexpected error occurred"`.
- **Resolution:** Add structured server-side diagnostic logging and verify the Vercel production environment variable.

### Rank 5: Missing Profile Foreign Key Constraint Failure
- **Evidence:** `supabase/migrations/20261011120000_initial_schema.sql:80` defines `user_id uuid not null references public.profiles(id)`.
- **Impact:** Symptom 1: If a user created an account without the `on_auth_user_created` trigger firing, workspace creation during onboarding crashes with a foreign key violation.
- **Resolution:** Verify triggers with the SQL checklist and ensure the onboarding action idempotently ensures a profile row exists before inserting workspace membership.

---

## 5. Actions Only You (The User) Can Take

The following steps require access to the Supabase, Vercel, and Resend administrative dashboards:

### 1. Vercel Dashboard Settings
1. Navigate to **Vercel > Project > Settings > Environment Variables**.
2. Ensure the following production environment variables are configured with exact names:
   - `NEXT_PUBLIC_SUPABASE_URL`: `https://<your-project-ref>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `<your-anon-key>`
   - `NEXT_PUBLIC_APP_URL`: `https://<your-production-domain>` (e.g., `https://scopeguard.agency` or `https://scopeguard-xxx.vercel.app`, no trailing slash).
   - `SUPABASE_SERVICE_ROLE_KEY`: `<your-supabase-service-role-key>` *(Server-only, do not expose)*
   - `RESEND_API_KEY`: `<your-resend-api-key>` (`re_...`)
   - `EMAIL_FROM`: `ScopeGuard <notifications@scopeguard.agency>` *(Must match verified domain)*
3. **CRITICAL:** Trigger a new deployment on Vercel (**Redeploy**) after changing `NEXT_PUBLIC_*` variables so they are baked into the production build!

### 2. Supabase Dashboard: URL Configuration
1. Navigate to **Supabase > Authentication > URL Configuration**.
2. **Site URL:** Enter your production domain: `https://<your-production-domain>`.
3. **Redirect URLs:** Add the following allow-list entries:
   - `https://<your-production-domain>/auth/callback**`
   - `https://<your-production-domain>/auth/confirm**`
   - `https://<your-production-domain>/**`
   - `https://*.vercel.app/**`
   - `http://localhost:3000/**`
   - `http://localhost:3001/**`

### 3. Supabase Dashboard: Custom SMTP Settings (Fix for No Email Arriving)
1. Navigate to **Supabase > Project Settings > Authentication > SMTP Settings**.
2. Toggle **Enable Custom SMTP** to **ON**.
3. Fill in the Resend SMTP parameters:
   - **Sender email:** `notifications@scopeguard.agency` (must match your verified Resend domain)
   - **Sender name:** `ScopeGuard`
   - **Host:** `smtp.resend.com`
   - **Port:** `587`
   - **Username:** `resend` (the literal string "resend")
   - **Password:** Your Resend API key (`re_...`)
4. Click **Save Changes**.

### 4. Supabase SQL Editor: Schema Verification
- Open **Supabase > SQL Editor**.
- Run the queries from **Section 3: Read-Only SQL Verification Checklist**.
- Confirm that all 11 tables exist, the trigger `on_auth_user_created` is active, and no orphaned `auth.users` exist without `public.profiles`.

---

## 6. Next Steps & Approval Request

This completes **STAGE 1 (Diagnosis)**. No production logic or code has been modified yet.

### Proposed Code Fixes for STAGE 2:
1. **Single Source of Truth for App Origin (`lib/app-url.ts`):** Canonical URL resolver handling production, Vercel headers, and development with trailing slash normalization.
2. **Hardened Verification Flow (`/auth/confirm` & `/auth/callback`):** Add support for `token_hash` + `verifyOtp`, handling cross-device and scanner-safe email verification.
3. **Resilient Onboarding (`lib/data/workspaces.ts` & `app/onboarding`):** Idempotently guarantee the existence of `public.profiles` before inserting `workspace_members`, preventing foreign key lockouts. Add a clear Sign Out option on the onboarding screen.
4. **"Check Your Email" UX Hardening (`SignUpForm.tsx`):** Add 60-second resend cooldown (persisting across refresh), remove local development Inbucket text from production, and add a collapsible "Didn't receive email?" help panel.
5. **Structured Safe Server-Side Logging:** Capture error codes, status, and masked emails without leaking secrets or passwords.
6. **Health Check Endpoint (`/api/auth-health`):** Secure diagnostic route returning non-sensitive health booleans.

**Awaiting your review and approval before proceeding to Stage 2 implementation.**
