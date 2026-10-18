# ScopeGuard Gap Audit & Quality Assessment Report

**Audit Date:** October 18, 2026  
**Auditor:** ScopeGuard Architecture Team  
**Scope:** Running app evaluation against `docs/00-master-brief.md`, `docs/DECISIONS.md`, and multi-role access (Owner, Manager, Member, and Unauthenticated Client Link).

---

## 1. Audit Findings Matrix & Remediation Summary

| ID | Route / Feature | Expected Behavior | Actual Behavior (Pre-Fix) | Severity | Status | Resolution Details |
|---|---|---|---|---|---|---|
| **GAP-01** | `/signup`<br>Auth Registration | When an existing email signs up, detect Supabase obfuscated user (`identities.length === 0`). If unconfirmed, re-send verification email. If confirmed, show helpful prompt with "Log in" and "Reset password" links. | Code assumed any non-error user object meant "New account awaiting verification", falsely claiming an email was sent for existing accounts. | **Important** | **RESOLVED** | Implemented `classifySignUpResult` domain logic in `lib/domain/authClassification.ts` and wired into `signUpAction` and `SignUpForm.tsx`. Tested with 11 unit tests in `tests/unit/auth-classification.test.ts`. |
| **GAP-02** | `lib/validation/auth.ts`<br>Email Normalization | Email input across login, signup, forgot-password, and resend must be normalized (`trim().toLowerCase()`) via a single shared Zod schema. | Schema only had `.trim()`, allowing uppercase/lowercase mismatches to propagate into queries. | **Important** | **RESOLVED** | Created unified `emailSchema = z.string().trim().toLowerCase()...` in `lib/validation/auth.ts`, applied across all auth schemas. Verified in `tests/unit/validation-auth.test.ts`. |
| **GAP-03** | Auth & Form Buttons<br>Double-Submit Protection | Submit buttons disable immediately on submit, display loading spinner, and ignore repeat clicks. | Rapid double-clicking could fire multiple concurrent server actions before transition state locked. | **Important** | **RESOLVED** | Added `isSubmitting` local lock + `isPending` state binding in `SignUpForm.tsx`, `LoginForm.tsx`, `ForgotPasswordForm.tsx`, and `ResetPasswordForm.tsx`. |
| **GAP-04** | `/projects`<br>Project List Search & Filters | Search query, status filter, and sort options persist in the URL query string (`?status=active&search=...&sort=...`) so refresh and link sharing preserve state. | Stored strictly in React component `useState`; refreshing or navigating back wiped all filter criteria. | **Important** | **RESOLVED** | Integrated `useSearchParams`, `useRouter`, and `usePathname` in `ProjectsClientList.tsx` with Suspense boundary in `app/(authenticated)/projects/page.tsx`. |
| **GAP-05** | `/projects/[projectId]/changes`<br>Changes List Search & Filters | Filter and search query persist in URL query parameters. | Local component state only; lost on page refresh. | **Important** | **RESOLVED** | Integrated `useSearchParams` and `useRouter` in `ProjectChangesClientList.tsx` with Suspense boundary in `app/(authenticated)/projects/[projectId]/changes/page.tsx`. |
| **GAP-06** | `/projects/[projectId]` & `/changes/[changeId]`<br>Next Action Prompts | Clear, contextual "Next Action" guide banner based on current status (e.g. "Draft ready: preview and send for client approval"). | Users had to infer the next step from raw status badges. | **Minor** | **RESOLVED** | Added contextual Next Action banners in `app/(authenticated)/projects/[projectId]/page.tsx`, `app/(authenticated)/changes/[changeId]/page.tsx`, and `ChangeRequestReadOnlyDetail.tsx`. |
| **GAP-07** | Project & Change Request Forms<br>Unsaved Changes Warning | Forms with `isDirty = true` alert the user via `beforeunload` if they attempt to leave or close the tab with unsaved edits. | Tab close or back-button navigation silently discarded unsubmitted form edits. | **Important** | **RESOLVED** | Created `useUnsavedChangesWarning` hook (`lib/hooks/useUnsavedChangesWarning.ts`) and wired into `ChangeRequestForm.tsx`, `NewProjectForm.tsx`, and `ProjectSettingsForm.tsx`. |
| **GAP-08** | `/dashboard`<br>First-Run Onboarding Checklist | On an empty workspace, provide an interactive checklist (1. Create project baseline, 2. Add contract deliverable, 3. Draft change request) that guides the user and disappears once completed. | Displayed static marketing feature cards without actionable step-by-step checklist progress. | **Minor** | **RESOLVED** | Updated `DashboardEmptyWorkspace.tsx` with an interactive 3-step checklist with progress count and direct action triggers. Automatically transitions to live metrics once first project is created. |
| **GAP-09** | Project Change History<br>CSV Export | Provide a safe, workspace-scoped CSV export of all change orders for a project (title, pricing, hours, cost, currency, status, approval decision), excluding internal notes. | No CSV export capability was present in the interface. | **Important** | **RESOLVED** | Created pure domain generator `lib/domain/exportCsv.ts` with RFC 4180 escaping and formula injection protection. Created workspace-scoped GET route `app/api/projects/[projectId]/export-csv/route.ts` and added "Export CSV" buttons to project changes and project detail pages. Tested in `tests/unit/export-csv.test.ts`. |
| **GAP-10** | `/changes/[changeId]`<br>Approval Link Expiry & Status | Clearly display current link status and active token badge on pending proposals, with 1-click "Revoke & Generate New Link" modal. | Expiry timestamp was not prominently displayed on the pending workflow bar. | **Minor** | **RESOLVED** | Added "Active Client Token" badge and plain-language guidance to `pendingWorkflowBar` in `ChangeRequestReadOnlyDetail.tsx` alongside `PublishedLinkDialog` copy modal. |

---

## 2. Role-Based Permission Audit

| Route / Capability | Owner | Manager | Member | Client Link (Public) | Result |
|---|---|---|---|---|---|
| **View Projects & Change Orders** | Allowed | Allowed | Allowed (Workspace) | Blocked (Requires token) | **PASS** |
| **Create Project Baseline** | Allowed | Allowed | Allowed | Blocked | **PASS** |
| **Edit Project Financials (Budget/Rate)** | Allowed | Allowed | **Blocked** (Role check) | Blocked | **PASS** |
| **Draft Change Request** | Allowed | Allowed | Allowed | Blocked | **PASS** |
| **Publish / Submit for Approval** | Allowed | Allowed | **Blocked** (Role check) | Blocked | **PASS** |
| **Revise Pending Proposal** | Allowed | Allowed | **Blocked** (Role check) | Blocked | **PASS** |
| **Withdraw Proposal** | Allowed | Allowed | **Blocked** (Role check) | Blocked | **PASS** |
| **View Proposal via `/approve/[token]`** | N/A (Public) | N/A (Public) | N/A (Public) | **Allowed** (Bearer link) | **PASS** |
| **Decide Proposal (Approve / Reject)** | N/A | N/A | N/A | **Allowed** (Mandatory Name) | **PASS** |
| **Team Role Management (`/settings/team`)** | Allowed | View Only | View Only | Blocked | **PASS** |

---

## 3. Verification & Test Evidence

All checks have been verified with automated tests:
1. `npm run test`: **24 test files, 261 tests passing** (including new `export-csv.test.ts` and `auth-classification.test.ts`).
2. `npm run typecheck`: TypeScript passes with **0 errors**.
3. `npm run lint`: ESLint passes with **0 warnings or errors**.
