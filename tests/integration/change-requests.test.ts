import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import * as fs from "fs";
import * as path from "path";

describe("Change Requests Database Integration & State Invariants", () => {
  let db: PGlite;
  const ownerAId = "11111111-1111-1111-1111-111111111111";
  const ownerBId = "22222222-2222-2222-2222-222222222222";
  let workspaceAId: string;
  let workspaceBId: string;
  let projectAId: string;
  let projectBId: string;
  let deliverableAId: string;
  let deliverableBId: string;

  beforeAll(async () => {
    db = new PGlite();

    // Setup mock auth schema
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

    // Apply migrations
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

    // Create user A and workspace A
    await db.query(`insert into auth.users (id, email) values ($1, $2)`, [
      ownerAId,
      "owner-a@studio.dev",
    ]);
    await db.exec(`select auth.set_mock_user('${ownerAId}');`);
    const wsARes = await db.query<{ create_workspace: { id: string } }>(
      `select public.create_workspace('Studio A') as create_workspace;`
    );
    workspaceAId = wsARes.rows[0].create_workspace.id;

    // Create user B and workspace B
    await db.query(`insert into auth.users (id, email) values ($1, $2)`, [
      ownerBId,
      "owner-b@rival.dev",
    ]);
    await db.exec(`select auth.set_mock_user('${ownerBId}');`);
    const wsBRes = await db.query<{ create_workspace: { id: string } }>(
      `select public.create_workspace('Studio B') as create_workspace;`
    );
    workspaceBId = wsBRes.rows[0].create_workspace.id;

    // Switch back to owner A to create Project A & Deliverable A
    await db.exec(`select auth.set_mock_user('${ownerAId}');`);
    const projARes = await db.query<{ id: string }>(
      `insert into public.projects (
        workspace_id, name, client_name, currency, budget_minor, hourly_rate_minor, start_date, original_deadline, created_by
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning id`,
      [workspaceAId, "Web Platform", "Client A", "USD", 5000000, 15000, "2026-06-01", "2026-10-01", ownerAId]
    );
    projectAId = projARes.rows[0].id;

    const delivARes = await db.query<{ id: string }>(
      `insert into public.deliverables (project_id, title)
       values ($1, $2) returning id`,
      [projectAId, "Sprint 1 Deliverable"]
    );
    deliverableAId = delivARes.rows[0].id;

    // Switch to owner B to create Project B & Deliverable B
    await db.exec(`select auth.set_mock_user('${ownerBId}');`);
    const projBRes = await db.query<{ id: string }>(
      `insert into public.projects (
        workspace_id, name, client_name, currency, budget_minor, hourly_rate_minor, start_date, original_deadline, created_by
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning id`,
      [workspaceBId, "Rival App", "Client B", "EUR", 8000000, 17500, "2026-07-01", "2026-11-01", ownerBId]
    );
    projectBId = projBRes.rows[0].id;

    const delivBRes = await db.query<{ id: string }>(
      `insert into public.deliverables (project_id, title)
       values ($1, $2) returning id`,
      [projectBId, "Rival Deliverable"]
    );
    deliverableBId = delivBRes.rows[0].id;
  }, 30000);

  it("creates a working draft change request with integer minor units", async () => {
    await db.exec(`select auth.set_mock_user('${ownerAId}');`);

    const res = await db.query<{
      id: string;
      title: string;
      status: string;
      current_version: number | null;
      cost_minor: number;
      hourly_rate_minor: number;
      pricing_method: string;
      reason: string;
    }>(
      `insert into public.change_requests (
        project_id, affected_deliverable_id, title, description, reason,
        pricing_method, estimated_hours, hourly_rate_minor, cost_minor,
        proposed_deadline, internal_notes, created_by
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      returning id, title, status, current_version, cost_minor, hourly_rate_minor, pricing_method, reason`,
      [
        projectAId,
        deliverableAId,
        "OAuth2 Authentication Flow",
        "Add Google & GitHub OAuth SSO providers",
        "Client requested single sign-on",
        "hourly",
        12.5,
        15000, // $150.00
        187500, // $1,875.00
        "2026-10-15",
        "Internal notes: keep confidential",
        ownerAId,
      ]
    );

    const cr = res.rows[0];
    expect(cr.id).toBeDefined();
    expect(cr.status).toBe("draft");
    expect(cr.current_version).toBeNull();
    expect(cr.cost_minor).toBe(187500);
    expect(cr.hourly_rate_minor).toBe(15000);
    expect(cr.pricing_method).toBe("hourly");
    expect(cr.reason).toBe("Client requested single sign-on");
  });

  it("enforces check constraint: cost_minor must be non-negative", async () => {
    await db.exec(`select auth.set_mock_user('${ownerAId}');`);

    await expect(
      db.query(
        `insert into public.change_requests (
          project_id, title, description, pricing_method, cost_minor, created_by
        ) values ($1, $2, $3, $4, $5, $6)`,
        [projectAId, "Negative Cost", "Invalid charge amount", "fixed", -5000, ownerAId]
      )
    ).rejects.toThrow();
  });

  it("enforces check constraint: pricing_method must be hourly or fixed", async () => {
    await db.exec(`select auth.set_mock_user('${ownerAId}');`);

    await expect(
      db.query(
        `insert into public.change_requests (
          project_id, title, description, pricing_method, cost_minor, created_by
        ) values ($1, $2, $3, $4, $5, $6)`,
        [projectAId, "Invalid Method", "Invalid method", "subscription", 10000, ownerAId]
      )
    ).rejects.toThrow();
  });

  it("publishes change request, creates immutable version snapshot, and blocks mutation on versions", async () => {
    await db.exec(`select auth.set_mock_user('${ownerAId}');`);

    // Create a draft
    const insertRes = await db.query<{ id: string }>(
      `insert into public.change_requests (
        project_id, title, description, pricing_method, estimated_hours, hourly_rate_minor, cost_minor, created_by
      ) values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
      [projectAId, "Audit Log Feature", "Enterprise compliance logs", "hourly", 20, 15000, 300000, ownerAId]
    );
    const crId = insertRes.rows[0].id;

    // Call publish_change_request with a valid 64-char SHA-256 hex hash
    const validSha256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    const publishRes = await db.query<{
      publish_change_request: { version_id: string; version_number: number };
    }>(
      `select public.publish_change_request($1, $2, $3) as publish_change_request;`,
      [crId, validSha256, "2026-12-31T23:59:59Z"]
    );

    const publishData = publishRes.rows[0].publish_change_request;
    expect(publishData.version_number).toBe(1);
    expect(publishData.version_id).toBeDefined();

    // Verify change_requests table status updated to pending_approval and current_version = 1
    const crCheck = await db.query<{ status: string; current_version: number }>(
      `select status, current_version from public.change_requests where id = $1`,
      [crId]
    );
    expect(crCheck.rows[0].status).toBe("pending_approval");
    expect(crCheck.rows[0].current_version).toBe(1);

    // Verify change_request_versions has immutable snapshot
    const versionRes = await db.query<{
      id: string;
      version_number: number;
      snapshot: { title: string; cost_minor: number };
    }>(
      `select id, version_number, snapshot from public.change_request_versions where id = $1`,
      [publishData.version_id]
    );
    expect(versionRes.rows[0].version_number).toBe(1);
    expect(versionRes.rows[0].snapshot.title).toBe("Audit Log Feature");
    expect(versionRes.rows[0].snapshot.cost_minor).toBe(300000);

    // Verify trigger BLOCKS UPDATE on change_request_versions
    await expect(
      db.query(
        `update public.change_request_versions set version_number = 99 where id = $1`,
        [publishData.version_id]
      )
    ).rejects.toThrow(/change_request_versions cannot be modified or deleted/);

    // Verify trigger BLOCKS DELETE on change_request_versions
    await expect(
      db.query(
        `delete from public.change_request_versions where id = $1`,
        [publishData.version_id]
      )
    ).rejects.toThrow(/change_request_versions cannot be modified or deleted/);
  });
});
