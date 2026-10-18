# Workspace Team Invitations Architecture & Technical Specification

## Overview

ScopeGuard provides a secure, role-governed, transactional email invitation flow enabling agency owners and managers to expand their teams. Invitations feature cryptographic token verification, immutable audit trails, strict email match enforcement, and automatic email delivery with an honest manual copy fallback.

---

## 1. Role Hierarchy & Permissions

In accordance with `docs/DECISIONS.md` and `docs/03-permissions-matrix.md`:

| Inviter Role | Permitted Invitee Roles | Forbidden Actions |
|---|---|---|
| **Owner** | `manager`, `member` | Cannot invite another `owner` |
| **Manager** | `member` | Cannot invite `manager` or `owner` |
| **Member** | None | Cannot invite any user or view pending invites |

### Invariant Rules
1. **Single Owner Rule:** A workspace has strictly one owner. The `owner` role cannot be provisioned via an invitation link.
2. **Subordinate Delegation:** Managers can only invite Members. Attempting to invite a Manager as a Manager is rejected at both the database RPC and UI levels.
3. **Strict Email Matching:** Acceptance is cryptographically and procedurally locked to the invited email address (case-insensitive). If an authenticated user attempts to accept an invitation issued to a different address, access is refused, and the user is prompted to sign out and switch accounts.

---

## 2. Database Schema & RLS Hardening

### Table: `public.workspace_invitations`

```sql
create table public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role public.member_role not null,
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by uuid not null references public.profiles(id) on delete restrict,
  accepted_by uuid references public.profiles(id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  last_sent_at timestamptz not null default now(),
  send_count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### Unique Active Constraint
A partial unique index guarantees that at most one active (`pending`) invitation exists for any email within a given workspace:
```sql
create unique index idx_workspace_invitations_active_email
  on public.workspace_invitations(workspace_id, lower(trim(email)))
  where status = 'pending';
```
When an invitation is revoked, accepted, or expired, a new invitation can be issued to that address.

### Row Level Security (RLS)
- **Default Deny:** Direct client inserts, updates, and deletes are disabled. All mutations execute through hardened `SECURITY DEFINER` stored procedures.
- **Select Policy:** Authenticated workspace owners and managers can select invitations belonging to their active workspace. `token_hash` selection is revoked from `anon` to prevent credential harvesting.

---

## 3. Cryptographic Token Lifecycle

```
[crypto.randomBytes(32)]
         │
         ├──> URL-safe base64url encode ──> Raw Token (in-memory only)
         │                                      │
         │                                      ├──> Sent in email CTA link: /invite/<token>
         │                                      └──> Never persisted or logged
         │
         └──> SHA-256 Digest ───────────────> token_hash (stored in database)
```

1. **Generation:** `generateInvitationToken()` generates 32 bytes of cryptographically secure random entropy (`crypto.randomBytes(32)`).
2. **Storage:** Stored exclusively as an SHA-256 hexadecimal hash (`token_hash`). Raw tokens are never logged or stored in plaintext.
3. **Lookup:** `/invite/[token]` computes `sha256(rawToken)` and queries by hash.
4. **Validity:** Invitations expire 7 days after issuance.
5. **Revocation & Regeneration:**
   - Resending generates a fresh raw token and updates `token_hash`, invalidating prior links immediately.
   - Enforces a 60-second cooldown between resends and a lifetime limit of 10 send attempts per invitation.

---

## 4. State Machine & Transition Rules

```
                 ┌───────────────┐
                 │    Pending    │ (7-day validity, token_hash active)
                 └───────┬───────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Accepted   │ │   Revoked    │ │   Expired    │
│  (Terminal)  │ │  (Terminal)  │ │  (Terminal)  │
└──────────────┘ └──────────────┘ └──────────────┘
```

- **Pending:** The link is active. Resending refreshes `token_hash` and resets `expires_at` to `now() + 7 days`.
- **Accepted:** Caller is added to `workspace_members` in an atomic transaction with `for update` locking. Idempotent on repeated calls.
- **Revoked:** Administrator invalidates the token. Any subsequent acceptance attempt fails cleanly.
- **Expired:** Automatically treated as expired once `now() > expires_at`.

---

## 5. Email Dispatch & Provider Architecture

### Transactional Templates
- Fully responsive HTML template with inline styling, bulletproof table layouts, and KaTeX-safe typography.
- Automatic input escaping for all dynamic fields (`inviterName`, `workspaceName`) to protect against HTML injection / XSS.
- Plaintext fallback automatically generated for terminal or text-only mail clients.

### Email Configuration & Honest Fallback
Configured via standard environment variables:
- `RESEND_API_KEY`: API key from [Resend](https://resend.com).
- `EMAIL_FROM`: Verified sender address (defaults to `ScopeGuard <notifications@scopeguard.agency>`).

**Honest Handling When Unconfigured:**
If `RESEND_API_KEY` is absent or email dispatch fails, ScopeGuard honestly surfaces:
> *"Email service is unconfigured; please copy and share the link manually."*
A one-click "Copy Link" button appears in the dispatch report and pending invites table.

---

## 6. Public Acceptance Flow (`/invite/[token]`)

### Route Security
- Registered with HTTP headers:
  - `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`
  - `Referrer-Policy: no-referrer`
  - `X-Robots-Tag: noindex, nofollow`

### Scenarios Handled
1. **Unauthenticated Visitor:**
   - Displays workspace name, inviter, assigned role, and role permissions.
   - Offers "Create Account to Join" and "Sign In to Join" buttons with `email` and `next=/invite/[token]` prefilled.
2. **Authenticated Matching User:**
   - Shows "Signed in as verified recipient".
   - One-click "Accept & Join [Workspace]" button invokes atomic database transaction and redirects to `/dashboard`.
3. **Authenticated Mismatched User:**
   - Warns with "Email Account Mismatch".
   - Offers "Sign Out & Switch Account" button redirecting back to `/invite/[token]` upon sign-in.
4. **Invalid / Expired / Revoked Invitation:**
   - Clean, friendly error card explaining the status with a link to sign in.

---

## 7. Developer Preview Route

In development environments, visit `/dev/email-preview` to inspect email templates:
- `?format=html&role=member`
- `?format=html&role=manager`
- `?format=text`

Automatically returns `404 Not Found` in production (`NODE_ENV === "production"`).
