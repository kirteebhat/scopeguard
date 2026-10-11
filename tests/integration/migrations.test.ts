import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import * as fs from "fs";
import * as path from "path";

describe("Database Migrations & Transactional Functions", () => {
  let db: PGlite;

  const user1Id = "11111111-1111-1111-1111-111111111111";
  const user2MemberId = "22222222-2222-2222-2222-222222222222";

  beforeAll(async () => {
    db = new PGlite();

    // 1. Setup mock auth schema simulating Supabase Auth
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
      create or replace function auth.set_mock_user(p_uid uuid) returns void language plpgsql as $$
      begin
        perform set_config('request.jwt.claim.sub', p_uid::text, false);
      end;
      $$;
    `);

    // 2. Read and apply Migration 1: Initial schema
    const migration1Path = path.resolve(
      __dirname,
      "../../supabase/migrations/20261011120000_initial_schema.sql"
    );
    const migration1Sql = fs.readFileSync(migration1Path, "utf-8");
    await db.exec(migration1Sql);

    // 3. Read and apply Migration 2: Change requests & approvals
    const migration2Path = path.resolve(
      __dirname,
      "../../supabase/migrations/20261011130000_change_requests_and_approvals.sql"
    );
    const migration2Sql = fs.readFileSync(migration2Path, "utf-8");
    await db.exec(migration2Sql);
  });

  it("applies migrations cleanly and provisions user profile via trigger", async () => {
    // Insert user into auth.users
    await db.query(
      `insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`,
      [user1Id, "owner@agency.com", JSON.stringify({ full_name: "Agency Owner" })]
    );

    // Verify profile auto-created
    const res = await db.query<{ id: string; full_name: string; email: string }>(
      `select * from public.profiles where id = $1`,
      [user1Id]
    );
    expect(res.rows.length).toBe(1);
    expect(res.rows[0].email).toBe("owner@agency.com");
    expect(res.rows[0].full_name).toBe("Agency Owner");
  });

  it("creates workspace atomically with owner role", async () => {
    // Set caller identity
    await db.exec(`select auth.set_mock_user('${user1Id}');`);

    const res = await db.query<{ create_workspace: { id: string; name: string; slug: string } }>(
      `select public.create_workspace('Acme Labs') as create_workspace;`
    );
    const ws = res.rows[0].create_workspace;
    expect(ws.name).toBe("Acme Labs");
    expect(ws.slug).toBe("acme-labs");

    // Verify owner membership
    const member = await db.query<{ role: string }>(
      `select role from public.workspace_members where workspace_id = $1 and user_id = $2`,
      [ws.id, user1Id]
    );
    expect(member.rows[0].role).toBe("owner");
  });

  it("publishes change request, snapshots data, and sets status to pending_approval", async () => {
    await db.exec(`select auth.set_mock_user('${user1Id}');`);

    // Get workspace
    const ws = (await db.query<{ id: string }>(`select id from public.workspaces limit 1`)).rows[0];

    // Create project
    const proj = (
      await db.query<{ id: string }>(
        `insert into public.projects (workspace_id, name, client_name, currency, budget_minor, hourly_rate_minor, original_deadline)
         values ($1, 'Mobile App', 'Client Co', 'INR', 50000000, 150000, '2026-12-31')
         returning id`,
        [ws.id]
      )
    ).rows[0];

    // Create change request draft
    const cr = (
      await db.query<{ id: string }>(
        `insert into public.change_requests (project_id, title, description, pricing_method, estimated_hours, hourly_rate_minor, cost_minor, internal_notes)
         values ($1, 'Biometric Login', 'Add Face ID', 'hourly', 10, 150000, 1500000, 'Agency secret note')
         returning id`,
        [proj.id]
      )
    ).rows[0];

    // Publish proposal
    const tokenHash = "a".repeat(64); // 64 hex chars
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const publishRes = await db.query<{ publish_change_request: any }>(
      `select public.publish_change_request($1, $2, $3) as publish_change_request`,
      [cr.id, tokenHash, expiresAt]
    );
    const pub = publishRes.rows[0].publish_change_request;
    expect(pub.success).toBe(true);
    expect(pub.version_number).toBe(1);
    expect(pub.status).toBe("pending_approval");

    // Verify snapshot excludes internal_notes
    const ver = (
      await db.query<{ snapshot: any }>(
        `select snapshot from public.change_request_versions where id = $1`,
        [pub.version_id]
      )
    ).rows[0];
    expect(ver.snapshot.title).toBe("Biometric Login");
    expect(ver.snapshot.internal_notes).toBeUndefined();
    expect(ver.snapshot.cost_minor).toBe(1500000);
  });

  it("test get_proposal_by_token: returns valid status and sanitized data", async () => {
    const tokenHash = "a".repeat(64);
    const res = await db.query<{ get_proposal_by_token: any }>(
      `select public.get_proposal_by_token($1) as get_proposal_by_token`,
      [tokenHash]
    );
    const data = res.rows[0].get_proposal_by_token;
    expect(data.status).toBe("valid");
    expect(data.snapshot.title).toBe("Biometric Login");
    expect(data.agency_name).toBe("Acme Labs");
    expect(data.project_name).toBe("Mobile App");
  });

  it("test submit_decision: approves proposal, updates status, and prevents double-submit", async () => {
    const tokenHash = "a".repeat(64);

    // 1. First approval
    const dec1 = (
      await db.query<{ submit_decision: any }>(
        `select public.submit_decision($1, 'approved', 'Alice Client', '{"ip_hash": "salt_123"}') as submit_decision`,
        [tokenHash]
      )
    ).rows[0].submit_decision;

    expect(dec1.success).toBe(true);
    expect(dec1.status).toBe("approved");
    expect(dec1.actor_name).toBe("Alice Client");

    // Verify change request is now approved
    const cr = (
      await db.query<{ status: string }>(
        `select status from public.change_requests where title = 'Biometric Login'`
      )
    ).rows[0];
    expect(cr.status).toBe("approved");

    // 2. DOUBLE SUBMIT: Submit a second time on the same token
    const dec2 = (
      await db.query<{ submit_decision: any }>(
        `select public.submit_decision($1, 'approved', 'Alice Client', '{}') as submit_decision`,
        [tokenHash]
      )
    ).rows[0].submit_decision;

    expect(dec2.success).toBe(false);
    expect(dec2.status).toBe("already_decided");
    expect(dec2.message).toContain("already been recorded");

    // Verify get_proposal_by_token now returns already_decided
    const getDecided = (
      await db.query<{ get_proposal_by_token: any }>(
        `select public.get_proposal_by_token($1) as get_proposal_by_token`,
        [tokenHash]
      )
    ).rows[0].get_proposal_by_token;
    expect(getDecided.status).toBe("already_decided");
    expect(getDecided.decision).toBe("approved");
  });

  it("test expired token: fails safely with expired status", async () => {
    await db.exec(`select auth.set_mock_user('${user1Id}');`);

    const proj = (await db.query<{ id: string }>(`select id from public.projects limit 1`)).rows[0];
    const cr = (
      await db.query<{ id: string }>(
        `insert into public.change_requests (project_id, title, description, cost_minor)
         values ($1, 'Expired Request', 'Description', 50000)
         returning id`,
        [proj.id]
      )
    ).rows[0];

    const expiredTokenHash = "b".repeat(64);
    // Expired 1 hour ago
    const expiredAt = new Date(Date.now() - 3600 * 1000).toISOString();

    await db.query(
      `select public.publish_change_request($1, $2, $3)`,
      [cr.id, expiredTokenHash, expiredAt]
    );

    // 1. get_proposal_by_token on expired token
    const getRes = (
      await db.query<{ get_proposal_by_token: any }>(
        `select public.get_proposal_by_token($1) as get_proposal_by_token`,
        [expiredTokenHash]
      )
    ).rows[0].get_proposal_by_token;
    expect(getRes.status).toBe("expired");

    // 2. submit_decision on expired token
    const decRes = (
      await db.query<{ submit_decision: any }>(
        `select public.submit_decision($1, 'approved', 'Bob Client') as submit_decision`,
        [expiredTokenHash]
      )
    ).rows[0].submit_decision;
    expect(decRes.success).toBe(false);
    expect(decRes.status).toBe("expired");
  });

  it("test revise flow & revoked token: returns draft, revokes token, blocks old token decision", async () => {
    await db.exec(`select auth.set_mock_user('${user1Id}');`);

    const proj = (await db.query<{ id: string }>(`select id from public.projects limit 1`)).rows[0];
    const cr = (
      await db.query<{ id: string }>(
        `insert into public.change_requests (project_id, title, description, cost_minor)
         values ($1, 'Revisable Request', 'Initial Scope', 80000)
         returning id`,
        [proj.id]
      )
    ).rows[0];

    const tokenV1 = "c".repeat(64);
    const expiresAt = new Date(Date.now() + 14 * 86400 * 1000).toISOString();

    // Publish v1
    await db.query(`select public.publish_change_request($1, $2, $3)`, [cr.id, tokenV1, expiresAt]);

    // Agency triggers REVISE
    const revRes = (
      await db.query<{ revise_change_request: any }>(
        `select public.revise_change_request($1) as revise_change_request`,
        [cr.id]
      )
    ).rows[0].revise_change_request;
    expect(revRes.success).toBe(true);
    expect(revRes.status).toBe("draft");

    // 1. Token v1 is now revoked
    const getV1 = (
      await db.query<{ get_proposal_by_token: any }>(
        `select public.get_proposal_by_token($1) as get_proposal_by_token`,
        [tokenV1]
      )
    ).rows[0].get_proposal_by_token;
    expect(getV1.status).toBe("revoked");

    // 2. Submitting decision on revoked token v1 fails
    const decV1 = (
      await db.query<{ submit_decision: any }>(
        `select public.submit_decision($1, 'approved', 'Client') as submit_decision`,
        [tokenV1]
      )
    ).rows[0].submit_decision;
    expect(decV1.success).toBe(false);
    expect(decV1.status).toBe("revoked");

    // 3. Edit draft and republish as Version 2
    await db.query(
      `update public.change_requests set cost_minor = 120000, description = 'Updated Scope' where id = $1`,
      [cr.id]
    );

    const tokenV2 = "d".repeat(64);
    const pubV2 = (
      await db.query<{ publish_change_request: any }>(
        `select public.publish_change_request($1, $2, $3) as publish_change_request`,
        [cr.id, tokenV2, expiresAt]
      )
    ).rows[0].publish_change_request;
    expect(pubV2.version_number).toBe(2);

    // 4. Token v2 works and can be approved
    const decV2 = (
      await db.query<{ submit_decision: any }>(
        `select public.submit_decision($1, 'approved', 'Happy Client') as submit_decision`,
        [tokenV2]
      )
    ).rows[0].submit_decision;
    expect(decV2.success).toBe(true);
    expect(decV2.status).toBe("approved");
    expect(decV2.version_number).toBe(2);
  });

  it("test immutable snapshot trigger: blocks direct UPDATE and DELETE on versions", async () => {
    const version = (
      await db.query<{ id: string }>(`select id from public.change_request_versions limit 1`)
    ).rows[0];

    // Attempt direct UPDATE
    await expect(
      db.query(`update public.change_request_versions set title = 'Hacked' where id = $1`, [
        version.id,
      ])
    ).rejects.toThrowError(/Immutable record violation/);

    // Attempt direct DELETE
    await expect(
      db.query(`delete from public.change_request_versions where id = $1`, [version.id])
    ).rejects.toThrowError(/Immutable record violation/);
  });
});
