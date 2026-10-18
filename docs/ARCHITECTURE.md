# ScopeGuard System Architecture & Technical Specifications

This document details the architectural topology, database schema, data flows, and security boundaries implemented in ScopeGuard.

---

## 1. High-Level System Architecture

ScopeGuard enforces strict layer separation between client views, Next.js server actions, pure business domain calculations, and PostgreSQL row-level security.

```mermaid
flowchart TD
    subgraph ClientLayer ["Client Presentation Layer (Browser)"]
        AgencyBrowser["Agency User (Desktop/Mobile Web)<br>Auth Cookies, React Hook Form, Dialogs"]
        ClientBrowser["Client Decider (Mobile-First)<br>Bearer Link (/approve/token), No Auth"]
    end

    subgraph NextServerLayer ["Next.js App Router Server Layer"]
        Middleware["Edge Middleware<br>Route Protection & Safe Redirection"]
        AppRouter["Server Components (RSC)<br>Cached Data Resolution, Page Headers"]
        ServerActions["Server Actions ('use server')<br>Role Guards, Mutation Validation, Audit Logging"]
        ServiceRoleClient["Service-Role Supabase Client<br>Server-Only Privileges (Public Approvals)"]
        UserClient["User-Scoped Supabase Client<br>Auth-Bound RLS Queries"]
    end

    subgraph DomainLayer ["Pure Domain Logic (lib/domain)"]
        MoneyLib["money.ts<br>Integer Minor Math, Half-Up Rounding"]
        ImpactLib["impact.ts<br>Project Rollup, Version Aggregation"]
        StateMachine["stateMachine.ts<br>Permitted Transitions & Actor Rules"]
    end

    subgraph DatabaseLayer ["Database Layer (Supabase PostgreSQL)"]
        RLS["Row-Level Security (RLS)<br>Tenant Isolation & Default Deny"]
        Triggers["Database Triggers<br>tr_block_version_mutation (Immutable)"]
        RPCs["SECURITY DEFINER RPCs<br>publish_change_request, submit_decision"]
        Tables[("11 Relational Tables<br>Snapshots, Tokens, Approvals, Logs")]
    end

    AgencyBrowser -->|HTTPS / Session Cookies| Middleware
    Middleware --> AppRouter
    AgencyBrowser -->|Server Actions| ServerActions
    ClientBrowser -->|GET /approve/token| AppRouter
    ClientBrowser -->|Submit Decision Action| ServerActions

    ServerActions --> DomainLayer
    ServerActions --> UserClient
    ServerActions --> ServiceRoleClient

    UserClient -->|Authenticated JWT| RLS
    ServiceRoleClient -->|Bypasses RLS via RPC| RPCs
    RPCs --> Triggers
    Triggers --> Tables
    RLS --> Tables
```

---

## 2. Entity-Relationship (ER) Diagram

ScopeGuard's database model decouples the mutable working draft from the immutable version snapshots that drive historical analytics.

```mermaid
erDiagram
    WORKSPACES ||--o{ WORKSPACE_MEMBERS : contains
    PROFILES ||--o{ WORKSPACE_MEMBERS : participates
    WORKSPACES ||--o{ PROJECTS : owns
    PROJECTS ||--o{ DELIVERABLES : defines
    PROJECTS ||--o{ CHANGE_REQUESTS : tracks
    DELIVERABLES ||--o{ CHANGE_REQUESTS : affects
    CHANGE_REQUESTS ||--o{ CHANGE_REQUEST_VERSIONS : freezes
    CHANGE_REQUEST_VERSIONS ||--o{ APPROVAL_TOKENS : authorizes
    CHANGE_REQUEST_VERSIONS ||--o| APPROVALS : records
    WORKSPACES ||--o{ ACTIVITY_LOGS : audits
    APPROVAL_TOKENS ||--o{ APPROVAL_ATTEMPTS : limits

    WORKSPACES {
        uuid id PK
        text name
        text slug
        text plan
        timestamptz created_at
    }

    WORKSPACE_MEMBERS {
        uuid id PK
        uuid workspace_id FK
        uuid user_id FK
        member_role role
        timestamptz created_at
    }

    PROJECTS {
        uuid id PK
        uuid workspace_id FK
        text name
        text client_name
        text currency
        bigint budget_minor
        bigint hourly_rate_minor
        date start_date
        date original_deadline
        project_status status
    }

    DELIVERABLES {
        uuid id PK
        uuid project_id FK
        text title
        deliverable_status status
    }

    CHANGE_REQUESTS {
        uuid id PK
        uuid project_id FK
        text title
        pricing_method pricing_method
        numeric estimated_hours
        bigint cost_minor
        date proposed_deadline
        text internal_notes
        change_request_status status
        integer current_version
    }

    CHANGE_REQUEST_VERSIONS {
        uuid id PK
        uuid change_request_id FK
        integer version_number
        bigint cost_minor
        text currency
        jsonb snapshot
        timestamptz created_at
    }

    APPROVAL_TOKENS {
        uuid id PK
        uuid version_id FK
        text token_hash
        timestamptz expires_at
        timestamptz revoked_at
        timestamptz consumed_at
    }

    APPROVALS {
        uuid id PK
        uuid version_id FK
        decision_type decision
        timestamptz decided_at
        text actor_name
        jsonb audit_metadata
    }

    ACTIVITY_LOGS {
        uuid id PK
        uuid workspace_id FK
        actor_type actor_type
        text actor_name
        text action
        jsonb metadata
    }
```

---

## 3. Public Approval Sequence Diagram

The approval flow ensures cryptographic secret isolation, atomic locking against race conditions, and complete immutability.

```mermaid
sequenceDiagram
    autonumber
    actor Agency as Agency User (PM/Owner)
    participant NextServer as Next.js Server Action
    participant PG as PostgreSQL (Database)
    actor Client as Client Decider (Mobile)

    Agency->>NextServer: Publish Change Request (request_id)
    Note over NextServer: Generates raw 32-byte CSPRNG token<br/>Computes SHA-256 token_hash
    NextServer->>PG: publish_change_request(request_id, token_hash, expires_at)
    PG->>PG: Lock CR row, freeze snapshot into change_request_versions,<br/>insert approval_tokens, set status='pending_approval'
    PG-->>NextServer: Transaction Committed
    NextServer-->>Agency: Returns link: /approve/{raw_token}
    Note over NextServer: Raw token discarded from server memory

    Agency->>Client: Shares bearer URL via chat / email
    Client->>NextServer: GET /approve/{raw_token}
    Note over NextServer: Computes SHA-256(raw_token)<br/>Rate limit check (approval_attempts)
    NextServer->>PG: get_proposal_by_token(token_hash)
    PG-->>NextServer: Returns proposal snapshot (internal notes omitted)
    NextServer-->>Client: Renders proposal view (mobile-first, zero agency layout)

    Client->>NextServer: submitClientDecisionAction(raw_token, decision, client_name)
    NextServer->>PG: submit_decision(token_hash, decision, client_name, audit_meta)
    Note over PG: SELECT ... FOR UPDATE on version & request<br/>Enforces atomic single-decision constraint
    PG->>PG: Insert approvals row, update CR status to 'approved'/'rejected',<br/>mark token consumed_at, insert activity_logs
    PG-->>NextServer: Decision recorded successfully
    NextServer-->>Client: Renders calm "Proposal Approved" confirmation
```

---

## 4. Key Architectural Safeguards

1. **Calculations in Pure Domain:**
   - Calculations (`calculateHourlyCost`, `calculateProjectRollup`) reside in `lib/domain` with 0 external dependencies.
   - 100% covered by unit tests including floating point anomalies (`0.1 + 0.2`), boundary rounding, and zero-hour requests.
2. **Snapshot-Driven Rollups:**
   - Financial totals and dashboard metrics are computed strictly from immutable `change_request_versions` where an associated `approvals` record has `decision = 'approved'`.
   - Editing or modifying draft fields on a change request has 0 impact on contract value totals.
3. **Database-Level Immutability:**
   - Database trigger `tr_block_version_mutation` prevents any `UPDATE` or `DELETE` on `change_request_versions`.
   - Table constraint `uq_change_request_version` enforces unique version numbers per request.
   - Constraint `approvals_version_id_key` enforces exactly one recorded decision per version snapshot.

