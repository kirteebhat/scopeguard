-- ============================================================================
-- ScopeGuard Migration: 00003_row_level_security.sql
-- Row-Level Security (RLS) Helper Functions, Default Deny, and Granular Policies
-- ============================================================================

-- 1. SECURITY DEFINER HELPER FUNCTIONS (Fixed search_path = public, pg_temp)

-- Check if current authenticated user belongs to the specified workspace
create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
security definer set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = p_workspace_id
      and user_id = auth.uid()
  );
$$;

-- Get the role of current authenticated user in the specified workspace
create or replace function public.workspace_role(p_workspace_id uuid)
returns public.member_role
language sql
security definer set search_path = public, pg_temp
stable
as $$
  select role
  from public.workspace_members
  where workspace_id = p_workspace_id
    and user_id = auth.uid()
  limit 1;
$$;

-- Resolve workspace_id from a project_id
create or replace function public.get_project_workspace_id(p_project_id uuid)
returns uuid
language sql
security definer set search_path = public, pg_temp
stable
as $$
  select workspace_id
  from public.projects
  where id = p_project_id
  limit 1;
$$;

-- Resolve workspace_id from a change_request_id
create or replace function public.get_change_request_workspace_id(p_request_id uuid)
returns uuid
language sql
security definer set search_path = public, pg_temp
stable
as $$
  select p.workspace_id
  from public.change_requests cr
  join public.projects p on p.id = cr.project_id
  where cr.id = p_request_id
  limit 1;
$$;


-- ============================================================================
-- 2. ENABLE ROW-LEVEL SECURITY ON ALL TABLES (DEFAULT DENY)
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.projects enable row level security;
alter table public.deliverables enable row level security;
alter table public.change_requests enable row level security;
alter table public.change_request_versions enable row level security;
alter table public.approval_tokens enable row level security;
alter table public.approvals enable row level security;
alter table public.activity_logs enable row level security;
alter table public.approval_attempts enable row level security;


-- ============================================================================
-- 3. POLICIES PER TABLE
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PROFILES
-- ----------------------------------------------------------------------------
-- Authenticated users can read their own profile or profiles of members in shared workspaces
create policy "profiles_select_policy"
  on public.profiles
  for select
  to authenticated
  using (
    auth.uid() = id
    or exists (
      select 1
      from public.workspace_members wm1
      join public.workspace_members wm2 on wm1.workspace_id = wm2.workspace_id
      where wm1.user_id = auth.uid() and wm2.user_id = profiles.id
    )
  );

-- Users can update only their own profile
create policy "profiles_update_policy"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Profiles insert allowed for user's own id (handled mostly by auth trigger)
create policy "profiles_insert_policy"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);


-- ----------------------------------------------------------------------------
-- WORKSPACES
-- ----------------------------------------------------------------------------
-- Members can view their workspace
create policy "workspaces_select_policy"
  on public.workspaces
  for select
  to authenticated
  using (public.is_workspace_member(id));

-- Only owner can update workspace settings
create policy "workspaces_update_policy"
  on public.workspaces
  for update
  to authenticated
  using (public.workspace_role(id) = 'owner')
  with check (public.workspace_role(id) = 'owner');

-- Only owner can delete workspace
create policy "workspaces_delete_policy"
  on public.workspaces
  for delete
  to authenticated
  using (public.workspace_role(id) = 'owner');


-- ----------------------------------------------------------------------------
-- WORKSPACE MEMBERS
-- ----------------------------------------------------------------------------
-- Members can view team members in their workspace
create policy "workspace_members_select_policy"
  on public.workspace_members
  for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

-- Only owner can add members directly
create policy "workspace_members_insert_policy"
  on public.workspace_members
  for insert
  to authenticated
  with check (public.workspace_role(workspace_id) = 'owner');

-- Only owner can update member roles
create policy "workspace_members_update_policy"
  on public.workspace_members
  for update
  to authenticated
  using (public.workspace_role(workspace_id) = 'owner')
  with check (public.workspace_role(workspace_id) = 'owner');

-- Owner can remove members; user can leave their own membership
create policy "workspace_members_delete_policy"
  on public.workspace_members
  for delete
  to authenticated
  using (
    public.workspace_role(workspace_id) = 'owner'
    or auth.uid() = user_id
  );


-- ----------------------------------------------------------------------------
-- PROJECTS
-- ----------------------------------------------------------------------------
-- Workspace members can view projects in their workspace
create policy "projects_select_policy"
  on public.projects
  for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

-- Owner and Manager can create projects
create policy "projects_insert_policy"
  on public.projects
  for insert
  to authenticated
  with check (
    public.workspace_role(workspace_id) in ('owner', 'manager')
  );

-- Owner and Manager can edit projects
create policy "projects_update_policy"
  on public.projects
  for update
  to authenticated
  using (
    public.workspace_role(workspace_id) in ('owner', 'manager')
  )
  with check (
    public.workspace_role(workspace_id) in ('owner', 'manager')
  );

-- Only owner can delete projects
create policy "projects_delete_policy"
  on public.projects
  for delete
  to authenticated
  using (public.workspace_role(workspace_id) = 'owner');


-- ----------------------------------------------------------------------------
-- DELIVERABLES
-- ----------------------------------------------------------------------------
-- Workspace members can view deliverables for projects in their workspace
create policy "deliverables_select_policy"
  on public.deliverables
  for select
  to authenticated
  using (
    public.is_workspace_member(public.get_project_workspace_id(project_id))
  );

-- Owner and Manager can add deliverables
create policy "deliverables_insert_policy"
  on public.deliverables
  for insert
  to authenticated
  with check (
    public.workspace_role(public.get_project_workspace_id(project_id)) in ('owner', 'manager')
  );

-- Owner and Manager can edit deliverables
create policy "deliverables_update_policy"
  on public.deliverables
  for update
  to authenticated
  using (
    public.workspace_role(public.get_project_workspace_id(project_id)) in ('owner', 'manager')
  )
  with check (
    public.workspace_role(public.get_project_workspace_id(project_id)) in ('owner', 'manager')
  );

-- Owner and Manager can delete deliverables
create policy "deliverables_delete_policy"
  on public.deliverables
  for delete
  to authenticated
  using (
    public.workspace_role(public.get_project_workspace_id(project_id)) in ('owner', 'manager')
  );


-- ----------------------------------------------------------------------------
-- CHANGE REQUESTS
-- ----------------------------------------------------------------------------
-- Workspace members can view change requests in their workspace
create policy "change_requests_select_policy"
  on public.change_requests
  for select
  to authenticated
  using (
    public.is_workspace_member(public.get_project_workspace_id(project_id))
  );

-- Any workspace member (owner, manager, member) can create drafts
create policy "change_requests_insert_policy"
  on public.change_requests
  for insert
  to authenticated
  with check (
    public.is_workspace_member(public.get_project_workspace_id(project_id))
    and status = 'draft'
  );

-- Members can edit requests ONLY while in 'draft' status
create policy "change_requests_update_policy"
  on public.change_requests
  for update
  to authenticated
  using (
    public.is_workspace_member(public.get_project_workspace_id(project_id))
    and status = 'draft'
  )
  with check (
    public.is_workspace_member(public.get_project_workspace_id(project_id))
    and status = 'draft'
  );

-- Only owner and manager can delete draft change requests
create policy "change_requests_delete_policy"
  on public.change_requests
  for delete
  to authenticated
  using (
    public.workspace_role(public.get_project_workspace_id(project_id)) in ('owner', 'manager')
    and status = 'draft'
  );


-- ----------------------------------------------------------------------------
-- CHANGE REQUEST VERSIONS
-- ----------------------------------------------------------------------------
-- Workspace members can view immutable version snapshots in their workspace
create policy "change_request_versions_select_policy"
  on public.change_request_versions
  for select
  to authenticated
  using (
    public.is_workspace_member(public.get_change_request_workspace_id(change_request_id))
  );

-- INSERT, UPDATE, and DELETE are strictly forbidden for direct calls
-- (Inserted exclusively via publish_change_request SECURITY DEFINER function)


-- ----------------------------------------------------------------------------
-- APPROVAL TOKENS
-- ----------------------------------------------------------------------------
-- Completely unreadable and unwritable by authenticated and anon roles.
-- (Default deny active. Only SECURITY DEFINER functions access this table).


-- ----------------------------------------------------------------------------
-- APPROVALS
-- ----------------------------------------------------------------------------
-- Workspace members can view decisions on their proposals
create policy "approvals_select_policy"
  on public.approvals
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.change_request_versions v
      where v.id = approvals.version_id
        and public.is_workspace_member(public.get_change_request_workspace_id(v.change_request_id))
    )
  );

-- Direct INSERT, UPDATE, and DELETE blocked for authenticated and anon
-- (Inserted exclusively via submit_decision SECURITY DEFINER function)


-- ----------------------------------------------------------------------------
-- ACTIVITY LOGS
-- ----------------------------------------------------------------------------
-- Workspace members can view activity logs for their workspace
create policy "activity_logs_select_policy"
  on public.activity_logs
  for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

-- Direct INSERT, UPDATE, and DELETE blocked for authenticated and anon
-- (Inserted exclusively via functions / server audit logs)


-- ----------------------------------------------------------------------------
-- APPROVAL ATTEMPTS
-- ----------------------------------------------------------------------------
-- Completely unreadable and unwritable by authenticated and anon.
-- (Default deny active. Server-only rate limiting table).


-- ============================================================================
-- 4. FUNCTION EXECUTE REVOCATIONS (Server-Only Access for Client Links)
-- ============================================================================

-- Revoke direct execution of client-link functions from anon and public
revoke execute on function public.get_proposal_by_token(text) from public;
revoke execute on function public.submit_decision(text, text, text, jsonb) from public;

do $$
begin
  -- In Supabase environments, revoke from anon and authenticated roles
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function public.get_proposal_by_token(text) from anon, authenticated;
    revoke execute on function public.submit_decision(text, text, text, jsonb) from anon, authenticated;
  end if;

  -- Grant execution strictly to service_role
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.get_proposal_by_token(text) to service_role;
    grant execute on function public.submit_decision(text, text, text, jsonb) to service_role;
  end if;
end $$;

