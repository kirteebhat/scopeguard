import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import * as fs from "fs";
import * as path from "path";
import { generateApprovalToken, hashApprovalToken } from "@/lib/server/tokens";

describe("Change Request Publishing, Versioning & Token Lifecycle Integration Suite", () => {
  let db: PGlite;

  // Workspace A Users
  const ownerAId = "11111111-1111-1111-1111-111111111111";
  const managerAId = "22222222-2222-2222-2222-222222222222";
  const memberAId = "33333333-3333-3333-3333-333333333333";

  // Workspace B User (Multi-tenant rival)
  const rivalOwnerBId = "44444444-4444-4444-4444-444444444444";

  let workspaceAId: string;
  let workspaceBId: string;
  let projectAId: string;
  let projectBId: string;
  let deliverableAId: string;

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

    // 2. Load and execute migrations in sequence
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

    // 3. Populate Auth Users & Workspaces
    await db.query(`insert into auth.users (id, email) values ($1, $2)`, [
      ownerAId,
      "owner-a@agency.dev",
    ]);
    await db.query(`insert into auth.users (id, email) values ($1, $2)`, [
      managerAId,
      "manager-a@agency.dev",
    ]);
    await db.query(`insert into auth.users (id, email) values ($1, $2)`, [
      memberAId,
      "member-a@agency.dev",
    ]);
    await db.query(`insert into auth.users (id, email) values ($1, $2)`, [
      rivalOwnerBId,
      "owner-b@rival.dev",
    ]);

    // Provision Workspace A
    await db.exec(`select auth.set_mock_user('${ownerAId}');`);
    const wsARes = await db.query<{ create_workspace: { id: string } }>(
      `select public.create_workspace('Apex Agency') as create_workspace;`
    );
    workspaceAId = wsARes.rows[0].create_workspace.id;

    // Add manager & member to Workspace A
    await db.query(
      `insert into public.workspace_members (workspace_id, user_id, role) values ($1, $2, 'manager')`,
      [workspaceAId, managerAId]
    );
    await db.query(
      `insert into public.workspace_members (workspace_id, user_id, role) values ($1, $2, 'member')`,
      [workspaceAId, memberAId]
    );

    // Provision Workspace B
    await db.exec(`select auth.set_mock_user('${rivalOwnerBId}');`);
    const wsBRes = await db.query<{ create_workspace: { id: string } }>(
      `select public.create_workspace('Rival Agency') as create_workspace;`
    );
    workspaceBId = wsBRes.rows[0].create_workspace.id;

    // Create Project A in Workspace A
    await db.exec(`select auth.set_mock_user('${ownerAId}');`);
    const projARes = await db.query<{ id: string }>(
      `insert into public.projects (
        workspace_id, name, client_name, currency, budget_minor, hourly_rate_minor, start_date, original_deadline, created_by
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning id`,
      [workspaceAId, "Enterprise Platform", "Acme Global", "USD", 10000000, 17500, "2026-06-01", "2026-12-01", ownerAId]
    );
    projectAId = projARes.rows[0].id;

    const delivARes = await db.query<{ id: string }>(
      `insert into public.deliverables (project_id, title)
       values ($1, $2) returning id`,
      [projectAId, "Backend Microservices"]
    );
    deliverableAId = delivARes.rows[0].id;

    // Create Project B in Workspace B
    await db.exec(`select auth.set_mock_user('${rivalOwnerBId}');`);
    const projBRes = await db.query<{ id: string }>(
      `insert into public.projects (
        workspace_id, name, client_name, currency, budget_minor, hourly_rate_minor, start_date, original_deadline, created_by
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning id`,
      [workspaceBId, "Rival App", "Client B", "EUR", 5000000, 15000, "2026-07-01", "2026-11-01", rivalOwnerBId]
    );
    projectBId = projBRes.rows[0].id;
  }, 30000);

  it("executes complete lifecycle: publish v1 -> token authorizes -> revise -> token revoked -> publish v2 -> regenerate token -> withdraw terminal lock", async () => {
    // 1. Create initial draft as workspace owner
    await db.exec(`select auth.set_mock_user('${ownerAId}');`);
    const draftRes = await db.query<{ id: string }>(
      `insert into public.change_requests (
        project_id, affected_deliverable_id, title, description, reason,
        pricing_method, estimated_hours, hourly_rate_minor, cost_minor,
        proposed_deadline, internal_notes, created_by
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      returning id`,
      [
        projectAId,
        deliverableAId,
        "Single Sign-On Integration",
        "Add Okta and Azure AD SAML SSO providers",
        "Client enterprise IT requirement",
        "hourly",
        20.0,
        17500, // $175.00/hr
        350000, // $3,500.00
        "2026-12-15",
        "Confidential margin: subcontractor cost is $100/hr",
        ownerAId,
      ]
    );
    const crId = draftRes.rows[0].id;

    // 2. Publish draft -> creates Version 1
    const token1 = generateApprovalToken(14);
    expect(token1.rawToken).toHaveLength(43);
    expect(token1.tokenHash).toHaveLength(64);

    const publish1Res = await db.query<{
      publish_change_request: {
        success: boolean;
        version_id: string;
        version_number: number;
        status: string;
      };
    }>(
      `select public.publish_change_request($1, $2, $3) as publish_change_request;`,
      [crId, token1.tokenHash, token1.expiresAt.toISOString()]
    );
    const pub1Data = publish1Res.rows[0].publish_change_request;
    expect(pub1Data.success).toBe(true);
    expect(pub1Data.version_number).toBe(1);
    expect(pub1Data.status).toBe("pending_approval");

    // Verify token 1 authorizes via public get_proposal_by_token
    const prop1Res = await db.query<{
      get_proposal_by_token: {
        status: string;
        version_id: string;
        version_number: number;
        snapshot: {
          title: string;
          cost_minor: number;
          internal_notes?: unknown;
        };
      };
    }>(
      `select public.get_proposal_by_token($1) as get_proposal_by_token;`,
      [token1.tokenHash]
    );
    const prop1 = prop1Res.rows[0].get_proposal_by_token;
    expect(prop1.status).toBe("valid");
    expect(prop1.version_number).toBe(1);
    expect(prop1.snapshot.title).toBe("Single Sign-On Integration");
    expect(prop1.snapshot.cost_minor).toBe(350000);
    // Security invariant: Internal notes must NEVER be leaked in proposal snapshot
    expect(prop1.snapshot.internal_notes).toBeUndefined();

    // 3. Revise proposal -> revokes active token 1 and returns to draft
    const reviseRes = await db.query<{
      revise_change_request: {
        success: boolean;
        status: string;
      };
    }>(
      `select public.revise_change_request($1) as revise_change_request;`,
      [crId]
    );
    expect(reviseRes.rows[0].revise_change_request.success).toBe(true);
    expect(reviseRes.rows[0].revise_change_request.status).toBe("draft");

    // Verify change_requests status reverted to draft
    const crCheckDraft = await db.query<{ status: string }>(
      `select status from public.change_requests where id = $1`,
      [crId]
    );
    expect(crCheckDraft.rows[0].status).toBe("draft");

    // Verify Token 1 is now REVOKED and no longer authorizes
    const prop1Revoked = await db.query<{
      get_proposal_by_token: { status: string; message: string };
    }>(
      `select public.get_proposal_by_token($1) as get_proposal_by_token;`,
      [token1.tokenHash]
    );
    expect(prop1Revoked.rows[0].get_proposal_by_token.status).toBe("revoked");
    expect(prop1Revoked.rows[0].get_proposal_by_token.message).toMatch(/revoked/i);

    // 4. Update draft details as manager
    await db.exec(`select auth.set_mock_user('${managerAId}');`);
    await db.query(
      `update public.change_requests
       set title = 'Single Sign-On & SCIM Provisioning',
           cost_minor = 450000,
           estimated_hours = 25.0
       where id = $1`,
      [crId]
    );

    // 5. Republish -> creates Version 2 with new token 2
    const token2 = generateApprovalToken(14);
    const publish2Res = await db.query<{
      publish_change_request: {
        success: boolean;
        version_id: string;
        version_number: number;
        status: string;
      };
    }>(
      `select public.publish_change_request($1, $2, $3) as publish_change_request;`,
      [crId, token2.tokenHash, token2.expiresAt.toISOString()]
    );
    const pub2Data = publish2Res.rows[0].publish_change_request;
    expect(pub2Data.success).toBe(true);
    expect(pub2Data.version_number).toBe(2);
    expect(pub2Data.status).toBe("pending_approval");

    // Verify token 2 authorizes Version 2
    const prop2Res = await db.query<{
      get_proposal_by_token: {
        status: string;
        version_number: number;
        snapshot: { title: string; cost_minor: number };
      };
    }>(
      `select public.get_proposal_by_token($1) as get_proposal_by_token;`,
      [token2.tokenHash]
    );
    const prop2 = prop2Res.rows[0].get_proposal_by_token;
    expect(prop2.status).toBe("valid");
    expect(prop2.version_number).toBe(2);
    expect(prop2.snapshot.title).toBe("Single Sign-On & SCIM Provisioning");
    expect(prop2.snapshot.cost_minor).toBe(450000);

    // Verify Token 1 STILL fails (cannot approve version 2)
    const prop1StillRevoked = await db.query<{
      get_proposal_by_token: { status: string };
    }>(
      `select public.get_proposal_by_token($1) as get_proposal_by_token;`,
      [token1.tokenHash]
    );
    expect(prop1StillRevoked.rows[0].get_proposal_by_token.status).toBe("revoked");

    // 6. Regenerate approval token -> revokes token 2 and activates token 3 without bumping version
    const token3 = generateApprovalToken(14);
    const regenRes = await db.query<{
      regenerate_approval_token: {
        success: boolean;
        version_number: number;
      };
    }>(
      `select public.regenerate_approval_token($1, $2, $3) as regenerate_approval_token;`,
      [crId, token3.tokenHash, token3.expiresAt.toISOString()]
    );
    expect(regenRes.rows[0].regenerate_approval_token.success).toBe(true);
    expect(regenRes.rows[0].regenerate_approval_token.version_number).toBe(2);

    // Token 3 now authorizes Version 2
    const prop3Res = await db.query<{
      get_proposal_by_token: { status: string; version_number: number };
    }>(
      `select public.get_proposal_by_token($1) as get_proposal_by_token;`,
      [token3.tokenHash]
    );
    expect(prop3Res.rows[0].get_proposal_by_token.status).toBe("valid");
    expect(prop3Res.rows[0].get_proposal_by_token.version_number).toBe(2);

    // Token 2 is now REVOKED
    const prop2Revoked = await db.query<{
      get_proposal_by_token: { status: string };
    }>(
      `select public.get_proposal_by_token($1) as get_proposal_by_token;`,
      [token2.tokenHash]
    );
    expect(prop2Revoked.rows[0].get_proposal_by_token.status).toBe("revoked");

    // 7. Withdraw proposal -> sets terminal status 'withdrawn' and revokes active token
    const withdrawRes = await db.query<{
      withdraw_change_request: {
        success: boolean;
        status: string;
      };
    }>(
      `select public.withdraw_change_request($1) as withdraw_change_request;`,
      [crId]
    );
    expect(withdrawRes.rows[0].withdraw_change_request.success).toBe(true);
    expect(withdrawRes.rows[0].withdraw_change_request.status).toBe("withdrawn");

    // Verify token 3 is now revoked
    const prop3Revoked = await db.query<{
      get_proposal_by_token: { status: string };
    }>(
      `select public.get_proposal_by_token($1) as get_proposal_by_token;`,
      [token3.tokenHash]
    );
    expect(prop3Revoked.rows[0].get_proposal_by_token.status).toBe("revoked");

    // Verify terminal locking: cannot publish or revise withdrawn proposal
    await expect(
      db.query(`select public.publish_change_request($1, $2, $3);`, [
        crId,
        token3.tokenHash,
        token3.expiresAt.toISOString(),
      ])
    ).rejects.toThrow(/Only drafts can be published/);

    await expect(
      db.query(`select public.revise_change_request($1);`, [crId])
    ).rejects.toThrow(/Only pending proposals can be revised/);
  });

  it("enforces role security: members cannot publish, revise, regenerate or withdraw proposals", async () => {
    // 1. Create draft as owner
    await db.exec(`select auth.set_mock_user('${ownerAId}');`);
    const draftRes = await db.query<{ id: string }>(
      `insert into public.change_requests (
        project_id, title, description, pricing_method, cost_minor, created_by
      ) values ($1, $2, $3, $4, $5, $6) returning id`,
      [projectAId, "Member Permission Test", "Test permissions", "fixed", 100000, ownerAId]
    );
    const crId = draftRes.rows[0].id;
    const testToken = generateApprovalToken();

    // 2. Switch to member role
    await db.exec(`select auth.set_mock_user('${memberAId}');`);

    // Member cannot publish
    await expect(
      db.query(`select public.publish_change_request($1, $2, $3);`, [
        crId,
        testToken.tokenHash,
        testToken.expiresAt.toISOString(),
      ])
    ).rejects.toThrow(/Only owners and managers can publish proposals/);

    // Switch back to owner to publish
    await db.exec(`select auth.set_mock_user('${ownerAId}');`);
    await db.query(`select public.publish_change_request($1, $2, $3);`, [
      crId,
      testToken.tokenHash,
      testToken.expiresAt.toISOString(),
    ]);

    // Switch back to member
    await db.exec(`select auth.set_mock_user('${memberAId}');`);

    // Member cannot revise
    await expect(
      db.query(`select public.revise_change_request($1);`, [crId])
    ).rejects.toThrow(/Only owners and managers can revise proposals/);

    // Member cannot regenerate link
    const freshToken = generateApprovalToken();
    await expect(
      db.query(`select public.regenerate_approval_token($1, $2, $3);`, [
        crId,
        freshToken.tokenHash,
        freshToken.expiresAt.toISOString(),
      ])
    ).rejects.toThrow(/Only owners and managers can regenerate proposal links/);

    // Member cannot withdraw
    await expect(
      db.query(`select public.withdraw_change_request($1);`, [crId])
    ).rejects.toThrow(/Only owners and managers can withdraw proposals/);
  });

  it("enforces multi-tenant cross-workspace isolation", async () => {
    // 1. Owner B attempts to publish Owner A's proposal
    await db.exec(`select auth.set_mock_user('${ownerAId}');`);
    const draftRes = await db.query<{ id: string }>(
      `insert into public.change_requests (
        project_id, title, description, pricing_method, cost_minor, created_by
      ) values ($1, $2, $3, $4, $5, $6) returning id`,
      [projectAId, "Cross Workspace CR", "Isolation test", "fixed", 50000, ownerAId]
    );
    const crId = draftRes.rows[0].id;
    const testToken = generateApprovalToken();

    // Switch to rival owner B
    await db.exec(`select auth.set_mock_user('${rivalOwnerBId}');`);

    await expect(
      db.query(`select public.publish_change_request($1, $2, $3);`, [
        crId,
        testToken.tokenHash,
        testToken.expiresAt.toISOString(),
      ])
    ).rejects.toThrow(/You do not belong to the workspace for this project/);
  });
});
