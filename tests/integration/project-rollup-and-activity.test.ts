import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import * as fs from "fs";
import * as path from "path";
import { generateApprovalToken } from "@/lib/server/tokens";
import { calculateProjectRollup } from "@/lib/domain/impact";

describe("Project Rollup Metrics & Activity Audit Trail Integration Suite", () => {
  let db: PGlite;

  const ownerId = "11111111-2222-3333-4444-555555555555";
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
      "director@strata.design",
    ]);

    await db.query(`select auth.set_mock_user($1::uuid)`, [ownerId]);

    const wsRes = await db.query<{ create_workspace: { id: string } }>(
      `select public.create_workspace('Strata Interactive') as create_workspace;`
    );
    workspaceId = wsRes.rows[0].create_workspace.id;

    // Create Initial Project
    const projRes = await db.query<{ id: string }>(
      `insert into public.projects (
        workspace_id, name, client_name, currency, budget_minor, hourly_rate_minor,
        start_date, original_deadline, created_by
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning id`,
      [
        workspaceId,
        "OmniChannel Commerce Platform",
        "Meridian Brands Group",
        "USD",
        10000000, // $100,000.00 baseline
        20000, // $200.00/hr
        "2026-10-01",
        "2027-01-01",
        ownerId,
      ]
    );
    projectId = projRes.rows[0].id;
  });

  /**
   * Helper function that queries real PostgreSQL database rows and calculates
   * the project rollup using calculateProjectRollup from lib/domain/impact.
   */
  async function getDbProjectRollup(pId: string) {
    // 1. Fetch project baseline
    const projRes = await db.query<{
      id: string;
      name: string;
      currency: string;
      budget_minor: number;
      original_deadline: unknown;
    }>(
      `select id, name, currency, budget_minor, original_deadline from public.projects where id = $1`,
      [pId]
    );
    const p = projRes.rows[0];

    const toDateStr = (val: unknown): string | null => {
      if (!val) return null;
      if (val instanceof Date) return val.toISOString().split("T")[0];
      return String(val).split("T")[0];
    };

    // 2. Fetch approved version snapshots (ONLY where approvals.decision = 'approved')
    const approvedRes = await db.query<{
      version_id: string;
      change_request_id: string;
      version_number: number;
      cost_minor: number;
      currency: string;
      proposed_deadline: unknown;
      decided_at: string;
    }>(
      `select
        v.id as version_id,
        v.change_request_id,
        v.version_number,
        v.cost_minor,
        v.currency,
        v.proposed_deadline,
        a.decided_at
      from public.change_request_versions v
      join public.approvals a on a.version_id = v.id
      join public.change_requests cr on cr.id = v.change_request_id
      where cr.project_id = $1 and a.decision = 'approved'`,
      [pId]
    );

    // 3. Fetch pending proposals
    const pendingRes = await db.query<{
      id: string;
      cost_minor: number;
      currency: string;
      proposed_deadline: unknown;
    }>(
      `select cr.id, cr.cost_minor, p.currency, cr.proposed_deadline
       from public.change_requests cr
       join public.projects p on p.id = cr.project_id
       where cr.project_id = $1 and cr.status = 'pending_approval'`,
      [pId]
    );

    const approvedSnapshots = approvedRes.rows.map((r) => ({
      versionId: r.version_id,
      changeRequestId: r.change_request_id,
      versionNumber: r.version_number,
      costMinor: Number(r.cost_minor),
      currency: r.currency,
      proposedDeadline: toDateStr(r.proposed_deadline),
      approvedAt: r.decided_at,
    }));

    const pendingSnapshots = pendingRes.rows.map((r) => ({
      changeRequestId: r.id,
      costMinor: Number(r.cost_minor),
      currency: r.currency,
      proposedDeadline: toDateStr(r.proposed_deadline),
    }));

    return calculateProjectRollup(
      {
        id: p.id,
        name: p.name,
        currency: p.currency,
        budgetMinor: Number(p.budget_minor),
        originalDeadline: toDateStr(p.original_deadline)!,
      },
      approvedSnapshots,
      pendingSnapshots
    );
  }

  it("1. Baseline project state: approved extra is 0, revised total equals baseline budget", async () => {
    const rollup = await getDbProjectRollup(projectId);

    expect(rollup.originalBudgetMinor).toBe(10000000); // $100,000.00
    expect(rollup.approvedExtraMinor).toBe(0);
    expect(rollup.revisedBudgetMinor).toBe(10000000); // $100,000.00
    expect(rollup.pendingExtraMinor).toBe(0);
    expect(rollup.approvedVersionsCount).toBe(0);
    expect(rollup.originalDeadline).toBe("2027-01-01");
    expect(rollup.revisedDeadline).toBe("2027-01-01");
    expect(rollup.deltaDays).toBe(0);
  });

  it("2. Creating a working draft does NOT affect approved totals", async () => {
    const crRes = await db.query<{ id: string }>(
      `insert into public.change_requests (
        project_id, title, description, pricing_method, estimated_hours,
        hourly_rate_minor, cost_minor, proposed_deadline, internal_notes, status, created_by
      ) values ($1, $2, $3, 'hourly', 25.0, 20000, 500000, '2027-02-15', 'Internal draft note', 'draft', $4) returning id`,
      [
        projectId,
        "Custom ERP Integrations",
        "Bi-directional inventory sync with SAP",
        ownerId,
      ]
    );
    const crId = crRes.rows[0].id;

    const rollup = await getDbProjectRollup(projectId);
    // Drafts do not affect approved totals or pending estimates (draft is unsubmitted)
    expect(rollup.approvedExtraMinor).toBe(0);
    expect(rollup.revisedBudgetMinor).toBe(10000000);
    expect(rollup.pendingExtraMinor).toBe(0);
    expect(rollup.revisedDeadline).toBe("2027-01-01");

    // Clean up draft for next test
    await db.query(`delete from public.change_requests where id = $1`, [crId]);
  });

  it("3. Approving a change request updates approved extra and revised total EXACTLY ONCE", async () => {
    // 1. Create Change Request 1: $15,000.00, proposed deadline: 2027-02-01 (+31 days)
    const crRes = await db.query<{ id: string }>(
      `insert into public.change_requests (
        project_id, title, description, pricing_method, cost_minor, proposed_deadline, status, created_by
      ) values ($1, 'Payment Gateway Multi-Currency', 'Stripe + Adyen support', 'fixed', 1500000, '2027-02-01', 'draft', $2) returning id`,
      [projectId, ownerId]
    );
    const cr1Id = crRes.rows[0].id;

    // 2. Publish Change Request
    const token = generateApprovalToken(14);
    await db.query(`select auth.set_mock_user($1::uuid)`, [ownerId]);
    await db.query(`select public.publish_change_request($1, $2, $3)`, [
      cr1Id,
      token.tokenHash,
      token.expiresAt.toISOString(),
    ]);

    // While in pending_approval: shows in pendingExtraMinor, but NOT in approvedExtraMinor
    const pendingRollup = await getDbProjectRollup(projectId);
    expect(pendingRollup.approvedExtraMinor).toBe(0);
    expect(pendingRollup.revisedBudgetMinor).toBe(10000000);
    expect(pendingRollup.pendingExtraMinor).toBe(1500000); // $15,000.00
    expect(pendingRollup.revisedDeadline).toBe("2027-01-01");

    // 3. Client approves Change Request
    const auditMeta = JSON.stringify({ ip_hash: "hash_client_1", user_agent: "Safari 16" });
    const subRes = await db.query<{ submit_decision: Record<string, unknown> }>(
      `select public.submit_decision($1, 'approved', 'Client VP Technology', $2::jsonb) as submit_decision`,
      [token.tokenHash, auditMeta]
    );
    expect(subRes.rows[0].submit_decision.success).toBe(true);

    // 4. Inspect rollup after approval
    const approvedRollup = await getDbProjectRollup(projectId);
    expect(approvedRollup.originalBudgetMinor).toBe(10000000); // $100,000.00
    expect(approvedRollup.approvedExtraMinor).toBe(1500000); // +$15,000.00
    expect(approvedRollup.revisedBudgetMinor).toBe(11500000); // $115,000.00
    expect(approvedRollup.pendingExtraMinor).toBe(0); // No longer pending
    expect(approvedRollup.approvedVersionsCount).toBe(1);
    expect(approvedRollup.originalDeadline).toBe("2027-01-01");
    expect(approvedRollup.revisedDeadline).toBe("2027-02-01");
    expect(approvedRollup.deltaDays).toBe(31);

    // 5. Query multiple times: verify numbers NEVER drift or double count
    const secondCheck = await getDbProjectRollup(projectId);
    expect(secondCheck.approvedExtraMinor).toBe(1500000);
    expect(secondCheck.revisedBudgetMinor).toBe(11500000);
    expect(secondCheck.approvedVersionsCount).toBe(1);
  });

  it("4. Rejected and Withdrawn change requests do NOT alter approved project totals", async () => {
    // 1. Create and Reject Change Request 2: $8,000.00, deadline: 2027-03-01
    const cr2Res = await db.query<{ id: string }>(
      `insert into public.change_requests (
        project_id, title, description, pricing_method, cost_minor, proposed_deadline, status, created_by
      ) values ($1, 'AI Search Recommendation Engine', 'Vector search embeddings', 'fixed', 800000, '2027-03-01', 'draft', $2) returning id`,
      [projectId, ownerId]
    );
    const cr2Id = cr2Res.rows[0].id;

    const token2 = generateApprovalToken(14);
    await db.query(`select public.publish_change_request($1, $2, $3)`, [
      cr2Id,
      token2.tokenHash,
      token2.expiresAt.toISOString(),
    ]);

    // Client rejects Change Request 2
    const sub2Res = await db.query<{ submit_decision: Record<string, unknown> }>(
      `select public.submit_decision($1, 'rejected', 'Client VP Marketing', '{}'::jsonb) as submit_decision`,
      [token2.tokenHash]
    );
    expect(sub2Res.rows[0].submit_decision.success).toBe(true);
    expect(sub2Res.rows[0].submit_decision.status).toBe("rejected");

    // 2. Create and Withdraw Change Request 3: $12,000.00, deadline: 2027-04-01
    const cr3Res = await db.query<{ id: string }>(
      `insert into public.change_requests (
        project_id, title, description, pricing_method, cost_minor, proposed_deadline, status, created_by
      ) values ($1, 'Legacy Mainframe Batch Importer', 'Cobol batch connector', 'fixed', 1200000, '2027-04-01', 'draft', $2) returning id`,
      [projectId, ownerId]
    );
    const cr3Id = cr3Res.rows[0].id;

    const token3 = generateApprovalToken(14);
    await db.query(`select public.publish_change_request($1, $2, $3)`, [
      cr3Id,
      token3.tokenHash,
      token3.expiresAt.toISOString(),
    ]);

    // Agency withdraws Change Request 3
    const withdrawRes = await db.query<{ withdraw_change_request: Record<string, unknown> }>(
      `select public.withdraw_change_request($1) as withdraw_change_request`,
      [cr3Id]
    );
    expect(withdrawRes.rows[0].withdraw_change_request.status).toBe("withdrawn");

    // 3. Inspect project rollup: Neither rejected nor withdrawn changed approved metrics
    const finalRollup = await getDbProjectRollup(projectId);
    expect(finalRollup.originalBudgetMinor).toBe(10000000); // $100,000.00
    expect(finalRollup.approvedExtraMinor).toBe(1500000); // STILL only the 1 approved change ($15,000.00)
    expect(finalRollup.revisedBudgetMinor).toBe(11500000);
    expect(finalRollup.pendingExtraMinor).toBe(0);
    expect(finalRollup.approvedVersionsCount).toBe(1);
    expect(finalRollup.revisedDeadline).toBe("2027-02-01"); // STILL 2027-02-01 (not extended to March or April)
  });

  it("5. Mutating working draft columns on change_requests table cannot alter approved totals because rollups read exclusively from immutable version snapshots", async () => {
    // Locate approved change request
    const approvedCr = await db.query<{ id: string }>(
      `select id from public.change_requests where project_id = $1 and status = 'approved' limit 1`,
      [projectId]
    );
    const crId = approvedCr.rows[0].id;

    // Direct malicious or accidental update on mutable draft columns
    await db.query(
      `update public.change_requests set cost_minor = 999999999, proposed_deadline = '2030-12-31' where id = $1`,
      [crId]
    );

    // Verify rollup STILL reads from the immutable version snapshot!
    const rollup = await getDbProjectRollup(projectId);
    expect(rollup.approvedExtraMinor).toBe(1500000); // Exactly $15,000.00 from version snapshot
    expect(rollup.revisedBudgetMinor).toBe(11500000);
    expect(rollup.revisedDeadline).toBe("2027-02-01"); // Preserved from version snapshot
    expect(rollup.revisedDeadline).not.toBe("2030-12-31");
  });

  it("6. Every meaningful action writes to activity_logs with strictly sanitized metadata", async () => {
    const logs = await db.query<{
      action: string;
      actor_type: string;
      actor_name: string | null;
      metadata: Record<string, unknown>;
    }>(
      `select action, actor_type, actor_name, metadata
       from public.activity_logs
       where workspace_id = $1
       order by created_at desc`,
      [workspaceId]
    );

    const actionList = logs.rows.map((l) => l.action);

    // Verify presence of all meaningful actions
    expect(actionList).toContain("change_request_published");
    expect(actionList).toContain("change_request_approved");
    expect(actionList).toContain("change_request_rejected");
    expect(actionList).toContain("change_request_withdrawn");

    // Verify safe metadata invariant: NO raw tokens, NO passwords, NO full IPs, NO internal notes
    for (const log of logs.rows) {
      const metaStr = JSON.stringify(log.metadata).toLowerCase();
      expect(metaStr).not.toContain("rawtoken");
      expect(metaStr).not.toContain("internal_note");
      expect(metaStr).not.toContain("password");
      expect(metaStr).not.toContain("client_ip");

      // When client decided, actor_type is client_link and actor_name is preserved
      if (log.action === "change_request_approved") {
        expect(log.actor_type).toBe("client_link");
        expect(log.actor_name).toBe("Client VP Technology");
      }
      if (log.action === "change_request_rejected") {
        expect(log.actor_type).toBe("client_link");
        expect(log.actor_name).toBe("Client VP Marketing");
      }
    }
  });
});
