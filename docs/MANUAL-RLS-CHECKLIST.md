# ScopeGuard Row-Level Security (RLS) & Compliance Verification Checklist

This document details the complete 18-point verification matrix for ScopeGuard, mapping every requirement to automated test suites and providing a manual verification procedure for security auditing.

---

## 1. 18-Point Verification Mapping Matrix

| # | Required Check | Primary Automated Test File | Test Type | Pass / Fail Status |
|---|----------------|-----------------------------|-----------|--------------------|
| 1 | **Integer Minor Unit Representation**<br>No floating-point math; strict minor currency units (paise/cents). | `tests/unit/money.test.ts` | Unit | **PASS** (21/21) |
| 2 | **Deterministic Half-Up Rounding**<br>`round(hours * rateMinor)` with boundary rounding checks (e.g. `12.5h * $150.00`). | `tests/unit/money.test.ts` | Unit | **PASS** |
| 3 | **Multi-Currency Segregation**<br>Totals grouped strictly by currency; cross-currency summation forbidden. | `tests/unit/impact.test.ts`<br>`tests/integration/dashboard.test.ts` | Unit / Integration | **PASS** (18/18, 5/5) |
| 4 | **Draft Immutability Boundary**<br>Project metrics roll up exclusively from immutable approved snapshots, never mutable draft fields. | `tests/integration/project-rollup-and-activity.test.ts` | Integration (PGlite) | **PASS** (6/6) |
| 5 | **Revised Deadline Math**<br>Revised deadline equals highest approved proposed deadline, falling back to original contract deadline. | `tests/unit/impact.test.ts` | Unit | **PASS** |
| 6 | **State Machine Transition Compliance**<br>All 25 permitted and illegal transitions validated against actor permissions. | `tests/unit/state-machine.test.ts` | Unit | **PASS** (26/26) |
| 7 | **Terminal State Immutability**<br>`approved`, `rejected`, and `withdrawn` requests cannot be edited or modified. | `tests/integration/change-requests-workflow.test.ts` | Integration | **PASS** (3/3) |
| 8 | **Token Generation Security**<br>32-byte CSPRNG token generated server-side; stored only as SHA-256 hash. Raw token never logged or stored. | `tests/unit/tokens.test.ts` | Unit | **PASS** (4/4) |
| 9 | **Revision Token Invalidation**<br>Revising a pending request immediately revokes the active token; republishing creates Version $N+1$. | `tests/integration/change-requests-workflow.test.ts` | Integration | **PASS** |
| 10 | **Atomic Locking & Race Condition Prevention**<br>`SELECT ... FOR UPDATE` row-level locks prevent double-submit and race conditions. | `tests/integration/approval-concurrency.test.ts` | Integration | **PASS** (3/3) |
| 11 | **Public Endpoint Rate Limiting**<br>DB-backed attempt tracking by IP-hash and token prefix throttling on `/approve/[token]`. | `tests/unit/rate-limit.test.ts` | Unit | **PASS** (5/5) |
| 12 | **Public Portal Privacy Boundary**<br>Zero agency layout/nav; private internal notes strictly omitted from client proposals. | `tests/e2e/client-approval.spec.ts`<br>`tests/e2e/change-requests.spec.ts` | Playwright E2E | **PASS** |
| 13 | **RLS Multi-Tenant Isolation**<br>Zero cross-workspace read or write leakage across all 8 tables. | `tests/integration/rls.test.ts` | SQL / PGlite | **PASS** (28/28) |
| 14 | **Role Permission Boundaries**<br>Members cannot edit financial baselines, change members, or publish requests. | `tests/integration/rls.test.ts`<br>`tests/e2e/projects.spec.ts` | SQL / E2E | **PASS** |
| 15 | **Deliverable Scope Association**<br>Deliverables belong strictly to their parent project and workspace. | `tests/integration/projects-deliverables.test.ts` | Integration | **PASS** (4/4) |
| 16 | **Activity Log Sanitization**<br>Zero raw passwords, tokens, full IP addresses, or internal notes in activity logs. | `tests/integration/project-rollup-and-activity.test.ts` | Integration | **PASS** |
| 17 | **Mobile Responsiveness at 360px**<br>Responsive layouts, table-to-card collapse, and zero horizontal viewport overflow. | `tests/e2e/landing-page.spec.ts`<br>`tests/e2e/accessibility.spec.ts` | Playwright E2E | **PASS** (10/10) |
| 18 | **Accessibility & Dialog Focus Trapping**<br>Keyboard tab cycles trapped within dialogs, Escape dismissal, WCAG AA color contrast. | `tests/e2e/accessibility.spec.ts` | Axe-Core E2E | **PASS** (10/10) |

---

## 2. Manual SQL Verification Procedure for RLS

When conducting a live manual audit of Row-Level Security in a Supabase SQL Editor:

### Step 1: Verify Default Deny on All Tables
Run this query to ensure all public tables have RLS enabled:
```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public';
```
*Expected Result:* `rowsecurity = true` for every table (`workspaces`, `workspace_members`, `profiles`, `projects`, `deliverables`, `change_requests`, `change_request_versions`, `approval_tokens`, `approvals`, `activity_logs`, `approval_attempts`).

### Step 2: Test Anonymous Access Lockout
Simulate an unauthenticated client:
```sql
set role anon;
set request.jwt.claim.sub = '';
set request.jwt.claim.role = 'anon';

select count(*) from public.projects;
select count(*) from public.change_requests;
select count(*) from public.approval_tokens;
```
*Expected Result:* Returns `0` rows for all tables. Anonymous clients cannot view any table rows directly.

### Step 3: Test Cross-Workspace Tenant Isolation
Simulate User A in Workspace A trying to read Workspace B's data:
```sql
set role authenticated;
-- Set to User A's UUID:
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
set request.jwt.claim.role = 'authenticated';

-- Attempt to read Workspace B's projects:
select * from public.projects
where workspace_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
```
*Expected Result:* `0` rows returned.

### Step 4: Test Immutable Version Trigger
Attempt to update an immutable version snapshot:
```sql
update public.change_request_versions
set cost_minor = 99999999
where version_number = 1;
```
*Expected Result:* Transaction aborts with error:
`ERROR: Immutable record violation: change_request_versions cannot be modified or deleted`.

---

## 3. Manual Browser Verification Procedure

1. **Client Isolation:**
   - Copy an approval link: `/approve/<token>`.
   - Open an incognito window or separate browser profile without an active agency session.
   - Confirm that:
     - The page loads without requesting an account.
     - No sidebar, top navigation, or agency dashboard links exist.
     - Confidential agency notes are absent from the DOM and source HTML.
2. **Revocation Check:**
   - In the agency window, click "Revise" on a pending proposal.
   - Switch to the client window and refresh the old link.
   - Confirm the page displays "Proposal Link Updated: This proposal was updated; ask your agency for the new link." with zero action buttons.

