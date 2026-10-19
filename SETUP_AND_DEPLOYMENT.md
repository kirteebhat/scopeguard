# ScopeGuard: Setup & Deployment Guide

This guide provides end-to-end operational instructions for configuring, developing, testing, and deploying **ScopeGuard** across local environments and production cloud infrastructure (Vercel + Supabase + Resend).

---

## 1. Prerequisites & Version Requirements

| Dependency / Tool | Required Version | Verification Command | Notes |
|---|---|---|---|
| **Node.js** | `v18.17.0+` or `v20+ LTS` *(flagged: no `"engines"` field declared in `package.json`)* | `node -v` | Next.js 15 requires Node.js 18.17.0 or higher. Node.js 20.x or 22.x LTS is strongly recommended. |
| **npm** | `v9.0.0+` | `npm -v` | Default package manager packaged with Node.js. |
| **Git** | `v2.30+` | `git --version` | Source code version control. |
| **Supabase Account** | Cloud or CLI | N/A | Hosted project at [supabase.com](https://supabase.com) or local CLI via Docker. |
| **Resend Account** | Optional (P1 Email) | N/A | For transactional emails at [resend.com](https://resend.com). |

---

## 2. Repository Installation

### Step 1: Clone Repository
```bash
git clone https://github.com/kirteebhat/scopeguard.git
cd scopeguard
```

### Step 2: Install Node Modules
```bash
npm install
```
This installs all application dependencies, dev dependencies (Playwright, Vitest, PGlite, TypeScript, Tailwind), and sets up lockfile parity.

---

## 3. Environment Variable Configuration

Create your local environment file by copying `.env.example`:
```bash
cp .env.example .env.local
```

### Environment Variables Reference Table

| Variable Name | Realm | Required? | Where to Obtain | Format / Validation | Example Placeholder |
|---|:---:|:---:|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser & Server | **Yes** | Supabase Project Settings -> API -> Project URL | Valid HTTPS URL | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser & Server | **Yes** | Supabase Project Settings -> API -> Project API Keys -> `anon` / `public` | String (JWT / Publishable Key) | `your-supabase-anon-key` |
| `NEXT_PUBLIC_APP_URL` | Browser & Server | **Yes** | Local dev server port or production Vercel domain | Valid URL without trailing slash | `http://localhost:3000` (or `https://your-app.vercel.app`) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server Only** | **Yes** | Supabase Project Settings -> API -> Project API Keys -> `service_role` (Secret) | String (Secret Token) | `your-supabase-service-role-key` |
| `RESEND_API_KEY` | Server Only | Optional | Resend Dashboard -> API Keys | String starting with `re_` | `re_your_resend_api_key_here` |
| `EMAIL_FROM` | Server Only | Optional | Verified sender domain in Resend | RFC 5322 formatted email address | `ScopeGuard <notifications@youragency.com>` |
| `RATE_LIMIT_SALT` | Server Only | Optional | Self-generated random secret string | Arbitrary secret string | `your_custom_secret_salt_12345` |

### Discrepancy Note Against `.env.example`
- `RATE_LIMIT_SALT` is utilized in `lib/server/rate-limit.ts` to hash client IP addresses. If omitted, the application uses a secure hardcoded fallback string (`"scopeguard_approval_rate_limit_salt_2026"`). It is not listed in `.env.example` but can be optionally set in production.
- All other 6 variables are documented in `.env.example` and validated via Zod schemas in `lib/env.ts`.

> [!CAUTION]
> **Service-Role Isolation Rule:** `SUPABASE_SERVICE_ROLE_KEY` must **NEVER** be prefixed with `NEXT_PUBLIC_` and must **NEVER** be used in client components. The `lib/env.ts` validator enforces an immediate runtime check that throws an exception if accessed from browser environments (`typeof window !== "undefined"`).

---

## 4. Supabase Database Setup & Migrations

ScopeGuard contains 5 ordered, idempotent SQL migrations in `supabase/migrations/`.

### Migration Sequence:
1. `20261011120000_initial_schema.sql`
   - Provisions utility trigger `handle_updated_at()`.
   - Creates ENUM types: `member_role`, `project_status`, `deliverable_status`, `pricing_method`.
   - Creates tables: `profiles`, `workspaces`, `workspace_members`, `projects`, `deliverables`.
   - Provisions user registration trigger `on_auth_user_created` on `auth.users`.
   - Creates stored procedure `create_workspace(name text)`.
2. `20261011130000_change_requests_and_approvals.sql`
   - Creates ENUM types: `change_request_status`, `decision_type`, `actor_type`.
   - Creates tables: `change_requests`, `change_request_versions`, `approval_tokens`, `approvals`, `activity_logs`, `approval_attempts`.
   - Adds trigger `tr_block_version_mutation` to guarantee immutable version snapshots.
   - Creates stored procedures: `publish_change_request`, `revise_change_request`, `withdraw_change_request`, `regenerate_approval_token`, `get_proposal_by_token`, and `submit_decision`.
3. `20261011140000_row_level_security.sql`
   - Creates helper functions: `is_workspace_member()`, `workspace_role()`, `get_project_workspace_id()`, `get_change_request_workspace_id()`.
   - Enables Row-Level Security (RLS) across all tables with default-deny policies.
   - Revokes client-direct execution of `get_proposal_by_token` and `submit_decision` from `anon` and `authenticated`; grants strictly to `service_role`.
4. `20261018230000_workspace_invitations.sql`
   - Creates table: `workspace_invitations` with unique pending email partial index.
   - Enables RLS on `workspace_invitations` (accessible only by workspace owner/manager).
   - Creates stored procedures: `create_invitation`, `resend_invitation`, `revoke_invitation`, `get_invitation_by_token`, and `accept_invitation`.
5. `20261019000000_proposal_emails.sql`
   - Alters `projects` table to add nullable `client_contact_name` and `client_contact_email` columns.
   - Creates table: `proposal_emails` (outbound delivery log) with strict RLS default deny.
   - Creates stored procedures: `begin_proposal_email`, `complete_proposal_email`, and `set_project_client_contact`.

### Option A: Hosted Supabase Project (Recommended)
1. Navigate to your [Supabase Project Dashboard](https://supabase.com/dashboard).
2. Open the **SQL Editor** from the left navigation.
3. Open each migration file from `supabase/migrations/` in order (1 through 5).
4. Copy and paste the contents into the SQL Editor and click **Run**.
5. *(Optional Demo Data)*: Run `supabase/seed.sql` to populate sample projects and change requests.

### Option B: Local Supabase CLI
```bash
# Initialize and start local containers (requires Docker)
npx supabase start

# Apply all migrations and seed data
npx supabase db reset
```

### Verification Checklist After Database Setup
Execute this query in the Supabase SQL Editor to confirm table creation and RLS coverage:
```sql
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```
Expected output: Exactly **13 tables**, each with `rowsecurity = true`:
- `activity_logs`
- `approval_attempts`
- `approval_tokens`
- `approvals`
- `change_request_versions`
- `change_requests`
- `deliverables`
- `profiles`
- `projects`
- `proposal_emails`
- `workspace_invitations`
- `workspace_members`
- `workspaces`

---

## 5. Running the Application Locally

Only package scripts declared in `package.json` are used:

```bash
# 1. Start development server
npm run dev
# The application boots on http://localhost:3000 (or http://localhost:3001)

# 2. Run static ESLint checks
npm run lint

# 3. Run strict TypeScript compiler verification
npm run typecheck

# 4. Run automated unit and integration tests (includes in-memory PGlite RLS tests)
npm run test

# 5. Build for production locally
npm run build

# 6. Start the local production server
npm run start
```

---

## 6. Production Deployment on Vercel

ScopeGuard is configured for native deployment on the Vercel platform.

### Step-by-Step Vercel Setup:
1. Push your repository to your GitHub account:
   ```bash
   git push origin main
   ```
2. Log in to [Vercel](https://vercel.com) and click **Add New... -> Project**.
3. Import your `scopeguard` repository.
4. **Configure Project Settings:**
   - **Framework Preset:** `Next.js`
   - **Root Directory:** `./`
   - **Build Command:** `next build` (default)
   - **Output Directory:** `.next` (default)
   - **Install Command:** `npm install` (default)
5. **Add Environment Variables:**
   Under **Environment Variables**, configure the 4 required production variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: `https://doxlujhgrbklsgwjyidc.supabase.co` (your hosted URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `your-hosted-anon-key`
   - `SUPABASE_SERVICE_ROLE_KEY`: `your-hosted-service-role-key`
   - `NEXT_PUBLIC_APP_URL`: `https://your-production-app.vercel.app` (e.g. `https://scopeguard-pearl.vercel.app`)
   *(Optional P1 Integrations)*:
   - `RESEND_API_KEY`: `re_your_resend_api_key_here`
   - `EMAIL_FROM`: `ScopeGuard <notifications@yourdomain.com>`
6. Click **Deploy**. Vercel will build and provision your edge routing and serverless functions.

---

## 7. Supabase Auth & Redirect URL Integration

For authentication, email verification, and password recovery to function properly on Vercel:

1. Open your [Supabase Project Dashboard](https://supabase.com/dashboard).
2. Navigate to **Authentication -> URL Configuration**.
3. Set **Site URL** to your production deployment domain:
   ```text
   https://your-production-app.vercel.app
   ```
4. Under **Redirect URLs**, add the following exact paths:
   ```text
   https://your-production-app.vercel.app/auth/callback
   https://your-production-app.vercel.app/dashboard
   https://your-production-app.vercel.app/reset-password
   https://your-production-app.vercel.app/onboarding
   http://localhost:3000/auth/callback
   http://localhost:3000/dashboard
   ```
5. Click **Save**.

---

## 8. Post-Deployment Verification Checklist

Once deployed to Vercel, verify each route and capability:

| Route Path | Expected Behavior | Verification Status |
|---|---|:---:|
| `/` | Landing page renders hero, problem statement, interactive workflow demo, and FAQ. | [ ] |
| `/login` | Login page loads with email and password inputs and "Forgot Password" link. | [ ] |
| `/signup` | Sign-up page allows entering full name, email, and password. | [ ] |
| `/dev/components` | Returns a **404 Not Found** in production builds (verified by middleware). | [ ] |
| `/dev/email-preview` | Returns a **404 Not Found** in production builds. | [ ] |
| `/approve/[invalid_token]` | Returns friendly "Approval link is invalid or does not exist" message without crashing. | [ ] |
| `/invite/[invalid_token]` | Returns friendly "Invitation link is invalid" message without leaking data. | [ ] |
| `/dashboard` (Unauthenticated) | Redirects automatically to `/login?next=%2Fdashboard`. | [ ] |
| `/dashboard` (Authenticated) | Displays workspace metrics, project summaries, and recent activity log. | [ ] |
| `/api/projects/[id]/export-csv` | Authenticated request downloads RFC 4180 CSV file. | [ ] |

---

## 9. Common Operational Pitfalls & Troubleshooting

### 1. `[ScopeGuard Env Error] Invalid or missing server environment variables`
- **Cause:** `SUPABASE_SERVICE_ROLE_KEY` is missing in Vercel project settings or `.env.local`.
- **Fix:** Copy the secret service-role key from Supabase Project Settings -> API and set it in Vercel environment variables for Production and Preview environments, then trigger a redeploy.

### 2. Infinite Redirect Loop Between `/login` and `/dashboard`
- **Cause:** Supabase cookie domain mismatch or unverified email redirecting back and forth.
- **Fix:** In Supabase Auth settings, disable "Confirm email" during local testing, or confirm the user's email address in the Supabase Users table (`email_confirm = true`).

### 3. `Permission denied: Only workspace owners and managers can publish`
- **Cause:** The authenticated user has the `member` role in `workspace_members`.
- **Fix:** By design, `member` users can only create and edit drafts. To publish proposals, an `owner` must promote the user to `manager` in `/settings/team`.

### 4. 404 Error on `/dev/components` in Production
- **Explanation:** This is an intentional security feature. `middleware.ts` intercepts `/dev/*` in production builds and returns an immediate 404 to avoid exposing internal test galleries.

### 5. Email Dispatch Status `not_configured`
- **Explanation:** If `RESEND_API_KEY` is not provided or contains placeholder text, ScopeGuard does not crash. It returns `{ success: true, status: "not_configured" }` and presents a manual copyable link in the UI. Add a valid Resend API key to enable direct email delivery.
