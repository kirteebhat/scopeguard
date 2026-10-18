import { requireRole, getAuthenticatedContext, MemberRole } from "./auth-context";
import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  generateInvitationToken,
  hashInvitationToken,
  buildInvitationUrl,
} from "@/lib/server/invitation-tokens";

export interface FallbackInvitationRecord {
  id: string;
  workspaceId: string;
  email: string;
  role: MemberRole;
  tokenHash: string;
  rawToken: string;
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

const globalForInvitations = globalThis as unknown as {
  fallbackInvitationStore?: Map<string, FallbackInvitationRecord>;
};

export const fallbackInvitationStore =
  globalForInvitations.fallbackInvitationStore ??
  new Map<string, FallbackInvitationRecord>();

if (process.env.NODE_ENV !== "production") {
  globalForInvitations.fallbackInvitationStore = fallbackInvitationStore;
}

export function isSchemaOrFunctionMissing(error: unknown): boolean {
  if (!error) return false;
  const msg = typeof error === "object" && error !== null && "message" in error ? String((error as { message?: string }).message).toLowerCase() : String(error).toLowerCase();
  const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: string }).code) : "";
  return (
    msg.includes("schema cache") ||
    msg.includes("does not exist") ||
    msg.includes("could not find") ||
    msg.includes("function") ||
    msg.includes("relation") ||
    code === "PGRST202" ||
    code === "PGRST204" ||
    code === "PGRST205" ||
    code === "42883" ||
    code === "42P01"
  );
}

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

  try {
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

    if (!error && data) {
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

    if (error && !isSchemaOrFunctionMissing(error)) {
      throw new Error(error.message || "Failed to fetch workspace invitations.");
    }
  } catch (err) {
    if (!isSchemaOrFunctionMissing(err)) {
      throw err;
    }
  }

  // Fallback: Read from in-memory store
  const now = new Date();
  const list: WorkspaceInvitationItem[] = [];
  for (const inv of fallbackInvitationStore.values()) {
    if (inv.workspaceId === workspace.id) {
      let effectiveStatus = inv.status;
      if (effectiveStatus === "pending" && new Date(inv.expiresAt) < now) {
        effectiveStatus = "expired";
      }
      list.push({
        ...inv,
        status: effectiveStatus,
      });
    }
  }
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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

  try {
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

    if (!error && data) {
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
  } catch {
    // Ignore and proceed to fallback
  }

  // Fallback: search in-memory store
  for (const inv of fallbackInvitationStore.values()) {
    if (inv.tokenHash === tokenHash) {
      let effectiveStatus = inv.status;
      if (effectiveStatus === "pending" && new Date(inv.expiresAt) < new Date()) {
        effectiveStatus = "expired";
      }
      const email = inv.email;
      const atIdx = email.indexOf("@");
      const invitedEmailMasked = atIdx > 0 ? email[0] + "***" + email.slice(atIdx) : email;

      return {
        workspaceName: "ScopeGuard Workspace",
        role: inv.role,
        email: inv.email,
        invitedEmailMasked,
        inviterName: inv.inviterName,
        status: effectiveStatus,
        expiresAt: inv.expiresAt,
      };
    }
  }

  return null;
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
  const { workspace, user } = await requireRole(["owner", "manager"]);
  const { rawToken, tokenHash, expiresAt } = generateInvitationToken();
  const adminClient = createServiceRoleClient();
  const normEmail = email.trim().toLowerCase();

  try {
    const { data, error } = await (adminClient as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>;
    }).rpc("create_invitation", {
      p_workspace_id: workspace.id,
      p_email: normEmail,
      p_role: role,
      p_token_hash: tokenHash,
      p_inviter_id: user.id,
    });

    if (!error && data) {
      const inviteUrl = buildInvitationUrl(rawToken);
      return {
        invitationId: data as string,
        email: normEmail,
        role,
        rawToken,
        inviteUrl,
        expiresAt,
      };
    }

    if (error && !isSchemaOrFunctionMissing(error)) {
      throw new Error(error.message || "Failed to create invitation record.");
    }
  } catch (err) {
    if (!isSchemaOrFunctionMissing(err)) {
      throw err;
    }
  }

  // Fallback: Check if user is already an active member of this workspace
  try {
    interface MemberProfileRow {
      user_id: string;
      profiles: { email: string } | { email: string }[] | null;
    }

    const { data: existingMember } = await adminClient
      .from("workspace_members")
      .select("user_id, profiles:user_id(email)")
      .eq("workspace_id", workspace.id);

    if (existingMember) {
      const memberEmails = (existingMember as unknown as MemberProfileRow[]).map((m) => {
        const prof = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
        return prof?.email?.toLowerCase();
      });
      if (memberEmails.includes(normEmail)) {
        throw new Error(`User with email ${normEmail} is already an active member of this workspace.`);
      }
    }
  } catch {
    // If profiles query fails, proceed
  }

  // Fallback: Check active pending invitation in store
  for (const inv of fallbackInvitationStore.values()) {
    if (inv.workspaceId === workspace.id && inv.email === normEmail && inv.status === "pending") {
      if (new Date(inv.expiresAt) > new Date()) {
        throw new Error(`A pending invitation already exists for this email address.`);
      }
    }
  }

  const id = crypto.randomUUID();
  const nowIso = new Date().toISOString();
  const record: FallbackInvitationRecord = {
    id,
    workspaceId: workspace.id,
    email: normEmail,
    role,
    tokenHash,
    rawToken,
    status: "pending",
    invitedBy: user.id,
    inviterName: user.fullName || user.email,
    expiresAt: expiresAt.toISOString(),
    acceptedAt: null,
    revokedAt: null,
    lastSentAt: nowIso,
    sendCount: 1,
    createdAt: nowIso,
  };

  fallbackInvitationStore.set(id, record);
  const inviteUrl = buildInvitationUrl(rawToken);

  return {
    invitationId: id,
    email: normEmail,
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

  try {
    const { data: currentInv, error: findError } = await adminClient
      .from("workspace_invitations")
      .select("email, role, workspace_id")
      .eq("id", invitationId)
      .maybeSingle();

    if (!findError && currentInv && currentInv.workspace_id === workspace.id) {
      const { error } = await adminClient.rpc("resend_invitation", {
        p_invitation_id: invitationId,
        p_new_token_hash: tokenHash,
      });

      if (!error) {
        return {
          invitationId,
          email: currentInv.email,
          role: currentInv.role as MemberRole,
          rawToken,
          inviteUrl: buildInvitationUrl(rawToken),
          expiresAt,
        };
      }
      if (!isSchemaOrFunctionMissing(error)) {
        throw new Error(error.message || "Failed to resend invitation.");
      }
    }
  } catch (err) {
    if (!isSchemaOrFunctionMissing(err)) {
      throw err;
    }
  }

  // Fallback:
  const inv = fallbackInvitationStore.get(invitationId);
  if (!inv || inv.workspaceId !== workspace.id) {
    throw new Error("Invitation record not found in this workspace.");
  }

  // Enforce 60-second cooldown
  const lastSent = new Date(inv.lastSentAt).getTime();
  if (Date.now() - lastSent < 60000) {
    const remaining = Math.ceil((60000 - (Date.now() - lastSent)) / 1000);
    throw new Error(`Please wait ${remaining} seconds before resending this invitation.`);
  }

  inv.tokenHash = tokenHash;
  inv.rawToken = rawToken;
  inv.expiresAt = expiresAt.toISOString();
  inv.lastSentAt = new Date().toISOString();
  inv.sendCount += 1;
  inv.status = "pending";

  return {
    invitationId,
    email: inv.email,
    role: inv.role,
    rawToken,
    inviteUrl: buildInvitationUrl(rawToken),
    expiresAt,
  };
}

/**
 * Revokes an active invitation.
 */
export async function revokeWorkspaceInvitation(invitationId: string): Promise<void> {
  const { workspace } = await requireRole(["owner", "manager"]);
  const adminClient = createServiceRoleClient();

  try {
    const { data: currentInv, error: findError } = await adminClient
      .from("workspace_invitations")
      .select("workspace_id")
      .eq("id", invitationId)
      .maybeSingle();

    if (!findError && currentInv && currentInv.workspace_id === workspace.id) {
      const { error } = await adminClient.rpc("revoke_invitation", {
        p_invitation_id: invitationId,
      });

      if (!error) return;
      if (!isSchemaOrFunctionMissing(error)) {
        throw new Error(error.message || "Failed to revoke invitation.");
      }
    }
  } catch (err) {
    if (!isSchemaOrFunctionMissing(err)) {
      throw err;
    }
  }

  // Fallback:
  const inv = fallbackInvitationStore.get(invitationId);
  if (!inv || inv.workspaceId !== workspace.id) {
    throw new Error("Invitation record not found in this workspace.");
  }

  inv.status = "revoked";
  inv.revokedAt = new Date().toISOString();
}

/**
 * Accepts an invitation as the currently authenticated user.
 * Invokes accept_invitation RPC strictly in the caller's authenticated context.
 */
export async function acceptWorkspaceInvitation(
  rawToken: string
): Promise<{ success: boolean; alreadyMember: boolean; workspaceId: string; role: MemberRole }> {
  const { supabase, user } = await getAuthenticatedContext().catch(async () => {
    // If user has no active workspace yet (new user), resolve user without workspace
    const { requireAuthUser } = await import("./auth-context");
    return await requireAuthUser();
  });

  const tokenHash = hashInvitationToken(rawToken);

  try {
    const { data, error } = await (supabase as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
    }).rpc("accept_invitation", {
      p_token_hash: tokenHash,
    });

    if (!error && data) {
      const res = data as { success: boolean; already_member: boolean; workspace_id: string; role: string };
      return {
        success: res.success,
        alreadyMember: res.already_member,
        workspaceId: res.workspace_id,
        role: res.role as MemberRole,
      };
    }

    if (error && !isSchemaOrFunctionMissing(error)) {
      throw new Error(error.message || "Failed to accept invitation.");
    }
  } catch (err) {
    if (!isSchemaOrFunctionMissing(err)) {
      throw err;
    }
  }

  // Fallback:
  let foundInv: FallbackInvitationRecord | null = null;
  for (const inv of fallbackInvitationStore.values()) {
    if (inv.tokenHash === tokenHash) {
      foundInv = inv;
      break;
    }
  }

  if (!foundInv) {
    throw new Error("Invalid or expired invitation link.");
  }

  if (foundInv.status !== "pending") {
    throw new Error(`Cannot accept invitation: Status is currently '${foundInv.status}'.`);
  }

  if (new Date(foundInv.expiresAt) < new Date()) {
    foundInv.status = "expired";
    throw new Error("This invitation has expired.");
  }

  // Add user to workspace_members via adminClient (service role)
  const adminClient = createServiceRoleClient();
  const { error: memberError } = await adminClient.from("workspace_members").upsert(
    {
      workspace_id: foundInv.workspaceId,
      user_id: user.id,
      role: foundInv.role,
    },
    { onConflict: "workspace_id,user_id" }
  );

  if (memberError) {
    throw new Error(memberError.message || "Failed to join workspace.");
  }

  foundInv.status = "accepted";
  foundInv.acceptedAt = new Date().toISOString();

  return {
    success: true,
    alreadyMember: false,
    workspaceId: foundInv.workspaceId,
    role: foundInv.role,
  };
}

