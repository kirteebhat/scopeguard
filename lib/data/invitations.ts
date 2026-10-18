import { requireRole, getAuthenticatedContext, MemberRole } from "./auth-context";
import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  generateInvitationToken,
  hashInvitationToken,
  buildInvitationUrl,
} from "@/lib/server/invitation-tokens";

export interface WorkspaceInvitationItem {
  id: string;
  workspaceId: string;
  email: string;
  role: MemberRole;
  status: "pending" | "accepted" | "revoked" | "expired";
  invitedBy: string;
  inviterName: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  lastSentAt: string;
  sendCount: number;
  createdAt: string;
}

export interface PublicInvitationData {
  workspaceName: string;
  role: MemberRole;
  email: string;
  invitedEmailMasked: string;
  inviterName: string;
  status: "pending" | "accepted" | "revoked" | "expired" | "invalid";
  expiresAt: string;
}

/**
 * Retrieves all invitations for the active workspace.
 * Restricted strictly to workspace owners and managers.
 */
export async function listWorkspaceInvitations(): Promise<WorkspaceInvitationItem[]> {
  const { workspace } = await requireRole(["owner", "manager"]);
  const adminClient = createServiceRoleClient();

  interface RawInvitationRow {
    id: string;
    workspace_id: string;
    email: string;
    role: MemberRole;
    status: "pending" | "accepted" | "revoked" | "expired";
    invited_by: string;
    expires_at: string;
    accepted_at: string | null;
    revoked_at: string | null;
    last_sent_at: string;
    send_count: number;
    created_at: string;
    profiles: { full_name: string | null; email: string } | { full_name: string | null; email: string }[] | null;
  }

  const { data, error } = await adminClient
    .from("workspace_invitations")
    .select(`
      id,
      workspace_id,
      email,
      role,
      status,
      invited_by,
      expires_at,
      accepted_at,
      revoked_at,
      last_sent_at,
      send_count,
      created_at,
      profiles:invited_by (
        full_name,
        email
      )
    `)
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false });

  if (error || !data) {
    throw new Error(error?.message || "Failed to fetch workspace invitations.");
  }

  const now = new Date();

  return (data as unknown as RawInvitationRow[]).map((row) => {
    const prof = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    let effectiveStatus = row.status;
    if (effectiveStatus === "pending" && new Date(row.expires_at) < now) {
      effectiveStatus = "expired";
    }

    return {
      id: row.id,
      workspaceId: row.workspace_id,
      email: row.email,
      role: row.role,
      status: effectiveStatus,
      invitedBy: row.invited_by,
      inviterName: prof?.full_name || prof?.email || "Team Administrator",
      expiresAt: row.expires_at,
      acceptedAt: row.accepted_at,
      revokedAt: row.revoked_at,
      lastSentAt: row.last_sent_at,
      sendCount: row.send_count,
      createdAt: row.created_at,
    };
  });
}

/**
 * Public-safe resolution of invitation details by raw token string.
 * Uses service-role client to query invitation and associated workspace/inviter.
 * Never leaks the stored token_hash.
 */
export async function getInvitationByToken(rawToken: string): Promise<PublicInvitationData | null> {
  if (!rawToken || typeof rawToken !== "string" || rawToken.trim().length < 10) {
    return null;
  }

  const tokenHash = hashInvitationToken(rawToken);
  const adminClient = createServiceRoleClient();

  interface RawRow {
    id: string;
    email: string;
    role: MemberRole;
    status: "pending" | "accepted" | "revoked" | "expired";
    expires_at: string;
    workspaces: { name: string } | { name: string }[] | null;
    profiles: { full_name: string | null; email: string } | { full_name: string | null; email: string }[] | null;
  }

  const { data, error } = await adminClient
    .from("workspace_invitations")
    .select(`
      id,
      email,
      role,
      status,
      expires_at,
      workspaces (
        name
      ),
      profiles:invited_by (
        full_name,
        email
      )
    `)
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as unknown as RawRow;
  const ws = Array.isArray(row.workspaces) ? row.workspaces[0] : row.workspaces;
  const prof = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;

  let effectiveStatus = row.status;
  if (effectiveStatus === "pending" && new Date(row.expires_at) < new Date()) {
    effectiveStatus = "expired";
  }

  const email = row.email;
  const atIdx = email.indexOf("@");
  let invitedEmailMasked = email;
  if (atIdx > 1) {
    invitedEmailMasked = email[0] + "***" + email.slice(atIdx);
  } else if (atIdx === 1) {
    invitedEmailMasked = email[0] + "***" + email.slice(atIdx);
  }

  return {
    workspaceName: ws?.name || "Workspace",
    role: row.role,
    email: row.email,
    invitedEmailMasked,
    inviterName: prof?.full_name || prof?.email || "Team Administrator",
    status: effectiveStatus,
    expiresAt: row.expires_at,
  };
}

export interface CreatedInvitationResult {
  invitationId: string;
  email: string;
  role: MemberRole;
  rawToken: string;
  inviteUrl: string;
  expiresAt: Date;
}

/**
 * Creates a single workspace invitation.
 * Enforces role checks, generates cryptographic token, and inserts through database RPC.
 */
export async function createWorkspaceInvitation(
  email: string,
  role: MemberRole
): Promise<CreatedInvitationResult> {
  const { workspace } = await requireRole(["owner", "manager"]);
  const { rawToken, tokenHash, expiresAt } = generateInvitationToken();
  const adminClient = createServiceRoleClient();

  const { data, error } = await adminClient.rpc("create_invitation", {
    p_workspace_id: workspace.id,
    p_email: email,
    p_role: role,
    p_token_hash: tokenHash,
  });

  if (error || !data) {
    throw new Error(error?.message || "Failed to create invitation record.");
  }

  const inviteUrl = buildInvitationUrl(rawToken);

  return {
    invitationId: data as string,
    email: email.trim().toLowerCase(),
    role,
    rawToken,
    inviteUrl,
    expiresAt,
  };
}

export interface ResentInvitationResult {
  invitationId: string;
  email: string;
  role: MemberRole;
  rawToken: string;
  inviteUrl: string;
  expiresAt: Date;
}

/**
 * Resends / regenerates an invitation with a fresh token.
 * Enforces 60-second cooldown and role hierarchy.
 */
export async function resendWorkspaceInvitation(
  invitationId: string
): Promise<ResentInvitationResult> {
  const { workspace } = await requireRole(["owner", "manager"]);
  const { rawToken, tokenHash, expiresAt } = generateInvitationToken();
  const adminClient = createServiceRoleClient();

  // Get current invitation metadata for email dispatch
  const { data: currentInv, error: findError } = await adminClient
    .from("workspace_invitations")
    .select("email, role, workspace_id")
    .eq("id", invitationId)
    .maybeSingle();

  if (findError || !currentInv || currentInv.workspace_id !== workspace.id) {
    throw new Error("Invitation record not found in this workspace.");
  }

  const { error } = await adminClient.rpc("resend_invitation", {
    p_invitation_id: invitationId,
    p_new_token_hash: tokenHash,
  });

  if (error) {
    throw new Error(error.message || "Failed to resend invitation.");
  }

  const inviteUrl = buildInvitationUrl(rawToken);

  return {
    invitationId,
    email: currentInv.email,
    role: currentInv.role as MemberRole,
    rawToken,
    inviteUrl,
    expiresAt,
  };
}

/**
 * Revokes an active invitation.
 */
export async function revokeWorkspaceInvitation(invitationId: string): Promise<void> {
  const { workspace } = await requireRole(["owner", "manager"]);
  const adminClient = createServiceRoleClient();

  const { data: currentInv, error: findError } = await adminClient
    .from("workspace_invitations")
    .select("workspace_id")
    .eq("id", invitationId)
    .maybeSingle();

  if (findError || !currentInv || currentInv.workspace_id !== workspace.id) {
    throw new Error("Invitation record not found in this workspace.");
  }

  const { error } = await adminClient.rpc("revoke_invitation", {
    p_invitation_id: invitationId,
  });

  if (error) {
    throw new Error(error.message || "Failed to revoke invitation.");
  }
}

/**
 * Accepts an invitation as the currently authenticated user.
 * Invokes accept_invitation RPC strictly in the caller's authenticated context.
 */
export async function acceptWorkspaceInvitation(
  rawToken: string
): Promise<{ success: boolean; alreadyMember: boolean; workspaceId: string; role: MemberRole }> {
  const { supabase } = await getAuthenticatedContext().catch(async () => {
    // If user has no active workspace yet (new user), resolve user without workspace
    const { requireAuthUser } = await import("./auth-context");
    return await requireAuthUser();
  });

  const tokenHash = hashInvitationToken(rawToken);

  // Invoke RPC as the authenticated user (using their session client)
  const { data, error } = await (supabase as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
  }).rpc("accept_invitation", {
    p_token_hash: tokenHash,
  });

  if (error || !data) {
    throw new Error(error?.message || "Failed to accept invitation.");
  }

  const res = data as { success: boolean; already_member: boolean; workspace_id: string; role: string };

  return {
    success: res.success,
    alreadyMember: res.already_member,
    workspaceId: res.workspace_id,
    role: res.role as MemberRole,
  };
}
