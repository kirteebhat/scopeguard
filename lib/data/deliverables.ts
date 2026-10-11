import {
  getAuthenticatedContext,
  requireRole,
  type AuthContext,
} from "./auth-context";
import { NotFoundError } from "./errors";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { logActivity } from "./activity";
import type { Database } from "@/lib/supabase/database.types";

export type DeliverableStatus = Database["public"]["Enums"]["deliverable_status"];

export interface DeliverableItem {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: DeliverableStatus;
  createdAt: string;
  updatedAt: string;
}

interface DeliverableDbRow {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: DeliverableStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Lists all deliverables for a project within caller's active workspace.
 */
export async function getProjectDeliverables(
  projectId: string
): Promise<DeliverableItem[]> {
  const context = await getAuthenticatedContext();
  const adminClient = createServiceRoleClient();

  // Verify project belongs to workspace
  const { data: project } = await adminClient
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle();

  if (!project) {
    throw new NotFoundError(`Project '${projectId}' was not found.`);
  }

  const { data: deliverables, error } = await adminClient
    .from("deliverables")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error || !deliverables) {
    throw new Error(error?.message || "Failed to fetch deliverables.");
  }

  return (deliverables as DeliverableDbRow[]).map((d) => ({
    id: d.id,
    projectId: d.project_id,
    title: d.title,
    description: d.description,
    status: d.status,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  }));
}

/**
 * Adds a new deliverable to a project.
 * Guarded: Only 'owner' or 'manager' can manage deliverables.
 */
export async function createDeliverable(
  projectId: string,
  data: { title: string; description?: string | null },
  customContext?: AuthContext
): Promise<DeliverableItem> {
  const context = await requireRole(["owner", "manager"], customContext);
  const adminClient = createServiceRoleClient();

  // Verify project belongs to workspace
  const { data: project } = await adminClient
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle();

  if (!project) {
    throw new NotFoundError(`Project '${projectId}' was not found.`);
  }

  const trimmedTitle = data.title.trim();
  if (trimmedTitle.length < 2) {
    throw new Error("Deliverable title must be at least 2 characters.");
  }

  const { data: created, error } = await adminClient
    .from("deliverables")
    .insert({
      project_id: projectId,
      title: trimmedTitle,
      description: data.description?.trim() || null,
      status: "pending",
    })
    .select("*")
    .single();

  if (error || !created) {
    throw new Error(error?.message || "Failed to create deliverable.");
  }

  const row = created as DeliverableDbRow;

  // Log activity
  await logActivity({
    workspaceId: context.workspace.id,
    actorType: "user",
    actorId: context.user.id,
    actorName: context.user.fullName || context.user.email,
    entityType: "deliverable",
    entityId: row.id,
    action: "deliverable_created",
    metadata: {
      projectId,
      title: row.title,
    },
  });

  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Updates an existing deliverable's title, description, or status.
 * Guarded: Only 'owner' or 'manager'.
 */
export async function updateDeliverable(
  deliverableId: string,
  projectId: string,
  data: { title?: string; description?: string | null; status?: DeliverableStatus },
  customContext?: AuthContext
): Promise<DeliverableItem> {
  const context = await requireRole(["owner", "manager"], customContext);
  const adminClient = createServiceRoleClient();

  // Verify deliverable belongs to project and workspace
  const { data: existing } = await adminClient
    .from("deliverables")
    .select("id, project_id, projects(workspace_id)")
    .eq("id", deliverableId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!existing) {
    throw new NotFoundError(`Deliverable '${deliverableId}' was not found.`);
  }

  const updatePayload: Database["public"]["Tables"]["deliverables"]["Update"] = {};
  if (data.title !== undefined) updatePayload.title = data.title.trim();
  if (data.description !== undefined) updatePayload.description = data.description?.trim() || null;
  if (data.status !== undefined) updatePayload.status = data.status;

  const { data: updated, error } = await adminClient
    .from("deliverables")
    .update(updatePayload)
    .eq("id", deliverableId)
    .select("*")
    .single();

  if (error || !updated) {
    throw new Error(error?.message || "Failed to update deliverable.");
  }

  const row = updated as DeliverableDbRow;

  await logActivity({
    workspaceId: context.workspace.id,
    actorType: "user",
    actorId: context.user.id,
    actorName: context.user.fullName || context.user.email,
    entityType: "deliverable",
    entityId: row.id,
    action: "deliverable_updated",
    metadata: {
      projectId,
      title: row.title,
    },
  });

  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Deletes a deliverable from a project.
 * Guarded: Only 'owner' or 'manager'.
 */
export async function deleteDeliverable(
  deliverableId: string,
  projectId: string,
  customContext?: AuthContext
): Promise<void> {
  const context = await requireRole(["owner", "manager"], customContext);
  const adminClient = createServiceRoleClient();

  const { data: existing } = await adminClient
    .from("deliverables")
    .select("id, title")
    .eq("id", deliverableId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!existing) {
    throw new NotFoundError(`Deliverable '${deliverableId}' was not found.`);
  }

  const { error } = await adminClient
    .from("deliverables")
    .delete()
    .eq("id", deliverableId);

  if (error) {
    throw new Error(error.message || "Failed to delete deliverable.");
  }

  await logActivity({
    workspaceId: context.workspace.id,
    actorType: "user",
    actorId: context.user.id,
    actorName: context.user.fullName || context.user.email,
    entityType: "deliverable",
    entityId: deliverableId,
    action: "deliverable_deleted",
    metadata: {
      projectId,
      title: existing.title,
    },
  });
}
