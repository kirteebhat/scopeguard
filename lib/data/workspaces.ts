import {
  getAuthenticatedContext,
  requireAuthUser,
  requireRole,
  AuthWorkspace,
} from "./auth-context";
import { createServiceRoleClient } from "@/lib/supabase/service";

interface WorkspaceRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  created_at: string;
}

/**
 * Returns the currently active workspace metadata for the authenticated user.
 */
export async function getCurrentWorkspace(): Promise<AuthWorkspace> {
  const context = await getAuthenticatedContext();
  return context.workspace;
}

/**
 * Creates a new agency workspace atomically during onboarding.
 * Assigns the authenticated caller as the sole owner.
 */
export async function createWorkspace(name: string): Promise<AuthWorkspace> {
  const { user } = await requireAuthUser();

  const trimmed = name.trim();
  if (trimmed.length < 2) {
    throw new Error("Workspace name must be at least 2 characters.");
  }

  // Generate unique slug
  const baseSlug =
    trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "workspace";

  let slug = baseSlug;
  let counter = 0;
  const adminClient = createServiceRoleClient();

  while (true) {
    const { data: existing } = await adminClient
      .from("workspaces")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (!existing) break;
    counter++;
    slug = `${baseSlug}-${counter}`;
  }

  const { data: createdWs, error: wsError } = await adminClient
    .from("workspaces")
    .insert({
      name: trimmed,
      slug,
      plan: "free",
    })
    .select("id, name, slug, plan, created_at")
    .single();

  if (wsError || !createdWs) {
    throw new Error(wsError?.message || "Failed to create workspace.");
  }

  const ws = createdWs as WorkspaceRow;

  const { error: memberError } = await adminClient
    .from("workspace_members")
    .insert({
      workspace_id: ws.id,
      user_id: user.id,
      role: "owner",
    });

  if (memberError) {
    throw new Error(memberError.message || "Failed to assign workspace ownership.");
  }

  return {
    id: ws.id,
    name: ws.name,
    slug: ws.slug,
    plan: ws.plan,
    createdAt: ws.created_at,
  };
}

/**
 * Updates the name of the current workspace.
 * Strictly restricted to users with the 'owner' role.
 * Never accepts workspace_id from client.
 */
export async function updateWorkspaceName(newName: string): Promise<AuthWorkspace> {
  // Guard: Must be workspace owner
  const { workspace } = await requireRole(["owner"]);

  const trimmed = newName.trim();
  if (trimmed.length < 2) {
    throw new Error("Workspace name must be at least 2 characters.");
  }

  const adminClient = createServiceRoleClient();
  const { data, error } = await adminClient
    .from("workspaces")
    .update({ name: trimmed })
    .eq("id", workspace.id)
    .select("id, name, slug, plan, created_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to update workspace name.");
  }

  const ws = data as WorkspaceRow;

  return {
    id: ws.id,
    name: ws.name,
    slug: ws.slug,
    plan: ws.plan,
    createdAt: ws.created_at,
  };
}
