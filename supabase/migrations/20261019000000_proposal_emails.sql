-- Migration: Add client contact fields to projects and proposal_emails delivery log
-- Timestamp: 20261019000000_proposal_emails.sql

-- ============================================================================
-- 1. ADD NULLABLE CLIENT CONTACT FIELDS TO PROJECTS
-- ============================================================================

alter table public.projects
  add column if not exists client_contact_name text check (client_contact_name is null or char_length(trim(client_contact_name)) >= 1),
  add column if not exists client_contact_email text check (
    client_contact_email is null or (
      char_length(client_contact_email) <= 255 and
      client_contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    )
  );

-- ============================================================================
-- 2. CREATE TABLE: proposal_emails (Delivery Log)
-- ============================================================================

create table if not exists public.proposal_emails (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  change_request_id uuid not null references public.change_requests(id) on delete cascade,
  version_id uuid not null references public.change_request_versions(id) on delete cascade,
  recipient_email text not null check (
    char_length(trim(recipient_email)) >= 3 and
    char_length(recipient_email) <= 255 and
    recipient_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  ),
  recipient_name text,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  provider text not null default 'resend',
  provider_message_id text,
  error_code text,
  sent_by uuid references public.profiles(id) on delete set null,
  personal_note_present boolean not null default false,
  send_attempt_key text not null unique,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

-- Indexes for performance & query isolation
create index if not exists idx_proposal_emails_workspace_id on public.proposal_emails(workspace_id);
create index if not exists idx_proposal_emails_change_request_id on public.proposal_emails(change_request_id);
create index if not exists idx_proposal_emails_version_id on public.proposal_emails(version_id);
create index if not exists idx_proposal_emails_created_at on public.proposal_emails(change_request_id, created_at desc);

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

alter table public.proposal_emails enable row level security;

-- Default Deny on Direct Client Mutations
create policy "proposal_emails_deny_direct_insert"
  on public.proposal_emails for insert
  to authenticated, anon
  with check (false);

create policy "proposal_emails_deny_direct_update"
  on public.proposal_emails for update
  to authenticated, anon
  using (false);

create policy "proposal_emails_deny_direct_delete"
  on public.proposal_emails for delete
  to authenticated, anon
  using (false);

-- Select Policy: Owners and Managers of the active workspace only.
-- Members are strictly denied access to the delivery log. Anon is denied.
create policy "proposal_emails_select_owner_manager"
  on public.proposal_emails for select
  to authenticated
  using (
    public.workspace_role(workspace_id) in ('owner', 'manager')
  );

-- Revoke all table mutations and select from anon
revoke all on public.proposal_emails from anon;
grant select on public.proposal_emails to authenticated;

-- ============================================================================
-- 4. SECURITY DEFINER FUNCTIONS
-- ============================================================================

-- Function 1: begin_proposal_email
-- Atomically validates permissions, change request state, rate limits, and inserts queued log.
create or replace function public.begin_proposal_email(
  p_change_request_id uuid,
  p_recipient_email text,
  p_recipient_name text,
  p_attempt_key text,
  p_personal_note_present boolean default false
)
returns uuid
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_caller_id uuid := auth.uid();
  v_req record;
  v_proj record;
  v_version record;
  v_existing_id uuid;
  v_normalized_email text;
  v_recent_count integer;
  v_last_sent timestamptz;
  v_email_row_id uuid;
begin
  if v_caller_id is null then
    raise exception 'Unauthorized: Authentication required to send proposals.';
  end if;

  -- 1. Idempotency Check: if attempt_key exists, return existing row id
  select id into v_existing_id
  from public.proposal_emails
  where send_attempt_key = p_attempt_key;

  if v_existing_id is not null then
    return v_existing_id;
  end if;

  -- 2. Validate email syntax
  v_normalized_email := lower(trim(p_recipient_email));
  if v_normalized_email is null or v_normalized_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then
    raise exception 'Invalid recipient email address: %', p_recipient_email;
  end if;

  -- 3. Lock and fetch change request
  select * into v_req
  from public.change_requests
  where id = p_change_request_id
  for update;

  if not found then
    raise exception 'Change request not found: %', p_change_request_id;
  end if;

  -- 4. Verify request status is pending_approval
  if v_req.status != 'pending_approval' then
    raise exception 'Illegal state: Proposals can only be sent to clients when pending approval (current status: %)', v_req.status;
  end if;

  -- 5. Verify caller role is owner or manager in the request''s project workspace
  select p.workspace_id, wm.role into v_proj
  from public.projects p
  join public.workspace_members wm on wm.workspace_id = p.workspace_id and wm.user_id = v_caller_id
  where p.id = v_req.project_id;

  if not found then
    raise exception 'Forbidden: You do not have access to this project.';
  end if;

  if v_proj.role not in ('owner', 'manager') then
    raise exception 'Forbidden: Only workspace owners and managers can send proposals to clients (your role: %).', v_proj.role;
  end if;

  -- 6. Locate active version record
  select * into v_version
  from public.change_request_versions
  where change_request_id = p_change_request_id and version_number = v_req.current_version;

  if not found then
    raise exception 'Current version record not found for change request %', p_change_request_id;
  end if;

  -- 7. Rate Limiting:
  -- Max 5 sends per change request per hour
  select count(*), max(created_at) into v_recent_count, v_last_sent
  from public.proposal_emails
  where change_request_id = p_change_request_id
    and created_at > (now() - interval '1 hour');

  if v_recent_count >= 5 then
    raise exception 'Rate limit exceeded: A maximum of 5 proposal emails can be sent per hour for this change request.';
  end if;

  -- 60-second cooldown between sends for this change request
  if v_last_sent is not null and v_last_sent > (now() - interval '60 seconds') then
    raise exception 'Cooldown active: Please wait at least 60 seconds between sending proposal emails.';
  end if;

  -- 8. Insert queued row
  insert into public.proposal_emails (
    workspace_id,
    change_request_id,
    version_id,
    recipient_email,
    recipient_name,
    status,
    provider,
    sent_by,
    personal_note_present,
    send_attempt_key
  ) values (
    v_proj.workspace_id,
    p_change_request_id,
    v_version.id,
    v_normalized_email,
    nullif(trim(p_recipient_name), ''),
    'queued',
    'resend',
    v_caller_id,
    coalesce(p_personal_note_present, false),
    p_attempt_key
  )
  returning id into v_email_row_id;

  return v_email_row_id;
end;
$$;

-- Function 2: complete_proposal_email
-- Updates delivery log status to sent or failed, and logs activity with safe metadata.
create or replace function public.complete_proposal_email(
  p_email_id uuid,
  p_status text,
  p_provider_message_id text default null,
  p_error_code text default null
)
returns void
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_caller_id uuid := auth.uid();
  v_row record;
  v_caller_role public.member_role;
  v_actor_name text;
begin
  if v_caller_id is null then
    raise exception 'Unauthorized: Authentication required.';
  end if;

  if p_status not in ('sent', 'failed') then
    raise exception 'Invalid status: Must be ''sent'' or ''failed'' (got %)', p_status;
  end if;

  select pe.*, crv.version_number into v_row
  from public.proposal_emails pe
  join public.change_request_versions crv on crv.id = pe.version_id
  where pe.id = p_email_id
  for update;

  if not found then
    raise exception 'Proposal email record not found: %', p_email_id;
  end if;

  v_caller_role := public.workspace_role(v_row.workspace_id);
  if v_caller_role is null or v_caller_role not in ('owner', 'manager') then
    raise exception 'Forbidden: Only workspace owners and managers can update email delivery status.';
  end if;

  update public.proposal_emails
  set status = p_status,
      provider_message_id = p_provider_message_id,
      error_code = p_error_code,
      sent_at = now()
  where id = p_email_id;

  select coalesce(full_name, email, 'Agency User') into v_actor_name
  from public.profiles
  where id = v_caller_id;

  -- Insert activity log with safe metadata ONLY (masked recipient, version, no token, no note text)
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
    v_row.workspace_id,
    'user',
    v_caller_id,
    coalesce(v_actor_name, 'Agency User'),
    'change_request',
    v_row.change_request_id,
    case when p_status = 'sent' then 'proposal_emailed' else 'proposal_email_failed' end,
    jsonb_build_object(
      'version_number', v_row.version_number,
      'recipient_masked', regexp_replace(v_row.recipient_email, '(?<=^.).*(?=@)', '***'),
      'status', p_status,
      'error_code', p_error_code
    )
  );
end;
$$;

-- Function 3: set_project_client_contact
-- Allows owners and managers to set the project's primary client contact for change proposals.
create or replace function public.set_project_client_contact(
  p_project_id uuid,
  p_contact_name text,
  p_contact_email text
)
returns void
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_caller_id uuid := auth.uid();
  v_proj record;
  v_normalized_email text;
  v_trimmed_name text;
  v_actor_name text;
begin
  if v_caller_id is null then
    raise exception 'Unauthorized: Authentication required.';
  end if;

  select p.*, wm.role into v_proj
  from public.projects p
  join public.workspace_members wm on wm.workspace_id = p.workspace_id and wm.user_id = v_caller_id
  where p.id = p_project_id;

  if not found or v_proj.role not in ('owner', 'manager') then
    raise exception 'Forbidden: Only workspace owners and managers can update project client contacts.';
  end if;

  v_trimmed_name := nullif(trim(p_contact_name), '');
  v_normalized_email := nullif(lower(trim(p_contact_email)), '');

  if v_normalized_email is not null and v_normalized_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then
    raise exception 'Invalid contact email address: %', p_contact_email;
  end if;

  update public.projects
  set client_contact_name = v_trimmed_name,
      client_contact_email = v_normalized_email,
      updated_at = now()
  where id = p_project_id;

  select coalesce(full_name, email, 'Agency User') into v_actor_name
  from public.profiles
  where id = v_caller_id;

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
    coalesce(v_actor_name, 'Agency User'),
    'project',
    p_project_id,
    'client_contact_updated',
    jsonb_build_object(
      'contact_name', v_trimmed_name,
      'contact_email_masked', case
        when v_normalized_email is not null then regexp_replace(v_normalized_email, '(?<=^.).*(?=@)', '***')
        else null
      end
    )
  );
end;
$$;

-- Permissions grants
grant execute on function public.begin_proposal_email to authenticated;
grant execute on function public.complete_proposal_email to authenticated;
grant execute on function public.set_project_client_contact to authenticated;

revoke execute on function public.begin_proposal_email from anon;
revoke execute on function public.complete_proposal_email from anon;
revoke execute on function public.set_project_client_contact from anon;
