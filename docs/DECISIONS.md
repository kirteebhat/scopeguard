# ScopeGuard - Locked Architecture & Business Decisions

This document records the foundational and unchangeable architectural, security, and business logic decisions for ScopeGuard. All implementations across database schemas, RLS policies, domain logic, and frontend components must strictly adhere to these rules.

---

## 1. Roles & Permissions

- **Internal Workspace Roles:** `owner`, `manager`, `member`.
- **"Client" is NOT a workspace role:** The client is an external actor type (`client_link`) authenticated strictly via unique, revocable bearer approval tokens. Clients never exist in `workspace_members`.
- **Role Permissions:**
  - **`member`:** Can view authorized projects within their workspace and create/edit **draft** change requests only. Members cannot publish proposals, withdraw proposals, delete projects, or modify project financial baselines (budget, hourly rates).
  - **`manager`:** Has full operational access over projects, deliverables, and change requests in the workspace (create, edit, publish, revise, withdraw). Cannot modify workspace settings, billing, or workspace ownership.
  - **`owner`:** Complete authority over the workspace, including workspace settings, member role assignments, workspace deletion/renaming, and all project operations. Exactly one owner per workspace.

---

## 2. Change Request Lifecycle & State Machine

- **Permitted Statuses:** `draft`, `pending_approval`, `approved`, `rejected`, `withdrawn`.
- **Terminal States:** `approved`, `rejected`, and `withdrawn` are strictly terminal. No further edits, revisions, or status changes are permitted on a decided request. Subsequent scope modifications require a new change request.
- **Revision Flow:** Revising a request in `pending_approval` revokes its active approval token immediately and reverts the request status to `draft`.
- **Versioning:** Republishing a revised draft creates version $N+1$ with a fresh snapshot and a new 14-day approval token. The previous version remains archived in history, and its old token is permanently unusable.

---

## 3. Money, Currencies & Rounding Rules

- **Storage Format:** Integer minor units (e.g., paise for INR, cents for USD/EUR). No floating-point currency storage.
- **Rounding Rule:** Half-up rounding (`round(hours * rate_minor)`), computed deterministically on the server within pure domain functions.
- **Currency Isolation:** Currency is set per project (3-letter ISO code).
- **Multi-Currency Totals:** Totals are **never** converted or summed across different currencies. Dashboards and project overviews must group and display totals grouped strictly per currency.

---

## 4. Financial "Source of Truth"

- **Immutable Snapshots:** Approved totals (additional charges, revised budget) are computed **exclusively** from approved version snapshots (`change_request_versions`), never from mutable draft columns on `change_requests`.
- **Mutable Draft Separation:** The mutable row on `change_requests` represents working draft inputs only. Edits to a draft never contaminate historical or dashboard metrics.

---

## 5. Deadline Calculation

- **Revised Project Deadline Formula:**
  $$\text{Revised Project Deadline} = \max(\{\text{proposed\_deadline} \mid \text{version} \in \text{approved\_versions}\} \cup \{\text{original\_deadline}\})$$
  If no approved version proposes an extended deadline, the revised deadline equals the project's original contractual deadline.

---

## 6. Client Approval Tokens & Security

- **Lifetime:** 14 days from publication.
- **Revocability:** Explicitly revocable upon proposal revision, agency withdrawal, or manual link revocation.
- **One Token per Version:** Exactly one active token per published proposal version.
- **Cryptographic Storage:** Raw tokens are generated using $\ge 32$ cryptographically secure random bytes (`crypto.randomBytes`). Only the SHA-256 hash (`token_hash`) is stored in the database. Raw tokens are never logged or persisted in plaintext.
- **Service-Role Boundary:** The public client approval page operates via `SECURITY DEFINER` database functions accessed through the server-side service-role client. The service-role key is never exposed to client-side bundles or browsers.

---

## 7. Client Identity & Non-Repudiation

- **Self-Declared Identity:** Bearer approval links require the client to provide a self-declared name (and optional email) at the moment of decision.
- **Honest Limitations:** Identity is unverified (operational sign-off, not a cryptographic or legally binding e-signature). Audit metadata captures timestamp, self-declared name, and salted/truncated IP hashes.

---

## 8. Communications & Notifications

- **Email Scope:** Outbound transactional email (via Resend) is designated as a **P1** feature.
- **MVP Behavior:** The MVP displays a copyable public approval link modal with an unambiguous notice: *"Link generated. No email was sent automatically — please share this link directly with your client."* The UI must never claim an email was dispatched when it was not.

---

## 9. Plans & Subscriptions

- **Display Metadata Only:** Subscription tiers (Free, Pro, Agency) and feature limits are strictly display-only metadata in the MVP.
- **No Deceptive Gating:** Limits must not be presented as enforced payment walls unless real billing or server-side limits are fully implemented.
