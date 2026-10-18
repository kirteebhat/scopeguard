# ScopeGuard Presentation Deck Outline (12 Slides)

A structured 10–12 slide deck outline designed for investor presentations, technical design reviews, or agency stakeholder demonstrations.

---

### Slide 1: Title & Vision
- **Header:** ScopeGuard
- **Sub-header:** Client-Approved Change Orders & Real-Time Budget Protection for Software Agencies
- **Presenter:** Core Engineering & Product Team
- **Key Takeaway:** "Never write out-of-scope code until the client signs the estimate."

---

### Slide 2: The Problem: The "Quick Slack Request" Trap
- **The Story:** A developer gets a message on Slack from a client: *"Hey, can we also add SMS 2FA to the login page before launch?"*
- **The Developer:** Assumes it is approved, codes it over 20 hours.
- **The Invoice:** Agency bills \$3,000 extra at project completion.
- **The Client Response:** *"We thought that was included in the original project budget."*

---

### Slide 3: The Quantifiable Impact: Scope Creep Costs
- Software agencies lose an estimated 10–25% of billable revenue to unbudgeted scope expansion.
- Projects slip past their original contractual delivery dates without official amendments.
- Project managers avoid sending formal contract amendments because traditional PDF signing tools (DocuSign, PandaDoc) take days of legal back-and-forth for minor 10-hour tasks.

---

### Slide 4: Current Workarounds & Why They Fail
- **Informal Email / Slack:** Zero audit trail, easily disputed, no live impact on financial baselines.
- **General PM Tools (ClickUp, Asana):** Tasks are mutable; anyone can change a custom field or delete a comment. No cryptographic freeze.
- **Heavyweight PSAs (Productive, Bonsai):** Focus on internal employee tracking or complex initial contracts; lack a rapid, lightweight, mobile-first client sign-off mechanism.

---

### Slide 5: The ScopeGuard Solution
- A specialized B2B micro-platform that turns scope change requests into instant, transparent client agreements.
- **Zero Client Accounts:** Clients don't log in, download an app, or navigate complex dashboards.
- **Mobile-First Approval Portal:** Deciders open a secure link on their phone and sign with their legal name in under 30 seconds.

---

### Slide 6: The Core Workflow Loop
1. **Draft:** Agency PM creates a change request and attaches it to an existing project deliverable.
2. **Live Calculation:** Transparent formula updates in real time (`12.5 hrs × ₹1,500.00 = ₹18,750.00`).
3. **Publish:** Generates a revocable, 256-bit CSPRNG bearer link (`/approve/[token]`).
4. **Client Decision:** Client reviews the exact scope and signs off on mobile.
5. **Rollup:** Project baseline and agency dashboard automatically update by exact integer minor units.

---

### Slide 7: Architectural Moat: Version Snapshot Immutability
- **The Golden Rule:** Changing draft fields never alters historical or approved totals.
- **Immutable Snapshots:** Publishing freezes the payload into `change_request_versions`.
- **Database Trigger Enforcement:** PostgreSQL triggers raise exceptions on any `UPDATE` or `DELETE` attempted on version records.
- **Single Decision Constraint:** Database unique constraints guarantee a version can only ever have exactly one recorded decision.

---

### Slide 8: The "Wow" Moment: Revision & Revocation
- **The Scenario:** Client requests an update on a pending proposal.
- **The Action:** Agency clicks "Revise Proposal".
- **The Result:** The active approval token is immediately revoked in the database.
- **The Verification:** Opening the old link instantly informs the client: *"This proposal was updated; ask your agency for the new link."*
- **Republishing:** Generates Version 2 with a brand-new token.

---

### Slide 9: Security by Design
- **Key Isolation:** Service-role key is 100% isolated to backend server actions (0 matches in client JavaScript bundles).
- **Hashed Secrets:** Only cryptographic SHA-256 hashes of approval tokens are stored; raw secrets exist only in memory.
- **Multi-Tenant RLS:** Strict Row-Level Security with default deny across all 11 tables.
- **Sanitized Auditing:** Zero passwords, raw tokens, or full client IPs in audit feeds.

---

### Slide 10: Technical Robustness: Zero Floating-Point Math
- All monetary amounts stored as integer minor units (paise / cents).
- Centralized half-up rounding (`round(hours * rateMinor)`) in pure TypeScript domain logic.
- Multi-currency compliance: Totals are strictly segregated by currency and never summed across USD, INR, EUR, or GBP.

---

### Slide 11: Monetization & Business Model Hypotheses
- **Freemium Acquisition:** Free tier (1 project, 3 change requests/mo) drives adoption.
- **Pro Tier (₹799/mo):** Unlimited projects and multi-currency tracking.
- **Agency Tier (₹1,999/mo):** Role-based permissions, custom branding, and exportable audit trails.
- **Viral Expansion:** Every client receiving a proposal link is introduced to the ScopeGuard platform.

---

### Slide 12: Roadmap & What's Next
- **Q1 2027 (P1):** Transactional email notifications via Resend, client email OTP verification, CSV/PDF report exports.
- **Q2 2027 (P2):** Stripe deposit payment collection upon proposal approval, bi-directional Jira/ClickUp task sync.
- **Call to Action:** Experience the live demo and inspect the automated test suite.

