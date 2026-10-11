# ScopeGuard Engineering Rules & Implementation Guidelines

These rules are strictly enforced for all development in the ScopeGuard workspace. Every AI agent and developer must comply with these standards.

---

## 1. Absolute Security & Access Boundaries

1. **Service-Role Key Isolation:** NEVER expose `SUPABASE_SERVICE_ROLE_KEY` to client components, browser-accessible environment variables (`NEXT_PUBLIC_*`), or frontend bundles. The service-role client is strictly restricted to server actions and server-side route handlers executing token-based public approvals.
2. **Row-Level Security (RLS) Default Deny:** Enable RLS on every database table without exception. Authenticated users only access rows within their verified workspace. Direct SQL reads/writes from the browser bypass RLS under no circumstances.
3. **Database Function Hardening:** All `SECURITY DEFINER` functions must specify an explicit, fixed `search_path = public, pg_temp` to prevent search path hijacking. Revoke direct execution permissions from public/anon where operations require service-role mediation.
4. **Token Security:** Approval tokens must be generated using `crypto.randomBytes(32)` (or higher), URL-safe encoded, and stored **only** as a cryptographic SHA-256 hash (`token_hash`). Raw tokens exist solely in memory for the single generation response; never persist or log raw tokens in plaintext.
5. **Audit Integrity:** Activity logs and audit records must store minimized metadata. Never store passwords, raw bearer tokens, or full client IP addresses (store salted hashes or truncated subnets).

---

## 2. Integrity & Quality Standards

1. **Never Mark Done Until Tested:** Do not declare any task, step, or feature complete until it has been verified through automated tests (unit, integration, or E2E) or interactive browser testing.
2. **Pre-Completion Quality Checks:** Always execute the following suite before reporting task completion:
   ```bash
   npm run lint
   npm run typecheck
   npm run test
   ```
   If any check fails, resolve the issue immediately. Never weaken or delete test assertions to force a pass.
3. **One Logical Change per Commit:** Commit work incrementally with clear, descriptive commit messages matching conventional commit conventions (e.g., `feat:`, `fix:`, `test:`, `docs:`, `refactor:`). Never bundle unrelated tasks into a single commit.
4. **No Simulated or "Fake" Features:**
   - No mock buttons with empty `onClick={() => {}}` handlers.
   - No fabricated charts, fake testimonials, fake logos, or fake statistics.
   - Features not yet ready for MVP (e.g., email dispatch, team invitations) must be clearly labeled as disabled or "coming in a future release" with plain, honest text.

---

## 3. Core Domain & Business Logic Rules

1. **Financial Precision:**
   - Store all monetary values as **integer minor units** (e.g., paise for INR, cents for USD). Never use floating-point types (`FLOAT`, `DOUBLE PRECISION`) for currency columns.
   - Rounding rule: Half-up rounding (`round(hours * rate_minor)`), calculated centrally in `lib/domain/money.ts`.
   - Multi-currency totals must **never** be summed or converted across currencies without an exchange rate engine. Aggregate and display totals grouped by currency.
2. **Source of Truth for Approved Changes:**
   - Historical and dashboard figures must roll up **exclusively** from immutable `change_request_versions` snapshots associated with `approved` status.
   - Never compute project metrics from mutable draft columns on `change_requests`.
3. **State Machine Compliance:**
   - Permitted states: `draft`, `pending_approval`, `approved`, `rejected`, `withdrawn`.
   - `approved`, `rejected`, and `withdrawn` are terminal.
   - Revising a pending request immediately revokes the active token and returns the status to `draft`. Republishing increments the version counter to $N+1$.
   - The decision endpoint must enforce atomic locking (`SELECT ... FOR UPDATE`) to prevent race conditions and duplicate approvals.
4. **Revised Deadline Math:**
   - The revised project deadline equals the maximum `proposed_deadline` among all approved version snapshots, falling back to the project's original contract deadline.

---

## 4. Architecture & Coding Conventions

1. **Strict Layer Separation:**
   - `app/`: Next.js App Router routes, layouts, and server actions.
   - `components/ui/`: Dumb, reusable, accessible UI components.
   - `lib/domain/`: Pure, framework-free business logic (zero React/Next.js/Supabase imports; 100% unit-tested).
   - `lib/data/`: Server-side data access layer, role validation, and Supabase client queries.
   - `lib/validation/`: Zod validation schemas shared between client forms and server actions.
   - `supabase/migrations/`: Idempotent SQL migrations with full RLS and trigger definitions.
2. **User Experience & Accessibility:**
   - Mobile-first responsiveness (no horizontal overflow at 360px viewport width; tables adapt to card views on mobile).
   - Keyboard accessibility: Visible focus rings, sensible tab sequences, dialog focus traps, and ESC dismissal.
   - Comprehensive error and boundary handling: Every page must implement `loading.tsx`, `error.tsx`, and explicit empty states.
