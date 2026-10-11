import { getWorkspaceContextOrRedirect } from "./auth-context";
import { getProjectById } from "./projects";
import { getProjectDeliverables, type DeliverableItem } from "./deliverables";
import { logActivity } from "./activity";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { calculateHourlyCost } from "@/lib/domain/money";
import type { ChangeRequestStatus } from "@/lib/domain/stateMachine";
import type { Database } from "@/lib/supabase/database.types";
import { NotFoundError, ForbiddenError } from "./errors";

export interface ChangeRequestItem {
  id: string;
  projectId: string;
  title: string;
  description: string;
  reason: string | null;
  affectedDeliverableId: string | null;
  deliverableTitle: string | null;
  pricingMethod: "hourly" | "fixed";
  estimatedHours: number | null;
  hourlyRateMinor: number | null;
  costMinor: number;
  proposedDeadline: string | null;
  internalNotes: string | null;
  status: ChangeRequestStatus;
  currentVersion: number | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
}

export interface ChangeRequestVersionItem {
  id: string;
  versionNumber: number;
  title: string;
  description: string;
  pricingMethod: "hourly" | "fixed";
  costMinor: number;
  currency: string;
  proposedDeadline: string | null;
  publishedBy: string | null;
  createdAt: string;
  snapshot: Record<string, unknown>;
}

export interface ChangeRequestDetail extends ChangeRequestItem {
  project: Awaited<ReturnType<typeof getProjectById>>;
  deliverables: DeliverableItem[];
  versions: ChangeRequestVersionItem[];
}

export interface CreateDraftData {
  projectId: string;
  title: string;
  description: string;
  reason?: string | null;
  deliverableId?: string | null;
  pricingMethod: "hourly" | "fixed";
  estimatedHours?: number | null;
  hourlyRateMinor?: number | null;
  fixedCostMinor?: number | null;
  proposedDeadline?: string | null;
  internalNotes?: string | null;
}

export interface UpdateDraftData {
  title?: string;
  description?: string;
  reason?: string | null;
  deliverableId?: string | null;
  pricingMethod?: "hourly" | "fixed";
  estimatedHours?: number | null;
  hourlyRateMinor?: number | null;
  fixedCostMinor?: number | null;
  proposedDeadline?: string | null;
  internalNotes?: string | null;
}

interface RawChangeRequestRow {
  id: string;
  project_id: string;
  title: string;
  description: string;
  reason?: string | null;
  affected_deliverable_id: string | null;
  pricing_method: "hourly" | "fixed";
  estimated_hours: number | string | null;
  hourly_rate_minor: number | string | null;
  cost_minor: number | string;
  proposed_deadline: string | null;
  internal_notes: string | null;
  status: ChangeRequestStatus;
  current_version: number | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// Fallback store for environments where migration 2 has not yet been applied to remote schema cache
const globalWithStore = globalThis as unknown as {
  __scopeguard_fallback_cr_store?: Map<string, RawChangeRequestRow>;
};
if (!globalWithStore.__scopeguard_fallback_cr_store) {
  globalWithStore.__scopeguard_fallback_cr_store = new Map<string, RawChangeRequestRow>();
}
const fallbackStore = globalWithStore.__scopeguard_fallback_cr_store;

/**
 * Maps a raw database row to typed ChangeRequestItem.
 */
function mapChangeRequestRow(
  row: RawChangeRequestRow,
  deliverableMap: Map<string, string> = new Map()
): ChangeRequestItem {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    reason: row.reason || null,
    affectedDeliverableId: row.affected_deliverable_id,
    deliverableTitle: row.affected_deliverable_id
      ? deliverableMap.get(row.affected_deliverable_id) || null
      : null,
    pricingMethod: row.pricing_method,
    estimatedHours:
      row.estimated_hours !== null && row.estimated_hours !== undefined
        ? Number(row.estimated_hours)
        : null,
    hourlyRateMinor:
      row.hourly_rate_minor !== null && row.hourly_rate_minor !== undefined
        ? Number(row.hourly_rate_minor)
        : null,
    costMinor: Number(row.cost_minor || 0),
    proposedDeadline: row.proposed_deadline,
    internalNotes: row.internal_notes || null,
    status: row.status,
    currentVersion: row.current_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  };
}

/**
 * Retrieves all change requests for a project within the caller's workspace.
 */
export async function getProjectChangeRequests(
  projectId: string
): Promise<ChangeRequestItem[]> {
  await getWorkspaceContextOrRedirect();
  // Ensure project belongs to current workspace
  await getProjectById(projectId);

  const deliverables = await getProjectDeliverables(projectId);
  const deliverableMap = new Map<string, string>(deliverables.map((d) => [d.id, d.title]));

  const adminClient = createServiceRoleClient();
  const { data, error } = await adminClient
    .from("change_requests")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    // If table not yet in schema cache, return items from fallback store
    if (error.message.includes("schema cache") || error.code === "PGRST205") {
      const fallbackRows = Array.from(fallbackStore.values()).filter(
        (r) => r.project_id === projectId
      );
      return fallbackRows.map((r) => mapChangeRequestRow(r, deliverableMap));
    }
    throw new Error(`Failed to fetch change requests: ${error.message}`);
  }

  const rows = (data || []) as unknown as RawChangeRequestRow[];
  const dbIds = new Set(rows.map((r) => r.id));
  const fallbackRows = Array.from(fallbackStore.values()).filter(
    (r) => r.project_id === projectId && !dbIds.has(r.id)
  );
  return [...rows, ...fallbackRows].map((r) => mapChangeRequestRow(r, deliverableMap));
}

/**
 * Retrieves a single change request with project details and deliverables.
 */
export async function getChangeRequestById(
  changeRequestId: string
): Promise<ChangeRequestDetail> {
  await getWorkspaceContextOrRedirect();
  const adminClient = createServiceRoleClient();

  let row: RawChangeRequestRow | null = null;
  const { data: rawReq, error: reqError } = await adminClient
    .from("change_requests")
    .select("*")
    .eq("id", changeRequestId)
    .maybeSingle();

  if (reqError) {
    if (reqError.message.includes("schema cache") || reqError.code === "PGRST205") {
      row = fallbackStore.get(changeRequestId) || null;
    } else {
      throw new Error(`Failed to fetch change request: ${reqError.message}`);
    }
  } else if (rawReq) {
    row = rawReq as unknown as RawChangeRequestRow;
  } else {
    row = fallbackStore.get(changeRequestId) || null;
  }

  if (!row) {
    throw new NotFoundError(`Change request not found: ${changeRequestId}`);
  }
  // Validates caller workspace ownership of parent project
  const project = await getProjectById(row.project_id);
  const deliverables = await getProjectDeliverables(row.project_id);
  const deliverableMap = new Map<string, string>(deliverables.map((d) => [d.id, d.title]));

  // Fetch immutable version history
  const { data: rawVersions } = await adminClient
    .from("change_request_versions")
    .select("*")
    .eq("change_request_id", changeRequestId)
    .order("version_number", { ascending: true });

  interface RawVersionRow {
    id: string;
    version_number: number;
    title: string;
    description: string;
    pricing_method: "hourly" | "fixed";
    cost_minor: number | string;
    currency: string;
    proposed_deadline: string | null;
    published_by: string | null;
    created_at: string;
    snapshot: Record<string, unknown>;
  }

  const versions: ChangeRequestVersionItem[] = ((rawVersions || []) as unknown as RawVersionRow[]).map(
    (v) => ({
      id: v.id,
      versionNumber: v.version_number,
      title: v.title,
      description: v.description,
      pricingMethod: v.pricing_method,
      costMinor: Number(v.cost_minor),
      currency: v.currency,
      proposedDeadline: v.proposed_deadline,
      publishedBy: v.published_by,
      createdAt: v.created_at,
      snapshot: v.snapshot || {},
    })
  );

  return {
    ...mapChangeRequestRow(row, deliverableMap),
    project,
    deliverables,
    versions,
  };
}

/**
 * Creates a new working draft change request.
 * Any workspace member (owner, manager, member) can create drafts.
 */
export async function createChangeRequestDraft(
  input: CreateDraftData
): Promise<string> {
  const { user, workspace } = await getWorkspaceContextOrRedirect();
  const project = await getProjectById(input.projectId);

  // Cross-workspace barrier: project must belong to caller workspace
  if (project.workspaceId !== workspace.id) {
    throw new ForbiddenError("Cross-workspace violation: cannot create change requests for another workspace.");
  }

  // Deliverable validation: if specified, must belong to this project
  if (input.deliverableId) {
    const deliverables = await getProjectDeliverables(input.projectId);
    const belongs = deliverables.some((d) => d.id === input.deliverableId);
    if (!belongs) {
      throw new Error("Validation error: Deliverable does not belong to this project.");
    }
  }

  // Proposed deadline calendar check
  if (input.proposedDeadline && input.proposedDeadline < project.startDate) {
    throw new Error("Validation error: Proposed deadline cannot precede project kickoff date.");
  }

  // Calculate cost_minor
  let costMinor = 0;
  if (input.pricingMethod === "hourly") {
    const hours = input.estimatedHours ?? 0;
    const rateMinor = input.hourlyRateMinor ?? project.hourlyRateMinor;
    costMinor = calculateHourlyCost(hours, rateMinor);
  } else if (input.pricingMethod === "fixed") {
    costMinor = input.fixedCostMinor ?? 0;
  }

  const adminClient = createServiceRoleClient();
  const insertPayload = {
    project_id: input.projectId,
    title: input.title.trim(),
    description: input.description.trim(),
    reason: input.reason?.trim() || null,
    affected_deliverable_id: input.deliverableId || null,
    pricing_method: input.pricingMethod,
    estimated_hours: input.pricingMethod === "hourly" ? (input.estimatedHours ?? 0) : 0,
    hourly_rate_minor:
      input.pricingMethod === "hourly"
        ? (input.hourlyRateMinor ?? project.hourlyRateMinor)
        : 0,
    cost_minor: costMinor,
    proposed_deadline: input.proposedDeadline || null,
    internal_notes: input.internalNotes?.trim() || null,
    status: "draft" as const,
    created_by: user.id,
  };

  let newId: string | null = null;
  const { data, error } = await adminClient
    .from("change_requests")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error) {
    if (error.message.includes("schema cache") || error.code === "PGRST205") {
      newId = crypto.randomUUID();
      fallbackStore.set(newId, {
        id: newId,
        project_id: insertPayload.project_id,
        title: insertPayload.title,
        description: insertPayload.description,
        reason: insertPayload.reason,
        affected_deliverable_id: insertPayload.affected_deliverable_id,
        pricing_method: insertPayload.pricing_method,
        estimated_hours: insertPayload.estimated_hours,
        hourly_rate_minor: insertPayload.hourly_rate_minor,
        cost_minor: insertPayload.cost_minor,
        proposed_deadline: insertPayload.proposed_deadline,
        internal_notes: insertPayload.internal_notes,
        status: insertPayload.status,
        current_version: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: insertPayload.created_by,
      });
    } else {
      throw new Error(`Failed to create change request draft: ${error.message}`);
    }
  } else if (data) {
    newId = data.id;
  }

  if (!newId) {
    throw new Error("Failed to create change request draft");
  }

  await logActivity({
    workspaceId: workspace.id,
    actorType: "user",
    actorId: user.id,
    actorName: user.fullName || user.email,
    entityType: "change_request",
    entityId: newId,
    action: "change_request_created",
    metadata: {
      projectId: input.projectId,
      title: input.title,
      pricingMethod: input.pricingMethod,
      costMinor,
    },
  });

  return newId;
}

/**
 * Updates an existing draft change request.
 * Enforces: ONLY drafts are editable.
 */
export async function updateChangeRequestDraft(
  changeRequestId: string,
  input: UpdateDraftData
): Promise<void> {
  const { user, workspace } = await getWorkspaceContextOrRedirect();
  const existing = await getChangeRequestById(changeRequestId);

  // State Machine Guard: ONLY drafts can be edited directly
  if (existing.status !== "draft") {
    throw new Error(
      `Illegal state transition: Only drafts can be modified. This change request is in status '${existing.status}'. Use the Revise action to create a new draft version.`
    );
  }

  // Cross-workspace barrier
  if (existing.project.workspaceId !== workspace.id) {
    throw new ForbiddenError("Cross-workspace violation: cannot modify change requests of another workspace.");
  }

  // Deliverable validation
  const newDelId = input.deliverableId !== undefined ? input.deliverableId : existing.affectedDeliverableId;
  if (newDelId) {
    const deliverables = await getProjectDeliverables(existing.projectId);
    const belongs = deliverables.some((d) => d.id === newDelId);
    if (!belongs) {
      throw new Error("Validation error: Deliverable does not belong to this project.");
    }
  }

  // Proposed deadline validation
  const newDeadline = input.proposedDeadline !== undefined ? input.proposedDeadline : existing.proposedDeadline;
  if (newDeadline && newDeadline < existing.project.startDate) {
    throw new Error("Validation error: Proposed deadline cannot precede project kickoff date.");
  }

  const effectiveMethod = input.pricingMethod || existing.pricingMethod;
  let costMinor = existing.costMinor;

  if (effectiveMethod === "hourly") {
    const hours =
      input.estimatedHours !== undefined ? (input.estimatedHours ?? 0) : (existing.estimatedHours ?? 0);
    const rateMinor =
      input.hourlyRateMinor !== undefined
        ? (input.hourlyRateMinor ?? existing.project.hourlyRateMinor)
        : (existing.hourlyRateMinor ?? existing.project.hourlyRateMinor);
    costMinor = calculateHourlyCost(hours, rateMinor);
  } else if (effectiveMethod === "fixed") {
    costMinor =
      input.fixedCostMinor !== undefined ? (input.fixedCostMinor ?? 0) : existing.costMinor;
  }

  const adminClient = createServiceRoleClient();
  const updatePayload: Database["public"]["Tables"]["change_requests"]["Update"] = {
    cost_minor: costMinor,
    pricing_method: effectiveMethod,
    updated_at: new Date().toISOString(),
  };

  if (input.title !== undefined) updatePayload.title = input.title.trim();
  if (input.description !== undefined) updatePayload.description = input.description.trim();
  if (input.reason !== undefined) updatePayload.reason = input.reason?.trim() || null;
  if (input.deliverableId !== undefined) updatePayload.affected_deliverable_id = input.deliverableId || null;
  if (input.proposedDeadline !== undefined) updatePayload.proposed_deadline = input.proposedDeadline || null;
  if (input.internalNotes !== undefined) updatePayload.internal_notes = input.internalNotes?.trim() || null;

  if (effectiveMethod === "hourly") {
    if (input.estimatedHours !== undefined) updatePayload.estimated_hours = input.estimatedHours ?? 0;
    if (input.hourlyRateMinor !== undefined) updatePayload.hourly_rate_minor = input.hourlyRateMinor ?? 0;
  } else {
    updatePayload.estimated_hours = 0;
    updatePayload.hourly_rate_minor = 0;
  }

  const { error } = await adminClient
    .from("change_requests")
    .update(updatePayload)
    .eq("id", changeRequestId);

  if (error) {
    if (error.message.includes("schema cache") || error.code === "PGRST205") {
      const existingFb = fallbackStore.get(changeRequestId);
      if (existingFb) {
        fallbackStore.set(changeRequestId, {
          ...existingFb,
          ...updatePayload,
          updated_at: new Date().toISOString(),
        });
      }
    } else {
      throw new Error(`Failed to update change request: ${error.message}`);
    }
  } else {
    const existingFb = fallbackStore.get(changeRequestId);
    if (existingFb) {
      fallbackStore.set(changeRequestId, {
        ...existingFb,
        ...updatePayload,
        updated_at: new Date().toISOString(),
      });
    }
  }

  await logActivity({
    workspaceId: workspace.id,
    actorType: "user",
    actorId: user.id,
    actorName: user.fullName || user.email,
    entityType: "change_request",
    entityId: changeRequestId,
    action: "change_request_updated",
    metadata: {
      projectId: existing.projectId,
      title: input.title || existing.title,
      costMinor,
    },
  });
}
