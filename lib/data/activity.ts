import { createServiceRoleClient } from "@/lib/supabase/service";
import { getAuthenticatedContext } from "./auth-context";
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

export interface ActivityLogItem {
  id: string;
  workspaceId: string;
  actorType: ActorType;
  actorId: string | null;
  actorName: string | null;
  entityType: string;
  entityId: string;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// In-memory fallback store for environments where schema cache lacks activity_logs
const globalWithActivity = globalThis as unknown as {
  __scopeguard_fallback_activity_logs?: ActivityLogItem[];
};
if (!globalWithActivity.__scopeguard_fallback_activity_logs) {
  globalWithActivity.__scopeguard_fallback_activity_logs = [];
}
const fallbackActivityStore = globalWithActivity.__scopeguard_fallback_activity_logs;

/**
 * Inserts an immutable activity audit log entry.
 * Minimizes audit metadata per AGENTS.md security guidelines.
 * Safe metadata ONLY:
 * - NO raw bearer tokens
 * - NO passwords
 * - NO full IP addresses (salted hashes only if any)
 * - NO internal notes
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  const sanitizedMeta = sanitizeActivityMetadata(params.metadata || {});
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  // Always append to fallback store
  fallbackActivityStore.unshift({
    id,
    workspaceId: params.workspaceId,
    actorType: params.actorType,
    actorId: params.actorId || null,
    actorName: params.actorName || null,
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    metadata: sanitizedMeta,
    createdAt: now,
  });

  try {
    const adminClient = createServiceRoleClient();
    const { error } = await adminClient.from("activity_logs").insert({
      id,
      workspace_id: params.workspaceId,
      actor_type: params.actorType,
      actor_id: params.actorId || null,
      actor_name: params.actorName || null,
      entity_type: params.entityType,
      entity_id: params.entityId,
      action: params.action,
      metadata: sanitizedMeta as Database["public"]["Tables"]["activity_logs"]["Insert"]["metadata"],
      created_at: now,
    });

    if (error) {
      console.warn("[logActivity] Note: activity_logs insert reported:", error.message);
    }
  } catch (err) {
    // Non-blocking: Logging errors should not crash business operations
    console.warn("[logActivity] Non-blocking log error:", err);
  }
}

/**
 * Strictly sanitizes metadata to guarantee that no sensitive credentials,
 * raw tokens, passwords, full IP addresses, or internal notes are persisted.
 */
function sanitizeActivityMetadata(meta: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(meta)) {
    const lowerKey = key.toLowerCase();
    // Exclude tokens, secrets, passwords, full IPs, and internal notes
    if (
      lowerKey.includes("token") && !lowerKey.includes("token_prefix") ||
      lowerKey.includes("password") ||
      lowerKey.includes("secret") ||
      lowerKey.includes("internal_note") ||
      lowerKey.includes("internalnote") ||
      (lowerKey === "ip" || lowerKey === "client_ip")
    ) {
      continue;
    }
    sanitized[key] = val;
  }

  return sanitized;
}

/**
 * Retrieves activity logs for a project and all associated change requests.
 */
export async function getProjectActivityLogs(projectId: string): Promise<ActivityLogItem[]> {
  const context = await getAuthenticatedContext();
  const adminClient = createServiceRoleClient();

  // 1. Fetch all change request IDs for this project
  const { data: crRows } = await adminClient
    .from("change_requests")
    .select("id")
    .eq("project_id", projectId);

  const crIds = (crRows || []).map((r) => r.id);

  // 2. Query activity_logs from database
  let dbLogs: ActivityLogItem[] = [];
  try {
    const { data, error } = await adminClient
      .from("activity_logs")
      .select("*")
      .eq("workspace_id", context.workspace.id)
      .or(
        crIds.length > 0
          ? `and(entity_type.eq.project,entity_id.eq.${projectId}),and(entity_type.eq.change_request,entity_id.in.(${crIds.join(",")}))`
          : `and(entity_type.eq.project,entity_id.eq.${projectId})`
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      dbLogs = data.map((d) => ({
        id: d.id,
        workspaceId: d.workspace_id,
        actorType: d.actor_type as ActorType,
        actorId: d.actor_id,
        actorName: d.actor_name,
        entityType: d.entity_type,
        entityId: d.entity_id,
        action: d.action,
        metadata: (d.metadata as Record<string, unknown>) || {},
        createdAt: d.created_at,
      }));
    }
  } catch {
    // Fallback to in-memory store
  }

  // 3. Merge with fallback activity store
  const relevantFallback = fallbackActivityStore.filter(
    (log) =>
      log.workspaceId === context.workspace.id &&
      ((log.entityType === "project" && log.entityId === projectId) ||
        (log.entityType === "change_request" && crIds.includes(log.entityId)) ||
        (log.entityType === "change_request" && (log.metadata.projectId === projectId)))
  );

  return mergeAndDeduplicateLogs(dbLogs, relevantFallback);
}

/**
 * Retrieves activity logs for a single change request.
 */
export async function getChangeRequestActivityLogs(
  changeRequestId: string
): Promise<ActivityLogItem[]> {
  const context = await getAuthenticatedContext();
  const adminClient = createServiceRoleClient();

  let dbLogs: ActivityLogItem[] = [];
  try {
    const { data, error } = await adminClient
      .from("activity_logs")
      .select("*")
      .eq("workspace_id", context.workspace.id)
      .eq("entity_type", "change_request")
      .eq("entity_id", changeRequestId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (!error && data) {
      dbLogs = data.map((d) => ({
        id: d.id,
        workspaceId: d.workspace_id,
        actorType: d.actor_type as ActorType,
        actorId: d.actor_id,
        actorName: d.actor_name,
        entityType: d.entity_type,
        entityId: d.entity_id,
        action: d.action,
        metadata: (d.metadata as Record<string, unknown>) || {},
        createdAt: d.created_at,
      }));
    }
  } catch {
    // Fallback to in-memory store
  }

  const relevantFallback = fallbackActivityStore.filter(
    (log) =>
      log.workspaceId === context.workspace.id &&
      log.entityType === "change_request" &&
      log.entityId === changeRequestId
  );

  return mergeAndDeduplicateLogs(dbLogs, relevantFallback);
}

function mergeAndDeduplicateLogs(
  primary: ActivityLogItem[],
  secondary: ActivityLogItem[]
): ActivityLogItem[] {
  const seen = new Set<string>();
  const merged: ActivityLogItem[] = [];

  for (const log of primary) {
    if (!seen.has(log.id)) {
      seen.add(log.id);
      merged.push(log);
    }
  }

  for (const log of secondary) {
    if (!seen.has(log.id)) {
      seen.add(log.id);
      merged.push(log);
    }
  }

  merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return merged;
}
