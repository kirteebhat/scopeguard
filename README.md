# ScopeGuard

> **Client-approved scope change management & real-time contract budget protection for software agencies.**

ScopeGuard is a specialized B2B platform designed to prevent agency revenue leakage. When a client requests out-of-scope work, ScopeGuard lets agency project managers draft an itemized estimate, preview it without exposing confidential internal margins, and publish a secure, 1-click mobile approval link. Once approved, project baselines and workspace dashboard metrics automatically update from immutable snapshots.

---

## 1. Feature Status & Verification Summary

| Feature / Domain | Status | How Verified |
|---|---|---|
| **Integer Minor Money Math** | **DONE** | 21 unit tests in `tests/unit/money.test.ts` (boundary half-up rounding, zero hours, paise/cents). |
| **Project & Dashboard Rollups** | **DONE** | 18 unit tests in `tests/unit/impact.test.ts` + 6 integration tests in `tests/integration/project-rollup-and-activity.test.ts`. |
| **State Machine Enforcement** | **DONE** | 26 unit tests in `tests/unit/state-machine.test.ts` (all 25 valid/illegal transitions verified). |
| **Zod Input Validation** | **DONE** | 45 unit tests across `tests/unit/validation-*.test.ts` (cross-workspace deliverables, negative rates, date orders). |
| **Cryptographic Token Hashing** | **DONE** | 4 unit tests in `tests/unit/tokens.test.ts` (256-bit CSPRNG, SHA-256 storage, 0 raw tokens logged). |
| **PostgreSQL Atomic Concurrency** | **DONE** | 3 integration tests in `tests/integration/approval-concurrency.test.ts` (`SELECT ... FOR UPDATE` row locks). |
| **Row-Level Security (RLS)** | **DONE** | 28 automated tests in `tests/integration/rls.test.ts` across 2 workspaces and 3 user roles using PGlite. |
| **Authentication & Route Guards** | **DONE** | Playwright E2E tests in `tests/e2e/auth-flow.spec.ts` (session persistence, login redirect, safe next url). |
| **Projects & Deliverables Management** | **DONE** | Integration tests in `tests/integration/projects-deliverables.test.ts` + Playwright E2E in `tests/e2e/projects.spec.ts`. |
| **Change Requests Drafting & Preview** | **DONE** | Playwright E2E in `tests/e2e/change-requests.spec.ts` (confidential internal notes omitted from client preview). |
| **Publishing, Revise & Withdraw** | **DONE** | Integration tests in `tests/integration/change-requests-workflow.test.ts` + Playwright E2E in `tests/e2e/change-requests-workflow.spec.ts`. |
| **Public Mobile Client Approval Portal** | **DONE** | Playwright E2E in `tests/e2e/client-approval.spec.ts` (360px viewport, touch buttons, double-submit protection). |
| **End-to-End Multi-Context User Journey** | **DONE** | Playwright E2E in `tests/e2e/full-journey.spec.ts` (isolated unauthenticated browser context approval, rejection, and revision revocation). |
| **Accessibility (WCAG AA) & Mobile UI** | **DONE** | Axe-Core Playwright test in `tests/e2e/accessibility.spec.ts` (10/10 passing, focus traps, zero overflow at 360px). |
| **Database-Backed Rate Limiting** | **DONE** | 5 unit tests in `tests/unit/rate-limit.test.ts` (IP-hash and token prefix throttling on `/approve/[token]`). |
| **Transactional Email Notifications** | **PARTIAL** | Stubbed with graceful fallback; copyable link modal informs user that no external email was sent (Roadmap P1). |
| **Client Email OTP Verification** | **NOT DONE** | Bearer link identity with self-declared legal name in MVP; OTP verification planned for Roadmap P1. |
| **Stripe Scope Deposit Collection** | **NOT DONE** | Documented limitation; scheduled for Roadmap P2. |

---

## 2. Prerequisites

- **Node.js:** v18.17.0 or higher (v20+ recommended)
- **Package Manager:** npm (v9+)
- **Database:** Supabase PostgreSQL instance (hosted or local via Supabase CLI)

---

## 3. Installation & Local Setup

### Step 1: Clone the Repository
```bash
git clone https://github.com/your-org/ScopeGuard.git
cd ScopeGuard
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure the environment variables according to the table below:

| Variable Name | Required | Environment | Description |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Client & Server | The URL of your Supabase project (e.g., `https://xyz.supabase.co` or `http://127.0.0.1:54321`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Client & Server | The public anonymous API key for browser-scoped Supabase client requests governed by RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | **Server Only** | Administrative service-role key. **NEVER expose to client code.** Used solely in backend actions for public approvals. |
| `NEXT_PUBLIC_APP_URL` | **Yes** | Client & Server | Base URL of the deployment (e.g., `http://localhost:3000` or `https://scopeguard.vercel.app`). |
| `RESEND_API_KEY` | No | Server Only | Optional API key for Resend email integration (P1 roadmap). |

---

## 4. Supabase Setup & Migrations

ScopeGuard provides idempotent SQL migrations in `supabase/migrations/`:
1. `20261011120000_initial_schema.sql` (Profiles, workspaces, members, projects, deliverables, constraints)
2. `20261011130000_change_requests_and_approvals.sql` (Change requests, version snapshots, tokens, approvals, activity logs, stored procedures)
3. `20261011140000_row_level_security.sql` (Default deny RLS policies, helper functions)

### Option A: Local Supabase CLI
```bash
# Initialize and start local Supabase containers (requires Docker)
npx supabase start

# Apply all migrations
npx supabase db reset
```

### Option B: Hosted Supabase Project
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Open the **SQL Editor**.
3. Sequentially run the contents of each migration file in `supabase/migrations/`.
4. (Optional) Run `supabase/seed.sql` to populate sample demo projects and change requests.

---

## 5. Development & Testing Commands

### Start the Local Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production
```bash
npm run build
npm run start
```

### Static Analysis & Quality Checks
```bash
# Run ESLint checks
npm run lint

# Run TypeScript compiler checks
npm run typecheck
```

### Run Vitest Unit & Integration Suite
ScopeGuard includes 22 test files with 244 automated unit, integration, and PGlite RLS tests:
```bash
npm run test
```

### Run Playwright End-to-End Suite
```bash
# Run full browser E2E tests (Desktop & Mobile viewports)
npm run test:e2e
```

---

## 6. Deployment to Vercel

### Step 1: Create a Vercel Project
1. Push your repository to GitHub, GitLab, or Bitbucket.
2. Import the project into [Vercel](https://vercel.com/new).
3. Framework Preset will automatically detect **Next.js**.

### Step 2: Configure Vercel Environment Variables
Add the following environment variables in the Vercel Project Settings:
- `NEXT_PUBLIC_SUPABASE_URL`: Your hosted Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your hosted Supabase anon key.
- `SUPABASE_SERVICE_ROLE_KEY`: Your hosted Supabase service-role secret.
- `NEXT_PUBLIC_APP_URL`: Your production Vercel URL (e.g., `https://your-app.vercel.app`).

### Step 3: Configure Supabase Auth Redirect URLs
In your Supabase Dashboard:
1. Navigate to **Authentication -> URL Configuration**.
2. Set **Site URL** to `https://your-app.vercel.app`.
3. Add redirect URLs:
   - `https://your-app.vercel.app/auth/callback`
   - `https://your-app.vercel.app/dashboard`

### Step 4: Deploy
Click **Deploy**. Once built, verify that:
- `/` renders the marketing landing page.
- `/approve/[token]` functions without requiring authentication.
- `/dev/components` is excluded and returns a 404 in production.

---

## 7. Known MVP Limitations

In accordance with our engineering honesty rules, the following capabilities are designated as limitations in version 0.1.0 MVP:

1. **Bearer Link Identity:** Public approval links operate as unguessable shared secrets. Clients self-declare their legal name upon signing. Two-factor email OTP verification is scheduled for Roadmap P1.
2. **Database-Backed Rate Limiting:** Attempt counters are tracked in the `approval_attempts` PostgreSQL table. Global edge-based Redis rate limiting is scheduled for Roadmap P2.
3. **No Legal E-Signature Certificate:** ScopeGuard estimates do not represent eIDAS/ESIGN Act public-key cryptographic certificates. Proposals are explicitly labeled *"Estimate, not a contract or legally binding quote"*.
4. **No Direct Email Dispatch:** The publishing dialog presents a copyable link with an explicit plain-language notice stating that no email was sent. Automatic transactional email delivery via Resend is scheduled for Roadmap P1.
5. **Display-Only Pricing Tiers:** Subscription plans (`Free`, `Pro ₹799/mo`, `Agency ₹1,999/mo`) are displayed as launch hypotheses without an active Stripe checkout connection.

---

## 8. Documentation Index

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) - System topology, ER diagram, and approval sequence diagrams.
- [`docs/SECURITY.md`](docs/SECURITY.md) - Service-role isolation, token hashing, and audit report.
- [`docs/MANUAL-RLS-CHECKLIST.md`](docs/MANUAL-RLS-CHECKLIST.md) - 18-point verification matrix and SQL audit steps.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) - P1/P2 priorities and revised effort estimates.
- [`docs/COMPETITORS.md`](docs/COMPETITORS.md) - Competitive analysis of Bonsai, Productive, and ClickUp.
- [`docs/INTERVIEW-QUESTIONS.md`](docs/INTERVIEW-QUESTIONS.md) - Customer discovery interview protocol.
- [`docs/BUSINESS-MODEL.md`](docs/BUSINESS-MODEL.md) - Monetization hypotheses and unit economics.
- [`docs/PRESENTATION-OUTLINE.md`](docs/PRESENTATION-OUTLINE.md) - 12-slide presentation structure.
- [`docs/DEMO-SCRIPT.md`](docs/DEMO-SCRIPT.md) - 5–7 minute click-by-click walkthrough script.

