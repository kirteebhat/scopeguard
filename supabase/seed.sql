-- ============================================================================
-- ScopeGuard Demo Seed Script
-- WARNING: FOR DEMO AND LOCAL DEVELOPMENT PURPOSES ONLY.
-- DO NOT RUN THIS IN A PRODUCTION ENVIRONMENT WITH LIVE USER DATA.
-- ============================================================================

-- Clean up any existing demo records
delete from public.activity_logs where workspace_id in ('d0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002');
delete from public.workspaces where id in ('d0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002');

-- ----------------------------------------------------------------------------
-- 1. DEMO USER & PROFILES
-- ----------------------------------------------------------------------------
-- Note: In Supabase, profiles link to auth.users. For seed execution, ensure a user
-- exists or create the profile mock.
insert into public.profiles (id, full_name, avatar_url, created_at, updated_at)
values 
  ('u0000000-0000-0000-0000-000000000001', 'Sarah Jenkins', null, now(), now()),
  ('u0000000-0000-0000-0000-000000000002', 'David Miller', null, now(), now())
on conflict (id) do update set full_name = excluded.full_name;

-- ----------------------------------------------------------------------------
-- 2. DEMO WORKSPACE & MEMBERSHIP
-- ----------------------------------------------------------------------------
insert into public.workspaces (id, name, slug, plan, created_at, updated_at)
values 
  ('d0000000-0000-0000-0000-000000000001', 'Apex Digital Agency [DEMO DATA]', 'apex-digital-demo', 'free', now(), now()),
  ('d0000000-0000-0000-0000-000000000002', 'Kestrel Interactive [DEMO DATA]', 'kestrel-demo', 'pro', now(), now());

insert into public.workspace_members (workspace_id, user_id, role, created_at)
values 
  ('d0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000001', 'owner', now()),
  ('d0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000002', 'manager', now())
on conflict (workspace_id, user_id) do nothing;

-- ----------------------------------------------------------------------------
-- 3. DEMO PROJECTS
-- ----------------------------------------------------------------------------
-- Project 1: Healthcare Portal (USD, Active with Approved & Pending Changes)
insert into public.projects (
  id, workspace_id, name, client_name, currency,
  budget_minor, hourly_rate_minor, start_date, original_deadline,
  description, status, created_by, created_at, updated_at
) values (
  'p0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001',
  'BioHealth Patient Portal [DEMO]',
  'Northwestern Health Systems',
  'USD',
  7500000, -- $75,000.00
  17500,   -- $175.00/hr
  '2026-09-01',
  '2026-12-15',
  'HIPAA-compliant patient appointment scheduling and telehealth portal.',
  'active',
  'u0000000-0000-0000-0000-000000000001',
  now() - interval '45 days',
  now()
);

-- Project 2: FinTech Reconciliation (INR, Active)
insert into public.projects (
  id, workspace_id, name, client_name, currency,
  budget_minor, hourly_rate_minor, start_date, original_deadline,
  description, status, created_by, created_at, updated_at
) values (
  'p0000000-0000-0000-0000-000000000002',
  'd0000000-0000-0000-0000-000000000001',
  'PayMatrix Settlement Gateway [DEMO]',
  'Axis Retail Tech Ltd',
  'INR',
  125000000, -- ₹1,250,000.00 (125,000,000 paise)
  250000,    -- ₹2,500.00/hr (250,000 paise)
  '2026-10-01',
  '2027-01-31',
  'Core automated ledger settlement integration with payment gateways.',
  'active',
  'u0000000-0000-0000-0000-000000000001',
  now() - interval '20 days',
  now()
);

-- ----------------------------------------------------------------------------
-- 4. DEMO DELIVERABLES
-- ----------------------------------------------------------------------------
insert into public.deliverables (id, project_id, title, description, status, created_at)
values 
  ('d1000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000001', 'HIPAA Auth & Telehealth WebRTC Engine', 'Secure authentication and video streaming architecture', 'completed', now() - interval '40 days'),
  ('d1000000-0000-0000-0000-000000000002', 'p0000000-0000-0000-0000-000000000001', 'Patient Records & EHR Ingestion', 'Bi-directional EHR synchronization', 'in_progress', now() - interval '30 days'),
  ('d1000000-0000-0000-0000-000000000003', 'p0000000-0000-0000-0000-000000000002', 'Settlement Batch Processor', 'Automated nightly banking ledger reconcile', 'in_progress', now() - interval '15 days');

-- ----------------------------------------------------------------------------
-- 5. DEMO CHANGE REQUEST 1: APPROVED
-- ----------------------------------------------------------------------------
insert into public.change_requests (
  id, project_id, title, description, affected_deliverable_id,
  pricing_method, estimated_hours, hourly_rate_minor, cost_minor,
  proposed_deadline, reason, internal_notes, status, current_version,
  created_by, created_at, updated_at
) values (
  'c0000000-0000-0000-0000-000000000001',
  'p0000000-0000-0000-0000-000000000001',
  'SMS Two-Factor Authentication Integration [DEMO]',
  'Integrate Twilio Verify for high-risk clinical logons.',
  'd1000000-0000-0000-0000-000000000001',
  'hourly',
  20.00,
  17500,
  350000, -- $3,500.00
  '2026-12-22',
  'Client security audit mandated SMS 2FA before production deployment.',
  'INTERNAL ONLY: Retain 40% margin on Twilio SMS per-message fees.',
  'approved',
  1,
  'u0000000-0000-0000-0000-000000000001',
  now() - interval '14 days',
  now() - interval '12 days'
);

-- Version 1 Snapshot
insert into public.change_request_versions (
  id, change_request_id, version_number, title, description,
  pricing_method, cost_minor, currency, proposed_deadline,
  snapshot, published_by, created_at
) values (
  'v0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  1,
  'SMS Two-Factor Authentication Integration [DEMO]',
  'Integrate Twilio Verify for high-risk clinical logons.',
  'hourly',
  350000,
  'USD',
  '2026-12-22',
  jsonb_build_object(
    'title', 'SMS Two-Factor Authentication Integration [DEMO]',
    'description', 'Integrate Twilio Verify for high-risk clinical logons.',
    'reason', 'Client security audit mandated SMS 2FA before production deployment.',
    'pricing_method', 'hourly',
    'estimated_hours', 20.0,
    'hourly_rate_minor', 17500,
    'cost_minor', 350000,
    'currency', 'USD',
    'proposed_deadline', '2026-12-22',
    'original_contract', jsonb_build_object(
      'project_name', 'BioHealth Patient Portal [DEMO]',
      'client_name', 'Northwestern Health Systems',
      'budget_minor', 7500000,
      'original_deadline', '2026-12-15'
    ),
    'disclaimer', 'Estimate, not a contract or legally binding quote'
  ),
  'u0000000-0000-0000-0000-000000000001',
  now() - interval '14 days'
);

-- Approval Record (Approved by client)
insert into public.approvals (
  id, version_id, decision, decided_at, decision_actor_type,
  actor_name, audit_metadata
) values (
  'a0000000-0000-0000-0000-000000000001',
  'v0000000-0000-0000-0000-000000000001',
  'approved',
  now() - interval '12 days',
  'client_link',
  'Dr. Robert Vance (VP of Medical Systems)',
  jsonb_build_object(
    'client_ip_hash', 'sha256_demo_salted_hash_948f',
    'user_agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
  )
);

-- ----------------------------------------------------------------------------
-- 6. DEMO CHANGE REQUEST 2: PENDING APPROVAL
-- ----------------------------------------------------------------------------
insert into public.change_requests (
  id, project_id, title, description, affected_deliverable_id,
  pricing_method, estimated_hours, hourly_rate_minor, cost_minor,
  proposed_deadline, reason, internal_notes, status, current_version,
  created_by, created_at, updated_at
) values (
  'c0000000-0000-0000-0000-000000000002',
  'p0000000-0000-0000-0000-000000000001',
  'Epic EHR Real-Time Webhook Feed [DEMO]',
  'Push incoming lab results directly to mobile clinician devices.',
  'd1000000-0000-0000-0000-000000000002',
  'hourly',
  16.00,
  17500,
  280000, -- $2,800.00
  '2026-12-30',
  'Requested during October sprint review to eliminate manual lab sync.',
  'INTERNAL: Fast turnaround needed; allocate senior backend engineer.',
  'pending_approval',
  1,
  'u0000000-0000-0000-0000-000000000001',
  now() - interval '2 days',
  now() - interval '2 days'
);

insert into public.change_request_versions (
  id, change_request_id, version_number, title, description,
  pricing_method, cost_minor, currency, proposed_deadline,
  snapshot, published_by, created_at
) values (
  'v0000000-0000-0000-0000-000000000002',
  'c0000000-0000-0000-0000-000000000002',
  1,
  'Epic EHR Real-Time Webhook Feed [DEMO]',
  'Push incoming lab results directly to mobile clinician devices.',
  'hourly',
  280000,
  'USD',
  '2026-12-30',
  jsonb_build_object(
    'title', 'Epic EHR Real-Time Webhook Feed [DEMO]',
    'description', 'Push incoming lab results directly to mobile clinician devices.',
    'pricing_method', 'hourly',
    'cost_minor', 280000,
    'currency', 'USD',
    'proposed_deadline', '2026-12-30',
    'disclaimer', 'Estimate, not a contract or legally binding quote'
  ),
  'u0000000-0000-0000-0000-000000000001',
  now() - interval '2 days'
);

-- Active Demo Token for Pending Proposal (Mock Hash)
insert into public.approval_tokens (
  id, version_id, token_hash, expires_at, revoked_at, created_by, created_at
) values (
  't0000000-0000-0000-0000-000000000002',
  'v0000000-0000-0000-0000-000000000002',
  -- SHA-256 hash of "demo_token_epic_ehr_2026"
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  now() + interval '12 days',
  null,
  'u0000000-0000-0000-0000-000000000001',
  now() - interval '2 days'
);

-- ----------------------------------------------------------------------------
-- 7. DEMO ACTIVITY LOGS
-- ----------------------------------------------------------------------------
insert into public.activity_logs (
  workspace_id, actor_type, actor_id, actor_name,
  entity_type, entity_id, action, metadata, created_at
) values 
  (
    'd0000000-0000-0000-0000-000000000001',
    'user',
    'u0000000-0000-0000-0000-000000000001',
    'Sarah Jenkins',
    'project',
    'p0000000-0000-0000-0000-000000000001',
    'project_created',
    jsonb_build_object('project_name', 'BioHealth Patient Portal [DEMO]', 'budget_minor', 7500000),
    now() - interval '45 days'
  ),
  (
    'd0000000-0000-0000-0000-000000000001',
    'client_link',
    null,
    'Client (Dr. Robert Vance (VP of Medical Systems))',
    'change_request',
    'c0000000-0000-0000-0000-000000000001',
    'change_request_approved',
    jsonb_build_object('version_number', 1, 'decision', 'approved', 'cost_minor', 350000, 'currency', 'USD'),
    now() - interval '12 days'
  ),
  (
    'd0000000-0000-0000-0000-000000000001',
    'user',
    'u0000000-0000-0000-0000-000000000001',
    'Sarah Jenkins',
    'change_request',
    'c0000000-0000-0000-0000-000000000002',
    'change_request_published',
    jsonb_build_object('version_number', 1, 'cost_minor', 280000, 'currency', 'USD'),
    now() - interval '2 days'
  );

