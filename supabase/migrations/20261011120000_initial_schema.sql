-- ============================================================================
-- ScopeGuard Migration: 00001_initial_schema.sql
-- Identity, Workspaces, Members, Projects, and Deliverables
-- ============================================================================

-- 1. EXTENSIONS & UTILITIES
create extension if not exists "uuid-ossp";

-- Reusable updated_at timestamp trigger function
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

-- 2. ENUMS
create type public.member_role as enum ('owner', 'manager', 'member');
create type public.project_status as enum ('active', 'completed', 'on_hold', 'archived');
create type public.deliverable_status as enum ('pending', 'in_progress', 'completed', 'cancelled');
create type public.pricing_method as enum ('hourly', 'fixed');

-- 3. PROFILES TABLE (Linked to Supabase Auth users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade, -- CASCADE: Profile removed if auth user is deleted
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create trigger tr_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- Trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. WORKSPACES TABLE
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) >= 2),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  plan text not null default 'free', -- Display metadata only (MVP locked decision)
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create trigger tr_workspaces_updated_at
  before update on public.workspaces
  for each row execute function public.handle_updated_at();

-- 5. WORKSPACE MEMBERS TABLE
create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade, -- CASCADE: Workspace deletion removes member links
  user_id uuid not null references public.profiles(id) on delete cascade,          -- CASCADE: User deletion removes workspace memberships
  role public.member_role not null default 'member',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint uq_workspace_member unique (workspace_id, user_id)
);

-- Exactly one owner per workspace enforced via unique partial index
create unique index idx_workspace_single_owner 
  on public.workspace_members (workspace_id) 
  where (role = 'owner');

create trigger tr_workspace_members_updated_at
  before update on public.workspace_members
  for each row execute function public.handle_updated_at();

-- 6. PROJECTS TABLE
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade, -- CASCADE: Deleting workspace removes associated projects
  name text not null check (char_length(trim(name)) >= 2),
  client_name text not null check (char_length(trim(client_name)) >= 1),
  status public.project_status not null default 'active',
  currency text not null check (currency ~ '^[A-Z]{3}$'), -- 3-letter ISO 4217 code (e.g. INR, USD)
  budget_minor bigint not null default 0 check (budget_minor >= 0), -- Integer minor units (e.g. paise, cents)
  hourly_rate_minor bigint not null default 0 check (hourly_rate_minor >= 0), -- Default rate in minor units
  start_date date not null default current_date,
  original_deadline date not null,
  created_by uuid references public.profiles(id) on delete set null, -- SET NULL: Retain project if creator account is deleted
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint chk_project_dates check (original_deadline >= start_date)
);

create trigger tr_projects_updated_at
  before update on public.projects
  for each row execute function public.handle_updated_at();

-- 7. DELIVERABLES TABLE
create table public.deliverables (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade, -- CASCADE: Deliverables belong to project
  title text not null check (char_length(trim(title)) >= 1),
  description text,
  status public.deliverable_status not null default 'pending',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create trigger tr_deliverables_updated_at
  before update on public.deliverables
  for each row execute function public.handle_updated_at();

-- 8. INDEXES FOR FOREIGN KEYS & COMMON FILTERS
create index idx_workspace_members_workspace_id on public.workspace_members(workspace_id);
create index idx_workspace_members_user_id on public.workspace_members(user_id);

create index idx_projects_workspace_id on public.projects(workspace_id);
create index idx_projects_status on public.projects(status);
create index idx_projects_workspace_status on public.projects(workspace_id, status);
create index idx_projects_created_by on public.projects(created_by);

create index idx_deliverables_project_id on public.deliverables(project_id);
create index idx_deliverables_project_status on public.deliverables(project_id, status);

-- 9. DATABASE FUNCTION: create_workspace(name)
-- Atomically provisions a workspace and makes the authenticated caller the owner
create or replace function public.create_workspace(name text)
returns json
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_workspace public.workspaces%rowtype;
  v_base_slug text;
  v_slug text;
  v_counter integer := 1;
begin
  -- Resolve authenticated caller
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized: Must be logged in to create a workspace';
  end if;

  if trim(name) is null or char_length(trim(name)) < 2 then
    raise exception 'Workspace name must be at least 2 characters';
  end if;

  -- Generate slug from name
  v_base_slug := lower(regexp_replace(trim(name), '[^a-zA-Z0-9]+', '-', 'g'));
  v_base_slug := trim(both '-' from v_base_slug);
  if v_base_slug = '' then
    v_base_slug := 'workspace';
  end if;
  v_slug := v_base_slug;

  -- Ensure slug uniqueness
  while exists (select 1 from public.workspaces where slug = v_slug) loop
    v_counter := v_counter + 1;
    v_slug := v_base_slug || '-' || v_counter;
  end loop;

  -- Insert workspace
  insert into public.workspaces (name, slug, plan)
  values (trim(name), v_slug, 'free')
  returning * into v_workspace;

  -- Insert owner membership (guaranteed to be unique owner by partial index)
  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace.id, v_user_id, 'owner');

  return row_to_json(v_workspace);
end;
$$;

