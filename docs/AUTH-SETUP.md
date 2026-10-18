# ScopeGuard Authentication & Supabase Configuration Guide

This guide details the complete configuration required for authentication in the ScopeGuard application across local development, testing, and production environments.

---

## 1. Quick Reference: Seed Development Accounts

Pre-confirmed development accounts with active workspaces are available for immediate login at `http://localhost:3001/login`:

| Email | Password | Role | Default Workspace |
|---|---|---|---|
| `demo@scopeguard.com` | `Password123!` | Owner | ScopeGuard Demo Workspace |
| `founder@acme.agency` | `Password123!` | Owner | Acme Agency Workspace |

To re-seed or verify these accounts at any time, run:
```bash
node scripts/ensure-demo-user.mjs
```

---

## 2. Supabase Dashboard URL Configuration

When running locally on port **3001** (or deploying to staging/production), the redirect allow-list in your Supabase project must include the application origin. Otherwise, Supabase will reject redirects with an error or default back to an unwhitelisted port.

### Configuration Steps:
1. Open the [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project: **`doxlujhgrbklsgwjyidc`**.
3. In the sidebar, navigate to **Authentication** &rarr; **URL Configuration**.
4. **Site URL:**
   - Set to `http://localhost:3001` for local development (or your production domain).
5. **Redirect URLs (Allow-list):**
   - Click **Add URL** and add the following entries:
     - `http://localhost:3001/**`
     - `http://localhost:3000/**` *(optional fallback)*
     - `https://your-production-domain.com/**`
6. Click **Save Changes**.

---

## 3. Email Confirmation & Rate Limiting

### Understanding the Free-Tier Rate Limits
Hosted Supabase projects on the free tier enforce a built-in email rate limit of **3 emails per hour**. Exceeding this rate returns:
```json
{
  "code": "over_email_send_rate_limit",
  "status": 429,
  "message": "email rate limit exceeded"
}
```

### Best Practices for Local Development:
1. **Direct Password Sign-in:** Use the pre-confirmed accounts above (`demo@scopeguard.com`) which do not require email re-verification.
2. **Manual Email Confirmation via Supabase Dashboard:**
   - If an account was registered with an unconfirmed email, navigate to **Authentication** &rarr; **Users**.
   - Locate the user row, click the **...** (Options) menu on the right, and select **Confirm Email**.
3. **Password Reset without Mailer:**
   - From the same **Authentication** &rarr; **Users** table, select **Send Password Recovery** or click **Auto-confirm User**.
4. **Disabling Email Confirmations (Dev-only Project):**
   - If using a dedicated local or development project, navigate to **Authentication** &rarr; **Email Templates / Providers** &rarr; uncheck **Enable Email Confirmations** to allow immediate login on signup without email dispatch.

### Setting up Custom SMTP for Production:
To send unlimited verification and recovery emails without rate limits:
1. In the Supabase Dashboard, go to **Authentication** &rarr; **SMTP Settings**.
2. Toggle **Enable Custom SMTP**.
3. Enter credentials from **Resend**, **Postmark**, **AWS SES**, or **SendGrid**:
   - **Sender email:** `support@yourdomain.com`
   - **Sender name:** `ScopeGuard Security`
   - **Host:** `smtp.resend.com` (or your provider's SMTP host)
   - **Port:** `587`
   - **Username / Password:** Provided by your mail vendor.
4. Save and send a test email to verify.

---

## 4. Local Environment Variables (.env.local)

Ensure your `.env.local` contains the harmonized port `3001`:

```ini
# Supabase Cloud Project Configuration
NEXT_PUBLIC_SUPABASE_URL=https://doxlujhgrbklsgwjyidc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_foENyzFDp1nzwph1Mt7yUQ_a1yZx47j
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Server-only development key (Bypasses RLS - keep secure)
SUPABASE_SERVICE_ROLE_KEY=sb_secret_LljGE8sy1LHWlU_0TI0lGQ_4e_uoDJ5
```

> [!CAUTION]
> In accordance with AGENTS.md rules:
> - `SUPABASE_SERVICE_ROLE_KEY` must **never** be prefixed with `NEXT_PUBLIC_` or imported into client components.
> - Client components only access `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

---

## 5. Dev Diagnostic Health Route

ScopeGuard provides a lightweight dev diagnostic endpoint at `/api/dev/auth-health`:

- **URL:** `http://localhost:3001/api/dev/auth-health`
- **Security:** Returns `404 Not Found` in production environments. Never leaks service role keys, tokens, or plaintext secrets.
- **Sample Output:**
```json
{
  "status": "healthy",
  "environment": "development",
  "appUrl": "http://localhost:3001",
  "projectRef": "doxlujhgrbklsgwjyidc",
  "supabaseConfigured": true,
  "authPing": {
    "status": "ok",
    "latencyMs": 142
  },
  "session": {
    "hasAuthCookie": true,
    "cookieName": "sb-doxlujhgrbklsgwjyidc-auth-token"
  },
  "timestamp": "2026-10-18T16:45:00.000Z"
}
```
