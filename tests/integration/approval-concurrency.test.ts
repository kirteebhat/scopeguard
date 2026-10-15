import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import * as fs from "fs";
import * as path from "path";
import { generateApprovalToken } from "@/lib/server/tokens";

describe("Approval Link Concurrency, Resolution & State Machine Integration Suite", () => {
  let db: PGlite;

  const ownerId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  let workspaceId: string;
  let projectId: string;

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
      create or replace function auth.role() returns text language sql stable as $$
        select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon')
      $$;
      create or replace function auth.set_mock_user(p_uid uuid) returns void language plpgsql as $$
      begin
        perform set_config('request.jwt.claim.sub', p_uid::text, false);
        perform set_config('request.jwt.claim.role', 'authenticated', false);
      end;
      $$;

      -- Create standard Supabase roles
      create role anon;
      create role authenticated;
      create role service_role;

      grant usage on schema public to anon, authenticated, service_role;
      grant all on all tables in schema public to anon, authenticated, service_role;
      grant all on all routines in schema public to anon, authenticated, service_role;
      grant all on all sequences in schema public to anon, authenticated, service_role;
    `);

    // 2. Execute migrations
    const migration1 = fs.readFileSync(
      path.resolve(__dirname, "../../supabase/migrations/20261011120000_initial_schema.sql"),
      "utf-8"
    );
    await db.exec(migration1);

    const migration2 = fs.readFileSync(
      path.resolve(__dirname, "../../supabase/migrations/20261011130000_change_requests_and_approvals.sql"),
      "utf-8"
    );
    await db.exec(migration2);

    const migration3 = fs.readFileSync(
      path.resolve(__dirname, "../../supabase/migrations/20261011140000_row_level_security.sql"),
      "utf-8"
    );
    await db.exec(migration3);

    // 3. Populate Owner and Workspace
    await db.query(`insert into auth.users (id, email) values ($1, $2)`, [
      ownerId,
      "owner@apexdesign.com",
    ]);

    await db.query(`select auth.set_mock_user($1::uuid)`, [ownerId]);

    const wsRes = await db.query<{ create_workspace: { id: string } }>(
      `select public.create_workspace('Apex Digital Studio') as create_workspace;`
    );
    workspaceId = wsRes.rows[0].create_workspace.id;

    // Create Project
    const projRes = await db.query<{ id: string }>(
      `insert into public.projects (
        workspace_id, name, client_name, currency, budget_minor, hourly_rate_minor,
        start_date, original_deadline, created_by
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning id`,
      [
        workspaceId,
        "Customer Retention Portal",
        "Apex Global Logistics",
        "USD",
        15000000, // $150,000.00
        17500, // $175.00/hr
        "2026-10-01",
        "2027-01-31",
        ownerId,
      ]
    );
    projectId = projRes.rows[0].id;
  });

  it("concurrency: simultaneous submissions on same token produce exactly ONE approval and one calm already_decided result", async () => {
    // 1. Create Change Request Draft
    const crRes = await db.query<{ id: string }>(
      `insert into public.change_requests (
        project_id, title, description, reason, pricing_method, estimated_hours,
        hourly_rate_minor, cost_minor, proposed_deadline, internal_notes, status, created_by
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'draft', $11) returning id`,
      [
        projectId,
        "Custom Automated Webhook Pipeline",
        "Add webhook triggers for parcel status updates.",
        "Client requested external ERP sync.",
        "hourly",
        20.0,
        17500,
        350000, // $3,500.00
        "2027-02-15",
        "NEVER LEAK TO CLIENT: Requires Redis queue",
        ownerId,
      ]
    );
    const crId = crRes.rows[0].id;

    // 2. Publish Change Request
    const token = generateApprovalToken(14);
    await db.query(`select auth.set_mock_user($1::uuid)`, [ownerId]);
    await db.query(
      `select public.publish_change_request($1, $2, $3)`,
      [crId, token.tokenHash, token.expiresAt.toISOString()]
    );

    // 3. Fire TWO simultaneous decision calls with Promise.all
    // Actor A approves, Actor B rejects at the exact same millisecond
    const auditMetaA = JSON.stringify({ ip_hash: "hash_a", user_agent: "Browser A" });
    const auditMetaB = JSON.stringify({ ip_hash: "hash_b", user_agent: "Browser B" });

    const [subA, subB] = await Promise.all([
      db.query<{ submit_decision: Record<string, unknown> }>(
        `select public.submit_decision($1, 'approved', 'Client Exec Alice', $2::jsonb) as submit_decision`,
        [token.tokenHash, auditMetaA]
      ),
      db.query<{ submit_decision: Record<string, unknown> }>(
        `select public.submit_decision($1, 'rejected', 'Client Exec Bob', $2::jsonb) as submit_decision`,
        [token.tokenHash, auditMetaB]
      ),
    ]);

    const resA = subA.rows[0].submit_decision;
    const resB = subB.rows[0].submit_decision;

    // Invariant: Exactly one must succeed, and the other must return already_decided
    const oneSucceeded = (resA.success === true && resB.success === false) ||
                         (resB.success === true && resA.success === false);
    expect(oneSucceeded).toBe(true);

    const loser = resA.success === false ? resA : resB;
    expect(loser.status).toBe("already_decided");
    expect(loser.message).toContain("already been recorded");

    // Invariant: Database approvals table has exactly ONE row for this version
    const versionRes = await db.query<{ id: string }>(
      `select id from public.change_request_versions where change_request_id = $1`,
      [crId]
    );
    const versionId = versionRes.rows[0].id;

    const approvalRows = await db.query<{ id: string; decision: string }>(
      `select id, decision from public.approvals where version_id = $1`,
      [versionId]
    );
    expect(approvalRows.rows).toHaveLength(1);

    // Invariant: Change request status is terminal
    const updatedCr = await db.query<{ status: string }>(
      `select status from public.change_requests where id = $1`,
      [crId]
    );
    expect(["approved", "rejected"]).toContain(updatedCr.rows[0].status);

    // Invariant: Subsequent get_proposal_by_token reports already_decided
    const getRes = await db.query<{ get_proposal_by_token: Record<string, unknown> }>(
      `select public.get_proposal_by_token($1) as get_proposal_by_token`,
      [token.tokenHash]
    );
    const resolved = getRes.rows[0].get_proposal_by_token;
    expect(resolved.status).toBe("already_decided");
    expect(resolved.decision).toBe(approvalRows.rows[0].decision);
  });

  it("expired token: returns status expired and prevents decision submission", async () => {
    // 1. Create & publish change request
    const crRes = await db.query<{ id: string }>(
      `insert into public.change_requests (
        project_id, title, description, pricing_method, cost_minor, status, created_by
      ) values ($1, $2, $3, 'fixed', 500000, 'draft', $4) returning id`,
      [projectId, "Expired Proposal Test", "Scope for expiry testing", ownerId]
    );
    const crId = crRes.rows[0].id;

    const token = generateApprovalToken(14);
    await db.query(`select auth.set_mock_user($1::uuid)`, [ownerId]);
    await db.query(
      `select public.publish_change_request($1, $2, $3)`,
      [crId, token.tokenHash, token.expiresAt.toISOString()]
    );

    // 2. Fast-forward expiration in the past
    await db.query(
      `update public.approval_tokens set expires_at = now() - interval '2 days' where token_hash = $1`,
      [token.tokenHash]
    );

    // 3. get_proposal_by_token returns expired
    const getRes = await db.query<{ get_proposal_by_token: Record<string, unknown> }>(
      `select public.get_proposal_by_token($1) as get_proposal_by_token`,
      [token.tokenHash]
    );
    expect(getRes.rows[0].get_proposal_by_token.status).toBe("expired");

    // 4. submit_decision fails with status expired
    const subRes = await db.query<{ submit_decision: Record<string, unknown> }>(
      `select public.submit_decision($1, 'approved', 'Client Officer', '{}'::jsonb) as submit_decision`,
      [token.tokenHash]
    );
    expect(subRes.rows[0].submit_decision.success).toBe(false);
    expect(subRes.rows[0].submit_decision.status).toBe("expired");
  });

  it("revoked & superseded tokens: revoking token or republishing v2 revokes v1 token", async () => {
    // 1. Create & publish v1
    const crRes = await db.query<{ id: string }>(
      `insert into public.change_requests (
        project_id, title, description, pricing_method, cost_minor, status, created_by
      ) values ($1, $2, $3, 'fixed', 800000, 'draft', $4) returning id`,
      [projectId, "Multi-version Proposal Test", "Revision testing", ownerId]
    );
    const crId = crRes.rows[0].id;

    const token1 = generateApprovalToken(14);
    await db.query(`select auth.set_mock_user($1::uuid)`, [ownerId]);
    await db.query(
      `select public.publish_change_request($1, $2, $3)`,
      [crId, token1.tokenHash, token1.expiresAt.toISOString()]
    );

    // Verify v1 is valid
    const v1Active = await db.query<{ get_proposal_by_token: Record<string, unknown> }>(
      `select public.get_proposal_by_token($1) as get_proposal_by_token`,
      [token1.tokenHash]
    );
    expect(v1Active.rows[0].get_proposal_by_token.status).toBe("valid");

    // 2. Revise proposal (revokes token1, reverts to draft)
    await db.query(`select public.revise_change_request($1)`, [crId]);

    // get_proposal_by_token on token1 now returns revoked
    const v1Revoked = await db.query<{ get_proposal_by_token: Record<string, unknown> }>(
      `select public.get_proposal_by_token($1) as get_proposal_by_token`,
      [token1.tokenHash]
    );
    expect(v1Revoked.rows[0].get_proposal_by_token.status).toBe("revoked");

    // 3. Republish as v2 with token2
    const token2 = generateApprovalToken(14);
    await db.query(
      `select public.publish_change_request($1, $2, $3)`,
      [crId, token2.tokenHash, token2.expiresAt.toISOString()]
    );

    // Token 2 is valid
    const v2Active = await db.query<{ get_proposal_by_token: Record<string, unknown> }>(
      `select public.get_proposal_by_token($1) as get_proposal_by_token`,
      [token2.tokenHash]
    );
    expect(v2Active.rows[0].get_proposal_by_token.status).toBe("valid");
    expect(v2Active.rows[0].get_proposal_by_token.version_number).toBe(2);

    // Old Token 1 remains revoked / superseded
    const v1Check = await db.query<{ get_proposal_by_token: Record<string, unknown> }>(
      `select public.get_proposal_by_token($1) as get_proposal_by_token`,
      [token1.tokenHash]
    );
    expect(v1Check.rows[0].get_proposal_by_token.status).toBe("revoked");
  });
});

