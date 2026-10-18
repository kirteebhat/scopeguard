import { getAuthenticatedContext } from "./auth-context";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getWorkspaceActivityLogs, type ActivityLogItem } from "./activity";
import {
  calculateProjectRollup,
  calculateWorkspaceRollup,
  type ApprovedVersionSnapshot,
  type PendingProposalSnapshot,
  type ProjectFinancialRollup,
} from "@/lib/domain/impact";
import { formatMinorToCurrency } from "@/lib/domain/money";
import type { ProjectStatus } from "./projects";

export interface CurrencyApprovedCharge {
  currency: string;
  totalMinor: number;
  formatted: string;
  approvedCount: number;
}

export interface DashboardMetrics {
  activeProjectsCount: number;
  totalProjectsCount: number;
  pendingApprovalsCount: number;
  approvedChangesCount: number;
  rejectedChangesCount: number;
  approvedChargesByCurrency: CurrencyApprovedCharge[];
}

export interface DashboardProjectItem {
  id: string;
  name: string;
  clientName: string;
  status: ProjectStatus;
  currency: string;
  budgetMinor: number;
  revisedBudgetMinor: number;
  approvedExtraMinor: number;
  originalDeadline: string;
  revisedDeadline: string;
  deltaDays: number;
  pendingRequestsCount: number;
  updatedAt: string;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  recentProjects: DashboardProjectItem[];
  recentActivity: ActivityLogItem[];
  hasProjects: boolean;
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

interface ChangeRequestDbRow {
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

/**
 * Retrieves aggregated dashboard data for the authenticated workspace.
 * Queries efficiently without N+1 loops:
 * 1. Fetches workspace projects
 * 2. Fetches associated change requests and immutable version approvals
 * 3. Computes rollups grouped strictly by currency per AGENTS.md rules
 * 4. Fetches recent workspace-scoped activity logs
 */
export async function getDashboardData(overrideWorkspaceId?: string): Promise<DashboardData> {
  let workspaceId = overrideWorkspaceId;
  if (!workspaceId) {
    const context = await getAuthenticatedContext();
    workspaceId = context.workspace.id;
  }

  const adminClient = createServiceRoleClient();

  // 1. Fetch workspace projects ordered by updated_at descending
  const { data: projectsData, error: projectsError } = await adminClient
    .from("projects")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });

  if (projectsError) {
    throw new Error(projectsError.message || "Failed to fetch workspace projects for dashboard.");
  }

  const projects = (projectsData || []) as ProjectDbRow[];
  const totalProjectsCount = projects.length;

  // If no projects exist in this workspace, return clean empty dashboard state
  if (totalProjectsCount === 0) {
    const recentActivity = await getWorkspaceActivityLogs(workspaceId, 10);
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
      recentActivity,
      hasProjects: false,
    };
  }

  const activeProjectsCount = projects.filter((p) => p.status === "active").length;
  const projectIds = projects.map((p) => p.id);

  // 2. Fetch change requests and approved immutable snapshots in one query
  const { data: crData, error: crError } = await adminClient
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

  if (crError) {
    throw new Error(crError.message || "Failed to fetch change requests for dashboard.");
  }

  const changeRequests = (crData || []) as unknown as ChangeRequestDbRow[];

  // 3. Count statuses across workspace change requests
  const pendingApprovalsCount = changeRequests.filter(
    (c) => c.status === "pending_approval"
  ).length;
  const approvedChangesCount = changeRequests.filter((c) => c.status === "approved").length;
  const rejectedChangesCount = changeRequests.filter((c) => c.status === "rejected").length;

  // 4. Map approved versions and pending proposals per project
  const approvedMap = new Map<string, ApprovedVersionSnapshot[]>();
  const pendingMap = new Map<string, PendingProposalSnapshot[]>();
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  for (const cr of changeRequests) {
    if (cr.change_request_versions) {
      for (const ver of cr.change_request_versions) {
        const rawApproval = ver.approvals;
        let approval = Array.isArray(rawApproval)
          ? rawApproval[0]
          : (rawApproval as { id: string; decision: string; decided_at: string } | null | undefined);

        if (!approval) {
          const globalWithStore = globalThis as unknown as {
            __scopeguard_fallback_approval_store?: Map<string, { id: string; decision: string; decided_at: string; version_id: string }>;
          };
          const fbStore = globalWithStore.__scopeguard_fallback_approval_store;
          if (fbStore) {
            for (const item of fbStore.values()) {
              if (item.version_id === ver.id) {
                approval = item;
                break;
              }
            }
          }
        }
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

    if (cr.status === "pending_approval") {
      const proj = projectMap.get(cr.project_id);
      const pendingList = pendingMap.get(cr.project_id) || [];
      pendingList.push({
        changeRequestId: cr.id,
        costMinor: cr.cost_minor,
        currency: proj ? proj.currency : "USD",
        proposedDeadline: cr.proposed_deadline,
      });
      pendingMap.set(cr.project_id, pendingList);
    }
  }

  // 5. Compute rollups per project using domain calculations
  const projectRollups: ProjectFinancialRollup[] = [];
  const dashboardProjects: DashboardProjectItem[] = [];

  for (const p of projects) {
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

    projectRollups.push(rollup);

    dashboardProjects.push({
      id: p.id,
      name: p.name,
      clientName: p.client_name,
      status: p.status,
      currency: p.currency,
      budgetMinor: p.budget_minor,
      revisedBudgetMinor: rollup.revisedBudgetMinor,
      approvedExtraMinor: rollup.approvedExtraMinor,
      originalDeadline: p.original_deadline,
      revisedDeadline: rollup.revisedDeadline,
      deltaDays: rollup.deltaDays,
      pendingRequestsCount: pending.length,
      updatedAt: p.updated_at,
    });
  }

  // 6. Aggregate workspace financial metrics strictly grouped by currency
  const workspaceRollups = calculateWorkspaceRollup(projectRollups);
  const approvedChargesByCurrency: CurrencyApprovedCharge[] = workspaceRollups
    .filter((g) => g.approvedChangesCount > 0 || g.approvedExtraMinor > 0)
    .map((g) => ({
      currency: g.currency,
      totalMinor: g.approvedExtraMinor,
      formatted: formatMinorToCurrency(g.approvedExtraMinor, g.currency),
      approvedCount: g.approvedChangesCount,
    }));

  // 7. Fetch workspace activity logs
  const recentActivity = await getWorkspaceActivityLogs(workspaceId, 10);

  return {
    metrics: {
      activeProjectsCount,
      totalProjectsCount,
      pendingApprovalsCount,
      approvedChangesCount,
      rejectedChangesCount,
      approvedChargesByCurrency,
    },
    recentProjects: dashboardProjects.slice(0, 5),
    recentActivity,
    hasProjects: true,
  };
}
