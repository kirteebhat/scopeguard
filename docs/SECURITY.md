# ScopeGuard Security Architecture & Audit Report

**Date of Audit:** October 18, 2026  
**Audited System:** ScopeGuard MVP (Next.js 15 App Router + Supabase Postgres)

---

## 1. Executive Security Summary

ScopeGuard is built on a "Defense in Depth" model specifically designed to prevent client data leakage, protect agency commercial margins, and prevent unverified financial totals from propagating into contract rollups.

Key architectural protections include:
1. **Zero Client Secret Exposure:** The Supabase Service-Role key is strictly isolated to backend server actions and server-side RPC executions.
2. **Cryptographic Token Hashing:** Public approval links utilize unguessable 256-bit CSPRNG tokens stored exclusively as SHA-256 hashes (`token_hash`).
3. **Database-Enforced Immutability:** Change request versions are frozen snapshots protected by PostgreSQL database triggers that raise exceptions on any `UPDATE` or `DELETE`.
4. **Row-Level Security (RLS) Default Deny:** Every table enforces tenant isolation via RLS policies verified by automated SQL suites.
5. **Atomic Concurrency Protection:** Decision submissions execute `SELECT ... FOR UPDATE` locks inside database transactions to prevent double-submit and race conditions.

---

## 2. Service-Role Key Isolation Verification

The `SUPABASE_SERVICE_ROLE_KEY` has full administrative database privileges. Its exposure to client browsers would compromise multi-tenant isolation.

### Verification Check
- Executed bundle inspection on `.next/static/chunks/*.js` following a full production build (`next build`).
- **Command:** `Get-ChildItem -Path ".next\static" -Recurse -Filter "*.js" | Select-String -Pattern "SUPABASE_SERVICE_ROLE_KEY|service_role"`
- **Result:** **0 matches found**.
- Architecture: Client components only import from `@/lib/supabase/client` which initializes with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. All administrative actions execute inside server actions or route handlers via `@/lib/supabase/service`.

---

## 3. Cryptographic Token Lifecycle

```
[Server Action / Database Function]
       |
       v
crypto.randomBytes(32) (256-bit CSPRNG)
       |
       +---> Raw token encoded as URL-safe base64url (returned ONCE to publisher)
       |
       +---> crypto.createHash('sha256').digest('hex')
                   |
                   v
       Inserted into approval_tokens.token_hash
```

1. **Storage:** The `approval_tokens` table only stores the 64-character SHA-256 hex hash of the token.
2. **In-Memory Lifetime:** The raw token string exists only in server memory for the duration of the publish action and is returned directly in the response payload.
3. **Revocation & Supeseding:** Revising a proposal sets `revoked_at = now()`. The database function immediately rejects any requests referencing a revoked token.
4. **Zero Raw Token Logging:** Logging utilities and `activity_logs` tables explicitly strip token parameters before persisting audit metadata.

---

## 4. Row-Level Security (RLS) & Multi-Tenant Boundaries

All 11 public database tables have RLS enabled with default deny:
- `workspaces`
- `workspace_members`
- `profiles`
- `projects`
- `deliverables`
- `change_requests`
- `change_request_versions`
- `approval_tokens`
- `approvals`
- `activity_logs`
- `approval_attempts`

### Access Rules
- **Authenticated Agency Users:** Can only read and mutate rows where `workspace_id` matches their verified active workspace membership (`is_workspace_member(workspace_id)`).
- **Public / Anonymous Role:** Direct `SELECT`, `INSERT`, `UPDATE`, and `DELETE` access is completely denied (`USING (false)`). Public approval interactions occur solely through `SECURITY DEFINER` stored procedures (`get_proposal_by_token` and `submit_decision`) that execute with restricted, explicit search paths (`search_path = public, pg_temp`).

---

## 5. Rate Limiting & Denial-of-Service Mitigations

Public endpoints (such as `/approve/[token]`) are subject to brute-force and scraping risks.

1. **Database-Backed Rate Limiting:** Each attempt on `/approve/[token]` logs a record in `approval_attempts` storing a salted SHA-256 hash of the client IP (`ip_hash`) and the first 8 characters of the token hash (`token_prefix`).
2. **Thresholds:**
   - Maximum 15 attempts per IP address per 15-minute rolling window.
   - Maximum 10 attempts per specific token prefix per 15-minute window.
3. **HTTP Caching & Headers:**
   - `Cache-Control: no-store, no-cache, must-revalidate`
   - `X-Robots-Tag: noindex, nofollow`
   - `Referrer-Policy: strict-origin-when-cross-origin` (prevents token leakage via referrer headers).

---

## 6. Audit Logging & PII Minimization

The `activity_logs` table records every lifecycle event (`project_created`, `change_request_published`, `change_request_approved`, etc.).

**Sanitization Controls:**
- Passwords, access tokens, and bearer credentials are never stored.
- Client IP addresses are hashed using a server-side salt before logging (`hashClientIp(clientIp)`).
- Internal confidential notes entered by agency members are explicitly excluded from version snapshot JSONB payloads and public RPC returns.

---

## 7. Remaining MVP Limitations

While ScopeGuard MVP meets commercial-grade security for its defined scope, the following limitations are explicitly documented:

1. **Bearer-Link Identity:**
   - *Limitation:* The approval token operates as a shared secret bearer link. Anyone in possession of the link can view the proposal and record an approval or rejection.
   - *Mitigation in MVP:* Requires the decider to enter their full legal name (unverified self-declared identity), records client IP subnet and user agent, and supports instant revocation.
   - *Future Solution (P1):* Email verification magic codes (OTP) sent to the client before approval submission.
2. **Basic In-Database Rate Limiting:**
   - *Limitation:* Rate limiting counters are tracked via the `approval_attempts` Postgres table. Under extreme DDoS traffic, this could place load on the database.
   - *Future Solution (P2):* Edge middleware rate limiting using Redis / Upstash or Cloudflare Turnstile.
3. **No Cryptographic / Legal E-Signature:**
   - *Limitation:* Approvals recorded in ScopeGuard do not constitute eIDAS or ESIGN Act compliant digital certificate signatures with PKI public key cryptography.
   - *Mitigation in MVP:* Clearly labels all proposals with "Estimate, not a contract or legally binding quote" and maintains an append-only audit log.
4. **No Email Delivery Integration:**
   - *Limitation:* MVP generates copyable links and explicitly informs agency users that no external emails have been dispatched.
   - *Future Solution (P1):* Transactional email delivery via Resend with webhook delivery tracking.

