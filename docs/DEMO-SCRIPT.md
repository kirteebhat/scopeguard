# ScopeGuard 5–7 Minute Interactive Demo Script

This script provides an exact, click-by-click walkthrough for demonstrating ScopeGuard to stakeholders, clients, or technical assessors.

---

## Preparation Checklist
1. Open two browser windows side by side:
   - **Window 1 (Agency View):** Desktop Chrome at 1280px width, logged in as an Agency Owner.
   - **Window 2 (Client View):** Mobile device simulation (Chrome DevTools Device Mode set to iPhone 14 / Pixel 7, width 375px) in an **Incognito / Unauthenticated** profile.
2. Ensure development server is running (`npm run start` or `npm run dev` at `http://localhost:3000`).

---

## Click-by-Click Demo Flow

### Act 1: The Problem & Project Baseline (0:00 – 1:30)
1. **Window 1 (Agency):** Navigate to `/dashboard`.
   - *Spoken Script:* "Welcome to ScopeGuard. Every digital agency founder knows the pain of scope creep. A client asks for a 'quick tweak' on Slack, your team builds it, and at invoice time, the client disputes the extra charge. ScopeGuard stops that revenue leakage by turning change requests into instant, transparent client agreements."
2. Click on an active project (or navigate to `/projects` and select *"BioHealth Patient Portal"* or create a new project).
3. Point out the **Project Baseline & Scope Impact Card**:
   - Original Contract Value: **\$75,000.00**
   - Approved Changes: **\$0.00** (or baseline)
   - Contractual Deadline: **Dec 15, 2026**
   - *Spoken Script:* "Notice this card. It tracks the original contractual statement of work. These figures are calculated strictly from immutable approved snapshots, with zero floating-point math."

---

### Act 2: Drafting the Change & Live Impact Formula (1:30 – 3:00)
1. In Window 1, click **"New Change"** (navigates to `/changes/new?projectId=...`).
2. Fill in the change request details:
   - **Title:** `Biometric FaceID & Multi-Factor Authentication`
   - **Deliverable:** Select `HIPAA Auth & Telehealth WebRTC Engine`
   - **Pricing Method:** Hourly
   - **Estimated Hours:** `20.0`
   - **Hourly Rate:** Defaults to project rate (`$175.00`), leave as is
   - **Additional Calendar Days:** `7`
   - **Internal Confidential Notes:** Type `INTERNAL: Subcontractor cost is $80/hr; agency margin retained is $95/hr.`
3. Highlight the **Live Impact Panel**:
   - *Spoken Script:* "As we type, the impact panel computes the exact cost: 20 hours at \$175 equals \$3,500.00. It shows the client's proposed deadline shifting by 7 days. Most importantly, it clearly labels this as an unapproved estimate."
4. Click **"Preview Proposal"**:
   - *Spoken Script:* "Before publishing, the agency can preview exactly what the client will see. Notice that our confidential margin notes are completely stripped. They never leave the agency boundary."
5. Close the preview dialog and click **"Save Draft"**.

---

### Act 3: Publishing & The Bearer Secret (3:00 – 4:00)
1. On the saved change request page (`/changes/[changeId]`), click **"Submit for Approval"**.
2. A dialog opens displaying the unique approval link (`/approve/<token>`).
   - *Spoken Script:* "When we submit, the server generates a 256-bit CSPRNG token. The database freezes an immutable snapshot of Version 1 and stores only a SHA-256 hash. The raw token exists in server memory for this single response."
3. Click the **"Copy Link"** button and close the modal.

---

### Act 4: The Client Mobile Experience (4:00 – 5:00)
1. **Window 2 (Client Mobile Simulation):** Paste the approval link into the address bar and press Enter.
2. *Spoken Script:* "Notice what the client sees on mobile:
   - Zero agency navigation, sidebars, or internal links.
   - Clean, branded proposal showing the agency name, project name, Version 1, and the \$3,500.00 estimate.
   - An explicit legal disclaimer: 'Estimate, not a contract or legally binding quote'.
   - No login or password required."
3. Click **"Approve Scope Modification"**.
4. In the confirmation dialog, enter client name: `Dr. Robert Vance`.
5. Click **"Confirm & Sign Approval"**.
6. Show the calm confirmation screen: *"Decision Already Recorded - Proposal Approved by Dr. Robert Vance"*.
7. Refresh Window 2: Demonstrate that the approved state persists idempotently and cannot be re-submitted.

---

### Act 5: Real-Time Baseline Rollup (5:00 – 5:45)
1. Return to **Window 1 (Agency Desktop)** and navigate to the project page (`/projects/[projectId]`).
2. Refresh the page:
   - *Spoken Script:* "Watch the Project Impact card:
     - Approved changes updated to **+\$3,500.00**.
     - Revised Estimated Total automatically updated to **\$78,500.00**.
     - Revised deadline shifted by 7 days.
     - The activity feed records the client approval with the name provided."
3. Click on **Dashboard**:
   - Show that the workspace approved totals updated by \$3,500.00 under the USD currency card.

---

### Act 6: The "Wow" Moment: Revision & Instant Revocation (5:45 – 7:00)
1. In Window 1, create and publish another quick change: `Epic EHR Webhooks` for 10 hours. Copy the new link (`token_B`).
2. Open `token_B` in Window 2: Verify it is in `pending_approval` status.
3. Return to Window 1 and say: *"The client calls and says: 'Wait, we actually need 15 hours instead of 10.'"*
4. Click **"Revise Proposal"** and confirm.
5. **The Wow Moment:** Switch back to Window 2 and refresh the client's link:
   - *Spoken Script:* "The moment the agency clicked Revise, the database revoked that token. The client's link immediately displays: 'Proposal Link Updated: This proposal was updated; ask your agency for the new link.' The approve and reject buttons have vanished. No client can ever approve a superseded version."
6. In Window 1, republish: It becomes **Version 2**, generating a fresh, secure link.

---

## Anticipated Assessor Questions & Answers

### Q1: "Why use bearer links instead of requiring the client to create an account?"
> **Answer:** Friction is the primary reason agency scope change processes fail. If a client stakeholder on the go has to register an account, remember a password, or download an app just to sign a 10-hour change, they postpone it, and developers end up working without sign-off. Bearer links combined with mandatory legal name entry and IP auditing provide the ideal balance between security and zero-friction commercial velocity for an MVP.

### Q2: "Why enforce Row-Level Security (RLS) if you have an application authorization layer?"
> **Answer:** Defense in depth. Application code can have regressions, route handler bugs, or missing middleware checks. By enabling default-deny RLS on all 11 tables with explicit workspace-scoped policies, even a catastrophic bug in a Next.js server component cannot leak data across tenant boundaries. Direct database queries from the browser role (`anon` or `authenticated`) can only ever touch rows that belong to that user's active workspace.

### Q3: "Why store snapshots in a separate table instead of calculating metrics from `change_requests`?"
> **Answer:** If metrics read from mutable columns on `change_requests`, an agency team member editing a draft could accidentally alter historical financial reports or approved contract totals. By freezing the complete commercial terms into `change_request_versions` with database triggers preventing any update or deletion, our financial rollups are 100% immutable and audit-proof.

### Q4: "What would you build next?"
> **Answer:** Our top P1 priority is transactional email via Resend and client email OTP verification. Following that, Stripe deposit collection upon approval so agencies can automatically charge a 50% deposit the second a client clicks 'Approve'."

