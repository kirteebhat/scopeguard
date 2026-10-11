import { getWorkspaceContextOrRedirect, requireRole } from "./auth-context";
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
  publisherName?: string | null;
  createdAt: string;
  snapshot: Record<string, unknown>;
  decision?: "approved" | "rejected" | null;
  decidedAt?: string | null;
  decidedByActor?: string | null;
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

export interface RawVersionRow {
  id: string;
  change_request_id: string;
  version_number: number;
  title: string;
  description: string;
  pricing_method: "hourly" | "fixed";
  cost_minor: number | string;
  currency: string;
  proposed_deadline: string | null;
  published_by: string | null;
  publisher_name?: string | null;
  created_at: string;
  snapshot: Record<string, unknown>;
}

export interface RawTokenRow {
  id: string;
  version_id: string;
  token_hash: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
  created_by: string | null;
}

export interface RawApprovalRow {
  id: string;
  version_id: string;
  decision: "approved" | "rejected";
  decided_at: string;
  decision_actor_type: string;
  actor_name: string;
  audit_metadata: Record<string, unknown>;
}

// Fallback stores for environments where migration 2 has not yet been applied to remote schema cache
const globalWithStore = globalThis as unknown as {
  __scopeguard_fallback_cr_store?: Map<string, RawChangeRequestRow>;
  __scopeguard_fallback_version_store?: Map<string, RawVersionRow>;
  __scopeguard_fallback_token_store?: Map<string, RawTokenRow>;
  __scopeguard_fallback_approval_store?: Map<string, RawApprovalRow>;
};
if (!globalWithStore.__scopeguard_fallback_cr_store) {
  globalWithStore.__scopeguard_fallback_cr_store = new Map<string, RawChangeRequestRow>();
}
if (!globalWithStore.__scopeguard_fallback_version_store) {
  globalWithStore.__scopeguard_fallback_version_store = new Map<string, RawVersionRow>();
}
if (!globalWithStore.__scopeguard_fallback_token_store) {
  globalWithStore.__scopeguard_fallback_token_store = new Map<string, RawTokenRow>();
}
if (!globalWithStore.__scopeguard_fallback_approval_store) {
  globalWithStore.__scopeguard_fallback_approval_store = new Map<string, RawApprovalRow>();
}
const fallbackStore = globalWithStore.__scopeguard_fallback_cr_store;
const fallbackVersionStore = globalWithStore.__scopeguard_fallback_version_store;
const fallbackTokenStore = globalWithStore.__scopeguard_fallback_token_store;
const fallbackApprovalStore = globalWithStore.__scopeguard_fallback_approval_store;

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
  let rawVersions: RawVersionRow[] = [];
  const { data: dbVersions, error: versionErr } = await adminClient
    .from("change_request_versions")
    .select("*")
    .eq("change_request_id", changeRequestId)
    .order("version_number", { ascending: true });

  if (versionErr) {
    if (versionErr.message.includes("schema cache") || versionErr.code === "PGRST205") {
      rawVersions = Array.from(fallbackVersionStore.values()).filter(
        (v) => v.change_request_id === changeRequestId
      );
    }
  } else if (dbVersions) {
    rawVersions = dbVersions as unknown as RawVersionRow[];
  }

  // Merge any fallback versions not in dbVersions
  const dbVerIds = new Set(rawVersions.map((v) => v.id));
  const additionalFbVersions = Array.from(fallbackVersionStore.values()).filter(
    (v) => v.change_request_id === changeRequestId && !dbVerIds.has(v.id)
  );
  rawVersions = [...rawVersions, ...additionalFbVersions].sort(
    (a, b) => a.version_number - b.version_number
  );

  // Fetch approvals for these versions
  const versionIds = rawVersions.map((v) => v.id);
  const approvalsMap = new Map<string, RawApprovalRow>();

  if (versionIds.length > 0) {
    const { data: dbApprovals } = await adminClient
      .from("approvals")
      .select("*")
      .in("version_id", versionIds);

    if (dbApprovals) {
      for (const a of dbApprovals as unknown as RawApprovalRow[]) {
        approvalsMap.set(a.version_id, a);
      }
    }
    // Also check fallbackApprovalStore
    for (const vId of versionIds) {
      if (!approvalsMap.has(vId) && fallbackApprovalStore.has(vId)) {
        approvalsMap.set(vId, fallbackApprovalStore.get(vId)!);
      }
    }
  }

  // Fetch profile names for publishers
  const publisherIds = Array.from(
    new Set(rawVersions.map((v) => v.published_by).filter(Boolean))
  ) as string[];
  const publisherMap = new Map<string, string>();
  if (publisherIds.length > 0) {
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("id, full_name")
      .in("id", publisherIds);
    if (profiles) {
      for (const p of profiles) {
        if (p.full_name) publisherMap.set(p.id, p.full_name);
      }
    }
  }

  const versions: ChangeRequestVersionItem[] = rawVersions.map((v) => {
    const approval = approvalsMap.get(v.id);
    return {
      id: v.id,
      versionNumber: v.version_number,
      title: v.title,
      description: v.description,
      pricingMethod: v.pricing_method,
      costMinor: Number(v.cost_minor),
      currency: v.currency,
      proposedDeadline: v.proposed_deadline,
      publishedBy: v.published_by,
      publisherName:
        (v.published_by ? publisherMap.get(v.published_by) : null) ||
        v.publisher_name ||
        null,
      createdAt: v.created_at,
      snapshot: v.snapshot || {},
      decision: approval?.decision || null,
      decidedAt: approval?.decided_at || null,
      decidedByActor: approval?.actor_name || null,
    };
  });

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

interface CustomRpcClient {
  rpc: (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>;
}

type ChangeRequestRowUpdatePayload = Database["public"]["Tables"]["change_requests"]["Update"];

function isSchemaOrFunctionMissing(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message || "").toLowerCase();
  const code = error.code || "";
  return (
    msg.includes("schema cache") ||
    msg.includes("does not exist") ||
    msg.includes("could not find") ||
    msg.includes("function") ||
    code === "PGRST202" ||
    code === "PGRST205" ||
    code === "42883" ||
    code === "42P01"
  );
}

/**
 * Publishes a draft change request, freezing it into immutable version snapshot N,
 * storing the hashed approval token, setting status to 'pending_approval',
 * and logging the audit activity.
 *
 * Enforces:
 * - Only workspace owners and managers can publish proposals.
 * - State machine rule: only 'draft' status can be published.
 */
export async function publishChangeRequest(
  changeRequestId: string,
  tokenHash: string,
  expiresAt: string
): Promise<{ versionId: string; versionNumber: number }> {
  const { user, workspace, supabase } = await requireRole(["owner", "manager"]);
  const existing = await getChangeRequestById(changeRequestId);

  if (existing.status !== "draft") {
    throw new Error(
      `Illegal state transition: Only drafts can be published (current status: '${existing.status}').`
    );
  }

  // Attempt real database RPC call
  const { data: rpcData, error: rpcErr } = await (supabase as unknown as CustomRpcClient).rpc(
    "publish_change_request",
    {
      p_request_id: changeRequestId,
      p_token_hash: tokenHash,
      p_expires_at: expiresAt,
    }
  );

  if (!rpcErr && rpcData) {
    const res = rpcData as { version_id: string; version_number: number };
    return {
      versionId: res.version_id,
      versionNumber: res.version_number,
    };
  }

  // If real RPC failed due to missing schema cache / function not found, fall back:
  if (rpcErr && !isSchemaOrFunctionMissing(rpcErr)) {
    throw new Error(`Failed to publish change request: ${rpcErr.message}`);
  }

  // --- Fallback Store Implementation ---
  const existingVersions = Array.from(fallbackVersionStore.values()).filter(
    (v) => v.change_request_id === changeRequestId
  );
  const nextVersion = existingVersions.length + 1;
  const versionId = crypto.randomUUID();
  const now = new Date().toISOString();

  let deliverableTitle: string | null = null;
  if (existing.affectedDeliverableId) {
    const deliv = existing.deliverables.find(
      (d) => d.id === existing.affectedDeliverableId
    );
    deliverableTitle = deliv ? deliv.title : null;
  }

  const snapshot: Record<string, unknown> = {
    version_number: nextVersion,
    title: existing.title,
    description: existing.description,
    reason: existing.reason,
    pricing_method: existing.pricingMethod,
    estimated_hours: existing.estimatedHours,
    hourly_rate_minor: existing.hourlyRateMinor,
    cost_minor: existing.costMinor,
    currency: existing.project.currency,
    proposed_deadline: existing.proposedDeadline,
    original_contract: {
      project_name: existing.project.name,
      client_name: existing.project.clientName,
      budget_minor: existing.project.budgetMinor,
      original_deadline: existing.project.originalDeadline,
    },
    affected_deliverable: existing.affectedDeliverableId
      ? { id: existing.affectedDeliverableId, title: deliverableTitle }
      : null,
    disclaimer:
      "This proposal represents an estimated scope modification. Approving will update project baseline parameters.",
  };

  fallbackVersionStore.set(versionId, {
    id: versionId,
    change_request_id: changeRequestId,
    version_number: nextVersion,
    title: existing.title,
    description: existing.description,
    pricing_method: existing.pricingMethod,
    cost_minor: existing.costMinor,
    currency: existing.project.currency,
    proposed_deadline: existing.proposedDeadline,
    published_by: user.id,
    publisher_name: user.fullName || user.email,
    created_at: now,
    snapshot,
  });

  const tokenId = crypto.randomUUID();
  fallbackTokenStore.set(tokenId, {
    id: tokenId,
    version_id: versionId,
    token_hash: tokenHash,
    expires_at: expiresAt,
    revoked_at: null,
    created_at: now,
    created_by: user.id,
  });

  const fbCr = fallbackStore.get(changeRequestId);
  if (fbCr) {
    fallbackStore.set(changeRequestId, {
      ...fbCr,
      status: "pending_approval",
      current_version: nextVersion,
      updated_at: now,
    });
  }

  const adminClient = createServiceRoleClient();
  await adminClient
    .from("change_requests")
    .update({
      status: "pending_approval",
      current_version: nextVersion,
      updated_at: now,
    } as unknown as ChangeRequestRowUpdatePayload)
    .eq("id", changeRequestId);

  await logActivity({
    workspaceId: workspace.id,
    actorType: "user",
    actorId: user.id,
    actorName: user.fullName || user.email,
    entityType: "change_request",
    entityId: changeRequestId,
    action: "change_request_published",
    metadata: {
      version_number: nextVersion,
      version_id: versionId,
      title: existing.title,
      cost_minor: existing.costMinor,
      currency: existing.project.currency,
    },
  });

  return {
    versionId,
    versionNumber: nextVersion,
  };
}

/**
 * Revokes any active approval token for the current pending version and stores
 * a new hashed token. Version and draft status remain unchanged.
 *
 * Enforces:
 * - Only workspace owners and managers can regenerate tokens.
 * - State machine rule: can only regenerate tokens for pending_approval requests.
 */
export async function regenerateApprovalToken(
  changeRequestId: string,
  tokenHash: string,
  expiresAt: string
): Promise<{ success: boolean }> {
  const { user, workspace, supabase } = await requireRole(["owner", "manager"]);
  const existing = await getChangeRequestById(changeRequestId);

  if (existing.status !== "pending_approval") {
    throw new Error(
      `Illegal state transition: Can only regenerate approval tokens for pending proposals (current status: '${existing.status}').`
    );
  }

  const { data: rpcData, error: rpcErr } = await (supabase as unknown as CustomRpcClient).rpc(
    "regenerate_approval_token",
    {
      p_request_id: changeRequestId,
      p_token_hash: tokenHash,
      p_expires_at: expiresAt,
    }
  );

  if (!rpcErr && rpcData) {
    return { success: true };
  }

  if (rpcErr && !isSchemaOrFunctionMissing(rpcErr)) {
    throw new Error(`Failed to regenerate approval token: ${rpcErr.message}`);
  }

  // Fallback
  const activeVersion = existing.versions.find(
    (v) => v.versionNumber === existing.currentVersion
  );
  if (!activeVersion) {
    throw new Error(
      `Active version record not found for change request ${changeRequestId}`
    );
  }

  const now = new Date().toISOString();
  for (const [tId, token] of fallbackTokenStore.entries()) {
    if (token.version_id === activeVersion.id && !token.revoked_at) {
      fallbackTokenStore.set(tId, {
        ...token,
        revoked_at: now,
      });
    }
  }

  const newTId = crypto.randomUUID();
  fallbackTokenStore.set(newTId, {
    id: newTId,
    version_id: activeVersion.id,
    token_hash: tokenHash,
    expires_at: expiresAt,
    revoked_at: null,
    created_at: now,
    created_by: user.id,
  });

  await logActivity({
    workspaceId: workspace.id,
    actorType: "user",
    actorId: user.id,
    actorName: user.fullName || user.email,
    entityType: "change_request",
    entityId: changeRequestId,
    action: "approval_token_regenerated",
    metadata: {
      version_number: existing.currentVersion,
      version_id: activeVersion.id,
    },
  });

  return { success: true };
}

/**
 * Revises a pending change request: revokes the active token and returns the status to 'draft'.
 * The next publish action will create version snapshot N+1.
 *
 * Enforces:
 * - Only workspace owners and managers can revise proposals.
 * - State machine rule: only 'pending_approval' proposals can be revised.
 */
export async function reviseChangeRequest(
  changeRequestId: string
): Promise<{ success: boolean; status: "draft" }> {
  const { user, workspace, supabase } = await requireRole(["owner", "manager"]);
  const existing = await getChangeRequestById(changeRequestId);

  if (existing.status !== "pending_approval") {
    throw new Error(
      `Illegal state transition: Only pending proposals can be revised (current status: '${existing.status}').`
    );
  }

  const { data: rpcData, error: rpcErr } = await (supabase as unknown as CustomRpcClient).rpc(
    "revise_change_request",
    { p_request_id: changeRequestId }
  );

  if (!rpcErr && rpcData) {
    return { success: true, status: "draft" };
  }

  if (rpcErr && !isSchemaOrFunctionMissing(rpcErr)) {
    throw new Error(`Failed to revise change request: ${rpcErr.message}`);
  }

  // Fallback
  const activeVersion = existing.versions.find(
    (v) => v.versionNumber === existing.currentVersion
  );
  const now = new Date().toISOString();

  if (activeVersion) {
    for (const [tId, token] of fallbackTokenStore.entries()) {
      if (token.version_id === activeVersion.id && !token.revoked_at) {
        fallbackTokenStore.set(tId, {
          ...token,
          revoked_at: now,
        });
      }
    }
  }

  const fbCr = fallbackStore.get(changeRequestId);
  if (fbCr) {
    fallbackStore.set(changeRequestId, {
      ...fbCr,
      status: "draft",
      updated_at: now,
    });
  }

  const adminClient = createServiceRoleClient();
  await adminClient
    .from("change_requests")
    .update({ status: "draft", updated_at: now } as unknown as ChangeRequestRowUpdatePayload)
    .eq("id", changeRequestId);

  await logActivity({
    workspaceId: workspace.id,
    actorType: "user",
    actorId: user.id,
    actorName: user.fullName || user.email,
    entityType: "change_request",
    entityId: changeRequestId,
    action: "change_request_revised",
    metadata: {
      revised_version: existing.currentVersion,
    },
  });

  return { success: true, status: "draft" };
}

/**
 * Withdraws a pending change request: revokes the active token and sets status to 'withdrawn'.
 * Status is terminal.
 *
 * Enforces:
 * - Only workspace owners and managers can withdraw proposals.
 * - State machine rule: only 'pending_approval' proposals can be withdrawn.
 */
export async function withdrawChangeRequest(
  changeRequestId: string
): Promise<{ success: boolean; status: "withdrawn" }> {
  const { user, workspace, supabase } = await requireRole(["owner", "manager"]);
  const existing = await getChangeRequestById(changeRequestId);

  if (existing.status !== "pending_approval") {
    throw new Error(
      `Illegal state transition: Only pending proposals can be withdrawn (current status: '${existing.status}').`
    );
  }

  const { data: rpcData, error: rpcErr } = await (supabase as unknown as CustomRpcClient).rpc(
    "withdraw_change_request",
    { p_request_id: changeRequestId }
  );

  if (!rpcErr && rpcData) {
    return { success: true, status: "withdrawn" };
  }

  if (rpcErr && !isSchemaOrFunctionMissing(rpcErr)) {
    throw new Error(`Failed to withdraw change request: ${rpcErr.message}`);
  }

  // Fallback
  const activeVersion = existing.versions.find(
    (v) => v.versionNumber === existing.currentVersion
  );
  const now = new Date().toISOString();

  if (activeVersion) {
    for (const [tId, token] of fallbackTokenStore.entries()) {
      if (token.version_id === activeVersion.id && !token.revoked_at) {
        fallbackTokenStore.set(tId, {
          ...token,
          revoked_at: now,
        });
      }
    }
  }

  const fbCr = fallbackStore.get(changeRequestId);
  if (fbCr) {
    fallbackStore.set(changeRequestId, {
      ...fbCr,
      status: "withdrawn",
      updated_at: now,
    });
  }

  const adminClient = createServiceRoleClient();
  await adminClient
    .from("change_requests")
    .update({ status: "withdrawn", updated_at: now } as unknown as ChangeRequestRowUpdatePayload)
    .eq("id", changeRequestId);

  await logActivity({
    workspaceId: workspace.id,
    actorType: "user",
    actorId: user.id,
    actorName: user.fullName || user.email,
    entityType: "change_request",
    entityId: changeRequestId,
    action: "change_request_withdrawn",
    metadata: {
      withdrawn_version: existing.currentVersion,
    },
  });

  return { success: true, status: "withdrawn" };
}

