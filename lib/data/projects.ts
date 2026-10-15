import {
  getAuthenticatedContext,
  requireRole,
  type AuthContext,
} from "./auth-context";
import { NotFoundError, ForbiddenError } from "./errors";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { logActivity } from "./activity";
import {
  calculateProjectRollup,
  type ApprovedVersionSnapshot,
  type PendingProposalSnapshot,
  type ProjectFinancialRollup,
} from "@/lib/domain/impact";
import type { Database } from "@/lib/supabase/database.types";

export type ProjectStatus = Database["public"]["Enums"]["project_status"];

export interface ProjectListItem {
  id: string;
  workspaceId: string;
  name: string;
  clientName: string;
  status: ProjectStatus;
  currency: string;
  budgetMinor: number;
  hourlyRateMinor: number;
  startDate: string;
  originalDeadline: string;
  revisedDeadline: string;
  deltaDays: number;
  approvedExtraMinor: number;
  revisedBudgetMinor: number;
  pendingRequestsCount: number;
  pendingExtraMinor: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetail extends ProjectListItem {
  description?: string | null;
  createdBy: string | null;
  deliverablesCount: number;
  financialRollup: ProjectFinancialRollup;
}

export interface CreateProjectData {
  name: string;
  clientName: string;
  description?: string | null;
  currency: string;
  budgetMinor: number;
  hourlyRateMinor: number;
  startDate: string;
  originalDeadline: string;
  deliverables?: Array<{ title: string; description?: string | null }>;
}

export interface UpdateProjectData {
  name?: string;
  clientName?: string;
  description?: string | null;
  currency?: string;
  budgetMinor?: number;
  hourlyRateMinor?: number;
  startDate?: string;
  originalDeadline?: string;
  status?: ProjectStatus;
}

interface ProjectDbRow {
  id: string;
  workspace_id: string;
  name: string;
  client_name: string;
  status: ProjectStatus;
  currency: string;
  budget_minor: number;
  hourly_rate_minor: number;
  start_date: string;
  original_deadline: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Lists all projects within the authenticated caller's active workspace.
 * Automatically computes financial rollups and revised deadlines from approved version snapshots.
 */
export async function getWorkspaceProjects(): Promise<ProjectListItem[]> {
  const context = await getAuthenticatedContext();
  const adminClient = createServiceRoleClient();

  // 1. Fetch all projects in workspace
  const { data: projectsData, error: projectsError } = await adminClient
    .from("projects")
    .select("*")
    .eq("workspace_id", context.workspace.id)
    .order("created_at", { ascending: false });

  if (projectsError || !projectsData) {
    throw new Error(projectsError?.message || "Failed to fetch workspace projects.");
  }

  const projects = projectsData as ProjectDbRow[];
  if (projects.length === 0) return [];

  const projectIds = projects.map((p) => p.id);

  // 2. Fetch change requests and approved versions across these projects
  const projectCurrencyMap = new Map(projects.map((p) => [p.id, p.currency]));

  const { data: crData } = await adminClient
    .from("change_requests")
    .select(`
      id,
      project_id,
      status,
      cost_minor,
      proposed_deadline,
      change_request_versions (
        id,
        version_number,
        cost_minor,
        currency,
        proposed_deadline,
        approvals (
          id,
          decision,
          decided_at
        )
      )
    `)
    .in("project_id", projectIds);

  // Group approved snapshots and pending proposals per project
  const approvedMap = new Map<string, ApprovedVersionSnapshot[]>();
  const pendingMap = new Map<string, PendingProposalSnapshot[]>();

  interface CrRow {
    id: string;
    project_id: string;
    status: string;
    cost_minor: number;
    proposed_deadline: string | null;
    change_request_versions?: Array<{
      id: string;
      version_number: number;
      cost_minor: number;
      currency: string;
      proposed_deadline: string | null;
      approvals?: Array<{ id: string; decision: string; decided_at: string }> | null;
    }>;
  }

  const changeRequests = (crData || []) as unknown as CrRow[];

  for (const cr of changeRequests) {
    // Process approved versions
    if (cr.change_request_versions) {
      for (const ver of cr.change_request_versions) {
        const rawApproval = ver.approvals;
        const approval = Array.isArray(rawApproval)
          ? rawApproval[0]
          : (rawApproval as { id: string; decision: string; decided_at: string } | null | undefined);
        if (approval && approval.decision === "approved") {
          const list = approvedMap.get(cr.project_id) || [];
          list.push({
            versionId: ver.id,
            changeRequestId: cr.id,
            versionNumber: ver.version_number,
            costMinor: ver.cost_minor,
            currency: ver.currency,
            proposedDeadline: ver.proposed_deadline,
            approvedAt: approval.decided_at,
          });
          approvedMap.set(cr.project_id, list);
        }
      }
    }

    // Process pending proposals (unapproved display)
    if (cr.status === "pending_approval") {
      const pendingList = pendingMap.get(cr.project_id) || [];
      pendingList.push({
        changeRequestId: cr.id,
        costMinor: cr.cost_minor,
        currency: projectCurrencyMap.get(cr.project_id) || "USD",
        proposedDeadline: cr.proposed_deadline,
      });
      pendingMap.set(cr.project_id, pendingList);
    }
  }

  // 3. Compute rollups per project
  return projects.map((p) => {
    const approved = approvedMap.get(p.id) || [];
    const pending = pendingMap.get(p.id) || [];

    const rollup = calculateProjectRollup(
      {
        id: p.id,
        name: p.name,
        currency: p.currency,
        budgetMinor: p.budget_minor,
        originalDeadline: p.original_deadline,
      },
      approved,
      pending
    );

    return {
      id: p.id,
      workspaceId: p.workspace_id,
      name: p.name,
      clientName: p.client_name,
      status: p.status,
      currency: p.currency,
      budgetMinor: p.budget_minor,
      hourlyRateMinor: p.hourly_rate_minor,
      startDate: p.start_date,
      originalDeadline: p.original_deadline,
      revisedDeadline: rollup.revisedDeadline,
      deltaDays: rollup.deltaDays,
      approvedExtraMinor: rollup.approvedExtraMinor,
      revisedBudgetMinor: rollup.revisedBudgetMinor,
      pendingRequestsCount: pending.length,
      pendingExtraMinor: rollup.pendingExtraMinor,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    };
  });
}

/**
 * Retrieves full details for a single project within the caller's workspace.
 */
export async function getProjectById(projectId: string): Promise<ProjectDetail> {
  const context = await getAuthenticatedContext();
  const adminClient = createServiceRoleClient();

  const { data: projectData, error: projectError } = await adminClient
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle();

  if (projectError || !projectData) {
    throw new NotFoundError(`Project with ID '${projectId}' was not found in your workspace.`);
  }

  const project = projectData as ProjectDbRow;

  // Fetch deliverables count
  const { count: deliverablesCount } = await adminClient
    .from("deliverables")
    .select("id", { count: "exact", head: true })
    .eq("project_id", project.id);

  // Fetch change requests and approved version snapshots
  const { data: crData } = await adminClient
    .from("change_requests")
    .select(`
      id,
      project_id,
      status,
      cost_minor,
      proposed_deadline,
      change_request_versions (
        id,
        version_number,
        cost_minor,
        currency,
        proposed_deadline,
        approvals (
          id,
          decision,
          decided_at
        )
      )
    `)
    .eq("project_id", project.id);

  const approvedVersions: ApprovedVersionSnapshot[] = [];
  const pendingProposals: PendingProposalSnapshot[] = [];

  interface CrRow {
    id: string;
    project_id: string;
    status: string;
    cost_minor: number;
    proposed_deadline: string | null;
    change_request_versions?: Array<{
      id: string;
      version_number: number;
      cost_minor: number;
      currency: string;
      proposed_deadline: string | null;
      approvals?: Array<{ id: string; decision: string; decided_at: string }> | null;
    }>;
  }

  const changeRequests = (crData || []) as unknown as CrRow[];

  for (const cr of changeRequests) {
    if (cr.change_request_versions) {
      for (const ver of cr.change_request_versions) {
        const rawApproval = ver.approvals;
        const approval = Array.isArray(rawApproval)
          ? rawApproval[0]
          : (rawApproval as { id: string; decision: string; decided_at: string } | null | undefined);
        if (approval && approval.decision === "approved") {
          approvedVersions.push({
            versionId: ver.id,
            changeRequestId: cr.id,
            versionNumber: ver.version_number,
            costMinor: ver.cost_minor,
            currency: ver.currency,
            proposedDeadline: ver.proposed_deadline,
            approvedAt: approval.decided_at,
          });
        }
      }
    }

    if (cr.status === "pending_approval") {
      pendingProposals.push({
        changeRequestId: cr.id,
        costMinor: cr.cost_minor,
        currency: project.currency,
        proposedDeadline: cr.proposed_deadline,
      });
    }
  }

  const rollup = calculateProjectRollup(
    {
      id: project.id,
      name: project.name,
      currency: project.currency,
      budgetMinor: project.budget_minor,
      originalDeadline: project.original_deadline,
    },
    approvedVersions,
    pendingProposals
  );

  return {
    id: project.id,
    workspaceId: project.workspace_id,
    name: project.name,
    clientName: project.client_name,
    status: project.status,
    currency: project.currency,
    budgetMinor: project.budget_minor,
    hourlyRateMinor: project.hourly_rate_minor,
    startDate: project.start_date,
    originalDeadline: project.original_deadline,
    revisedDeadline: rollup.revisedDeadline,
    deltaDays: rollup.deltaDays,
    approvedExtraMinor: rollup.approvedExtraMinor,
    revisedBudgetMinor: rollup.revisedBudgetMinor,
    pendingRequestsCount: pendingProposals.length,
    pendingExtraMinor: rollup.pendingExtraMinor,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
    createdBy: project.created_by,
    deliverablesCount: deliverablesCount || 0,
    financialRollup: rollup,
  };
}

/**
 * Creates a new project in the active workspace.
 * Guarded: Only 'owner' or 'manager' can create projects.
 */
export async function createProject(
  data: CreateProjectData,
  customContext?: AuthContext
): Promise<ProjectDbRow> {
  const context = await requireRole(["owner", "manager"], customContext);
  const adminClient = createServiceRoleClient();

  const { data: createdProject, error: projectError } = await adminClient
    .from("projects")
    .insert({
      workspace_id: context.workspace.id,
      name: data.name.trim(),
      client_name: data.clientName.trim(),
      currency: data.currency.toUpperCase().trim(),
      budget_minor: data.budgetMinor,
      hourly_rate_minor: data.hourlyRateMinor,
      start_date: data.startDate,
      original_deadline: data.originalDeadline,
      created_by: context.user.id,
      status: "active",
    })
    .select("*")
    .single();

  if (projectError || !createdProject) {
    throw new Error(projectError?.message || "Failed to create project.");
  }

  const project = createdProject as ProjectDbRow;

  // Insert initial deliverables if provided
  if (data.deliverables && data.deliverables.length > 0) {
    const deliverablesToInsert = data.deliverables
      .filter((d) => d.title.trim().length > 0)
      .map((d) => ({
        project_id: project.id,
        title: d.title.trim(),
        description: d.description?.trim() || null,
        status: "pending" as const,
      }));

    if (deliverablesToInsert.length > 0) {
      const { error: delError } = await adminClient
        .from("deliverables")
        .insert(deliverablesToInsert);

      if (delError) {
        console.error("[createProject] Failed to insert initial deliverables:", delError.message);
      }
    }
  }

  // Audit activity log
  await logActivity({
    workspaceId: context.workspace.id,
    actorType: "user",
    actorId: context.user.id,
    actorName: context.user.fullName || context.user.email,
    entityType: "project",
    entityId: project.id,
    action: "project_created",
    metadata: {
      projectName: project.name,
      clientName: project.client_name,
      currency: project.currency,
      budgetMinor: project.budget_minor,
    },
  });

  return project;
}

/**
 * Updates an existing project.
 * Enforces role boundaries:
 *  - 'member' accounts CANNOT modify financial fields (budget, rate, currency).
 *  - 'owner' and 'manager' have full edit rights.
 */
export async function updateProject(
  projectId: string,
  data: UpdateProjectData,
  customContext?: AuthContext
): Promise<ProjectDbRow> {
  const context = customContext ?? (await getAuthenticatedContext());
  const adminClient = createServiceRoleClient();

  // Verify project belongs to caller's workspace
  const { data: existingProject, error: findError } = await adminClient
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle();

  if (findError || !existingProject) {
    throw new NotFoundError(`Project '${projectId}' was not found.`);
  }

  const existing = existingProject as ProjectDbRow;

  // ROLE CHECK: Members cannot edit money fields (budget, rate, currency)
  const isMember = context.role === "member";
  const isModifyingMoney =
    (data.budgetMinor !== undefined && data.budgetMinor !== existing.budget_minor) ||
    (data.hourlyRateMinor !== undefined && data.hourlyRateMinor !== existing.hourly_rate_minor) ||
    (data.currency !== undefined && data.currency !== existing.currency);

  if (isMember && isModifyingMoney) {
    throw new ForbiddenError(
      "Team members are not authorized to modify project contractual budget or financial baselines."
    );
  }

  const updatePayload: Database["public"]["Tables"]["projects"]["Update"] = {};

  if (data.name !== undefined) updatePayload.name = data.name.trim();
  if (data.clientName !== undefined) updatePayload.client_name = data.clientName.trim();
  if (data.status !== undefined) updatePayload.status = data.status;
  if (data.startDate !== undefined) updatePayload.start_date = data.startDate;
  if (data.originalDeadline !== undefined) updatePayload.original_deadline = data.originalDeadline;

  // Only apply money fields if permitted (owner or manager)
  if (!isMember) {
    if (data.budgetMinor !== undefined) updatePayload.budget_minor = data.budgetMinor;
    if (data.hourlyRateMinor !== undefined) updatePayload.hourly_rate_minor = data.hourlyRateMinor;
    if (data.currency !== undefined) updatePayload.currency = data.currency.toUpperCase().trim();
  }

  const { data: updatedData, error: updateError } = await adminClient
    .from("projects")
    .update(updatePayload)
    .eq("id", projectId)
    .select("*")
    .single();

  if (updateError || !updatedData) {
    throw new Error(updateError?.message || "Failed to update project.");
  }

  const updated = updatedData as ProjectDbRow;

  // Audit activity log
  await logActivity({
    workspaceId: context.workspace.id,
    actorType: "user",
    actorId: context.user.id,
    actorName: context.user.fullName || context.user.email,
    entityType: "project",
    entityId: updated.id,
    action: "project_updated",
    metadata: {
      modifiedFields: Object.keys(updatePayload),
      name: updated.name,
    },
  });

  return updated;
}
