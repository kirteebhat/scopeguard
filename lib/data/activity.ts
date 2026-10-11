import { createServiceRoleClient } from "@/lib/supabase/service";
import type { Database } from "@/lib/supabase/database.types";

export type ActorType = Database["public"]["Enums"]["actor_type"];

export interface LogActivityParams {
  workspaceId: string;
  actorType: ActorType;
  actorId?: string | null;
  actorName?: string | null;
  entityType: string; // 'project', 'deliverable', 'change_request', etc.
  entityId: string;
  action: string; // 'project_created', 'project_updated', etc.
  metadata?: Record<string, unknown>;
}

/**
 * Inserts an immutable activity audit log entry.
 * Minimizes audit metadata per AGENTS.md security guidelines.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const adminClient = createServiceRoleClient();
    const { error } = await adminClient.from("activity_logs").insert({
      workspace_id: params.workspaceId,
      actor_type: params.actorType,
      actor_id: params.actorId || null,
      actor_name: params.actorName || null,
      entity_type: params.entityType,
      entity_id: params.entityId,
      action: params.action,
      metadata: (params.metadata || {}) as Database["public"]["Tables"]["activity_logs"]["Insert"]["metadata"],
    });

    if (error) {
      console.error("[logActivity] Failed to insert activity log:", error.message);
    }
  } catch (err) {
    // Non-blocking: Logging errors should not crash business operations
    console.error("[logActivity] Unexpected error logging activity:", err);
  }
}

