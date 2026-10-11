import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import * as fs from "fs";
import * as path from "path";

describe("Row-Level Security (RLS) & Multi-Tenant Isolation Suite", () => {
  let db: PGlite;

  // Users in Workspace A
  const ownerAId = "11111111-1111-1111-1111-111111111111";
  const managerAId = "22222222-2222-2222-2222-222222222222";
  const memberAId = "33333333-3333-3333-3333-333333333333";

  // Users in Workspace B
  const ownerBId = "44444444-4444-4444-4444-444444444444";
  const managerBId = "55555555-5555-5555-5555-555555555555";

  let wsAId: string;
  let wsBId: string;
  let projAId: string;
  let projBId: string;
  let delivAId: string;
  let draftCrAId: string;
  let publishedCrAId: string;
  let versionAId: string;

  // Helper to switch acting user and role
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

      -- Create standard Supabase roles
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

    // 2. Read and apply Migration 1: Initial schema
    const m1Path = path.resolve(__dirname, "../../supabase/migrations/20261011120000_initial_schema.sql");
    await db.exec(fs.readFileSync(m1Path, "utf-8"));

    // 3. Read and apply Migration 2: Change requests and approvals
    const m2Path = path.resolve(__dirname, "../../supabase/migrations/20261011130000_change_requests_and_approvals.sql");
    await db.exec(fs.readFileSync(m2Path, "utf-8"));

    // Re-grant to ensure tables created by migrations are accessible by DAC before RLS filters
    await db.exec(`
      grant all on all tables in schema public to anon, authenticated, service_role;
      grant all on all routines in schema public to anon, authenticated, service_role;
      grant all on all sequences in schema public to anon, authenticated, service_role;
    `);

    // 4. Read and apply Migration 3: Row-Level Security
    const m3Path = path.resolve(__dirname, "../../supabase/migrations/20261011140000_row_level_security.sql");
    await db.exec(fs.readFileSync(m3Path, "utf-8"));

    // 5. Seed Users into auth.users (triggers profile creation)
    const users = [
      { id: ownerAId, email: "owner-a@example.com", name: "Owner A" },
      { id: managerAId, email: "manager-a@example.com", name: "Manager A" },
      { id: memberAId, email: "member-a@example.com", name: "Member A" },
      { id: ownerBId, email: "owner-b@example.com", name: "Owner B" },
      { id: managerBId, email: "manager-b@example.com", name: "Manager B" },
    ];

    for (const u of users) {
      await db.query(
        `insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`,
        [u.id, u.email, JSON.stringify({ full_name: u.name })]
      );
    }

    // 6. Provision Workspace A (via ownerA)
    await asUser(ownerAId);
    const wsARes = await db.query<{ create_workspace: { id: string } }>(
      `select public.create_workspace('Workspace A') as create_workspace;`
    );
    wsAId = wsARes.rows[0].create_workspace.id;

    // Add managerA and memberA to Workspace A (ownerA is authorized)
    await db.query(
      `insert into public.workspace_members (workspace_id, user_id, role) values ($1, $2, 'manager')`,
      [wsAId, managerAId]
    );
    await db.query(
      `insert into public.workspace_members (workspace_id, user_id, role) values ($1, $2, 'member')`,
      [wsAId, memberAId]
    );

    // Create Project A in Workspace A
    const projARes = await db.query<{ id: string }>(
      `insert into public.projects (workspace_id, name, client_name, currency, budget_minor, hourly_rate_minor, original_deadline)
       values ($1, 'Project Alpha', 'Acme Client', 'USD', 1000000, 15000, '2026-12-31')
       returning id`,
      [wsAId]
    );
    projAId = projARes.rows[0].id;

    // Create Deliverable A
    const delivARes = await db.query<{ id: string }>(
      `insert into public.deliverables (project_id, title) values ($1, 'Alpha Phase 1') returning id`,
      [projAId]
    );
    delivAId = delivARes.rows[0].id;

    // Create a draft change request in Workspace A
    const draftCrARes = await db.query<{ id: string }>(
      `insert into public.change_requests (project_id, title, description, pricing_method, estimated_hours, cost_minor, status, created_by)
       values ($1, 'Draft Scope', 'A draft change', 'hourly', 10, 150000, 'draft', $2)
       returning id`,
      [projAId, memberAId]
    );
    draftCrAId = draftCrARes.rows[0].id;

    // Create another change request and publish it to test version/approvals
    const pubCrARes = await db.query<{ id: string }>(
      `insert into public.change_requests (project_id, title, description, pricing_method, cost_minor, status, created_by)
       values ($1, 'Published Scope', 'Published change', 'fixed', 50000, 'draft', $2)
       returning id`,
      [projAId, ownerAId]
    );
    publishedCrAId = pubCrARes.rows[0].id;

    const tokenHash = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const expiresAt = new Date(Date.now() + 14 * 86400000).toISOString();
    const pubResult = await db.query<{ publish_change_request: { version_id: string } }>(
      `select public.publish_change_request($1, $2, $3::timestamptz) as publish_change_request`,
      [publishedCrAId, tokenHash, expiresAt]
    );
    versionAId = pubResult.rows[0].publish_change_request.version_id;

    // 7. Provision Workspace B (via ownerB)
    await asUser(ownerBId);
    const wsBRes = await db.query<{ create_workspace: { id: string } }>(
      `select public.create_workspace('Workspace B') as create_workspace;`
    );
    wsBId = wsBRes.rows[0].create_workspace.id;

    await db.query(
      `insert into public.workspace_members (workspace_id, user_id, role) values ($1, $2, 'manager')`,
      [wsBId, managerBId]
    );

    const projBRes = await db.query<{ id: string }>(
      `insert into public.projects (workspace_id, name, client_name, currency, budget_minor, hourly_rate_minor, original_deadline)
       values ($1, 'Project Beta', 'Beta Client', 'EUR', 2000000, 20000, '2026-11-30')
       returning id`,
      [wsBId]
    );
    projBId = projBRes.rows[0].id;
  });

  // ==========================================================================
  // 1. Cross-Workspace Read Isolation
  // ==========================================================================
  describe("1. Cross-Workspace Read Isolation", () => {
    it("prevents Workspace B users from viewing Workspace A projects", async () => {
      await asUser(ownerBId);
      const res = await db.query(`select * from public.projects where id = $1`, [projAId]);
      expect(res.rows.length).toBe(0);

      const allProjects = await db.query(`select * from public.projects`);
      // Should only see Workspace B projects
      expect(allProjects.rows.length).toBe(1);
      expect((allProjects.rows[0] as { id: string }).id).toBe(projBId);
    });

    it("prevents Workspace B users from viewing Workspace A workspaces", async () => {
      await asUser(ownerBId);
      const res = await db.query(`select * from public.workspaces where id = $1`, [wsAId]);
      expect(res.rows.length).toBe(0);
    });

    it("prevents Workspace B users from viewing Workspace A deliverables", async () => {
      await asUser(ownerBId);
      const res = await db.query(`select * from public.deliverables where id = $1`, [delivAId]);
      expect(res.rows.length).toBe(0);
    });

    it("prevents Workspace B users from viewing Workspace A change requests", async () => {
      await asUser(ownerBId);
      const res = await db.query(`select * from public.change_requests where id = $1`, [draftCrAId]);
      expect(res.rows.length).toBe(0);
    });

    it("prevents Workspace B users from viewing Workspace A versions and activity logs", async () => {
      await asUser(ownerBId);
      const vRes = await db.query(`select * from public.change_request_versions where id = $1`, [versionAId]);
      expect(vRes.rows.length).toBe(0);

      const logRes = await db.query(`select * from public.activity_logs where workspace_id = $1`, [wsAId]);
      expect(logRes.rows.length).toBe(0);
    });
  });

  // ==========================================================================
  // 2. Cross-Workspace Write Isolation
  // ==========================================================================
  describe("2. Cross-Workspace Write Isolation", () => {
    it("blocks inserting a project into another workspace", async () => {
      await asUser(ownerBId);
      await expect(
        db.query(
          `insert into public.projects (workspace_id, name, client_name, currency, budget_minor, hourly_rate_minor, original_deadline)
           values ($1, 'Hacked Project', 'Victim', 'USD', 1000, 1000, '2027-01-01')`,
          [wsAId]
        )
      ).rejects.toThrow(/row-level security/i);
    });

    it("blocks inserting a change request into a project belonging to another workspace", async () => {
      await asUser(ownerBId);
      await expect(
        db.query(
          `insert into public.change_requests (project_id, title, description, pricing_method, estimated_hours, status)
           values ($1, 'Rogue CR', 'Desc', 'hourly', 5, 'draft')`,
          [projAId]
        )
      ).rejects.toThrow(/row-level security/i);
    });

    it("silently prevents updating a project belonging to another workspace (0 rows updated)", async () => {
      await asUser(ownerBId);
      const res = await db.query(`update public.projects set name = 'Defaced' where id = $1 returning id`, [projAId]);
      expect(res.rows.length).toBe(0);

      // Verify original name intact
      await asUser(ownerAId);
      const check = await db.query<{ name: string }>(`select name from public.projects where id = $1`, [projAId]);
      expect(check.rows[0].name).toBe("Project Alpha");
    });

    it("silently prevents deleting a project belonging to another workspace (0 rows deleted)", async () => {
      await asUser(ownerBId);
      const res = await db.query(`delete from public.projects where id = $1 returning id`, [projAId]);
      expect(res.rows.length).toBe(0);
    });
  });

  // ==========================================================================
  // 3. Role-Based Permissions in Same Workspace: Member Role
  // ==========================================================================
  describe("3. Member Role Boundaries", () => {
    it("allows member to view projects and create draft change requests", async () => {
      await asUser(memberAId);
      const proj = await db.query(`select * from public.projects where id = $1`, [projAId]);
      expect(proj.rows.length).toBe(1);

      const cr = await db.query<{ id: string }>(
        `insert into public.change_requests (project_id, title, description, pricing_method, estimated_hours, status, created_by)
         values ($1, 'Member Draft', 'Desc', 'hourly', 4, 'draft', $2)
         returning id`,
        [projAId, memberAId]
      );
      expect(cr.rows.length).toBe(1);
    });

    it("blocks member from directly creating a non-draft change request", async () => {
      await asUser(memberAId);
      await expect(
        db.query(
          `insert into public.change_requests (project_id, title, description, pricing_method, estimated_hours, status, created_by)
           values ($1, 'Illegal Status', 'Desc', 'hourly', 4, 'pending_approval', $2)`,
          [projAId, memberAId]
        )
      ).rejects.toThrow(/row-level security/i);
    });

    it("blocks member from publishing a change request via RPC", async () => {
      await asUser(memberAId);
      const tokenHash = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
      const expiresAt = new Date(Date.now() + 14 * 86400000).toISOString();

      await expect(
        db.query(`select public.publish_change_request($1, $2, $3::timestamptz)`, [draftCrAId, tokenHash, expiresAt])
      ).rejects.toThrow(/Forbidden: Only owners and managers can publish proposals/i);
    });

    it("blocks member from creating or deleting projects", async () => {
      await asUser(memberAId);
      await expect(
        db.query(
          `insert into public.projects (workspace_id, name, client_name, currency, budget_minor, hourly_rate_minor, original_deadline)
           values ($1, 'Member Project', 'Client', 'USD', 50000, 10000, '2026-12-31')`,
          [wsAId]
        )
      ).rejects.toThrow(/row-level security/i);

      const delRes = await db.query(`delete from public.projects where id = $1 returning id`, [projAId]);
      expect(delRes.rows.length).toBe(0);
    });

    it("blocks member from deleting draft change requests (only owner & manager)", async () => {
      await asUser(memberAId);
      const res = await db.query(`delete from public.change_requests where id = $1 returning id`, [draftCrAId]);
      expect(res.rows.length).toBe(0);
    });
  });

  // ==========================================================================
  // 4. Role-Based Permissions in Same Workspace: Manager Role
  // ==========================================================================
  describe("4. Manager Role Capabilities and Boundaries", () => {
    it("allows manager to create deliverables and publish proposals", async () => {
      await asUser(managerAId);

      // Manager creates deliverable
      const deliv = await db.query<{ id: string }>(
        `insert into public.deliverables (project_id, title) values ($1, 'Manager Deliverable') returning id`,
        [projAId]
      );
      expect(deliv.rows.length).toBe(1);

      // Manager publishes draftCrAId
      const tokenHash = "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
      const expiresAt = new Date(Date.now() + 14 * 86400000).toISOString();

      const pubRes = await db.query<{ publish_change_request: { version_number: number } }>(
        `select public.publish_change_request($1, $2, $3::timestamptz) as publish_change_request`,
        [draftCrAId, tokenHash, expiresAt]
      );
      expect(pubRes.rows[0].publish_change_request.version_number).toBe(1);
    });

    it("blocks manager from deleting projects (owner only)", async () => {
      await asUser(managerAId);
      const res = await db.query(`delete from public.projects where id = $1 returning id`, [projAId]);
      expect(res.rows.length).toBe(0);
    });

    it("blocks manager from modifying workspace settings or deleting workspace", async () => {
      await asUser(managerAId);
      const updateRes = await db.query(
        `update public.workspaces set name = 'Manager Renamed' where id = $1 returning id`,
        [wsAId]
      );
      expect(updateRes.rows.length).toBe(0);

      const deleteRes = await db.query(`delete from public.workspaces where id = $1 returning id`, [wsAId]);
      expect(deleteRes.rows.length).toBe(0);
    });

    it("blocks manager from modifying member roles", async () => {
      await asUser(managerAId);
      const res = await db.query(
        `update public.workspace_members set role = 'owner' where workspace_id = $1 and user_id = $2 returning user_id`,
        [wsAId, memberAId]
      );
      expect(res.rows.length).toBe(0);
    });
  });

  // ==========================================================================
  // 5. Owner Role Capabilities
  // ==========================================================================
  describe("5. Owner Role Capabilities", () => {
    it("allows owner to manage workspace members and update roles", async () => {
      await asUser(ownerAId);

      // Owner updates memberA to manager
      const res = await db.query<{ user_id: string; role: string }>(
        `update public.workspace_members
         set role = 'manager'
         where workspace_id = $1 and user_id = $2
         returning user_id, role`,
        [wsAId, memberAId]
      );
      expect(res.rows.length).toBe(1);
      expect(res.rows[0].role).toBe("manager");

      // Reset memberA back to member
      await db.query(
        `update public.workspace_members set role = 'member' where workspace_id = $1 and user_id = $2`,
        [wsAId, memberAId]
      );
    });

    it("allows owner to update workspace settings", async () => {
      await asUser(ownerAId);
      const res = await db.query<{ name: string }>(
        `update public.workspaces set name = 'Workspace A Renamed' where id = $1 returning name`,
        [wsAId]
      );
      expect(res.rows.length).toBe(1);
      expect(res.rows[0].name).toBe("Workspace A Renamed");
    });
  });

  // ==========================================================================
  // 6. Immutability & Direct Mutation Protection on Versions
  // ==========================================================================
  describe("6. Version Snapshot Protection", () => {
    it("blocks direct update of change_request_versions even by owner", async () => {
      await asUser(ownerAId);
      // RLS policy prevents direct update (no update policy exists) -> 0 rows updated
      const res = await db.query(
        `update public.change_request_versions set snapshot = '{"hacked": true}'::jsonb where id = $1 returning id`,
        [versionAId]
      );
      expect(res.rows.length).toBe(0);
    });

    it("blocks direct delete of change_request_versions even by owner", async () => {
      await asUser(ownerAId);
      const res = await db.query(`delete from public.change_request_versions where id = $1 returning id`, [versionAId]);
      expect(res.rows.length).toBe(0);
    });

    it("blocks direct insert into change_request_versions", async () => {
      await asUser(ownerAId);
      await expect(
        db.query(
          `insert into public.change_request_versions (change_request_id, version_number, title, description, pricing_method, cost_minor, currency, snapshot)
           values ($1, 99, 'Hacked Version', 'Desc', 'fixed', 1000, 'USD', '{"fake": true}'::jsonb)`,
          [publishedCrAId]
        )
      ).rejects.toThrow(/row-level security/i);
    });
  });

  // ==========================================================================
  // 7. Approvals & Tokens Protection
  // ==========================================================================
  describe("7. Approvals and Token Tables Protection", () => {
    it("blocks direct insert into approvals table", async () => {
      await asUser(ownerAId);
      await expect(
        db.query(
          `insert into public.approvals (version_id, decision, actor_name)
           values ($1, 'approved', 'Fake Client')`,
          [versionAId]
        )
      ).rejects.toThrow(/row-level security/i);
    });

    it("blocks direct select or insert on approval_tokens table", async () => {
      await asUser(ownerAId);
      const res = await db.query(`select * from public.approval_tokens`);
      expect(res.rows.length).toBe(0);

      await expect(
        db.query(
          `insert into public.approval_tokens (version_id, token_hash, expires_at)
           values ($1, 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd', now() + interval '1 day')`,
          [versionAId]
        )
      ).rejects.toThrow(/row-level security/i);
    });
  });

  // ==========================================================================
  // 8. Anonymous (Unauthenticated) Access Denied
  // ==========================================================================
  describe("8. Anonymous / Public User Default Deny", () => {
    it("returns zero rows for all tables when accessed as anon", async () => {
      await asUser(null, "anon");

      const tables = [
        "profiles",
        "workspaces",
        "workspace_members",
        "projects",
        "deliverables",
        "change_requests",
        "change_request_versions",
        "approvals",
        "approval_tokens",
        "activity_logs",
        "approval_attempts",
      ];

      for (const table of tables) {
        const res = await db.query(`select * from public.${table}`);
        expect(res.rows.length).toBe(0);
      }
    });

    it("blocks direct insert into any table when accessed as anon", async () => {
      await asUser(null, "anon");

      await expect(
        db.query(`insert into public.projects (name, client_name, currency, budget_minor) values ('x', 'y', 'USD', 0)`)
      ).rejects.toThrow();
    });

    it("blocks anon from directly calling get_proposal_by_token or submit_decision", async () => {
      await asUser(null, "anon");

      await expect(
        db.query(`select public.get_proposal_by_token('somehash')`)
      ).rejects.toThrow(/permission denied/i);

      await expect(
        db.query(`select public.submit_decision('somehash', 'approved', 'Client', '{}'::jsonb)`)
      ).rejects.toThrow(/permission denied/i);
    });
  });
});
