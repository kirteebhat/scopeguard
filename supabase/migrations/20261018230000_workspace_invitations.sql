-- ============================================================================
-- ScopeGuard Migration: 20261018230000_workspace_invitations.sql
-- Workspace Team Invitations: Schema, RLS, Audit Logging, and Hardened Functions
-- ============================================================================

-- 1. CREATE WORKSPACE_INVITATIONS TABLE
create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null check (email = lower(trim(email)) and char_length(email) >= 3),
  role public.member_role not null check (role in ('manager', 'member')),
  token_hash text not null unique check (char_length(token_hash) = 64),
  status text not null check (status in ('pending', 'accepted', 'revoked', 'expired')) default 'pending',
  invited_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  last_sent_at timestamptz not null default now(),
  send_count integer not null default 1 check (send_count >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger for auto-updating updated_at
drop trigger if exists tr_workspace_invitations_updated_at on public.workspace_invitations;
create trigger tr_workspace_invitations_updated_at
  before update on public.workspace_invitations
  for each row execute function public.handle_updated_at();

-- 2. INDEXES & CONSTRAINTS

-- Exactly ONE pending invitation per (workspace_id, email)
create unique index if not exists idx_workspace_invitations_active_email
  on public.workspace_invitations (workspace_id, email)
  where (status = 'pending');

-- Performance indexes for lookup, status filtering, and token resolution
create index if not exists idx_workspace_invitations_workspace_id 
  on public.workspace_invitations (workspace_id);

create index if not exists idx_workspace_invitations_token_hash 
  on public.workspace_invitations (token_hash);

create index if not exists idx_workspace_invitations_status 
  on public.workspace_invitations (status);

-- 3. ROW-LEVEL SECURITY (DEFAULT DENY)
alter table public.workspace_invitations enable row level security;

-- Owners and Managers can select invitations within their workspace
drop policy if exists "workspace_invitations_select_policy" on public.workspace_invitations;
create policy "workspace_invitations_select_policy"
  on public.workspace_invitations
  for select
  to authenticated
  using (
    public.workspace_role(workspace_id) in ('owner', 'manager')
  );

-- Direct client updates, inserts, and deletes are disabled by omission (all changes via functions)

-- Revoke direct select on token_hash from client roles to ensure bearer hash confidentiality
revoke select on public.workspace_invitations from anon;
grant select (
  id, workspace_id, email, role, status, invited_by,
  expires_at, accepted_by, accepted_at, revoked_at,
  last_sent_at, send_count, created_at, updated_at
) on public.workspace_invitations to authenticated;
grant all on public.workspace_invitations to service_role;


-- ============================================================================
-- 4. SECURITY DEFINER DATABASE FUNCTIONS
-- Fixed search_path = public, pg_temp; transactional and hardened against hijacking
-- ============================================================================

-- Function 1: Create Workspace Invitation
create or replace function public.create_invitation(
  p_workspace_id uuid,
  p_email text,
  p_role text,
  p_token_hash text
)
returns uuid
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_caller_id uuid := auth.uid();
  v_caller_role public.member_role;
  v_email text := lower(trim(p_email));
  v_invitation_id uuid;
  v_inviter_name text;
begin
  -- 1. Validate caller authentication
  if v_caller_id is null then
    raise exception 'Unauthorized: Authentication required to create invitations.';
  end if;

  -- 2. Resolve caller role in this workspace
  v_caller_role := public.workspace_role(p_workspace_id);
  if v_caller_role is null or v_caller_role = 'member' then
    raise exception 'Permission denied: Only workspace owners and managers can invite team members.';
  end if;

  -- 3. Validate role parameter
  if p_role not in ('manager', 'member') then
    raise exception 'Invalid invitation role: ''%''. Permitted roles are ''manager'' or ''member''.', p_role;
  end if;

  -- 4. Role hierarchy check: Managers can only invite Members (not Managers)
  if v_caller_role = 'manager' and p_role != 'member' then
    raise exception 'Permission denied: Managers are only authorized to invite Members.';
  end if;

  -- 5. Validate email format
  if v_email is null or char_length(v_email) < 5 or v_email not like '%@%.%' then
    raise exception 'Invalid email address provided.';
  end if;

  -- 6. Check if email is already an active member of this workspace
  if exists (
    select 1
    from public.workspace_members wm
    join public.profiles p on p.id = wm.user_id
    where wm.workspace_id = p_workspace_id
      and lower(p.email) = v_email
  ) then
    raise exception 'User with email % is already an active member of this workspace.', v_email;
  end if;

  -- 7. Daily rate limit check (max 20 pending invitations per 24 hours per workspace)
  if (
    select count(*)
    from public.workspace_invitations
    where workspace_id = p_workspace_id
      and created_at >= (now() - interval '24 hours')
  ) >= 20 then
    raise exception 'Daily invitation limit reached for this workspace (maximum 20 invitations per 24 hours).';
  end if;

  -- 8. Insert invitation record
  insert into public.workspace_invitations (
    workspace_id,
    email,
    role,
    token_hash,
    status,
    invited_by,
    expires_at,
    last_sent_at,
    send_count
  ) values (
    p_workspace_id,
    v_email,
    p_role::public.member_role,
    p_token_hash,
    'pending',
    v_caller_id,
    (now() + interval '7 days'),
    now(),
    1
  )
  returning id into v_invitation_id;

  -- 9. Record audit activity log
  select coalesce(full_name, email) into v_inviter_name from public.profiles where id = v_caller_id;

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
    p_workspace_id,
    'user',
    v_caller_id,
    coalesce(v_inviter_name, 'Agency User'),
    'workspace_invitation',
    v_invitation_id,
    'invitation_created',
    jsonb_build_object(
      'role', p_role,
      'email_masked', regexp_replace(v_email, '(?<=^.).*(?=@)', '***')
    )
  );

  return v_invitation_id;
end;
$$;


-- Function 2: Resend / Regenerate Invitation
create or replace function public.resend_invitation(
  p_invitation_id uuid,
  p_new_token_hash text
)
returns void
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_caller_id uuid := auth.uid();
  v_caller_role public.member_role;
  v_inv record;
begin
  if v_caller_id is null then
    raise exception 'Unauthorized: Authentication required to resend invitations.';
  end if;

  select * into v_inv
  from public.workspace_invitations
  where id = p_invitation_id
  for update;

  if not found then
    raise exception 'Invitation record not found.';
  end if;

  if v_inv.status != 'pending' then
    raise exception 'Cannot resend invitation: Status is currently ''%''. Only pending invitations can be resent.', v_inv.status;
  end if;

  v_caller_role := public.workspace_role(v_inv.workspace_id);
  if v_caller_role is null or v_caller_role = 'member' then
    raise exception 'Permission denied: Only workspace owners and managers can manage invitations.';
  end if;

  -- Enforce 60-second cooldown
  if v_inv.last_sent_at > (now() - interval '60 seconds') then
    raise exception 'Cooldown active: Please wait at least 60 seconds between resends.';
  end if;

  -- Enforce maximum resends limit per invitation
  if v_inv.send_count >= 10 then
    raise exception 'Maximum send limit reached for this invitation (maximum 10 attempts).';
  end if;

  update public.workspace_invitations
  set token_hash = p_new_token_hash,
      expires_at = (now() + interval '7 days'),
      last_sent_at = now(),
      send_count = send_count + 1,
      updated_at = now()
  where id = p_invitation_id;

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
    v_inv.workspace_id,
    'user',
    v_caller_id,
    coalesce((select full_name from public.profiles where id = v_caller_id), 'Agency User'),
    'workspace_invitation',
    v_inv.id,
    'invitation_resent',
    jsonb_build_object(
      'role', v_inv.role,
      'send_count', v_inv.send_count + 1,
      'email_masked', regexp_replace(v_inv.email, '(?<=^.).*(?=@)', '***')
    )
  );
end;
$$;


-- Function 3: Revoke Workspace Invitation
create or replace function public.revoke_invitation(
  p_invitation_id uuid
)
returns void
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_caller_id uuid := auth.uid();
  v_caller_role public.member_role;
  v_inv record;
begin
  if v_caller_id is null then
    raise exception 'Unauthorized: Authentication required to revoke invitations.';
  end if;

  select * into v_inv
  from public.workspace_invitations
  where id = p_invitation_id
  for update;

  if not found then
    raise exception 'Invitation record not found.';
  end if;

  if v_inv.status != 'pending' then
    raise exception 'Cannot revoke invitation: Status is currently ''%''.', v_inv.status;
  end if;

  v_caller_role := public.workspace_role(v_inv.workspace_id);
  if v_caller_role is null or v_caller_role = 'member' then
    raise exception 'Permission denied: Only workspace owners and managers can revoke invitations.';
  end if;

  update public.workspace_invitations
  set status = 'revoked',
      revoked_at = now(),
      updated_at = now()
  where id = p_invitation_id;

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
    v_inv.workspace_id,
    'user',
    v_caller_id,
    coalesce((select full_name from public.profiles where id = v_caller_id), 'Agency User'),
    'workspace_invitation',
    v_inv.id,
    'invitation_revoked',
    jsonb_build_object(
      'role', v_inv.role,
      'email_masked', regexp_replace(v_inv.email, '(?<=^.).*(?=@)', '***')
    )
  );
end;
$$;


-- Function 4: Public Safe Token Resolution
create or replace function public.get_invitation_by_token(
  p_token_hash text
)
returns table (
  workspace_name text,
  role public.member_role,
  invited_email_masked text,
  inviter_name text,
  status text,
  expires_at timestamptz
)
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_inv record;
  v_ws_name text;
  v_inviter_name text;
  v_effective_status text;
begin
  select wi.*, w.name as ws_name, coalesce(p.full_name, 'Team Administrator') as inv_name
  into v_inv
  from public.workspace_invitations wi
  join public.workspaces w on w.id = wi.workspace_id
  join public.profiles p on p.id = wi.invited_by
  where wi.token_hash = p_token_hash;

  if not found then
    return;
  end if;

  v_effective_status := v_inv.status;
  if v_effective_status = 'pending' and v_inv.expires_at < now() then
    v_effective_status := 'expired';
  end if;

  workspace_name := v_inv.ws_name;
  role := v_inv.role;
  invited_email_masked := regexp_replace(v_inv.email, '(?<=^.).*(?=@)', '***');
  inviter_name := v_inv.inv_name;
  status := v_effective_status;
  expires_at := v_inv.expires_at;
  return next;
end;
$$;


-- Function 5: Accept Workspace Invitation
create or replace function public.accept_invitation(
  p_token_hash text
)
returns jsonb
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_caller_id uuid := auth.uid();
  v_caller_email text;
  v_inv record;
begin
  if v_caller_id is null then
    raise exception 'Unauthorized: You must log in or sign up before accepting this invitation.';
  end if;

  -- 1. Resolve authenticated caller email from profile or auth.users
  select lower(trim(email)) into v_caller_email
  from public.profiles
  where id = v_caller_id;

  if v_caller_email is null then
    -- Fallback to auth.users in simulated or test environments
    select lower(trim(email)) into v_caller_email
    from auth.users
    where id = v_caller_id;
  end if;

  if v_caller_email is null then
    raise exception 'Caller profile not found or email address is missing.';
  end if;

  -- 2. Lookup invitation record for update
  select * into v_inv
  from public.workspace_invitations
  where token_hash = p_token_hash
  for update;

  if not found then
    raise exception 'Invalid invitation token.';
  end if;

  -- 3. Validate status
  if v_inv.status = 'revoked' then
    raise exception 'This invitation has been revoked by the workspace administrator.';
  end if;

  if v_inv.status = 'expired' or v_inv.expires_at < now() then
    update public.workspace_invitations
    set status = 'expired', updated_at = now()
    where id = v_inv.id;
    raise exception 'This invitation link has expired. Please ask your administrator for a new invitation.';
  end if;

  if v_inv.status = 'accepted' then
    -- Check if caller is already a member (idempotent acceptance)
    if exists (
      select 1
      from public.workspace_members
      where workspace_id = v_inv.workspace_id and user_id = v_caller_id
    ) then
      return jsonb_build_object(
        'success', true,
        'already_member', true,
        'workspace_id', v_inv.workspace_id,
        'role', v_inv.role
      );
    else
      raise exception 'This invitation has already been accepted by another account.';
    end if;
  end if;

  -- 4. Strict Email Match Requirement (Case-insensitive)
  if lower(trim(v_caller_email)) != lower(trim(v_inv.email)) then
    raise exception 'Email mismatch: This invitation was issued for %, but you are currently authenticated as %.',
      regexp_replace(v_inv.email, '(?<=^.).*(?=@)', '***'),
      regexp_replace(v_caller_email, '(?<=^.).*(?=@)', '***');
  end if;

  -- 5. Atomically insert into workspace_members (idempotent on conflict)
  insert into public.workspace_members (
    workspace_id,
    user_id,
    role
  ) values (
    v_inv.workspace_id,
    v_caller_id,
    v_inv.role
  )
  on conflict (workspace_id, user_id) do update
    set role = v_inv.role,
        updated_at = now();

  -- 6. Mark invitation accepted
  update public.workspace_invitations
  set status = 'accepted',
      accepted_by = v_caller_id,
      accepted_at = now(),
      updated_at = now()
  where id = v_inv.id;

  -- 7. Record audit activity log
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
    v_inv.workspace_id,
    'user',
    v_caller_id,
    coalesce((select full_name from public.profiles where id = v_caller_id), v_caller_email),
    'workspace_invitation',
    v_inv.id,
    'invitation_accepted',
    jsonb_build_object(
      'role', v_inv.role,
      'email_masked', regexp_replace(v_inv.email, '(?<=^.).*(?=@)', '***')
    )
  );

  return jsonb_build_object(
    'success', true,
    'already_member', false,
    'workspace_id', v_inv.workspace_id,
    'role', v_inv.role
  );
end;
$$;


-- ============================================================================
-- 5. FUNCTION EXECUTION PRIVILEGES
-- ============================================================================
grant execute on function public.get_invitation_by_token(text) to anon, authenticated, service_role;
grant execute on function public.accept_invitation(text) to authenticated, service_role;
revoke execute on function public.accept_invitation(text) from anon;

grant execute on function public.create_invitation(uuid, text, text, text) to authenticated, service_role;
grant execute on function public.resend_invitation(uuid, text) to authenticated, service_role;
grant execute on function public.revoke_invitation(uuid) to authenticated, service_role;

revoke execute on function public.create_invitation(uuid, text, text, text) from anon;
revoke execute on function public.resend_invitation(uuid, text) from anon;
revoke execute on function public.revoke_invitation(uuid) from anon;
