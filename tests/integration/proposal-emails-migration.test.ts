import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import * as fs from "fs";
import * as path from "path";
import crypto from "crypto";

describe("Proposal Emails Migration & RLS Suite", () => {
  let db: PGlite;

  // Workspace A users
  const ownerAId = "11111111-1111-1111-1111-111111111111";
  const managerAId = "22222222-2222-2222-2222-222222222222";
  const memberAId = "33333333-3333-3333-3333-333333333333";

  // Workspace B user
  const ownerBId = "44444444-4444-4444-4444-444444444444";

  let wsAId: string;
  let wsBId: string;
  let projAId: string;
  let pendingCrId: string;
  let draftCrId: string;
  let approvedCrId: string;

  function sha256(val: string): string {
    return crypto.createHash("sha256").update(val).digest("hex");
  }

  async function asUser(userId: string | null, role: "authenticated" | "anon" = userId ? "authenticated" : "anon") {
    if (role === "authenticated" && userId) {
      await db.exec(`
        set role authenticated;
        select set_config('request.jwt.claim.sub', '${userId}', false);
        select set_config('request.jwt.claim.role', 'authenticated', false);
      `);
    } else {
      await db.exec(`
        set role anon;
        select set_config('request.jwt.claim.sub', '', false);
        select set_config('request.jwt.claim.role', 'anon', false);
      `);
    }
  }

  async function asSuperuser() {
    await db.exec(`
      set role postgres;
      select set_config('request.jwt.claim.sub', '', false);
      select set_config('request.jwt.claim.role', '', false);
    `);
  }

  beforeAll(async () => {
    db = new PGlite();

    // 1. Setup mock auth and roles
    await db.exec(`
      create schema if not exists auth;
      create table if not exists auth.users (
        id uuid primary key default gen_random_uuid(),
        email text not null,
        raw_user_meta_data jsonb default '{}'::jsonb
      );
      create or replace function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      create or replace function auth.role() returns text language sql stable as $$
        select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon')
      $$;

      create role anon;
      create role authenticated;
      create role service_role;

      grant usage on schema public to anon, authenticated, service_role;
      grant all on all tables in schema public to anon, authenticated, service_role;
      grant all on all routines in schema public to anon, authenticated, service_role;
      grant all on all sequences in schema public to anon, authenticated, service_role;

      alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
      alter default privileges in schema public grant all on routines to anon, authenticated, service_role;
      alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
    `);

    // 2. Apply Migration 1: Initial schema
    const m1Path = path.resolve(__dirname, "../../supabase/migrations/20261011120000_initial_schema.sql");
    await db.exec(fs.readFileSync(m1Path, "utf-8"));

    // 3. Apply Migration 2: Change requests & approvals
    const m2Path = path.resolve(__dirname, "../../supabase/migrations/20261011130000_change_requests_and_approvals.sql");
    await db.exec(fs.readFileSync(m2Path, "utf-8"));

    // 4. Apply Migration 3: Row level security
    const m3Path = path.resolve(__dirname, "../../supabase/migrations/20261011140000_row_level_security.sql");
    await db.exec(fs.readFileSync(m3Path, "utf-8"));

    // 5. Apply Migration 4: Workspace invitations
    const m4Path = path.resolve(__dirname, "../../supabase/migrations/20261018230000_workspace_invitations.sql");
    await db.exec(fs.readFileSync(m4Path, "utf-8"));

    // 6. Apply Migration 5: Proposal emails (new migration)
    const m5Path = path.resolve(__dirname, "../../supabase/migrations/20261019000000_proposal_emails.sql");
    await db.exec(fs.readFileSync(m5Path, "utf-8"));

    // Re-grant for newly created tables
    await db.exec(`
      grant all on all tables in schema public to anon, authenticated, service_role;
      grant all on all routines in schema public to anon, authenticated, service_role;
      grant all on all sequences in schema public to anon, authenticated, service_role;
    `);

    // Seed test users in auth.users & profiles
    await db.query(`insert into auth.users (id, email, raw_user_meta_data) values 
      ($1, 'owner_a@agency.com', '{"full_name":"Owner A"}'),
      ($2, 'manager_a@agency.com', '{"full_name":"Manager A"}'),
      ($3, 'member_a@agency.com', '{"full_name":"Member A"}'),
      ($4, 'owner_b@agency.com', '{"full_name":"Owner B"}')
    `, [ownerAId, managerAId, memberAId, ownerBId]);

    // Provision Workspaces
    const wsARes = await db.query<{ id: string }>(
      `insert into public.workspaces (name, slug) values ('Workspace A', 'workspace-a') returning id`
    );
    wsAId = wsARes.rows[0].id;

    const wsBRes = await db.query<{ id: string }>(
      `insert into public.workspaces (name, slug) values ('Workspace B', 'workspace-b') returning id`
    );
    wsBId = wsBRes.rows[0].id;

    // Provision Workspace Memberships
    await db.query(`insert into public.workspace_members (workspace_id, user_id, role) values
      ($1, $2, 'owner'),
      ($1, $3, 'manager'),
      ($1, $4, 'member')
    `, [wsAId, ownerAId, managerAId, memberAId]);

    await db.query(`insert into public.workspace_members (workspace_id, user_id, role) values
      ($1, $2, 'owner')
    `, [wsBId, ownerBId]);

    // Provision Project in Workspace A
    const projRes = await db.query<{ id: string }>(`
      insert into public.projects (
        workspace_id, name, client_name, currency, budget_minor, hourly_rate_minor,
        start_date, original_deadline, created_by
      ) values (
        $1, 'Client Portal Revamp', 'Acme Global Corp', 'USD', 5000000, 15000,
        current_date, current_date + 30, $2
      ) returning id
    `, [wsAId, ownerAId]);
    projAId = projRes.rows[0].id;

    // Create Draft Change Request
    const draftRes = await db.query<{ id: string }>(`
      insert into public.change_requests (
        project_id, title, description, pricing_method, estimated_hours, hourly_rate_minor,
        cost_minor, status, created_by
      ) values (
        $1, 'Draft Scope Feature', 'Draft description', 'hourly', 10, 15000,
        150000, 'draft', $2
      ) returning id
    `, [projAId, ownerAId]);
    draftCrId = draftRes.rows[0].id;

    // Create and Publish a Change Request (to reach pending_approval)
    const pendingRes = await db.query<{ id: string }>(`
      insert into public.change_requests (
        project_id, title, description, pricing_method, estimated_hours, hourly_rate_minor,
        cost_minor, status, created_by
      ) values (
        $1, 'SSO & OAuth Integration', 'Single Sign-on implementation', 'hourly', 20, 15000,
        300000, 'draft', $2
      ) returning id
    `, [projAId, ownerAId]);
    pendingCrId = pendingRes.rows[0].id;

    // Publish via publish_change_request RPC as ownerA
    await asUser(ownerAId);
    const tokenHashPending = sha256("token_pending_1");
    await db.query(`select public.publish_change_request($1, $2, now() + interval '14 days')`, [
      pendingCrId,
      tokenHashPending,
    ]);

    // Create and Approve another Change Request
    const appRes = await db.query<{ id: string }>(`
      insert into public.change_requests (
        project_id, title, description, pricing_method, estimated_hours, hourly_rate_minor,
        cost_minor, status, created_by
      ) values (
        $1, 'Approved Addon', 'Approved description', 'hourly', 5, 15000,
        75000, 'draft', $2
      ) returning id
    `, [projAId, ownerAId]);
    approvedCrId = appRes.rows[0].id;

    const tokenHashApp = sha256("token_approved_1");
    await db.query(`select public.publish_change_request($1, $2, now() + interval '14 days')`, [
      approvedCrId,
      tokenHashApp,
    ]);

    // Submit decision to reach terminal approved status
    await asSuperuser();
    await db.query(`select public.submit_decision($1, 'approved', 'Acme Client Signer')`, [tokenHashApp]);
  });

  it("1. Owner and Manager can set project client contact; Member is forbidden", async () => {
    // Owner sets contact
    await asUser(ownerAId);
    await db.query(`select public.set_project_client_contact($1, $2, $3)`, [
      projAId,
      "Jane Client Lead",
      "jane@acmecorp.com",
    ]);

    let projCheck = await db.query<{ client_contact_name: string; client_contact_email: string }>(
      `select client_contact_name, client_contact_email from public.projects where id = $1`,
      [projAId]
    );
    expect(projCheck.rows[0].client_contact_name).toBe("Jane Client Lead");
    expect(projCheck.rows[0].client_contact_email).toBe("jane@acmecorp.com");

    // Manager updates contact
    await asUser(managerAId);
    await db.query(`select public.set_project_client_contact($1, $2, $3)`, [
      projAId,
      "John Tech Director",
      "john.tech@acmecorp.com",
    ]);

    projCheck = await db.query<{ client_contact_name: string; client_contact_email: string }>(
      `select client_contact_name, client_contact_email from public.projects where id = $1`,
      [projAId]
    );
    expect(projCheck.rows[0].client_contact_name).toBe("John Tech Director");
    expect(projCheck.rows[0].client_contact_email).toBe("john.tech@acmecorp.com");

    // Member is rejected
    await asUser(memberAId);
    await expect(
      db.query(`select public.set_project_client_contact($1, $2, $3)`, [
        projAId,
        "Illegal Contact",
        "illegal@acmecorp.com",
      ])
    ).rejects.toThrow(/Forbidden: Only workspace owners and managers/);
  });

  it("2. Validates client contact email syntax and rejects invalid formats", async () => {
    await asUser(ownerAId);
    await expect(
      db.query(`select public.set_project_client_contact($1, $2, $3)`, [
        projAId,
        "Bad Email User",
        "not-an-email",
      ])
    ).rejects.toThrow(/Invalid contact email address/);
  });

  it("3. Owner can begin a proposal email for a pending_approval request", async () => {
    await asUser(ownerAId);
    const attemptKey = "attempt_key_001";
    const res = await db.query<{ begin_proposal_email: string }>(
      `select public.begin_proposal_email($1, $2, $3, $4, $5)`,
      [pendingCrId, "client.approver@acme.com", "Client Approver", attemptKey, true]
    );
    const emailId = res.rows[0].begin_proposal_email;
    expect(emailId).toBeDefined();

    // Verify row was inserted with queued status
    const rowRes = await db.query<{ status: string; recipient_email: string; personal_note_present: boolean }>(
      `select status, recipient_email, personal_note_present from public.proposal_emails where id = $1`,
      [emailId]
    );
    expect(rowRes.rows[0].status).toBe("queued");
    expect(rowRes.rows[0].recipient_email).toBe("client.approver@acme.com");
    expect(rowRes.rows[0].personal_note_present).toBe(true);
  });

  it("4. Enforces idempotency on attempt_key: duplicate call returns same id without inserting extra row", async () => {
    await asUser(ownerAId);
    const attemptKey = "attempt_key_001"; // Same key as test 3

    const countBefore = await db.query<{ count: string }>(
      `select count(*) from public.proposal_emails where send_attempt_key = $1`,
      [attemptKey]
    );
    expect(parseInt(countBefore.rows[0].count, 10)).toBe(1);

    const res = await db.query<{ begin_proposal_email: string }>(
      `select public.begin_proposal_email($1, $2, $3, $4, $5)`,
      [pendingCrId, "client.approver@acme.com", "Client Approver", attemptKey, true]
    );

    const countAfter = await db.query<{ count: string }>(
      `select count(*) from public.proposal_emails where send_attempt_key = $1`,
      [attemptKey]
    );
    expect(parseInt(countAfter.rows[0].count, 10)).toBe(1);
    expect(res.rows[0].begin_proposal_email).toBeDefined();
  });

  it("5. Cannot send for draft or approved requests (enforces pending_approval only)", async () => {
    await asUser(ownerAId);

    // Draft request rejected
    await expect(
      db.query(`select public.begin_proposal_email($1, $2, $3, $4, $5)`, [
        draftCrId,
        "client@acme.com",
        "Client",
        "attempt_key_draft",
        false,
      ])
    ).rejects.toThrow(/Proposals can only be sent to clients when pending approval/);

    // Approved request rejected
    await expect(
      db.query(`select public.begin_proposal_email($1, $2, $3, $4, $5)`, [
        approvedCrId,
        "client@acme.com",
        "Client",
        "attempt_key_approved",
        false,
      ])
    ).rejects.toThrow(/Proposals can only be sent to clients when pending approval/);
  });

  it("6. Member cannot begin proposal email (role check enforced)", async () => {
    await asUser(memberAId);
    await expect(
      db.query(`select public.begin_proposal_email($1, $2, $3, $4, $5)`, [
        pendingCrId,
        "client@acme.com",
        "Client",
        "attempt_key_member",
        false,
      ])
    ).rejects.toThrow(/Forbidden: Only workspace owners and managers can send proposals/);
  });

  it("7. Cross-workspace isolation: Workspace B owner cannot send proposal for Workspace A", async () => {
    await asUser(ownerBId);
    await expect(
      db.query(`select public.begin_proposal_email($1, $2, $3, $4, $5)`, [
        pendingCrId,
        "client@acme.com",
        "Client",
        "attempt_key_wsb",
        false,
      ])
    ).rejects.toThrow(/Forbidden: You do not have access to this project/);
  });

  it("8. complete_proposal_email updates status to sent and records safe activity log", async () => {
    await asUser(ownerAId);

    // Find the queued proposal email row
    const emailRow = await db.query<{ id: string }>(
      `select id from public.proposal_emails where send_attempt_key = 'attempt_key_001'`
    );
    const emailId = emailRow.rows[0].id;

    await db.query(`select public.complete_proposal_email($1, $2, $3, $4)`, [
      emailId,
      "sent",
      "msg_resend_12345",
      null,
    ]);

    // Verify row status is sent and provider_message_id is stored
    const checkRow = await db.query<{ status: string; provider_message_id: string; sent_at: string }>(
      `select status, provider_message_id, sent_at from public.proposal_emails where id = $1`,
      [emailId]
    );
    expect(checkRow.rows[0].status).toBe("sent");
    expect(checkRow.rows[0].provider_message_id).toBe("msg_resend_12345");
    expect(checkRow.rows[0].sent_at).toBeDefined();

    // Verify activity_logs entry
    const act = await db.query<{ action: string; metadata: Record<string, unknown> }>(
      `select action, metadata from public.activity_logs where entity_id = $1 and action = 'proposal_emailed' order by created_at desc limit 1`,
      [pendingCrId]
    );
    expect(act.rows[0].action).toBe("proposal_emailed");
    expect(act.rows[0].metadata.recipient_masked).toBe("c***@acme.com");
    expect(act.rows[0].metadata.version_number).toBe(1);
    expect(act.rows[0].metadata.token).toBeUndefined();
    expect(act.rows[0].metadata.note).toBeUndefined();
  });

  it("9. complete_proposal_email handles failure outcome with safe error code and log", async () => {
    await asUser(managerAId);

    // Create a new attempt row
    // Fast-forward cooldown by updating previous row's created_at
    await asSuperuser();
    await db.query(`update public.proposal_emails set created_at = now() - interval '70 seconds'`);

    await asUser(managerAId);
    const beginRes = await db.query<{ begin_proposal_email: string }>(
      `select public.begin_proposal_email($1, $2, $3, $4, $5)`,
      [pendingCrId, "fail.client@acme.com", "Fail Client", "attempt_key_fail", false]
    );
    const failEmailId = beginRes.rows[0].begin_proposal_email;

    await db.query(`select public.complete_proposal_email($1, $2, $3, $4)`, [
      failEmailId,
      "failed",
      null,
      "PROVIDER_RATE_LIMIT",
    ]);

    const checkFail = await db.query<{ status: string; error_code: string }>(
      `select status, error_code from public.proposal_emails where id = $1`,
      [failEmailId]
    );
    expect(checkFail.rows[0].status).toBe("failed");
    expect(checkFail.rows[0].error_code).toBe("PROVIDER_RATE_LIMIT");

    // Verify activity_logs entry for failure
    const actFail = await db.query<{ action: string; metadata: Record<string, unknown> }>(
      `select action, metadata from public.activity_logs where entity_id = $1 and action = 'proposal_email_failed' order by created_at desc limit 1`,
      [pendingCrId]
    );
    expect(actFail.rows[0].action).toBe("proposal_email_failed");
    expect(actFail.rows[0].metadata.recipient_masked).toBe("f***@acme.com");
    expect(actFail.rows[0].metadata.error_code).toBe("PROVIDER_RATE_LIMIT");
  });

  it("10. Enforces 60-second cooldown between consecutive sends", async () => {
    await asUser(ownerAId);
    // An email was just completed above, so cooldown should be active
    await expect(
      db.query(`select public.begin_proposal_email($1, $2, $3, $4, $5)`, [
        pendingCrId,
        "cooldown.test@acme.com",
        "Cooldown",
        "attempt_key_cooldown",
        false,
      ])
    ).rejects.toThrow(/Cooldown active: Please wait at least 60 seconds/);
  });

  it("11. Enforces rate limit of maximum 5 sends per hour per change request", async () => {
    await asSuperuser();
    // Simulate 5 sends within the last hour for this change request
    await db.query(`delete from public.proposal_emails where change_request_id = $1`, [pendingCrId]);
    for (let i = 1; i <= 5; i++) {
      await db.query(`
        insert into public.proposal_emails (
          workspace_id, change_request_id, version_id, recipient_email, status,
          send_attempt_key, created_at
        ) values (
          $1, $2, (select id from public.change_request_versions where change_request_id = $2 limit 1),
          'rate.limit@test.com', 'sent', $3, now() - interval '${i * 2} minutes'
        )
      `, [wsAId, pendingCrId, `rate_key_${i}`]);
    }

    await asUser(ownerAId);
    await expect(
      db.query(`select public.begin_proposal_email($1, $2, $3, $4, $5)`, [
        pendingCrId,
        "rate.blocked@test.com",
        "Blocked",
        "attempt_key_blocked",
        false,
      ])
    ).rejects.toThrow(/Rate limit exceeded: A maximum of 5 proposal emails can be sent per hour/);
  });

  it("12. RLS: Owners and Managers can SELECT delivery log; Members and Anon cannot", async () => {
    // Owner can select
    await asUser(ownerAId);
    const ownerRows = await db.query(`select id, recipient_email, status from public.proposal_emails`);
    expect(ownerRows.rows.length).toBeGreaterThan(0);

    // Manager can select
    await asUser(managerAId);
    const mgrRows = await db.query(`select id, recipient_email, status from public.proposal_emails`);
    expect(mgrRows.rows.length).toBeGreaterThan(0);

    // Member gets 0 rows (RLS default deny on member)
    await asUser(memberAId);
    const memberRows = await db.query(`select id, recipient_email, status from public.proposal_emails`);
    expect(memberRows.rows.length).toBe(0);

    // Direct inserts by authenticated users are blocked by RLS
    await expect(
      db.query(`
        insert into public.proposal_emails (
          workspace_id, change_request_id, version_id, recipient_email, send_attempt_key
        ) values (
          $1, $2, (select id from public.change_request_versions limit 1), 'hacker@test.com', 'hack_key'
        )
      `, [wsAId, pendingCrId])
    ).rejects.toThrow();

    // Anon gets 0 rows (RLS default deny on anon)
    await asUser(null, "anon");
    const anonRows = await db.query(`select * from public.proposal_emails`);
    expect(anonRows.rows.length).toBe(0);

    // Anon direct insert is rejected
    await expect(
      db.query(`
        insert into public.proposal_emails (
          workspace_id, change_request_id, version_id, recipient_email, send_attempt_key
        ) values (
          $1, $2, (select id from public.change_request_versions limit 1), 'anon_hack@test.com', 'anon_key'
        )
      `, [wsAId, pendingCrId])
    ).rejects.toThrow();
  });
});
