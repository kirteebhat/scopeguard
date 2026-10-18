# ScopeGuard - Permissions & Access Control Matrix

---

## 1. Actor Definitions

| Actor | Category | Description & Authentication Context |
|---|---|---|
| **`owner`** | Internal Workspace | The primary administrator and creator of the workspace. Exactly one owner exists per workspace. |
| **`manager`** | Internal Workspace | Project managers and account leads with operational authority to manage projects, commercial terms, and client proposals. |
| **`member`** | Internal Workspace | Technical contributors, designers, or junior staff who execute work and identify draft scope changes. |
| **`client_link`** | External Actor | External client stakeholder accessing a specific proposal version via a cryptographically hashed 14-day bearer token. No Supabase user account. |
| **`not_authenticated`** | Public User | Public visitor with no active Supabase session and no valid bearer approval token. |

---

## 2. Granular Permissions Matrix

| Domain | Action / Operation | `owner` | `manager` | `member` | `client_link` | `not_authenticated` | Enforcement Mechanism |
|---|---|:---:|:---:|:---:|:---:|:---:|---|
| **Workspace** | Create workspace | ✅ | ❌ | ❌ | ❌ | ❌ (Must login) | Database RPC (`create_workspace`) |
| | Edit workspace name / settings | ✅ | ❌ | ❌ | ❌ | ❌ | Server Action (`requireRole(['owner'])`) & RLS |
| | View workspace dashboard | ✅ | ✅ | ✅ | ❌ | ❌ | Server Action (`requireRole`) & RLS on `workspace_id` |
| | Delete workspace | ✅ | ❌ | ❌ | ❌ | ❌ | Server Action (`requireRole(['owner'])`) & RLS |
| **Team** | View team members | ✅ | ✅ | ✅ | ❌ | ❌ | RLS (`workspace_members` SELECT policy) |
| | Change member role | ✅ | ❌ | ❌ | ❌ | ❌ | Server Action (`requireRole(['owner'])`) & RLS UPDATE |
| | Remove member | ✅ | ❌ | ❌ | ❌ | ❌ | Server Action (`requireRole(['owner'])`) & RLS DELETE |
| | Invite member (Manager role) | ✅ | ❌ | ❌ | ❌ | ❌ | Server Action (`requireRole(['owner'])`) & RPC `create_invitation` |
| | Invite member (Member role) | ✅ | ✅ | ❌ | ❌ | ❌ | Server Action (`requireRole(['owner', 'manager'])`) & RPC `create_invitation` |
| | Resend / Revoke invitation | ✅ | ✅ | ❌ | ❌ | ❌ | Server Action (`requireRole(['owner', 'manager'])`) & RPC `resend/revoke_invitation` |
| | Accept invitation (`/invite/[token]`) | ❌ | ❌ | ❌ | ❌ | ✅ (Bound invitee) | RPC `accept_invitation` (Strict email match & atomic lock) |
| **Projects** | View project list & detail | ✅ | ✅ | ✅ | ❌ | ❌ | RLS (`projects` SELECT where `is_workspace_member`) |
| | Create new project | ✅ | ✅ | ❌ | ❌ | ❌ | Server Action (`requireRole(['owner','manager'])`) & RLS |
| | Edit non-financial details (name, client) | ✅ | ✅ | ❌ | ❌ | ❌ | Server Action (`requireRole(['owner','manager'])`) & RLS |
| | Edit baseline financials (budget, rate, currency) | ✅ | ✅ | ❌ | ❌ | ❌ | Server Action (`requireRole(['owner','manager'])`) & RLS |
| | Archive / Delete project | ✅ | ❌ | ❌ | ❌ | ❌ | Server Action (`requireRole(['owner'])`) & RLS |
| **Deliverables**| View deliverables | ✅ | ✅ | ✅ | ❌ | ❌ | RLS (`deliverables` SELECT) |
| | Add deliverable | ✅ | ✅ | ❌ | ❌ | ❌ | Server Action (`requireRole(['owner','manager'])`) & RLS |
| | Edit deliverable | ✅ | ✅ | ❌ | ❌ | ❌ | Server Action (`requireRole(['owner','manager'])`) & RLS |
| | Delete deliverable | ✅ | ✅ | ❌ | ❌ | ❌ | Server Action (`requireRole(['owner','manager'])`) & RLS |
| **Drafting** | View change requests | ✅ | ✅ | ✅ | ❌ | ❌ | RLS (`change_requests` SELECT) |
| | Create change request draft | ✅ | ✅ | ✅ | ❌ | ❌ | Server Action & RLS (`change_requests` INSERT as 'draft') |
| | Edit draft request | ✅ | ✅ | ✅ | ❌ | ❌ | Server Action & RLS (UPDATE restricted to status='draft') |
| | View internal notes | ✅ | ✅ | ✅ | ❌ | ❌ | RLS (notes never in public RPC or client view) |
| | Delete draft request | ✅ | ✅ | ❌ | ❌ | ❌ | Server Action & RLS (DELETE restricted to status='draft') |
| **Publishing**| Publish draft to pending proposal | ✅ | ✅ | ❌ | ❌ | ❌ | Postgres RPC `publish_change_request` (Owner/Manager check) |
| | View/copy active approval link | ✅ | ✅ | ❌ | ❌ | ❌ | Returned in-memory on publish; re-issue RPC only |
| | Re-issue / revoke active token | ✅ | ✅ | ❌ | ❌ | ❌ | Postgres RPC `reissue_approval_token` |
| | Revise pending proposal | ✅ | ✅ | ❌ | ❌ | ❌ | Postgres RPC `revise_change_request` |
| | Withdraw pending proposal | ✅ | ✅ | ❌ | ❌ | ❌ | Postgres RPC `withdraw_change_request` |
| **Send to Client**| Send proposal email to client | ✅ | ✅ | ❌ | ❌ | ❌ | Server Action (`requireRole(['owner','manager'])`) & RPC `begin_proposal_email` |
| | Set/update project client contact | ✅ | ✅ | ❌ | ❌ | ❌ | Server Action & RPC `set_project_client_contact` |
| | View proposal email delivery history | ✅ | ✅ | ❌ | ❌ | ❌ | Server Action & RLS (`proposal_emails` SELECT for owner/manager only) |
| | Direct SQL write to `proposal_emails`| ❌ | ❌ | ❌ | ❌ | ❌ | Default deny RLS on `proposal_emails` (INSERT/UPDATE via RPC only) |
| **Client Portal**| View proposal via token (`/approve/[token]`)| ❌ | ❌ | ❌ | ✅ (Bound token) | ❌ | Public Service-Role RPC `get_proposal_by_token` |
| | Submit decision (Approve/Reject) | ❌ | ❌ | ❌ | ✅ (Bound token) | ❌ | Public Service-Role RPC `submit_decision` |
| **Audit & Log** | View activity feed | ✅ | ✅ | ✅ | ❌ | ❌ | RLS (`activity_logs` SELECT on workspace) |
| | View version snapshot history | ✅ | ✅ | ✅ | ❌ | ❌ | RLS (`change_request_versions` SELECT on workspace) |
| | Direct SQL update/delete of snapshots | ❌ | ❌ | ❌ | ❌ | ❌ | Database trigger blocks UPDATE/DELETE on versions |

---

## 3. Defense-in-Depth Enforcement Model

To ensure security is never compromised by a missed client-side check, ScopeGuard enforces permissions across three distinct architectural layers:

```text
[ Browser / Client Form ]
           │
           ▼
[ Layer 1: Next.js Server Action ]
  • Validates session cookie with Supabase Auth
  • Resolves user's active workspace and role in lib/data/permissions.ts
  • Evaluates requireRole(['owner', 'manager'])
  • Validates payload with shared Zod schema
           │
           ▼
[ Layer 2: Postgres Row-Level Security (RLS) ]
  • Evaluates is_workspace_member(workspace_id)
  • Default-deny policy on all tables
  • Blocks cross-workspace data leakage even on direct SQL attempts
           │
           ▼
[ Layer 3: SECURITY DEFINER Database Functions ]
  • Atomic transactional state transitions (publish, decide, revise)
  • Fixed search_path = public, pg_temp
  • Row-level locking (SELECT ... FOR UPDATE) on decision submissions
```

### Special Rule: Client Bearer Link Security
- The public client portal (`/approve/[token]`) does **not** rely on standard RLS because the client is unauthenticated.
- Direct table reads/writes to `change_request_versions`, `approval_tokens`, and `approvals` are **revoked from anon and authenticated roles**.
- All interactions execute via two hardened `SECURITY DEFINER` Postgres functions invoked strictly server-side by the dedicated service-role client:
  1. `get_proposal_by_token(token_hash)`: Exposes only sanitized proposal data (internal notes explicitly excluded).
  2. `submit_decision(token_hash, decision, actor_name, audit_meta)`: Enforces atomic concurrency locking and checks token expiry/revocation.
