# ScopeGuard Product & Engineering Roadmap

**Baseline Version:** 0.1.0 MVP  
**Last Updated:** October 18, 2026

---

## 1. Retrospective & Effort Estimation Realities

During the development of ScopeGuard MVP, several technical domains required substantially different engineering effort than originally projected:

| Area | Initial Assumption | Actual Build Reality | Revised Multiplier |
|---|---|---|---|
| **PostgreSQL Stored Procedures & Atomic Row Locks** | 1–2 days | Required extensive testing with PGlite for concurrency race conditions and rollback isolation. | 1.8x |
| **Row-Level Security (RLS) Edge Cases** | 1 day | Complex sub-queries across multi-tenant foreign keys required strict security definer helpers to avoid circular evaluation. | 2.0x |
| **Mobile Viewport Optimization (360px)** | 0.5 days | Table-to-card conversions and dialog focus traps on touch devices required dedicated accessibility auditing. | 1.5x |
| **Pure Domain Calculations** | 1 day | Straightforward; completed ahead of schedule with zero-dependency TypeScript modules. | 0.8x |

---

## 2. Priority 1 (P1): Production Hardening & Automation

Target Delivery: Q1 2027

### 1. Transactional Email Delivery (Resend Integration)
- **Goal:** Automatically notify client deciders when a change proposal is published, and alert the agency project manager when a decision is signed.
- **Scope:**
  - Resend API integration with React Email templates.
  - Plain-text fallback for corporate email gateways.
  - Webhook listener to track email delivery, bounces, and opens.
- **Estimated Effort:** 3 person-days.

### 2. Client Identity Verification via Email OTP
- **Goal:** Upgrade bearer link security to 2-factor verified client identity.
- **Scope:**
  - When the client opens `/approve/[token]`, they receive a 6-digit one-time passcode sent to their pre-registered client email address.
  - Verifies that the individual clicking "Approve" is authorized by the client organization.
- **Estimated Effort:** 4 person-days.

### 3. Team Member Invitations & Access Delegation
- **Goal:** Allow workspace owners and managers to invite colleagues with specific workspace roles.
- **Scope:**
  - Secure email invitation tokens expiring in 7 days.
  - Role management UI in `/settings/team`.
  - Audited role change logs.
- **Estimated Effort:** 3 person-days.

### 4. CSV & PDF Export Engine
- **Goal:** Enable agencies to export approved change orders and baseline rollups for client invoicing and ERP reconciliation.
- **Scope:**
  - Client-ready PDF change order summary signed with timestamped decision metadata.
  - CSV export of all version snapshots, cost breakdowns, and approval timestamps.
- **Estimated Effort:** 3 person-days.

---

## 3. Priority 2 (P2): Enterprise Integrations & Scale

Target Delivery: Q2–Q3 2027

### 1. Stripe Checkout Scope Deposit Payments
- **Goal:** Collect payment deposits immediately upon client proposal approval.
- **Scope:**
  - Optional setting on change requests: "Require 50% deposit upon approval".
  - Redirects client to Stripe Hosted Checkout after clicking "Approve".
  - Webhook updates change request status to `paid_deposit`.
- **Estimated Effort:** 6 person-days.

### 2. Bi-Directional PM Tooling Sync (ClickUp, Jira, Asana)
- **Goal:** Turn approved ScopeGuard change requests directly into development tasks in the agency's primary project management tool.
- **Scope:**
  - OAuth2 connect with ClickUp / Jira API.
  - Auto-generate epic / task cards with hours and deadline allocations once approved.
- **Estimated Effort:** 8 person-days.

### 3. Client Portal Dashboard
- **Goal:** Dedicated workspace portal where recurring enterprise clients can view all active projects, approved scopes, and pending decisions in one place.
- **Scope:**
  - Magic link client login.
  - Consolidated statement of work burn-down charts.
- **Estimated Effort:** 7 person-days.

### 4. Edge-Based Distributed Rate Limiting (Upstash / Redis)
- **Goal:** Offload brute-force mitigation from the primary PostgreSQL database to global edge middleware.
- **Scope:**
  - Upstash Redis token bucket rate limiting on Edge Middleware.
  - Cloudflare Turnstile CAPTCHA challenge on suspicious traffic.
- **Estimated Effort:** 2 person-days.

