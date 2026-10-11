-- ============================================================================
-- ScopeGuard Migration: 00002_change_requests_and_approvals.sql
-- Change Requests, Versions, Approvals, Tokens, Activity Logs, and Functions
-- ============================================================================

-- 1. ENUMS
create type public.change_request_status as enum (
  'draft',
  'pending_approval',
  'approved',
  'rejected',
  'withdrawn'
);

create type public.decision_type as enum (
  'approved',
  'rejected'
);

create type public.actor_type as enum (
  'user',
  'client_link',
  'system'
);

-- 2. CHANGE REQUESTS TABLE (Mutable Working Draft)
create table public.change_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(trim(title)) >= 1),
  description text not null check (char_length(trim(description)) >= 1),
  affected_deliverable_id uuid references public.deliverables(id) on delete set null,
  pricing_method public.pricing_method not null default 'hourly',
  estimated_hours numeric(6,2) default 0 check (estimated_hours >= 0),
  hourly_rate_minor bigint default 0 check (hourly_rate_minor >= 0),
  cost_minor bigint not null default 0 check (cost_minor >= 0), -- Integer minor units (e.g. paise, cents)
  proposed_deadline date,
  internal_notes text, -- Agency private notes: NEVER visible to clients
  status public.change_request_status not null default 'draft',
  current_version integer default null check (current_version is null or current_version >= 1),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create trigger tr_change_requests_updated_at
  before update on public.change_requests
  for each row execute function public.handle_updated_at();

-- 3. CHANGE REQUEST VERSIONS TABLE (Immutable Snapshots)
create table public.change_request_versions (
  id uuid primary key default gen_random_uuid(),
  change_request_id uuid not null references public.change_requests(id) on delete cascade,
  version_number integer not null check (version_number >= 1),
  title text not null,
  description text not null,
  pricing_method public.pricing_method not null,
  cost_minor bigint not null check (cost_minor >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  proposed_deadline date,
  snapshot jsonb not null, -- Frozen complete payload (excludes internal notes)
  published_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint uq_change_request_version unique (change_request_id, version_number)
);

-- Trigger to block UPDATE and DELETE on immutable snapshots
create or replace function public.block_version_mutation()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
begin
  raise exception 'Immutable record violation: change_request_versions cannot be modified or deleted';
end;
$$;

create trigger tr_block_version_mutation
  before update or delete on public.change_request_versions
  for each row execute function public.block_version_mutation();

-- 4. APPROVAL TOKENS TABLE (Hashed Secrets)
create table public.approval_tokens (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.change_request_versions(id) on delete cascade,
  token_hash text not null unique check (char_length(token_hash) = 64), -- SHA-256 hex string (64 characters)
  expires_at timestamptz not null,
  revoked_at timestamptz default null,
  consumed_at timestamptz default null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- 5. APPROVALS TABLE (Client Decisions)
create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null unique references public.change_request_versions(id) on delete cascade, -- Exactly ONE decision per version
  decision public.decision_type not null,
  decided_at timestamptz not null default timezone('utc'::text, now()),
  decision_actor_type public.actor_type not null default 'client_link',
  actor_name text not null check (char_length(trim(actor_name)) >= 1), -- Self-declared name at decision time
  audit_metadata jsonb not null default '{}'::jsonb, -- Minimized metadata: salted IP hash, user agent summary (NO raw tokens)
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- 6. ACTIVITY LOGS TABLE (Audit Trail)
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_type public.actor_type not null,
  actor_id uuid references public.profiles(id) on delete set null, -- Null for client_link
  actor_name text,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- 7. APPROVAL ATTEMPTS TABLE (DB-Backed Rate Limiting)
create table public.approval_attempts (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  token_prefix text not null,
  attempted_at timestamptz not null default timezone('utc'::text, now())
);

-- 8. INDEXES
create index idx_change_requests_project_id on public.change_requests(project_id);
create index idx_change_requests_status on public.change_requests(status);
create index idx_change_requests_created_by on public.change_requests(created_by);

create index idx_versions_change_request_id on public.change_request_versions(change_request_id);
create index idx_tokens_version_id on public.approval_tokens(version_id);
create index idx_tokens_hash on public.approval_tokens(token_hash);

create index idx_approvals_version_id on public.approvals(version_id);
create index idx_activity_logs_workspace_id on public.activity_logs(workspace_id);
create index idx_activity_logs_created_at on public.activity_logs(created_at desc);

create index idx_approval_attempts_lookup on public.approval_attempts(ip_hash, token_prefix, attempted_at desc);

-- ============================================================================
-- 9. TRANSACTIONAL FUNCTIONS (SECURITY DEFINER, Fixed search_path)
-- ============================================================================

-- Function 1: publish_change_request
-- Atomically snapshots the draft, generates version N, inserts token, sets status to pending_approval
create or replace function public.publish_change_request(
  p_request_id uuid,
  p_token_hash text,
  p_expires_at timestamptz
)
returns json
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_caller_id uuid;
  v_req record;
  v_proj record;
  v_deliverable_title text := null;
  v_user_role public.member_role;
  v_next_version integer;
  v_version_id uuid;
  v_snapshot jsonb;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Unauthorized: Must be authenticated to publish a change request';
  end if;

  -- Lock and fetch change request
  select cr.* into v_req
  from public.change_requests cr
  where cr.id = p_request_id
  for update;

  if not found then
    raise exception 'Change request not found: %', p_request_id;
  end if;

  -- Check state machine
  if v_req.status != 'draft' then
    raise exception 'Illegal state transition: Only drafts can be published (current status: %)', v_req.status;
  end if;

  -- Fetch project & verify caller role
  select p.*, wm.role into v_proj
  from public.projects p
  join public.workspace_members wm on wm.workspace_id = p.workspace_id and wm.user_id = v_caller_id
  where p.id = v_req.project_id;

  if not found then
    raise exception 'Forbidden: You do not belong to the workspace for this project';
  end if;

  v_user_role := v_proj.role;
  if v_user_role not in ('owner', 'manager') then
    raise exception 'Forbidden: Only owners and managers can publish proposals (your role: %)', v_user_role;
  end if;

  -- Calculate next version number
  select coalesce(max(version_number), 0) + 1 into v_next_version
  from public.change_request_versions
  where change_request_id = p_request_id;

  -- Fetch deliverable title if linked
  if v_req.affected_deliverable_id is not null then
    select title into v_deliverable_title
    from public.deliverables
    where id = v_req.affected_deliverable_id;
  end if;

  -- Assemble immutable snapshot JSON (EXCLUDES internal_notes)
  v_snapshot := jsonb_build_object(
    'version_number', v_next_version,
    'title', v_req.title,
    'description', v_req.description,
    'pricing_method', v_req.pricing_method,
    'estimated_hours', v_req.estimated_hours,
    'hourly_rate_minor', v_req.hourly_rate_minor,
    'cost_minor', v_req.cost_minor,
    'currency', v_proj.currency,
    'proposed_deadline', v_req.proposed_deadline,
    'original_contract', jsonb_build_object(
      'project_name', v_proj.name,
      'client_name', v_proj.client_name,
      'budget_minor', v_proj.budget_minor,
      'original_deadline', v_proj.original_deadline
    ),
    'affected_deliverable', case
      when v_req.affected_deliverable_id is not null then jsonb_build_object('id', v_req.affected_deliverable_id, 'title', v_deliverable_title)
      else null
    end,
    'disclaimer', 'This proposal represents an estimated scope modification. Approving will update project baseline parameters.'
  );

  -- 1. Insert frozen version record
  insert into public.change_request_versions (
    change_request_id,
    version_number,
    title,
    description,
    pricing_method,
    cost_minor,
    currency,
    proposed_deadline,
    snapshot,
    published_by
  ) values (
    p_request_id,
    v_next_version,
    v_req.title,
    v_req.description,
    v_req.pricing_method,
    v_req.cost_minor,
    v_proj.currency,
    v_req.proposed_deadline,
    v_snapshot,
    v_caller_id
  ) returning id into v_version_id;

  -- 2. Insert approval token
  insert into public.approval_tokens (
    version_id,
    token_hash,
    expires_at,
    created_by
  ) values (
    v_version_id,
    p_token_hash,
    p_expires_at,
    v_caller_id
  );

  -- 3. Update request status & current version
  update public.change_requests
  set status = 'pending_approval',
      current_version = v_next_version
  where id = p_request_id;

  -- 4. Log activity
  insert into public.activity_logs (
    workspace_id,
    actor_type,
    actor_id,
    actor_name,
    entity_type,
    entity_id,
    action,
    metadata
  ) values (
    v_proj.workspace_id,
    'user',
    v_caller_id,
    (select full_name from public.profiles where id = v_caller_id),
    'change_request',
    p_request_id,
    'change_request_published',
    jsonb_build_object(
      'version_number', v_next_version,
      'version_id', v_version_id,
      'title', v_req.title,
      'cost_minor', v_req.cost_minor,
      'currency', v_proj.currency
    )
  );

  return jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'version_id', v_version_id,
    'version_number', v_next_version,
    'status', 'pending_approval'
  );
end;
$$;


-- Function 2A: revise_change_request
-- Revokes the active token, returns request status to draft
create or replace function public.revise_change_request(
  p_request_id uuid
)
returns json
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_caller_id uuid;
  v_req record;
  v_proj record;
  v_version_id uuid;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Unauthorized';
  end if;

  select cr.* into v_req
  from public.change_requests cr
  where cr.id = p_request_id
  for update;

  if not found then
    raise exception 'Change request not found';
  end if;

  if v_req.status != 'pending_approval' then
    raise exception 'Illegal state transition: Only pending proposals can be revised (current: %)', v_req.status;
  end if;

  select p.*, wm.role into v_proj
  from public.projects p
  join public.workspace_members wm on wm.workspace_id = p.workspace_id and wm.user_id = v_caller_id
  where p.id = v_req.project_id;

  if not found or v_proj.role not in ('owner', 'manager') then
    raise exception 'Forbidden: Only owners and managers can revise proposals';
  end if;

  -- Locate active version
  select id into v_version_id
  from public.change_request_versions
  where change_request_id = p_request_id and version_number = v_req.current_version;

  -- Revoke active token
  update public.approval_tokens
  set revoked_at = timezone('utc'::text, now())
  where version_id = v_version_id and revoked_at is null;

  -- Revert request to draft
  update public.change_requests
  set status = 'draft'
  where id = p_request_id;

  -- Log activity
  insert into public.activity_logs (
    workspace_id,
    actor_type,
    actor_id,
    entity_type,
    entity_id,
    action,
    metadata
  ) values (
    v_proj.workspace_id,
    'user',
    v_caller_id,
    'change_request',
    p_request_id,
    'change_request_revised',
    jsonb_build_object('revised_version', v_req.current_version)
  );

  return jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'status', 'draft'
  );
end;
$$;


-- Function 2B: withdraw_change_request
-- Revokes the active token, sets status to withdrawn (TERMINAL)
create or replace function public.withdraw_change_request(
  p_request_id uuid
)
returns json
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_caller_id uuid;
  v_req record;
  v_proj record;
  v_version_id uuid;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Unauthorized';
  end if;

  select cr.* into v_req
  from public.change_requests cr
  where cr.id = p_request_id
  for update;

  if not found then
    raise exception 'Change request not found';
  end if;

  if v_req.status != 'pending_approval' then
    raise exception 'Illegal state transition: Only pending proposals can be withdrawn (current: %)', v_req.status;
  end if;

  select p.*, wm.role into v_proj
  from public.projects p
  join public.workspace_members wm on wm.workspace_id = p.workspace_id and wm.user_id = v_caller_id
  where p.id = v_req.project_id;

  if not found or v_proj.role not in ('owner', 'manager') then
    raise exception 'Forbidden: Only owners and managers can withdraw proposals';
  end if;

  select id into v_version_id
  from public.change_request_versions
  where change_request_id = p_request_id and version_number = v_req.current_version;

  update public.approval_tokens
  set revoked_at = timezone('utc'::text, now())
  where version_id = v_version_id and revoked_at is null;

  update public.change_requests
  set status = 'withdrawn'
  where id = p_request_id;

  insert into public.activity_logs (
    workspace_id,
    actor_type,
    actor_id,
    entity_type,
    entity_id,
    action,
    metadata
  ) values (
    v_proj.workspace_id,
    'user',
    v_caller_id,
    'change_request',
    p_request_id,
    'change_request_withdrawn',
    jsonb_build_object('withdrawn_version', v_req.current_version)
  );

  return jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'status', 'withdrawn'
  );
end;
$$;


-- Function 3: get_proposal_by_token
-- Public, safe proposal resolver. Returns status code, NEVER leaks internal notes or raw errors.
create or replace function public.get_proposal_by_token(
  p_token_hash text
)
returns json
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_token record;
  v_version record;
  v_req record;
  v_proj record;
  v_workspace record;
  v_approval record;
begin
  -- 1. Find token
  select * into v_token
  from public.approval_tokens
  where token_hash = p_token_hash;

  if not found then
    return jsonb_build_object(
      'status', 'not_found',
      'message', 'This approval link is invalid or does not exist.'
    );
  end if;

  -- 2. Check revocation
  if v_token.revoked_at is not null then
    return jsonb_build_object(
      'status', 'revoked',
      'message', 'This proposal link was superseded or revoked by the agency. Please request an updated link.'
    );
  end if;

  -- 3. Check expiration
  if v_token.expires_at < now() then
    return jsonb_build_object(
      'status', 'expired',
      'message', 'This proposal link expired after 14 days without a decision. Please request a new link.'
    );
  end if;

  -- 4. Fetch version and request
  select * into v_version
  from public.change_request_versions
  where id = v_token.version_id;

  select * into v_req
  from public.change_requests
  where id = v_version.change_request_id;

  select p.*, w.name as workspace_name into v_proj
  from public.projects p
  join public.workspaces w on w.id = p.workspace_id
  where p.id = v_req.project_id;

  -- 5. Check if already decided
  select * into v_approval
  from public.approvals
  where version_id = v_version.id;

  if found then
    return jsonb_build_object(
      'status', 'already_decided',
      'decision', v_approval.decision,
      'decided_at', v_approval.decided_at,
      'actor_name', v_approval.actor_name,
      'snapshot', v_version.snapshot,
      'project_name', v_proj.name,
      'agency_name', v_proj.workspace_name
    );
  end if;

  -- 6. Check if request has been superseded
  if v_req.status != 'pending_approval' or v_req.current_version != v_version.version_number then
    return jsonb_build_object(
      'status', 'superseded',
      'message', 'This proposal has been superseded by a newer version or withdrawn.'
    );
  end if;

  -- 7. Valid pending proposal
  return jsonb_build_object(
    'status', 'valid',
    'version_id', v_version.id,
    'version_number', v_version.version_number,
    'expires_at', v_token.expires_at,
    'project_name', v_proj.name,
    'client_name', v_proj.client_name,
    'agency_name', v_proj.workspace_name,
    'snapshot', v_version.snapshot
  );
end;
$$;


-- Function 4: submit_decision
-- Atomic decision submission with row lock, double-submit protection, and terminal state transition
create or replace function public.submit_decision(
  p_token_hash text,
  p_decision text,
  p_actor_name text,
  p_audit_meta jsonb default '{}'::jsonb
)
returns json
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_token record;
  v_version record;
  v_req record;
  v_proj record;
  v_decision_enum public.decision_type;
  v_existing_approval record;
begin
  -- Validate decision parameter
  if p_decision not in ('approved', 'rejected') then
    return jsonb_build_object('success', false, 'status', 'invalid_decision', 'message', 'Decision must be approved or rejected');
  end if;
  v_decision_enum := p_decision::public.decision_type;

  -- Validate actor name
  if trim(coalesce(p_actor_name, '')) = '' or char_length(trim(p_actor_name)) < 2 then
    return jsonb_build_object('success', false, 'status', 'invalid_name', 'message', 'Please provide a valid full name');
  end if;

  -- 1. Lock and inspect token
  select * into v_token
  from public.approval_tokens
  where token_hash = p_token_hash
  for update;

  if not found then
    return jsonb_build_object('success', false, 'status', 'not_found', 'message', 'Invalid approval token');
  end if;

  if v_token.revoked_at is not null then
    return jsonb_build_object('success', false, 'status', 'revoked', 'message', 'This proposal link has been superseded');
  end if;

  if v_token.expires_at < now() then
    return jsonb_build_object('success', false, 'status', 'expired', 'message', 'This proposal link has expired');
  end if;

  -- 2. Lock version row
  select * into v_version
  from public.change_request_versions
  where id = v_token.version_id
  for update;

  -- 3. Check for existing decision on this version
  select * into v_existing_approval
  from public.approvals
  where version_id = v_version.id;

  if found then
    return jsonb_build_object(
      'success', false,
      'status', 'already_decided',
      'decision', v_existing_approval.decision,
      'decided_at', v_existing_approval.decided_at,
      'actor_name', v_existing_approval.actor_name,
      'message', 'A decision has already been recorded for this proposal'
    );
  end if;

  -- 4. Lock change request
  select * into v_req
  from public.change_requests
  where id = v_version.change_request_id
  for update;

  if v_req.status != 'pending_approval' or v_req.current_version != v_version.version_number then
    return jsonb_build_object(
      'success', false,
      'status', 'superseded',
      'message', 'This proposal version is no longer active'
    );
  end if;

  select * into v_proj
  from public.projects
  where id = v_req.project_id;

  -- 5. Insert approval record
  insert into public.approvals (
    version_id,
    decision,
    decision_actor_type,
    actor_name,
    audit_metadata
  ) values (
    v_version.id,
    v_decision_enum,
    'client_link',
    trim(p_actor_name),
    p_audit_meta
  );

  -- 6. Update change request to terminal status
  update public.change_requests
  set status = p_decision::public.change_request_status
  where id = v_req.id;

  -- 7. Mark token consumed
  update public.approval_tokens
  set consumed_at = timezone('utc'::text, now())
  where id = v_token.id;

  -- 8. Log activity
  insert into public.activity_logs (
    workspace_id,
    actor_type,
    actor_name,
    entity_type,
    entity_id,
    action,
    metadata
  ) values (
    v_proj.workspace_id,
    'client_link',
    trim(p_actor_name),
    'change_request',
    v_req.id,
    'change_request_' || p_decision,
    jsonb_build_object(
      'version_number', v_version.version_number,
      'decision', p_decision,
      'client_name', trim(p_actor_name),
      'cost_minor', v_version.cost_minor,
      'currency', v_version.currency
    )
  );

  return jsonb_build_object(
    'success', true,
    'status', p_decision,
    'decided_at', timezone('utc'::text, now()),
    'actor_name', trim(p_actor_name),
    'version_number', v_version.version_number
  );
end;
$$;
