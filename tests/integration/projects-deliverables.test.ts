import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import * as fs from "fs";
import * as path from "path";

describe("Projects & Deliverables Database Integration", () => {
  let db: PGlite;
  const ownerId = "11111111-1111-1111-1111-111111111111";
  let workspaceId: string;

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

    // Create user and workspace
    await db.query(`insert into auth.users (id, email) values ($1, $2)`, [
      ownerId,
      "founder@agency.dev",
    ]);
    await db.exec(`select auth.set_mock_user('${ownerId}');`);

    const wsRes = await db.query<{ create_workspace: { id: string } }>(
      `select public.create_workspace('Apex Studio') as create_workspace;`
    );
    workspaceId = wsRes.rows[0].create_workspace.id;
  });

  it("creates project with valid constraints and integer minor units", async () => {
    const proj = await db.query<{
      id: string;
      name: string;
      budget_minor: number;
      hourly_rate_minor: number;
      currency: string;
    }>(
      `insert into public.projects (
        workspace_id, name, client_name, currency, budget_minor, hourly_rate_minor, start_date, original_deadline, created_by
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      returning id, name, budget_minor, hourly_rate_minor, currency`,
      [
        workspaceId,
        "Fintech Web App",
        "Apex Banking Corp",
        "USD",
        7500000, // $75,000.00
        17500, // $175.00/hr
        "2026-06-01",
        "2026-09-01",
        ownerId,
      ]
    );

    expect(proj.rows.length).toBe(1);
    expect(proj.rows[0].name).toBe("Fintech Web App");
    expect(proj.rows[0].budget_minor).toBe(7500000);
    expect(proj.rows[0].hourly_rate_minor).toBe(17500);
    expect(proj.rows[0].currency).toBe("USD");
  });

  it("enforces CHECK constraints: negative budget rejected", async () => {
    await expect(
      db.query(
        `insert into public.projects (
          workspace_id, name, client_name, currency, budget_minor, hourly_rate_minor, start_date, original_deadline
        ) values ($1, 'Bad Budget', 'Client', 'USD', -500, 10000, '2026-06-01', '2026-09-01')`,
        [workspaceId]
      )
    ).rejects.toThrow();
  });

  it("enforces CHECK constraints: original_deadline must be >= start_date", async () => {
    await expect(
      db.query(
        `insert into public.projects (
          workspace_id, name, client_name, currency, budget_minor, hourly_rate_minor, start_date, original_deadline
        ) values ($1, 'Inverted Dates', 'Client', 'USD', 50000, 10000, '2026-10-01', '2026-09-01')`,
        [workspaceId]
      )
    ).rejects.toThrow();
  });

  it("creates, updates, and deletes deliverables linked to a project", async () => {
    const proj = (
      await db.query<{ id: string }>(
        `select id from public.projects where name = 'Fintech Web App' limit 1`
      )
    ).rows[0];

    // Create deliverable
    const d1 = (
      await db.query<{ id: string; title: string; status: string }>(
        `insert into public.deliverables (project_id, title, description, status)
         values ($1, 'User Onboarding Flow', 'KYC and authentication screens', 'pending')
         returning id, title, status`,
        [proj.id]
      )
    ).rows[0];

    expect(d1.title).toBe("User Onboarding Flow");
    expect(d1.status).toBe("pending");

    // Update deliverable status to in_progress
    const updated = (
      await db.query<{ status: string }>(
        `update public.deliverables set status = 'in_progress' where id = $1 returning status`,
        [d1.id]
      )
    ).rows[0];
    expect(updated.status).toBe("in_progress");

    // Delete deliverable
    await db.query(`delete from public.deliverables where id = $1`, [d1.id]);
    const afterDelete = await db.query(`select * from public.deliverables where id = $1`, [d1.id]);
    expect(afterDelete.rows.length).toBe(0);
  });
});

