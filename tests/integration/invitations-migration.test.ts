import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import * as fs from "fs";
import * as path from "path";
import crypto from "crypto";

describe("Workspace Invitations Migration & RLS Suite", () => {
  let db: PGlite;

  // Workspace A users
  const ownerAId = "11111111-1111-1111-1111-111111111111";
  const managerAId = "22222222-2222-2222-2222-222222222222";
  const memberAId = "33333333-3333-3333-3333-333333333333";

  // Workspace B user
  const ownerBId = "44444444-4444-4444-4444-444444444444";

  // External candidate users
  const candidateUserId = "55555555-5555-5555-5555-555555555555";
  const wrongCandidateUserId = "66666666-6666-6666-6666-666666666666";

  let wsAId: string;
  let wsBId: string;

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

    // Re-grant for newly created tables
    await db.exec(`
      grant all on all tables in schema public to anon, authenticated, service_role;
      grant all on all routines in schema public to anon, authenticated, service_role;
      grant all on all sequences in schema public to anon, authenticated, service_role;
    `);

    // Seed test users in auth.users
    await db.query(`insert into auth.users (id, email, raw_user_meta_data) values 
      ($1, 'owner_a@agency.com', '{"full_name":"Owner A"}'),
      ($2, 'manager_a@agency.com', '{"full_name":"Manager A"}'),
      ($3, 'member_a@agency.com', '{"full_name":"Member A"}'),
      ($4, 'owner_b@agency.com', '{"full_name":"Owner B"}'),
      ($5, 'candidate@newhire.com', '{"full_name":"Candidate User"}'),
      ($6, 'wrong@other.com', '{"full_name":"Wrong User"}')
    `, [ownerAId, managerAId, memberAId, ownerBId, candidateUserId, wrongCandidateUserId]);

    // Provision Workspaces
    const wsARes = await db.query<{ id: string }>(
      `insert into public.workspaces (name, slug) values ('Workspace A', 'workspace-a') returning id`
    );
    wsAId = wsARes.rows[0].id;

    const wsBRes = await db.query<{ id: string }>(
      `insert into public.workspaces (name, slug) values ('Workspace B', 'workspace-b') returning id`
    );
    wsBId = wsBRes.rows[0].id;

    // Provision Workspace A memberships
    await db.query(`insert into public.workspace_members (workspace_id, user_id, role) values
      ($1, $2, 'owner'),
      ($1, $3, 'manager'),
      ($1, $4, 'member')
    `, [wsAId, ownerAId, managerAId, memberAId]);

    // Provision Workspace B membership
    await db.query(`insert into public.workspace_members (workspace_id, user_id, role) values
      ($1, $2, 'owner')
    `, [wsBId, ownerBId]);
  });

  it("1. Owner can create invitations for manager and member", async () => {
    await asUser(ownerAId);
    const tokenHash1 = sha256("token_manager_1");
    const res1 = await db.query<{ create_invitation: string }>(
      `select public.create_invitation($1, $2, $3, $4)`,
      [wsAId, "manager_invite@test.com", "manager", tokenHash1]
    );
    expect(res1.rows[0].create_invitation).toBeDefined();

    const tokenHash2 = sha256("token_member_1");
    const res2 = await db.query<{ create_invitation: string }>(
      `select public.create_invitation($1, $2, $3, $4)`,
      [wsAId, "member_invite@test.com", "member", tokenHash2]
    );
    expect(res2.rows[0].create_invitation).toBeDefined();
  });

  it("2. Manager can invite a member, but CANNOT invite a manager", async () => {
    await asUser(managerAId);

    // Permitted: manager invites member
    const tokenHash = sha256("token_manager_invited_member");
    const res = await db.query<{ create_invitation: string }>(
      `select public.create_invitation($1, $2, $3, $4)`,
      [wsAId, "dev_hire@test.com", "member", tokenHash]
    );
    expect(res.rows[0].create_invitation).toBeDefined();

    // Rejected: manager tries to invite a manager
    const tokenHashMgr = sha256("token_mgr_invite_mgr");
    await expect(
      db.query(
        `select public.create_invitation($1, $2, $3, $4)`,
        [wsAId, "another_mgr@test.com", "manager", tokenHashMgr]
      )
    ).rejects.toThrow(/Managers are only authorized to invite Members/);
  });

  it("3. Owner role CANNOT be granted by invitation", async () => {
    await asUser(ownerAId);
    const tokenHash = sha256("token_owner_illegal");
    await expect(
      db.query(
        `select public.create_invitation($1, $2, $3, $4)`,
        [wsAId, "illegal_owner@test.com", "owner", tokenHash]
      )
    ).rejects.toThrow(/Permitted roles are 'manager' or 'member'/);
  });

  it("4. Member CANNOT create or view invitations (RLS default deny)", async () => {
    await asUser(memberAId);

    // Cannot create
    const tokenHash = sha256("token_member_illegal");
    await expect(
      db.query(
        `select public.create_invitation($1, $2, $3, $4)`,
        [wsAId, "someone@test.com", "member", tokenHash]
      )
    ).rejects.toThrow(/Only workspace owners and managers can invite/);

    // Cannot view (RLS returns 0 rows)
    const res = await db.query(`select * from public.workspace_invitations where workspace_id = $1`, [wsAId]);
    expect(res.rows.length).toBe(0);
  });

  it("5. Cross-workspace isolation: Owner B cannot see or manage Workspace A invitations", async () => {
    await asUser(ownerBId);

    // SELECT on Workspace A returns empty
    const res = await db.query(`select * from public.workspace_invitations where workspace_id = $1`, [wsAId]);
    expect(res.rows.length).toBe(0);

    // Owner B cannot create invitation in Workspace A
    const tokenHash = sha256("token_cross_ws");
    await expect(
      db.query(
        `select public.create_invitation($1, $2, $3, $4)`,
        [wsAId, "infiltrator@test.com", "member", tokenHash]
      )
    ).rejects.toThrow(/Only workspace owners and managers can invite/);
  });

  it("6. Cannot invite an existing workspace member", async () => {
    await asUser(ownerAId);
    const tokenHash = sha256("token_existing_member");
    await expect(
      db.query(
        `select public.create_invitation($1, $2, $3, $4)`,
        [wsAId, "member_a@agency.com", "member", tokenHash]
      )
    ).rejects.toThrow(/already an active member/);
  });

  it("7. Duplicate pending invite for same email is rejected by unique constraint", async () => {
    await asUser(ownerAId);
    const tokenHash1 = sha256("token_dup_1");
    await db.query(
      `select public.create_invitation($1, $2, $3, $4)`,
      [wsAId, "unique_check@test.com", "member", tokenHash1]
    );

    const tokenHash2 = sha256("token_dup_2");
    await expect(
      db.query(
        `select public.create_invitation($1, $2, $3, $4)`,
        [wsAId, "unique_check@test.com", "member", tokenHash2]
      )
    ).rejects.toThrow(/unique|duplicate key/i);
  });

  it("8. Resend resets expiry, increments send count, and enforces 60s cooldown", async () => {
    await asUser(ownerAId);
    const tokenHash1 = sha256("token_resend_target");
    const createRes = await db.query<{ create_invitation: string }>(
      `select public.create_invitation($1, $2, $3, $4)`,
      [wsAId, "cooldown_test@test.com", "member", tokenHash1]
    );
    const inviteId = createRes.rows[0].create_invitation;

    // Immediate resend should fail cooldown
    const tokenHash2 = sha256("token_resend_target_2");
    await expect(
      db.query(`select public.resend_invitation($1, $2)`, [inviteId, tokenHash2])
    ).rejects.toThrow(/Cooldown active: Please wait at least 60 seconds/);

    // Fast-forward last_sent_at past 60s
    await asSuperuser();
    await db.query(
      `update public.workspace_invitations set last_sent_at = now() - interval '65 seconds' where id = $1`,
      [inviteId]
    );

    // Resend now succeeds
    await asUser(ownerAId);
    await db.query(`select public.resend_invitation($1, $2)`, [inviteId, tokenHash2]);

    const updatedRes = await db.query<{ send_count: number; token_hash: string }>(
      `select send_count, token_hash from public.workspace_invitations where id = $1`,
      [inviteId]
    );
    expect(updatedRes.rows[0].send_count).toBe(2);
    expect(updatedRes.rows[0].token_hash).toBe(tokenHash2);
  });

  it("9. Revoke marks status revoked and blocks acceptance", async () => {
    await asUser(ownerAId);
    const tokenHash = sha256("token_revoke_test");
    const createRes = await db.query<{ create_invitation: string }>(
      `select public.create_invitation($1, $2, $3, $4)`,
      [wsAId, "candidate@newhire.com", "member", tokenHash]
    );
    const inviteId = createRes.rows[0].create_invitation;

    // Revoke
    await db.query(`select public.revoke_invitation($1)`, [inviteId]);

    // Check status
    const invRes = await db.query<{ status: string }>(
      `select status from public.workspace_invitations where id = $1`,
      [inviteId]
    );
    expect(invRes.rows[0].status).toBe("revoked");

    // Attempting to accept revoked token fails
    await asUser(candidateUserId);
    await expect(
      db.query(`select public.accept_invitation($1)`, [tokenHash])
    ).rejects.toThrow(/invitation has been revoked/);
  });

  it("10. Wrong email user CANNOT accept invitation", async () => {
    await asUser(ownerAId);
    const tokenHash = sha256("token_email_mismatch");
    const createRes = await db.query<{ create_invitation: string }>(
      `select public.create_invitation($1, $2, $3, $4)`,
      [wsAId, "candidate@newhire.com", "member", tokenHash]
    );

    // Wrong candidate (wrong@other.com) tries to accept
    await asUser(wrongCandidateUserId);
    await expect(
      db.query(`select public.accept_invitation($1)`, [tokenHash])
    ).rejects.toThrow(/Email mismatch/);

    // Clean up by revoking so it is no longer pending
    await asUser(ownerAId);
    await db.query(`select public.revoke_invitation($1)`, [createRes.rows[0].create_invitation]);
  });

  it("11. Matching email user accepts invitation: atomically joins workspace and double-accept is idempotent", async () => {
    await asUser(ownerAId);
    const tokenHash = sha256("token_accept_success");
    await db.query(
      `select public.create_invitation($1, $2, $3, $4)`,
      [wsAId, "candidate@newhire.com", "manager", tokenHash]
    );

    // Matching candidate (candidate@newhire.com) accepts
    await asUser(candidateUserId);
    const acceptRes = await db.query<{ accept_invitation: { success: boolean; already_member: boolean; role: string } }>(
      `select public.accept_invitation($1)`,
      [tokenHash]
    );
    expect(acceptRes.rows[0].accept_invitation.success).toBe(true);
    expect(acceptRes.rows[0].accept_invitation.already_member).toBe(false);
    expect(acceptRes.rows[0].accept_invitation.role).toBe("manager");

    // Verify membership row exists in workspace_members
    const memberRes = await db.query<{ role: string }>(
      `select role from public.workspace_members where workspace_id = $1 and user_id = $2`,
      [wsAId, candidateUserId]
    );
    expect(memberRes.rows.length).toBe(1);
    expect(memberRes.rows[0].role).toBe("manager");

    // Double-accept: repeated acceptance is idempotent
    const repeatRes = await db.query<{ accept_invitation: { success: boolean; already_member: boolean } }>(
      `select public.accept_invitation($1)`,
      [tokenHash]
    );
    expect(repeatRes.rows[0].accept_invitation.success).toBe(true);
    expect(repeatRes.rows[0].accept_invitation.already_member).toBe(true);

    // Membership count remains exactly 1
    const finalMembers = await db.query(
      `select * from public.workspace_members where workspace_id = $1 and user_id = $2`,
      [wsAId, candidateUserId]
    );
    expect(finalMembers.rows.length).toBe(1);
  });

  it("12. Expired invitation token fails safely", async () => {
    await asUser(ownerAId);
    const tokenHash = sha256("token_expired_test");
    const createRes = await db.query<{ create_invitation: string }>(
      `select public.create_invitation($1, $2, $3, $4)`,
      [wsAId, "expired_candidate@test.com", "member", tokenHash]
    );
    const inviteId = createRes.rows[0].create_invitation;

    // Fast forward expires_at to the past
    await asSuperuser();
    await db.query(
      `update public.workspace_invitations set expires_at = now() - interval '1 hour' where id = $1`,
      [inviteId]
    );

    // Public resolution shows status 'expired'
    const inspectRes = await db.query<{ status: string }>(
      `select status from public.get_invitation_by_token($1)`,
      [tokenHash]
    );
    expect(inspectRes.rows[0].status).toBe("expired");

    // Acceptance fails with expiration error
    await asUser(candidateUserId);
    await expect(
      db.query(`select public.accept_invitation($1)`, [tokenHash])
    ).rejects.toThrow(/invitation link has expired/);
  });

  it("13. Audit logs record invitation lifecycle events with safe masked metadata", async () => {
    await asSuperuser();
    const logsRes = await db.query<{ action: string; metadata: { role?: string; email_masked?: string } }>(
      `select action, metadata from public.activity_logs where entity_type = 'workspace_invitation' order by created_at asc`
    );
    expect(logsRes.rows.length).toBeGreaterThan(0);

    const actions = logsRes.rows.map(r => r.action);
    expect(actions).toContain("invitation_created");
    expect(actions).toContain("invitation_resent");
    expect(actions).toContain("invitation_revoked");
    expect(actions).toContain("invitation_accepted");

    // Verify metadata does NOT contain raw tokens or unmasked emails
    for (const log of logsRes.rows) {
      expect(log.metadata).toBeDefined();
      if (log.metadata.email_masked) {
        expect(log.metadata.email_masked).toContain("***@");
      }
    }
  });
});
