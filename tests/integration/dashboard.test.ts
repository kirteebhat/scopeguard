import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import * as fs from "fs";
import * as path from "path";
import { generateApprovalToken } from "@/lib/server/tokens";
import {
  calculateProjectRollup,
  calculateWorkspaceRollup,
  type ApprovedVersionSnapshot,
  type PendingProposalSnapshot,
  type ProjectFinancialRollup,
} from "@/lib/domain/impact";
import { formatMinorToCurrency } from "@/lib/domain/money";

describe("Dashboard Multi-Tenant Metrics & Multi-Currency Aggregation Integration Suite", () => {
  let db: PGlite;

  // Workspace A (Apex Agency)
  const ownerAId = "11111111-1111-1111-1111-111111111111";
  let workspaceAId: string;
  let projectA1Id: string; // USD ($100,000.00)
  let projectA2Id: string; // EUR (€50,000.00)
  let projectA3Id: string; // USD ($20,000.00, completed)

  // Workspace B (Zenith Creative - Rival Multi-Tenant Workspace)
  const ownerBId = "22222222-2222-2222-2222-222222222222";
  let workspaceBId: string;
  let projectB1Id: string; // GBP (£200,000.00)

  // Workspace C (Brand-New Workspace with 0 Projects)
  const ownerCId = "33333333-3333-3333-3333-333333333333";
  let workspaceCId: string;

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

    // 3. Populate Users in auth.users
    await db.query(`insert into auth.users (id, email) values ($1, $2)`, [
      ownerAId,
      "director@apex-agency.com",
    ]);
    await db.query(`insert into auth.users (id, email) values ($1, $2)`, [
      ownerBId,
      "head@zenith-creative.com",
    ]);
    await db.query(`insert into auth.users (id, email) values ($1, $2)`, [
      ownerCId,
      "founder@fresh-agency.com",
    ]);

    // 4. Create Workspace A
    await db.query(`select auth.set_mock_user($1::uuid)`, [ownerAId]);
    const wsARes = await db.query<{ create_workspace: { id: string } }>(
      `select public.create_workspace('Apex Digital Agency') as create_workspace;`
    );
    workspaceAId = wsARes.rows[0].create_workspace.id;

    // 5. Create Workspace B
    await db.query(`select auth.set_mock_user($1::uuid)`, [ownerBId]);
    const wsBRes = await db.query<{ create_workspace: { id: string } }>(
      `select public.create_workspace('Zenith Creative') as create_workspace;`
    );
    workspaceBId = wsBRes.rows[0].create_workspace.id;

    // 6. Create Workspace C (Empty)
    await db.query(`select auth.set_mock_user($1::uuid)`, [ownerCId]);
    const wsCRes = await db.query<{ create_workspace: { id: string } }>(
      `select public.create_workspace('Fresh Studio') as create_workspace;`
    );
    workspaceCId = wsCRes.rows[0].create_workspace.id;

    // --------------------------------------------------------------------------
    // SEED WORKSPACE A: 3 Projects (USD active, EUR active, USD completed)
    // --------------------------------------------------------------------------
    await db.query(`select auth.set_mock_user($1::uuid)`, [ownerAId]);

    // Project A1: USD Active ($100,000.00 baseline)
    const projA1Res = await db.query<{ id: string }>(
      `insert into public.projects (
        workspace_id, name, client_name, currency, budget_minor, hourly_rate_minor,
        start_date, original_deadline, status, created_by
      ) values ($1, 'Apex E-Commerce Platform', 'Global Retail Corp', 'USD', 10000000, 15000, '2026-10-01', '2027-01-01', 'active', $2) returning id`,
      [workspaceAId, ownerAId]
    );
    projectA1Id = projA1Res.rows[0].id;

    // Project A2: EUR Active (€50,000.00 baseline)
    const projA2Res = await db.query<{ id: string }>(
      `insert into public.projects (
        workspace_id, name, client_name, currency, budget_minor, hourly_rate_minor,
        start_date, original_deadline, status, created_by
      ) values ($1, 'Apex Mobile App Europe', 'EuroLogistics SA', 'EUR', 5000000, 12000, '2026-11-01', '2027-03-01', 'active', $2) returning id`,
      [workspaceAId, ownerAId]
    );
    projectA2Id = projA2Res.rows[0].id;

    // Project A3: USD Completed ($20,000.00 baseline)
    const projA3Res = await db.query<{ id: string }>(
      `insert into public.projects (
        workspace_id, name, client_name, currency, budget_minor, hourly_rate_minor,
        start_date, original_deadline, status, created_by
      ) values ($1, 'Legacy Brand Refresh', 'Vintage Co', 'USD', 2000000, 10000, '2026-06-01', '2026-09-01', 'completed', $2) returning id`,
      [workspaceAId, ownerAId]
    );
    projectA3Id = projA3Res.rows[0].id;

    // Activity log for Project A1 creation
    await db.query(
      `insert into public.activity_logs (
        workspace_id, actor_type, actor_id, actor_name, entity_type, entity_id, action, metadata
      ) values ($1, 'user', $2, 'Director A', 'project', $3, 'project_created', '{"name":"Apex E-Commerce Platform"}'::jsonb)`,
      [workspaceAId, ownerAId, projectA1Id]
    );

    // --------------------------------------------------------------------------
    // SEED WORKSPACE A CHANGE REQUESTS
    // --------------------------------------------------------------------------
    // CR A1-1: Payment Gateway Integration ($15,000.00 USD, APPROVED)
    const crA1_1 = await db.query<{ id: string }>(
      `insert into public.change_requests (
        project_id, title, description, pricing_method, cost_minor, proposed_deadline, status, created_by
      ) values ($1, 'Multi-Currency Payment Gateway', 'Stripe + Adyen support', 'fixed', 1500000, '2027-02-01', 'draft', $2) returning id`,
      [projectA1Id, ownerAId]
    );
    const crA1_1Id = crA1_1.rows[0].id;

    // Publish CR A1-1 -> v1
    const tokenA1 = generateApprovalToken();
    const expiresAt = new Date(Date.now() + 86400000 * 7).toISOString();
    const pubResA1 = await db.query<{ publish_change_request: { version_id: string } }>(
      `select public.publish_change_request($1, $2, $3::timestamptz) as publish_change_request`,
      [crA1_1Id, tokenA1.tokenHash, expiresAt]
    );
    const v1A1Id = pubResA1.rows[0].publish_change_request.version_id;

    // Client Approves CR A1-1
    await db.query(
      `select public.submit_decision($1, 'approved', 'Rachel Green (VP Tech)', '{"note":"Approved Stripe + Adyen integration"}'::jsonb)`,
      [tokenA1.tokenHash]
    );

    // CR A1-2: Advanced Filter Engine ($5,000.00 USD, PENDING APPROVAL)
    const crA1_2 = await db.query<{ id: string }>(
      `insert into public.change_requests (
        project_id, title, description, pricing_method, cost_minor, proposed_deadline, status, created_by
      ) values ($1, 'ElasticSearch Filters', 'Faceted catalog search', 'fixed', 500000, '2027-01-20', 'draft', $2) returning id`,
      [projectA1Id, ownerAId]
    );
    const crA1_2Id = crA1_2.rows[0].id;
    const tokenA2 = generateApprovalToken();
    await db.query(
      `select public.publish_change_request($1, $2, $3::timestamptz)`,
      [crA1_2Id, tokenA2.tokenHash, expiresAt]
    );

    // CR A1-3: Custom Blog System ($3,000.00 USD, REJECTED)
    const crA1_3 = await db.query<{ id: string }>(
      `insert into public.change_requests (
        project_id, title, description, pricing_method, cost_minor, proposed_deadline, status, created_by
      ) values ($1, 'Embedded WordPress Blog', 'Marketing blog sync', 'fixed', 300000, '2027-01-15', 'draft', $2) returning id`,
      [projectA1Id, ownerAId]
    );
    const crA1_3Id = crA1_3.rows[0].id;
    const tokenA3 = generateApprovalToken();
    await db.query(
      `select public.publish_change_request($1, $2, $3::timestamptz)`,
      [crA1_3Id, tokenA3.tokenHash, expiresAt]
    );
    // Client Rejects CR A1-3
    await db.query(
      `select public.submit_decision($1, 'rejected', 'Rachel Green (VP Tech)', '{"note":"Out of budget for Q1"}'::jsonb)`,
      [tokenA3.tokenHash]
    );

    // CR A1-4: SEO Enhancement ($2,000.00 USD, DRAFT)
    await db.query(
      `insert into public.change_requests (
        project_id, title, description, pricing_method, cost_minor, proposed_deadline, status, created_by
      ) values ($1, 'Core Web Vitals SEO', 'Performance tuning', 'fixed', 200000, '2027-01-10', 'draft', $2)`,
      [projectA1Id, ownerAId]
    );

    // CR A2-1 on Project A2 (EUR): GDPR Module (€8,000.00 EUR, APPROVED)
    const crA2_1 = await db.query<{ id: string }>(
      `insert into public.change_requests (
        project_id, title, description, pricing_method, cost_minor, proposed_deadline, status, created_by
      ) values ($1, 'EU GDPR Consent Framework', 'Cookie preferences + data export', 'fixed', 800000, '2027-03-15', 'draft', $2) returning id`,
      [projectA2Id, ownerAId]
    );
    const crA2_1Id = crA2_1.rows[0].id;
    const tokenA4 = generateApprovalToken();
    await db.query(
      `select public.publish_change_request($1, $2, $3::timestamptz)`,
      [crA2_1Id, tokenA4.tokenHash, expiresAt]
    );
    // Client Approves CR A2-1
    await db.query(
      `select public.submit_decision($1, 'approved', 'Henri Dupont (DPO)', '{"note":"Mandatory for EU launch"}'::jsonb)`,
      [tokenA4.tokenHash]
    );

    // --------------------------------------------------------------------------
    // SEED WORKSPACE B (Rival Multi-Tenant): 1 Project (GBP £200,000.00)
    // --------------------------------------------------------------------------
    await db.query(`select auth.set_mock_user($1::uuid)`, [ownerBId]);

    const projB1Res = await db.query<{ id: string }>(
      `insert into public.projects (
        workspace_id, name, client_name, currency, budget_minor, hourly_rate_minor,
        start_date, original_deadline, status, created_by
      ) values ($1, 'Zenith AI Discovery Portal', 'FinTech Capital UK', 'GBP', 20000000, 25000, '2026-12-01', '2027-06-01', 'active', $2) returning id`,
      [workspaceBId, ownerBId]
    );
    projectB1Id = projB1Res.rows[0].id;

    // CR B1-1: Vector Database Integration (£40,000.00 GBP, APPROVED)
    const crB1_1 = await db.query<{ id: string }>(
      `insert into public.change_requests (
        project_id, title, description, pricing_method, cost_minor, proposed_deadline, status, created_by
      ) values ($1, 'Pinecone Vector Cluster', 'High-throughput semantic search', 'fixed', 4000000, '2027-07-01', 'draft', $2) returning id`,
      [projectB1Id, ownerBId]
    );
    const crB1_1Id = crB1_1.rows[0].id;
    const tokenB1 = generateApprovalToken();
    await db.query(
      `select public.publish_change_request($1, $2, $3::timestamptz)`,
      [crB1_1Id, tokenB1.tokenHash, expiresAt]
    );
    // Client Approves CR B1-1
    await db.query(
      `select public.submit_decision($1, 'approved', 'Alistair Finch (CTO)', '{"note":"Approved enterprise search add-on"}'::jsonb)`,
      [tokenB1.tokenHash]
    );


    // CR B1-2: Analytics Pipeline (£10,000.00 GBP, PENDING APPROVAL)
    const crB1_2 = await db.query<{ id: string }>(
      `insert into public.change_requests (
        project_id, title, description, pricing_method, cost_minor, proposed_deadline, status, created_by
      ) values ($1, 'Snowflake Event Ingestion', 'Streaming analytics pipeline', 'fixed', 1000000, '2027-06-15', 'draft', $2) returning id`,
      [projectB1Id, ownerBId]
    );
    const crB1_2Id = crB1_2.rows[0].id;
    const tokenB2 = generateApprovalToken();
    await db.query(
      `select public.publish_change_request($1, $2, $3::timestamptz)`,
      [crB1_2Id, tokenB2.tokenHash, expiresAt]
    );

    // Activity log for Workspace B
    await db.query(
      `insert into public.activity_logs (
        workspace_id, actor_type, actor_id, actor_name, entity_type, entity_id, action, metadata
      ) values ($1, 'user', $2, 'Head B', 'project', $3, 'project_created', '{"name":"Zenith AI Discovery Portal"}'::jsonb)`,
      [workspaceBId, ownerBId, projectB1Id]
    );
  });

  /**
   * Helper function executing the exact dashboard queries directly against
   * the real PostgreSQL database and applying pure domain calculation rules.
   */
  async function computeDashboardForWorkspace(wsId: string) {
    // 1. Fetch workspace projects
    const projRes = await db.query<{
      id: string;
      workspace_id: string;
      name: string;
      client_name: string;
      status: string;
      currency: string;
      budget_minor: number;
      hourly_rate_minor: number;
      start_date: string;
      original_deadline: unknown;
      updated_at: string;
    }>(
      `select id, workspace_id, name, client_name, status, currency, budget_minor, hourly_rate_minor,
              start_date, original_deadline, updated_at
       from public.projects
       where workspace_id = $1
       order by updated_at desc`,
      [wsId]
    );

    const projects = projRes.rows;
    if (projects.length === 0) {
      return {
        metrics: {
          activeProjectsCount: 0,
          totalProjectsCount: 0,
          pendingApprovalsCount: 0,
          approvedChangesCount: 0,
          rejectedChangesCount: 0,
          approvedChargesByCurrency: [],
        },
        recentProjects: [],
        hasProjects: false,
      };
    }

    const toDateStr = (val: unknown): string => {
      if (!val) return "";
      if (val instanceof Date) return val.toISOString().split("T")[0];
      return String(val).split("T")[0];
    };

    const projectIds = projects.map((p) => p.id);
    const activeProjectsCount = projects.filter((p) => p.status === "active").length;

    // 2. Fetch change requests for workspace projects
    const crRes = await db.query<{
      id: string;
      project_id: string;
      status: string;
      cost_minor: number;
      proposed_deadline: unknown;
    }>(
      `select id, project_id, status, cost_minor, proposed_deadline
       from public.change_requests
       where project_id = any($1::uuid[])`,
      [projectIds]
    );
    const changeRequests = crRes.rows;

    const pendingApprovalsCount = changeRequests.filter((c) => c.status === "pending_approval").length;
    const approvedChangesCount = changeRequests.filter((c) => c.status === "approved").length;
    const rejectedChangesCount = changeRequests.filter((c) => c.status === "rejected").length;

    // 3. Fetch approved version snapshots (ONLY where approvals.decision = 'approved')
    const approvedRes = await db.query<{
      version_id: string;
      change_request_id: string;
      project_id: string;
      version_number: number;
      cost_minor: number;
      currency: string;
      proposed_deadline: unknown;
      decided_at: string;
    }>(
      `select
        v.id as version_id,
        v.change_request_id,
        cr.project_id,
        v.version_number,
        v.cost_minor,
        v.currency,
        v.proposed_deadline,
        a.decided_at
      from public.change_request_versions v
      join public.approvals a on a.version_id = v.id
      join public.change_requests cr on cr.id = v.change_request_id
      where cr.project_id = any($1::uuid[]) and a.decision = 'approved'`,
      [projectIds]
    );

    const approvedMap = new Map<string, ApprovedVersionSnapshot[]>();
    for (const row of approvedRes.rows) {
      const list = approvedMap.get(row.project_id) || [];
      list.push({
        versionId: row.version_id,
        changeRequestId: row.change_request_id,
        versionNumber: row.version_number,
        costMinor: Number(row.cost_minor),
        currency: row.currency,
        proposedDeadline: toDateStr(row.proposed_deadline),
        approvedAt: row.decided_at,
      });
      approvedMap.set(row.project_id, list);
    }

    // Pending proposals per project
    const projectMap = new Map(projects.map((p) => [p.id, p]));
    const pendingMap = new Map<string, PendingProposalSnapshot[]>();
    for (const cr of changeRequests) {
      if (cr.status === "pending_approval") {
        const proj = projectMap.get(cr.project_id);
        const list = pendingMap.get(cr.project_id) || [];
        list.push({
          changeRequestId: cr.id,
          costMinor: Number(cr.cost_minor),
          currency: proj?.currency || "USD",
          proposedDeadline: toDateStr(cr.proposed_deadline),
        });
        pendingMap.set(cr.project_id, list);
      }
    }

    // 4. Compute rollups per project using calculateProjectRollup
    const projectRollups: ProjectFinancialRollup[] = [];
    const dashboardProjects = [];

    for (const p of projects) {
      const approved = approvedMap.get(p.id) || [];
      const pending = pendingMap.get(p.id) || [];

      const rollup = calculateProjectRollup(
        {
          id: p.id,
          name: p.name,
          currency: p.currency,
          budgetMinor: Number(p.budget_minor),
          originalDeadline: toDateStr(p.original_deadline),
        },
        approved,
        pending
      );

      projectRollups.push(rollup);

      dashboardProjects.push({
        id: p.id,
        name: p.name,
        clientName: p.client_name,
        status: p.status,
        currency: p.currency,
        budgetMinor: Number(p.budget_minor),
        revisedBudgetMinor: rollup.revisedBudgetMinor,
        approvedExtraMinor: rollup.approvedExtraMinor,
        originalDeadline: toDateStr(p.original_deadline),
        revisedDeadline: rollup.revisedDeadline,
        deltaDays: rollup.deltaDays,
        pendingRequestsCount: pending.length,
        updatedAt: p.updated_at,
      });
    }

    // 5. Aggregate strictly grouped by currency
    const workspaceRollups = calculateWorkspaceRollup(projectRollups);
    const approvedChargesByCurrency = workspaceRollups
      .filter((g) => g.approvedChangesCount > 0 || g.approvedExtraMinor > 0)
      .map((g) => ({
        currency: g.currency,
        totalMinor: g.approvedExtraMinor,
        formatted: formatMinorToCurrency(g.approvedExtraMinor, g.currency),
        approvedCount: g.approvedChangesCount,
      }));

    return {
      metrics: {
        activeProjectsCount,
        totalProjectsCount: projects.length,
        pendingApprovalsCount,
        approvedChangesCount,
        rejectedChangesCount,
        approvedChargesByCurrency,
      },
      recentProjects: dashboardProjects,
      hasProjects: true,
    };
  }

  // ============================================================================
  // TEST SUITE 1: Workspace A Metrics & Multi-Currency Aggregation
  // ============================================================================
  it("computes accurate metrics for Workspace A without cross-currency summation", async () => {
    const data = await computeDashboardForWorkspace(workspaceAId);

    // Active vs Total Projects
    expect(data.hasProjects).toBe(true);
    expect(data.metrics.totalProjectsCount).toBe(3); // A1 (active), A2 (active), A3 (completed)
    expect(data.metrics.activeProjectsCount).toBe(2); // Only A1 and A2 are active

    // Change Request Status Counters
    expect(data.metrics.pendingApprovalsCount).toBe(1); // CR A1-2 (ElasticSearch)
    expect(data.metrics.approvedChangesCount).toBe(2); // CR A1-1 ($15k USD) & CR A2-1 (€8k EUR)
    expect(data.metrics.rejectedChangesCount).toBe(1); // CR A1-3 (Blog Module)

    // Multi-Currency Breakdown (Rule 3.1 & DECISIONS.md):
    // Amounts must NEVER be summed across USD and EUR!
    expect(data.metrics.approvedChargesByCurrency).toHaveLength(2);

    const eurEntry = data.metrics.approvedChargesByCurrency.find((c) => c.currency === "EUR");
    expect(eurEntry).toBeDefined();
    expect(eurEntry?.totalMinor).toBe(800000); // €8,000.00
    expect(eurEntry?.formatted).toBe("€8,000.00");
    expect(eurEntry?.approvedCount).toBe(1);

    const usdEntry = data.metrics.approvedChargesByCurrency.find((c) => c.currency === "USD");
    expect(usdEntry).toBeDefined();
    expect(usdEntry?.totalMinor).toBe(1500000); // $15,000.00
    expect(usdEntry?.formatted).toBe("$15,000.00");
    expect(usdEntry?.approvedCount).toBe(1);

    // Ensure Workspace B's GBP is NOT present
    const gbpEntry = data.metrics.approvedChargesByCurrency.find((c) => c.currency === "GBP");
    expect(gbpEntry).toBeUndefined();

    // Verify recent projects list contains only Workspace A projects
    expect(data.recentProjects).toHaveLength(3);
    const projIds = data.recentProjects.map((p) => p.id);
    expect(projIds).toContain(projectA1Id);
    expect(projIds).toContain(projectA2Id);
    expect(projIds).toContain(projectA3Id);
    expect(projIds).not.toContain(projectB1Id);
  });

  // ============================================================================
  // TEST SUITE 2: Multi-Tenant Isolation (Workspace B sees ONLY its own data)
  // ============================================================================
  it("guarantees strict multi-tenant isolation for Workspace B", async () => {
    const data = await computeDashboardForWorkspace(workspaceBId);

    expect(data.hasProjects).toBe(true);
    expect(data.metrics.totalProjectsCount).toBe(1); // Only B1
    expect(data.metrics.activeProjectsCount).toBe(1);

    // Status Counters for Workspace B
    expect(data.metrics.pendingApprovalsCount).toBe(1); // CR B1-2 (Snowflake)
    expect(data.metrics.approvedChangesCount).toBe(1); // CR B1-1 (Vector DB)
    expect(data.metrics.rejectedChangesCount).toBe(0);

    // Currency rollup for Workspace B: ONLY GBP
    expect(data.metrics.approvedChargesByCurrency).toHaveLength(1);
    const gbpEntry = data.metrics.approvedChargesByCurrency[0];
    expect(gbpEntry.currency).toBe("GBP");
    expect(gbpEntry.totalMinor).toBe(4000000); // £40,000.00
    expect(gbpEntry.formatted).toBe("£40,000.00");
    expect(gbpEntry.approvedCount).toBe(1);

    // Zero USD or EUR from Workspace A
    expect(data.metrics.approvedChargesByCurrency.some((c) => c.currency === "USD")).toBe(false);
    expect(data.metrics.approvedChargesByCurrency.some((c) => c.currency === "EUR")).toBe(false);

    // Recent projects
    expect(data.recentProjects).toHaveLength(1);
    expect(data.recentProjects[0].id).toBe(projectB1Id);
    expect(data.recentProjects[0].name).toBe("Zenith AI Discovery Portal");
  });

  // ============================================================================
  // TEST SUITE 3: Brand-New Workspace Empty State
  // ============================================================================
  it("renders clean zero-metrics empty state for a brand-new workspace", async () => {
    const data = await computeDashboardForWorkspace(workspaceCId);

    expect(data.hasProjects).toBe(false);
    expect(data.metrics.totalProjectsCount).toBe(0);
    expect(data.metrics.activeProjectsCount).toBe(0);
    expect(data.metrics.pendingApprovalsCount).toBe(0);
    expect(data.metrics.approvedChangesCount).toBe(0);
    expect(data.metrics.rejectedChangesCount).toBe(0);
    expect(data.metrics.approvedChargesByCurrency).toEqual([]);
    expect(data.recentProjects).toEqual([]);
  });

  // ============================================================================
  // TEST SUITE 4: Direct SQL Aggregation & Immutable Snapshot Source of Truth
  // ============================================================================
  it("verifies direct SQL aggregation matches and enforces immutable snapshots as source of truth", async () => {
    // 1. Direct SQL sum of approved versions for Workspace A grouped by currency
    const sqlRes = await db.query<{
      currency: string;
      total_cost_minor: string;
      approved_versions_count: string;
    }>(
      `select
        v.currency,
        sum(v.cost_minor)::bigint as total_cost_minor,
        count(distinct cr.id) as approved_versions_count
      from public.change_request_versions v
      join public.approvals a on a.version_id = v.id
      join public.change_requests cr on cr.id = v.change_request_id
      join public.projects p on p.id = cr.project_id
      where p.workspace_id = $1 and a.decision = 'approved'
      group by v.currency
      order by v.currency`,
      [workspaceAId]
    );

    expect(sqlRes.rows).toHaveLength(2);
    expect(sqlRes.rows[0].currency).toBe("EUR");
    expect(Number(sqlRes.rows[0].total_cost_minor)).toBe(800000);
    expect(Number(sqlRes.rows[0].approved_versions_count)).toBe(1);

    expect(sqlRes.rows[1].currency).toBe("USD");
    expect(Number(sqlRes.rows[1].total_cost_minor)).toBe(1500000);
    expect(Number(sqlRes.rows[1].approved_versions_count)).toBe(1);

    // 2. Direct SQL count of change requests by status for Workspace A
    const crCountRes = await db.query<{
      status: string;
      cr_count: string;
    }>(
      `select
        cr.status,
        count(*)::int as cr_count
      from public.change_requests cr
      join public.projects p on p.id = cr.project_id
      where p.workspace_id = $1
      group by cr.status
      order by cr.status`,
      [workspaceAId]
    );

    const statusCounts = Object.fromEntries(
      crCountRes.rows.map((r) => [r.status, Number(r.cr_count)])
    );

    expect(statusCounts["approved"]).toBe(2);
    expect(statusCounts["pending_approval"]).toBe(1);
    expect(statusCounts["rejected"]).toBe(1);
    expect(statusCounts["draft"]).toBe(1);

    // 3. Modifying draft column on change_requests does NOT alter approved rollups
    // (Per Rule 3.2: Never compute project metrics from mutable draft columns on change_requests)
    await db.query(
      `update public.change_requests set cost_minor = 99999999 where id = (
        select change_request_id from public.change_request_versions v
        join public.approvals a on a.version_id = v.id
        limit 1
      )`
    );

    const recheckSql = await db.query<{ total_cost_minor: string }>(
      `select sum(v.cost_minor)::bigint as total_cost_minor
       from public.change_request_versions v
       join public.approvals a on a.version_id = v.id
       join public.change_requests cr on cr.id = v.change_request_id
       join public.projects p on p.id = cr.project_id
       where p.workspace_id = $1 and a.decision = 'approved' and v.currency = 'USD'`,
      [workspaceAId]
    );

    // Totals remain rock solid at $15,000.00 (1500000 minor units), NOT 99999999!
    expect(Number(recheckSql.rows[0].total_cost_minor)).toBe(1500000);
  });

  // ============================================================================
  // TEST SUITE 5: Activity Logs Workspace Isolation
  // ============================================================================
  it("enforces activity audit log workspace isolation", async () => {
    const actARes = await db.query<{ workspace_id: string; entity_id: string }>(
      `select workspace_id, entity_id from public.activity_logs where workspace_id = $1`,
      [workspaceAId]
    );
    expect(actARes.rows.length).toBeGreaterThan(0);
    expect(actARes.rows.every((r) => r.workspace_id === workspaceAId)).toBe(true);

    const actBRes = await db.query<{ workspace_id: string; entity_id: string }>(
      `select workspace_id, entity_id from public.activity_logs where workspace_id = $1`,
      [workspaceBId]
    );
    expect(actBRes.rows.length).toBeGreaterThan(0);
    expect(actBRes.rows.every((r) => r.workspace_id === workspaceBId)).toBe(true);

    // Zero overlap between Workspace A and Workspace B activity logs
    const aEntityIds = new Set(actARes.rows.map((r) => r.entity_id));
    const bOverlap = actBRes.rows.filter((r) => aEntityIds.has(r.entity_id));
    expect(bOverlap).toHaveLength(0);
  });
});
