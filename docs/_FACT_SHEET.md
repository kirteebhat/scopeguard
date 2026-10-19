# ScopeGuard Fact Sheet & Codebase Audit Evidence

**Generated:** 2026-10-19  
**Status:** Internal Verification Working Document  
**Repository Working Directory:** `c:\ScopeGuard`  

---

## 1. Tech Stack (from `package.json`)

Evidence File: [`package.json`](file:///c:/ScopeGuard/package.json)

| Component / Layer | Package / Tool | Exact Version | Purpose / Evidence |
|---|---|---|---|
| **Framework** | `next` | `^15.1.7` | Next.js 15 App Router, Server Components & Server Actions |
| **Frontend UI Runtime** | `react`, `react-dom` | `^19.0.0` | React 19 core library |
| **Language** | `typescript` | `^5.7.3` | Strict TypeScript compilation (`tsconfig.json`) |
| **Styling** | `tailwindcss` | `^3.4.17` | Utility-first CSS (`tailwind.config.ts`, `app/globals.css`) |
| **CSS Processing** | `postcss`, `autoprefixer` | `^8.5.2`, `^10.4.20` | CSS parsing and vendor prefixing |
| **Database & Auth SDK** | `@supabase/ssr` | `^0.5.2` | Cookie-based SSR Auth for Next.js 15 |
| **Database Client** | `@supabase/supabase-js` | `^2.49.1` | Supabase Postgres client |
| **Validation** | `zod` | `^3.24.2` | Runtime data validation (`lib/validation/*`, `lib/env.ts`) |
| **Form Management** | `react-hook-form` | `^7.54.2` | Client form handling |
| **Form Resolvers** | `@hookform/resolvers` | `^3.10.0` | Zod resolver adapter for React Hook Form |
| **UI Icons** | `lucide-react` | `^0.475.0` | Modern SVG icon set |
| **Animation Engine** | `motion` | `^14.3.0` | Declarative UI animations & transitions |
| **Transactional Email** | `resend` | `^6.34.1` | Outbound email SDK (`lib/email/resend.ts`) |
| **Unit/Integration Runner** | `vitest` | `^3.0.5` | Fast unit & integration test runner (`vitest.config.ts`) |
| **In-Memory Postgres** | `@electric-sql/pglite` | `^0.5.8` | Real WASM Postgres used in tests (`tests/integration/rls.test.ts`) |
| **E2E Testing** | `@playwright/test` | `^1.50.1` | Headless browser testing (`playwright.config.ts`) |
| **Accessibility Testing** | `@axe-core/playwright` | `^4.14.0` | Automated WCAG AA accessibility audits |
| **Node.js Execution** | `tsx` | `^4.23.15` | TypeScript script execution (`scripts/`) |
| **Linting & Code Style** | `eslint`, `eslint-config-next`, `prettier` | `^9.20.1`, `^15.1.7`, `^3.5.1` | Code style enforcement |
| **Node Version Requirement** | *None declared* | *None* | `package.json` contains no `"engines"` field; recommended Node.js 18.17.0+ or 20+ LTS based on Next.js 15 requirements. |

---

## 2. `package.json` Scripts

Evidence File: [`package.json`](file:///c:/ScopeGuard/package.json#L5-L13)

| Script Command | Exact Executable Command | Purpose |
|---|---|---|
| `dev` | `next dev` | Starts local Next.js development server (default port 3000 / 3001) |
| `build` | `next build` | Produces optimized Next.js production build |
| `start` | `next start` | Runs production server after `npm run build` |
| `lint` | `next lint` | Executes ESLint analysis with Next.js rules |
| `typecheck` | `tsc --noEmit` | Validates TypeScript types across the entire project |
| `test` | `vitest run` | Runs unit and integration test suites using Vitest |
| `test:e2e` | `playwright test` | Runs Playwright browser end-to-end tests |

*Note: No additional scripts exist in `package.json`.*

---

## 3. Application Routes & Middleware

Evidence Files: `app/` directory, [`middleware.ts`](file:///c:/ScopeGuard/middleware.ts), [`lib/supabase/middleware.ts`](file:///c:/ScopeGuard/lib/supabase/middleware.ts)

### A. Routes Table

| Route Path | Type | Access Level | Purpose | Source File |
|---|---|---|---|---|
| `/` | Page | Public | Marketing landing page explaining problem, value, and pricing hypothesis | [`app/page.tsx`](file:///c:/ScopeGuard/app/page.tsx) |
| `/login` | Page | Public (Guest) | User authentication form with email/password; redirects to `/dashboard` if authenticated | [`app/(auth)/login/page.tsx`](file:///c:/ScopeGuard/app/(auth)/login/page.tsx) |
| `/signup` | Page | Public (Guest) | Account creation form with email, password, and full name | [`app/(auth)/signup/page.tsx`](file:///c:/ScopeGuard/app/(auth)/signup/page.tsx) |
| `/forgot-password` | Page | Public (Guest) | Password reset email request form | [`app/(auth)/forgot-password/page.tsx`](file:///c:/ScopeGuard/app/(auth)/forgot-password/page.tsx) |
| `/reset-password` | Page | Public (Recovery) | Password update form loaded following recovery link callback | [`app/(auth)/reset-password/page.tsx`](file:///c:/ScopeGuard/app/(auth)/reset-password/page.tsx) |
| `/approve/[token]` | Page | Public (Token-Bound) | Client proposal review & approval/rejection portal (no login required) | [`app/approve/[token]/page.tsx`](file:///c:/ScopeGuard/app/approve/[token]/page.tsx) |
| `/invite/[token]` | Page | Public (Token-Bound) | Team member workspace invitation acceptance view | [`app/invite/[token]/page.tsx`](file:///c:/ScopeGuard/app/invite/[token]/page.tsx) |
| `/unauthorized` | Page | Public | 403 Forbidden display for role-restricted operations | [`app/unauthorized/page.tsx`](file:///c:/ScopeGuard/app/unauthorized/page.tsx) |
| `/onboarding` | Page | Authenticated | First-time user workspace setup wizard | [`app/onboarding/page.tsx`](file:///c:/ScopeGuard/app/onboarding/page.tsx) |
| `/dashboard` | Page | Authenticated | Agency executive metrics, currency rollups, active change requests, recent activity | [`app/(authenticated)/dashboard/page.tsx`](file:///c:/ScopeGuard/app/(authenticated)/dashboard/page.tsx) |
| `/projects` | Page | Authenticated | Workspace projects list with search, filter, and budget stats | [`app/(authenticated)/projects/page.tsx`](file:///c:/ScopeGuard/app/(authenticated)/projects/page.tsx) |
| `/projects/new` | Page | Authenticated (Owner/Manager) | Project creation wizard | [`app/(authenticated)/projects/new/page.tsx`](file:///c:/ScopeGuard/app/(authenticated)/projects/new/page.tsx) |
| `/projects/[projectId]` | Page | Authenticated | Project overview, baseline vs revised financials, deliverables, change requests | [`app/(authenticated)/projects/[projectId]/page.tsx`](file:///c:/ScopeGuard/app/(authenticated)/projects/[projectId]/page.tsx) |
| `/projects/[projectId]/changes` | Page | Authenticated | Change requests register for a specific project | [`app/(authenticated)/projects/[projectId]/changes/page.tsx`](file:///c:/ScopeGuard/app/(authenticated)/projects/[projectId]/changes/page.tsx) |
| `/projects/[projectId]/changes/new` | Page | Authenticated | Create change request draft form within project context | [`app/(authenticated)/projects/[projectId]/changes/new/page.tsx`](file:///c:/ScopeGuard/app/(authenticated)/projects/[projectId]/changes/new/page.tsx) |
| `/projects/[projectId]/settings` | Page | Authenticated (Owner/Manager) | Project details, client contact info, deliverables editor | [`app/(authenticated)/projects/[projectId]/settings/page.tsx`](file:///c:/ScopeGuard/app/(authenticated)/projects/[projectId]/settings/page.tsx) |
| `/changes/new` | Page | Authenticated | Global change request creator (select project then create draft) | [`app/(authenticated)/changes/new/page.tsx`](file:///c:/ScopeGuard/app/(authenticated)/changes/new/page.tsx) |
| `/changes/[changeId]` | Page | Authenticated | Change request detail: draft editor, version history, publish modal, email modal | [`app/(authenticated)/changes/[changeId]/page.tsx`](file:///c:/ScopeGuard/app/(authenticated)/changes/[changeId]/page.tsx) |
| `/settings` | Page | Authenticated (Owner) | Workspace general settings and rename form | [`app/(authenticated)/settings/page.tsx`](file:///c:/ScopeGuard/app/(authenticated)/settings/page.tsx) |
| `/settings/team` | Page | Authenticated (Owner/Manager) | Team member management, role assignments, invite modal, pending invitations list | [`app/(authenticated)/settings/team/page.tsx`](file:///c:/ScopeGuard/app/(authenticated)/settings/team/page.tsx) |
| `/auth/callback` | Route Handler (GET) | Public | Supabase Auth code-exchange endpoint (OAuth, email confirmation, recovery) | [`app/auth/callback/route.ts`](file:///c:/ScopeGuard/app/auth/callback/route.ts) |
| `/api/projects/[projectId]/export-csv` | Route Handler (GET) | Authenticated | Exports approved project change requests and financial impacts to CSV | [`app/api/projects/[projectId]/export-csv/route.ts`](file:///c:/ScopeGuard/app/api/projects/[projectId]/export-csv/route.ts) |
| `/api/dev/auth-health` | Route Handler (GET) | Dev-Only (404 in prod) | Diagnostics endpoint checking Supabase config and auth session status | [`app/api/dev/auth-health/route.ts`](file:///c:/ScopeGuard/app/api/dev/auth-health/route.ts) |
| `/dev/components` | Page | Dev-Only (404 in prod) | UI component library showcase | [`app/dev/components/page.tsx`](file:///c:/ScopeGuard/app/dev/components/page.tsx) |
| `/dev/email-preview` | Page | Dev-Only (404 in prod) | HTML rendering preview for team invitation emails | [`app/dev/email-preview/page.tsx`](file:///c:/ScopeGuard/app/dev/email-preview/page.tsx) |
| `/dev/proposal-email-preview` | Page | Dev-Only (404 in prod) | HTML rendering preview for client proposal emails | [`app/dev/proposal-email-preview/page.tsx`](file:///c:/ScopeGuard/app/dev/proposal-email-preview/page.tsx) |

### B. Middleware Configuration

Evidence Files: [`middleware.ts`](file:///c:/ScopeGuard/middleware.ts), [`lib/supabase/middleware.ts`](file:///c:/ScopeGuard/lib/supabase/middleware.ts)

- **Execution:** Runs on all incoming requests except static files (`_next/static`, `_next/image`, `favicon.ico`, static asset extensions).
- **Production Guard:** Explicitly blocks any path starting with `/dev` in production (`process.env.NODE_ENV === "production"`) with an immediate `404 Not Found`.
- **Protected Path Prefixes:** `/dashboard`, `/projects`, `/settings`, `/onboarding`.
  - Unauthenticated visitors are redirected to `/login?next=<encoded_path>`.
- **Auth Page Redirection:** If an authenticated user visits `/login`, `/signup`, or `/forgot-password`, they are redirected to `/dashboard` (or the safe target in `?next=`).
- **Open Redirect Protection:** Next redirects are sanitized through `getSafeRedirectUrl` ([`lib/validation/redirect.ts`](file:///c:/ScopeGuard/lib/validation/redirect.ts)), rejecting external URLs or protocol relative URLs.
- **Security Headers on Public Token Pages:** For `/approve/*` and `/invite/*`, middleware attaches:
  - `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`
  - `Pragma: no-cache`
  - `Expires: 0`
  - `Referrer-Policy: no-referrer`
  - `X-Robots-Tag: noindex, nofollow`

---

## 4. Server Actions and Database Functions (RPCs)

### A. Server Actions (28 total across 9 files in `app/actions/`)

| Action Name | Source File | Purpose | Enforced Role / Security |
|---|---|---|---|
| `loginAction` | [`app/actions/auth.ts`](file:///c:/ScopeGuard/app/actions/auth.ts#L63) | Validates credentials via `signInWithPassword` | Public / Guest |
| `signUpAction` | [`app/actions/auth.ts`](file:///c:/ScopeGuard/app/actions/auth.ts#L172) | Registers account via `signUp` with email normalization | Public / Guest |
| `resendVerificationAction` | [`app/actions/auth.ts`](file:///c:/ScopeGuard/app/actions/auth.ts#L405) | Resends confirmation email via Supabase Auth | Public / Guest |
| `forgotPasswordAction` | [`app/actions/auth.ts`](file:///c:/ScopeGuard/app/actions/auth.ts#L463) | Dispatches recovery email via `resetPasswordForEmail` | Public / Guest |
| `resetPasswordAction` | [`app/actions/auth.ts`](file:///c:/ScopeGuard/app/actions/auth.ts#L510) | Updates user password via `updateUser` | Authenticated (Recovery Session) |
| `logoutAction` | [`app/actions/auth.ts`](file:///c:/ScopeGuard/app/actions/auth.ts#L561) | Terminates Supabase Auth session via `signOut` | Authenticated |
| `createWorkspaceAction` | [`app/actions/workspace.ts`](file:///c:/ScopeGuard/app/actions/workspace.ts#L16) | Calls RPC `create_workspace` | Authenticated |
| `updateWorkspaceAction` | [`app/actions/workspace.ts`](file:///c:/ScopeGuard/app/actions/workspace.ts#L52) | Updates workspace name | `owner` |
| `createProjectAction` | [`app/actions/projects.ts`](file:///c:/ScopeGuard/app/actions/projects.ts#L13) | Creates project record with integer minor budget | `owner`, `manager` |
| `updateProjectAction` | [`app/actions/projects.ts`](file:///c:/ScopeGuard/app/actions/projects.ts#L113) | Updates project budget, dates, and client details | `owner`, `manager` |
| `createDeliverableAction` | [`app/actions/deliverables.ts`](file:///c:/ScopeGuard/app/actions/deliverables.ts#L15) | Adds project deliverable | `owner`, `manager` |
| `updateDeliverableAction` | [`app/actions/deliverables.ts`](file:///c:/ScopeGuard/app/actions/deliverables.ts#L56) | Updates deliverable title/status | `owner`, `manager` |
| `deleteDeliverableAction` | [`app/actions/deliverables.ts`](file:///c:/ScopeGuard/app/actions/deliverables.ts#L91) | Deletes deliverable | `owner`, `manager` |
| `createChangeRequestDraftAction` | [`app/actions/change-requests.ts`](file:///c:/ScopeGuard/app/actions/change-requests.ts#L29) | Creates change request in `draft` status | `owner`, `manager`, `member` |
| `updateChangeRequestDraftAction` | [`app/actions/change-requests.ts`](file:///c:/ScopeGuard/app/actions/change-requests.ts#L143) | Updates draft fields while status is `draft` | `owner`, `manager`, `member` |
| `publishChangeRequestAction` | [`app/actions/change-requests.ts`](file:///c:/ScopeGuard/app/actions/change-requests.ts#L257) | Calls RPC `publish_change_request` | `owner`, `manager` |
| `regenerateApprovalTokenAction` | [`app/actions/change-requests.ts`](file:///c:/ScopeGuard/app/actions/change-requests.ts#L311) | Calls RPC `regenerate_approval_token` | `owner`, `manager` |
| `reviseChangeRequestAction` | [`app/actions/change-requests.ts`](file:///c:/ScopeGuard/app/actions/change-requests.ts#L361) | Calls RPC `revise_change_request` | `owner`, `manager` |
| `withdrawChangeRequestAction` | [`app/actions/change-requests.ts`](file:///c:/ScopeGuard/app/actions/change-requests.ts#L391) | Calls RPC `withdraw_change_request` | `owner`, `manager` |
| `submitClientDecisionAction` | [`app/actions/approvals.ts`](file:///c:/ScopeGuard/app/actions/approvals.ts#L23) | Checks rate limit, invokes service-role RPC `submit_decision` | Public / Token Bearer (`client_link`) |
| `updateMemberRoleAction` | [`app/actions/members.ts`](file:///c:/ScopeGuard/app/actions/members.ts#L13) | Updates user role in `workspace_members` | `owner` |
| `sendInvitationsAction` | [`app/actions/invitations.ts`](file:///c:/ScopeGuard/app/actions/invitations.ts#L44) | Generates tokens, calls RPC `create_invitation`, sends email via Resend | `owner` (for manager/member) or `manager` (for member only) |
| `resendInvitationAction` | [`app/actions/invitations.ts`](file:///c:/ScopeGuard/app/actions/invitations.ts#L202) | Re-hashes token, calls RPC `resend_invitation`, sends email | `owner`, `manager` |
| `revokeInvitationAction` | [`app/actions/invitations.ts`](file:///c:/ScopeGuard/app/actions/invitations.ts#L284) | Calls RPC `revoke_invitation` | `owner`, `manager` |
| `acceptInvitationAction` | [`app/actions/invitations.ts`](file:///c:/ScopeGuard/app/actions/invitations.ts#L323) | Calls RPC `accept_invitation` with authenticated email match | Authenticated User |
| `sendProposalToClientAction` | [`app/actions/proposal-emails.ts`](file:///c:/ScopeGuard/app/actions/proposal-emails.ts#L50) | Rate limits, calls RPC `begin_proposal_email`, sends email, completes log | `owner`, `manager` |
| `setProjectClientContactAction` | [`app/actions/proposal-emails.ts`](file:///c:/ScopeGuard/app/actions/proposal-emails.ts#L360) | Calls RPC `set_project_client_contact` | `owner`, `manager` |
| `fetchProposalEmailHistoryAction` | [`app/actions/proposal-emails.ts`](file:///c:/ScopeGuard/app/actions/proposal-emails.ts#L408) | Queries `proposal_emails` delivery logs | `owner`, `manager` |

### B. Database Functions & Stored Procedures (from `supabase/migrations/`)

| Function Name | Return Type | Security & Search Path | Role Granted | Purpose |
|---|---|---|---|---|
| `handle_updated_at()` | `trigger` | `SECURITY DEFINER set search_path = public, pg_temp` | Internal | Automatically maintains `updated_at = now()` on record updates |
| `handle_new_user()` | `trigger` | `SECURITY DEFINER set search_path = public, pg_temp` | Internal | Trigger on `auth.users` to populate `public.profiles` |
| `create_workspace(name text)` | `json` | `SECURITY DEFINER set search_path = public, pg_temp` | `authenticated` | Atomically creates workspace and assigns caller as `owner` |
| `block_version_mutation()` | `trigger` | `SECURITY DEFINER set search_path = public, pg_temp` | Internal | Raises exception on UPDATE/DELETE on `change_request_versions` |
| `publish_change_request(...)` | `json` | `SECURITY DEFINER set search_path = public, pg_temp` | `authenticated` | Snapshots draft into version record, sets `pending_approval`, creates token |
| `revise_change_request(...)` | `json` | `SECURITY DEFINER set search_path = public, pg_temp` | `authenticated` | Revokes active token, returns request status to `draft` |
| `withdraw_change_request(...)` | `json` | `SECURITY DEFINER set search_path = public, pg_temp` | `authenticated` | Revokes active token, marks request permanently `withdrawn` |
| `regenerate_approval_token(...)` | `json` | `SECURITY DEFINER set search_path = public, pg_temp` | `authenticated` | Revokes existing token and stores new token hash for pending version |
| `get_proposal_by_token(text)` | `json` | `SECURITY DEFINER set search_path = public, pg_temp` | `service_role` (revoked from anon/auth) | Resolves proposal snapshot by token hash without leaking internal notes |
| `submit_decision(...)` | `json` | `SECURITY DEFINER set search_path = public, pg_temp` | `service_role` (revoked from anon/auth) | Locks rows, records approval/rejection, sets terminal state, marks token consumed |
| `is_workspace_member(uuid)` | `boolean` | `SECURITY DEFINER set search_path = public, pg_temp` | Internal SQL | Checks if authenticated user belongs to workspace |
| `workspace_role(uuid)` | `member_role` | `SECURITY DEFINER set search_path = public, pg_temp` | Internal SQL | Returns caller's role (`owner`, `manager`, `member`) in workspace |
| `get_project_workspace_id(uuid)` | `uuid` | `SECURITY DEFINER set search_path = public, pg_temp` | Internal SQL | Resolves `workspace_id` from a `project_id` |
| `get_change_request_workspace_id(uuid)`| `uuid` | `SECURITY DEFINER set search_path = public, pg_temp` | Internal SQL | Resolves `workspace_id` from a `change_request_id` |
| `create_invitation(...)` | `uuid` | `SECURITY DEFINER set search_path = public, pg_temp` | `authenticated`, `service_role` | Creates pending team invitation with rate limiting (max 20/day) |
| `resend_invitation(...)` | `void` | `SECURITY DEFINER set search_path = public, pg_temp` | `authenticated`, `service_role` | Re-hashes invitation token with 60s cooldown (max 10 resends) |
| `revoke_invitation(...)` | `void` | `SECURITY DEFINER set search_path = public, pg_temp` | `authenticated`, `service_role` | Sets invitation status to `revoked` |
| `get_invitation_by_token(text)` | `table(...)` | `SECURITY DEFINER set search_path = public, pg_temp` | `anon`, `authenticated`, `service_role` | Public safe lookup of invitation details (email masked) |
| `accept_invitation(text)` | `jsonb` | `SECURITY DEFINER set search_path = public, pg_temp` | `authenticated`, `service_role` | Validates strict email match and atomically inserts `workspace_members` row |
| `begin_proposal_email(...)` | `uuid` | `SECURITY DEFINER set search_path = public, pg_temp` | `authenticated` | Verifies pending state, enforces rate limit (5/hr, 60s cooldown), inserts queued log |
| `complete_proposal_email(...)` | `void` | `SECURITY DEFINER set search_path = public, pg_temp` | `authenticated` | Updates delivery status to `sent` or `failed` with provider ID and audit log |
| `set_project_client_contact(...)` | `void` | `SECURITY DEFINER set search_path = public, pg_temp` | `authenticated` | Updates `client_contact_name` and `client_contact_email` on project |

---

## 5. Database Schema & Migrations

Derived strictly from the 5 SQL files in `supabase/migrations/`:
1. `20261011120000_initial_schema.sql`
2. `20261011130000_change_requests_and_approvals.sql`
3. `20261011140000_row_level_security.sql`
4. `20261018230000_workspace_invitations.sql`
5. `20261019000000_proposal_emails.sql`

### A. Database Tables (13 Total)

All 13 tables have Row-Level Security (RLS) enabled.

1. **`public.profiles`**
   - Columns: `id` (uuid, PK, references `auth.users(id)` on delete cascade), `email` (text), `full_name` (text), `avatar_url` (text), `created_at`, `updated_at`.
   - RLS: Enabled. Select allowed for self or workspace peers. Update/insert allowed for self only.
2. **`public.workspaces`**
   - Columns: `id` (uuid, PK), `name` (text, check >= 2), `slug` (text, unique, regex), `plan` (text, default 'free'), `created_at`, `updated_at`.
   - RLS: Enabled. Select for members. Update/delete restricted to `owner`.
3. **`public.workspace_members`**
   - Columns: `id` (uuid, PK), `workspace_id` (uuid, FK `workspaces`), `user_id` (uuid, FK `profiles`), `role` (`member_role`: 'owner', 'manager', 'member'), `created_at`, `updated_at`.
   - Constraints: `UNIQUE(workspace_id, user_id)`. Partial unique index: `idx_workspace_single_owner` on `workspace_id` where `role = 'owner'` (exactly one owner).
   - RLS: Enabled. Select for members. Insert/update/delete restricted to `owner` (except user self-leave).
4. **`public.projects`**
   - Columns: `id` (uuid, PK), `workspace_id` (uuid, FK `workspaces`), `name` (text), `client_name` (text), `status` (`project_status`: 'active', 'completed', 'on_hold', 'archived'), `currency` (text, ISO 3-letter uppercase check), `budget_minor` (bigint check >= 0), `hourly_rate_minor` (bigint check >= 0), `start_date` (date), `original_deadline` (date), `created_by` (uuid, FK `profiles` on delete set null), `client_contact_name` (text, nullable), `client_contact_email` (text, nullable), `created_at`, `updated_at`.
   - Constraints: `original_deadline >= start_date`.
   - RLS: Enabled. Select for workspace members. Insert/update for `owner`/`manager`. Delete for `owner`.
5. **`public.deliverables`**
   - Columns: `id` (uuid, PK), `project_id` (uuid, FK `projects` on delete cascade), `title` (text), `description` (text), `status` (`deliverable_status`: 'pending', 'in_progress', 'completed', 'cancelled'), `created_at`, `updated_at`.
   - RLS: Enabled. Select for workspace members. Insert/update/delete for `owner`/`manager`.
6. **`public.change_requests`** (Mutable Working Draft)
   - Columns: `id` (uuid, PK), `project_id` (uuid, FK `projects` on delete cascade), `title` (text), `description` (text), `affected_deliverable_id` (uuid, FK `deliverables` on delete set null), `pricing_method` (`pricing_method`: 'hourly', 'fixed'), `estimated_hours` (numeric(6,2)), `hourly_rate_minor` (bigint), `cost_minor` (bigint check >= 0), `proposed_deadline` (date), `reason` (text), `internal_notes` (text, private agency notes), `status` (`change_request_status`: 'draft', 'pending_approval', 'approved', 'rejected', 'withdrawn'), `current_version` (integer), `created_by` (uuid, FK `profiles`), `created_at`, `updated_at`.
   - RLS: Enabled. Select for members. Insert/update allowed ONLY when `status = 'draft'`. Delete allowed for `owner`/`manager` when `status = 'draft'`.
7. **`public.change_request_versions`** (Immutable Snapshots)
   - Columns: `id` (uuid, PK), `change_request_id` (uuid, FK `change_requests` on delete cascade), `version_number` (integer check >= 1), `title` (text), `description` (text), `pricing_method` (`pricing_method`), `cost_minor` (bigint check >= 0), `currency` (text), `proposed_deadline` (date), `snapshot` (jsonb, complete frozen proposal excluding internal notes), `published_by` (uuid, FK `profiles`), `created_at`.
   - Constraints: `UNIQUE(change_request_id, version_number)`.
   - Triggers: `tr_block_version_mutation` prevents any UPDATE or DELETE.
   - RLS: Enabled. Select for workspace members. Direct INSERT/UPDATE/DELETE blocked.
8. **`public.approval_tokens`** (Hashed Secrets)
   - Columns: `id` (uuid, PK), `version_id` (uuid, FK `change_request_versions` on delete cascade), `token_hash` (text, unique, exactly 64 chars SHA-256 hex), `expires_at` (timestamptz), `revoked_at` (timestamptz), `consumed_at` (timestamptz), `created_by` (uuid, FK `profiles`), `created_at`.
   - RLS: Enabled. Default deny: no client policies. Accessed exclusively via `SECURITY DEFINER` functions.
9. **`public.approvals`** (Client Decisions)
   - Columns: `id` (uuid, PK), `version_id` (uuid, unique FK `change_request_versions` on delete cascade), `decision` (`decision_type`: 'approved', 'rejected'), `decided_at` (timestamptz), `decision_actor_type` (`actor_type`), `actor_name` (text), `audit_metadata` (jsonb), `created_at`.
   - Constraints: `UNIQUE(version_id)` enforces exactly one decision per version snapshot.
   - RLS: Enabled. Select for workspace members. Direct mutation blocked (via `submit_decision` RPC only).
10. **`public.activity_logs`** (Audit Trail)
    - Columns: `id` (uuid, PK), `workspace_id` (uuid, FK `workspaces` on delete cascade), `actor_type` (`actor_type`: 'user', 'client_link', 'system'), `actor_id` (uuid, FK `profiles` on delete set null), `actor_name` (text), `entity_type` (text), `entity_id` (uuid), `action` (text), `metadata` (jsonb), `created_at`.
    - RLS: Enabled. Select for workspace members. Direct mutation blocked.
11. **`public.approval_attempts`** (Rate Limiting)
    - Columns: `id` (uuid, PK), `ip_hash` (text), `token_prefix` (text), `attempted_at` (timestamptz).
    - RLS: Enabled. Default deny: server-only table.
12. **`public.workspace_invitations`** (Team Invitations)
    - Columns: `id` (uuid, PK), `workspace_id` (uuid, FK `workspaces` on delete cascade), `email` (text, lowercase, trimmed), `role` (`member_role`: 'manager', 'member'), `token_hash` (text, unique, 64 chars), `status` (text check: 'pending', 'accepted', 'revoked', 'expired'), `invited_by` (uuid, FK `profiles`), `expires_at` (timestamptz, default 7 days), `accepted_by` (uuid, FK `profiles`), `accepted_at`, `revoked_at`, `last_sent_at`, `send_count` (integer), `created_at`, `updated_at`.
    - Constraints: Unique partial index `idx_workspace_invitations_active_email` on `(workspace_id, email)` where `status = 'pending'`.
    - RLS: Enabled. Select for `owner`/`manager`. `token_hash` column revoked from client SELECT. Direct mutations blocked.
13. **`public.proposal_emails`** (Client Proposal Delivery Logs)
    - Columns: `id` (uuid, PK), `workspace_id` (uuid, FK `workspaces` on delete cascade), `change_request_id` (uuid, FK `change_requests` on delete cascade), `version_id` (uuid, FK `change_request_versions` on delete cascade), `recipient_email` (text), `recipient_name` (text, nullable), `status` (text check: 'queued', 'sent', 'failed'), `provider` (text, default 'resend'), `provider_message_id` (text), `error_code` (text), `sent_by` (uuid, FK `profiles`), `personal_note_present` (boolean), `send_attempt_key` (text, unique), `created_at`, `sent_at`.
    - RLS: Enabled. Select for `owner`/`manager`. Direct mutations denied.

---

## 6. Authentication Flows

Evidence: [`app/actions/auth.ts`](file:///c:/ScopeGuard/app/actions/auth.ts), [`app/auth/callback/route.ts`](file:///c:/ScopeGuard/app/auth/callback/route.ts), [`lib/supabase/middleware.ts`](file:///c:/ScopeGuard/lib/supabase/middleware.ts)

- **Signup Flow:** `signUpAction` validates email and password (minimum 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char). Email is normalized (`lower(trim(email))`). Calls `supabase.auth.signUp`. Trigger `on_auth_user_created` creates `profiles` record.
- **Login Flow:** `loginAction` validates credentials via `signInWithPassword`. On success, redirects to `/dashboard` or safe sanitized `?next=` destination. Handles unconfirmed email error with friendly prompt and resend option.
- **Logout Flow:** `logoutAction` signs out session on server and redirects to `/login`.
- **Forgot Password Flow:** `forgotPasswordAction` invokes `resetPasswordForEmail` directing to `${NEXT_PUBLIC_APP_URL}/auth/callback?type=recovery`.
- **Password Reset Flow:** After clicking email link, callback exchanges code and user is directed to `/reset-password` where `resetPasswordAction` invokes `updateUser({ password })`.
- **Email Verification Flow:** After signup, user receives confirmation link handled by `/auth/callback?type=signup`, establishing session and forwarding to `/onboarding` or `/dashboard`.
- **Session Refresh:** `lib/supabase/middleware.ts` runs on every request using `@supabase/ssr` `createServerClient` and executes `supabase.auth.getUser()` to safely refresh session cookies and validate authentication against Supabase Auth servers.

---

## 7. Authorization & Role Matrix

Enforced via PostgreSQL Row-Level Security (RLS) helper `workspace_role(workspace_id)` and server action authorization helper `requireRole(...)`.

| Capability / Resource | `owner` | `manager` | `member` | `client_link` (Public Token) |
|---|:---:|:---:|:---:|:---:|
| **Workspace Settings & Rename** | ✅ Allowed | ❌ Denied | ❌ Denied | ❌ Denied |
| **Delete Workspace** | ✅ Allowed | ❌ Denied | ❌ Denied | ❌ Denied |
| **Manage Team Members & Roles** | ✅ Allowed | ❌ Denied | ❌ Denied | ❌ Denied |
| **Invite Managers** | ✅ Allowed | ❌ Denied | ❌ Denied | ❌ Denied |
| **Invite Members** | ✅ Allowed | ✅ Allowed | ❌ Denied | ❌ Denied |
| **Resend / Revoke Invitations** | ✅ Allowed | ✅ Allowed | ❌ Denied | ❌ Denied |
| **Create & Edit Projects** | ✅ Allowed | ✅ Allowed | ❌ Denied | ❌ Denied |
| **Manage Deliverables** | ✅ Allowed | ✅ Allowed | ❌ Denied | ❌ Denied |
| **Create Change Request Draft** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ❌ Denied |
| **Edit Change Request Draft** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ❌ Denied |
| **Publish Change Proposal** | ✅ Allowed | ✅ Allowed | ❌ Denied | ❌ Denied |
| **Revise Pending Proposal** | ✅ Allowed | ✅ Allowed | ❌ Denied | ❌ Denied |
| **Withdraw Pending Proposal** | ✅ Allowed | ✅ Allowed | ❌ Denied | ❌ Denied |
| **Regenerate Approval Token** | ✅ Allowed | ✅ Allowed | ❌ Denied | ❌ Denied |
| **Send Proposal Email to Client** | ✅ Allowed | ✅ Allowed | ❌ Denied | ❌ Denied |
| **View Proposal Email Logs** | ✅ Allowed | ✅ Allowed | ❌ Denied | ❌ Denied |
| **View Change Requests & History** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ❌ Denied |
| **View Internal Notes** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ❌ Denied (Never in snapshot) |
| **Decide Proposal (Approve/Reject)** | ❌ Denied | ❌ Denied | ❌ Denied | ✅ Allowed (Via token) |

---

## 8. Core Workflows & Feature Status

| Feature / Workflow | Implementation Status | Evidence & Implementation Notes |
|---|---|---|
| **Projects & Deliverables** | **Implemented** | Full CRUD in `app/actions/projects.ts` and `deliverables.ts`. Deliverables link to change requests. |
| **Change Request Drafting** | **Implemented** | Hourly (hours $\times$ rate) or fixed pricing. Validated via `lib/validation/change-requests.ts`. |
| **Money & Rounding Rules** | **Implemented** | Integer minor units (cents/paise). `calculateHourlyCost` uses `Math.floor(hours * rateMinor + 0.5)` half-up rounding in `lib/domain/money.ts`. |
| **Publishing & Versioning** | **Implemented** | RPC `publish_change_request` creates immutable version $v_N$, copies draft into frozen JSONB snapshot excluding internal notes, generates token, sets status to `pending_approval`. |
| **Approval Token Security** | **Implemented** | 32-byte CSPRNG token (`crypto.randomBytes(32)` base64url). Raw token exists in memory only; database stores SHA-256 hash. 14-day expiry. |
| **Client Approval Portal** | **Implemented** | `/approve/[token]` page. Displays project baseline vs proposed change. Captures self-declared legal name. RPC `submit_decision` acquires row lock via `SELECT ... FOR UPDATE`, records decision in `approvals`, sets terminal status, marks token consumed. |
| **Revising & Withdrawing** | **Implemented** | `revise_change_request` revokes token and returns to `draft`. Next publish creates $v_{N+1}$. `withdraw_change_request` sets terminal `withdrawn` state. |
| **Rollup Calculations** | **Implemented** | `calculateProjectRollup` and `calculateWorkspaceRollup` in `lib/domain/impact.ts`. Strictly rolls up from approved version snapshots. Deduplicates versions. Strictly groups workspace rollups by currency without cross-currency summation. |
| **Team Invitations** | **Implemented** | Migration 4 (`workspace_invitations`), `app/actions/invitations.ts`, `/invite/[token]` page, transactional email via Resend with in-memory fallback. Daily limit (20/day) and 60s cooldown. |
| **Send Proposal to Client** | **Implemented** | Migration 5 (`proposal_emails`), `app/actions/proposal-emails.ts`, Resend delivery, rate limit (5/hr, 60s cooldown), email masking, in-memory fallback. |
| **CSV Export** | **Implemented** | Route `/api/projects/[projectId]/export-csv` generates RFC 4180 CSV of approved changes. |
| **Dev Previews & Health** | **Implemented** | `/dev/components`, `/dev/email-preview`, `/dev/proposal-email-preview`, `/api/dev/auth-health` (blocked in production). |
| **Automated Link Expiry Cron** | **Not implemented** | No background scheduler or cron job is configured. Expiration is evaluated at token resolution time. |
| **Command Palette (`cmdk`)** | **Not implemented** | No command palette package or components exist. |
| **Dark Mode Theme Switcher** | **Not implemented** | Clean, accessible light-mode palette only. No theme toggling code. |
| **Stripe Scope Deposits** | **Not implemented** | Explicitly out of scope for MVP. Plans are display-only hypotheses. |
| **Webhook Integrations** | **Not implemented** | No webhooks for Slack, Jira, or Linear. |
| **Live FX Conversion** | **Not implemented** | Aggregations strictly isolate distinct currencies without FX conversion. |

---

## 9. Security Measures & Limitations

### Security Measures Present:
1. **Row-Level Security (RLS) Coverage:** All 13 database tables have RLS enabled with default-deny policies.
2. **Token Security:** Raw tokens generated with 256 bits of entropy (`crypto.randomBytes(32)`). Only SHA-256 hex hashes are persisted in the database. `token_hash` columns are revoked from client `SELECT`.
3. **Service-Role Key Isolation:** `SUPABASE_SERVICE_ROLE_KEY` is validated in `lib/env.ts` with an explicit check throwing an error if called from the browser (`typeof window !== "undefined"`). Used strictly in backend route handlers and server actions.
4. **Input Validation:** Zod schemas validate all server action inputs before database calls.
5. **Rate Limiting:**
   - Client approval portal: `approval_attempts` table tracks salted IP hashes (`RATE_LIMIT_SALT`) and 12-char token prefixes. Limits: max 30 attempts per IP and max 15 attempts per token per 10-minute window. In-memory sliding window fallback if unmigrated.
   - Team invitations: Max 20 pending invitations per 24 hours per workspace; 60s cooldown between resends (max 10 resends).
   - Proposal emails: Max 5 sends per change request per hour; 60s cooldown between dispatches.
6. **Security Headers & Cache Control:** Public token pages (`/approve/*`, `/invite/*`) serve headers disabling browser caching (`no-store, no-cache, must-revalidate`), stripping referrers (`no-referrer`), and instructing search crawlers not to index (`noindex, nofollow`).
7. **Privacy & Audit Logging:** IP addresses are salted and hashed; email addresses in activity logs and invitation tables are masked (`j***@example.com`); internal notes are excluded from client snapshots.

### Observed Limitations:
1. **Bearer Link Identity:** Client identity on approval links is bearer-token based. Clients self-declare their name; there is no two-factor OTP or verified digital certificate.
2. **Provider Acceptance vs Delivery:** Outbound emails sent via Resend record status `sent` when accepted by the Resend REST API; actual inbox delivery depends on recipient mail servers (webhook status tracking is not implemented).
3. **Database-Backed Rate Limiting:** Rate limiting uses PostgreSQL table queries rather than an edge Redis cache (e.g. Upstash), introducing minor database overhead on high-frequency requests.

---

## 10. Environment Variables

Evidence Files: [`.env.example`](file:///c:/ScopeGuard/.env.example), [`lib/env.ts`](file:///c:/ScopeGuard/lib/env.ts), [`lib/server/rate-limit.ts`](file:///c:/ScopeGuard/lib/server/rate-limit.ts)

| Variable Name | Realm | Required? | Default / Example Value | Where Used in Code | Purpose |
|---|---|:---:|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client & Server | **Yes** | `https://your-project.supabase.co` | `lib/env.ts`, `lib/supabase/client.ts`, `server.ts`, `middleware.ts` | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client & Server | **Yes** | `your-supabase-anon-key` | `lib/env.ts`, `lib/supabase/client.ts`, `server.ts`, `middleware.ts` | Supabase anonymous public key |
| `NEXT_PUBLIC_APP_URL` | Client & Server | **Yes** | `http://localhost:3000` (or `3001`) | `lib/env.ts`, `app/actions/auth.ts`, `lib/server/tokens.ts`, `invitation-tokens.ts` | Canonical base URL for auth redirects and links |
| `SUPABASE_SERVICE_ROLE_KEY` | Server Only | **Yes** | `your-supabase-service-role-key` | `lib/env.ts`, `lib/supabase/service.ts` | Secret service-role key for public approvals |
| `RESEND_API_KEY` | Server Only | Optional | `re_your_resend_api_key_here` | `lib/env.ts`, `lib/email/resend.ts` | API key for Resend email service |
| `EMAIL_FROM` | Server Only | Optional | `ScopeGuard <notifications@scopeguard.agency>` | `lib/env.ts`, `lib/email/resend.ts` | Sender email identity for outgoing notifications |
| `RATE_LIMIT_SALT` | Server Only | Optional | Hardcoded fallback `"scopeguard_approval_rate_limit_salt_2026"` | `lib/server/rate-limit.ts` | Salt used to hash client IP addresses |

### Cross-Check against `.env.example`:
- `RATE_LIMIT_SALT` is read in `lib/server/rate-limit.ts` with a secure default fallback, but is **omitted from `.env.example`**.
- All other 6 variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`) are documented in `.env.example` and validated via Zod in `lib/env.ts`.

---

## 11. Deployment Configuration

- **Platform:** Vercel (Next.js preset)
- **Vercel Config File (`vercel.json`):** Not present (standard Next.js zero-config build used).
- **Build Settings:**
  - Build command: `npm run build` (`next build`)
  - Output directory: `.next`
  - Install command: `npm install`
- **Live URL:** `https://scopeguard-pearl.vercel.app` (or `[TO BE FILLED BY AUTHOR: custom production domain]`)
- **Repository URL:** `https://github.com/kirteebhat/scopeguard.git` (verified from `git remote -v`)
- **Supabase Auth Redirect URL Requirements:**
  - Site URL: `https://scopeguard-pearl.vercel.app`
  - Additional Redirect URLs:
    - `https://scopeguard-pearl.vercel.app/auth/callback`
    - `https://scopeguard-pearl.vercel.app/dashboard`
    - `https://scopeguard-pearl.vercel.app/reset-password`

---

## 12. Test Assets

### A. Unit Tests (20 files in `tests/unit/`)
1. `auth-classification.test.ts`: Error classification for auth responses.
2. `auth-context.test.ts`: User role and workspace membership context validation.
3. `change-requests-action.test.ts`: Action layer input parsing for change requests.
4. `env.test.ts`: Zod schema validation for public and server environment variables.
5. `export-csv.test.ts`: CSV formatting, character escaping, and RFC 4180 compliance.
6. `impact.test.ts`: Baseline impact math, delta days, and project financial rollup.
7. `invitations-fallback.test.ts`: In-memory fallback behavior when invitation tables are unmigrated.
8. `invitations-validation.test.ts`: Zod validation schemas for team invitations.
9. `landing-page.test.tsx`: Component test for landing page hero, pricing, and FAQ.
10. `money.test.ts`: Decimal parsing, minor units conversion, half-up rounding, and currency formatting.
11. `projects.test.ts`: Project validation rules, date sequencing, and currency checks.
12. `proposal-email-validation.test.ts`: Validation for client contact updates and proposal email requests.
13. `proposal-emails-fallback.test.ts`: In-memory fallback behavior when proposal email tables are unmigrated.
14. `rate-limit.test.ts`: In-memory and hashing rate limit tests for client link decisions.
15. `redirect.test.ts`: Open-redirect prevention and safe URL resolution.
16. `smoke.test.ts`: Vitest test runner sanity check.
17. `state-machine.test.ts`: 25 transitions tested across all roles (owner, manager, member, client_link).
18. `tokens.test.ts`: 256-bit entropy, URL-safe base64 encoding, and SHA-256 hash length.
19. `validation-auth.test.ts`: Password strength and email format validation.
20. `validation-domain.test.ts`: Project and change request domain input validation.

### B. Integration Tests (11 files in `tests/integration/`)
1. `approval-concurrency.test.ts`: Concurrent decision submission using simulated locks.
2. `change-requests-workflow.test.ts`: Full draft -> publish -> revise -> republish lifecycle.
3. `change-requests.test.ts`: Database draft creation, update, and deletion rules.
4. `dashboard.test.ts`: Workspace dashboard aggregation across multiple projects and currencies.
5. `invitations-migration.test.ts`: PGlite in-memory Postgres test running Migration 4 (`workspace_invitations`).
6. `migrations.test.ts`: PGlite in-memory Postgres executing Migrations 1 and 2 sequentially.
7. `project-rollup-and-activity.test.ts`: Rollup calculations verified against audit activity log entries.
8. `projects-deliverables.test.ts`: Deliverable creation, status update, and project relationship integrity.
9. `proposal-email-actions.test.ts`: Server action logic for sending proposals, rate limiting, and cooldowns.
10. `proposal-emails-migration.test.ts`: PGlite in-memory Postgres running Migration 5 (`proposal_emails`).
11. `rls.test.ts`: Comprehensive PGlite Postgres RLS testing: 28 test cases verifying default-deny across roles.

### C. End-to-End Tests (11 files in `tests/e2e/`)
1. `accessibility.spec.ts`: Playwright + Axe-Core automated WCAG AA accessibility audit.
2. `auth-flow.spec.ts`: Login, signup, password reset, and route protection redirects.
3. `change-requests-workflow.spec.ts`: Full agency drafting, publishing, and revision flow.
4. `change-requests.spec.ts`: Draft creation, deliverable linking, and internal notes isolation.
5. `client-approval.spec.ts`: Public client portal review, approve, and reject actions on mobile/desktop.
6. `components.spec.ts`: Dev component showcase rendering.
7. `full-journey.spec.ts`: Multi-context end-to-end journey from project creation to client sign-off.
8. `landing-page.spec.ts`: Landing page responsiveness and navigation.
9. `multi-tenant-isolation.spec.ts`: Cross-workspace data isolation verification.
10. `projects.spec.ts`: Project creation, deliverable management, and settings forms.
11. `smoke.spec.ts`: Server connectivity and homepage loading.

---

## 13. Contradictions Between Older Docs and Code

| Item / Subject | Older Docs Claim | Codebase / Migration Reality | Resolution in Final Docs |
|---|---|---|---|
| **Database Tables Count** | `docs/ARCHITECTURE.md` states "11 Relational Tables". | Migrations 1 through 5 create exactly **13 relational tables** (`workspace_invitations` added in Migration 4, `proposal_emails` added in Migration 5). | State 13 tables accurately in all architecture documents. |
| **Token Regeneration RPC Name** | `docs/03-permissions-matrix.md` lists RPC name as `reissue_approval_token`. | `20261011130000_change_requests_and_approvals.sql` defines `public.regenerate_approval_token`. | Document the exact SQL function name `regenerate_approval_token`. |
| **Email Dispatch Feature Status** | Older `README.md` states *"No Direct Email Dispatch"* as an MVP limitation. | Migrations 4 and 5 implemented transactional email dispatch via Resend for both Team Invitations (`app/actions/invitations.ts`) and Client Proposals (`app/actions/proposal-emails.ts`), complete with in-memory fallback stores. | Classify transactional email notifications as **Implemented** with documented provider caveats. |
| **Test Suite Numbers** | Older `README.md` claims "22 test files with 244 automated unit, integration, and PGlite RLS tests". | The codebase contains **31 unit and integration test files** executing **345 passing tests** in Vitest, plus 11 Playwright E2E spec files. | Report true, verified Vitest execution count (345 tests). |
| **Environment Variable in Code** | `.env.example` lists 6 environment variables. | `lib/server/rate-limit.ts` reads `RATE_LIMIT_SALT` with fallback `"scopeguard_approval_rate_limit_salt_2026"`. | Note `RATE_LIMIT_SALT` as an optional server secret in setup tables and highlight discrepancy with `.env.example`. |
| **Repository URL** | Older `README.md` displays `https://github.com/your-org/ScopeGuard.git`. | Verified via `git remote -v`: `https://github.com/kirteebhat/scopeguard.git`. | Use verified repository URL throughout. |
| **Multi-Currency Totals** | Informal roadmap docs discussed summing project totals. | `lib/domain/impact.ts` strictly prohibits cross-currency summation (`Currency mismatch` exception) and groups rollups by currency. | Highlight currency isolation as an intentional core architectural constraint. |
| **Command Palette & Themes** | Older UI upgrade notes discussed cmdk command palettes and dark mode toggles. | Not implemented in code; package `cmdk` is not installed, and the application uses a consistent accessible light theme. | Mark Command Palette and Theme Switcher as **Not implemented**. |
