import {
  getAuthenticatedContext,
  requireRole,
  MemberRole,
} from "./auth-context";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { ForbiddenError, NotFoundError } from "./errors";

export interface WorkspaceMemberItem {
  id: string;
  userId: string;
  role: MemberRole;
  createdAt: string;
  profile: {
    email: string;
    fullName: string | null;
  };
}

/**
 * Retrieves all members of the active workspace.
 * Returns member list along with the caller's role and user ID.
 */
export async function getWorkspaceMembers(): Promise<{
  members: WorkspaceMemberItem[];
  currentUserRole: MemberRole;
  currentUserId: string;
}> {
  const context = await getAuthenticatedContext();

  interface MemberQueryRow {
    id: string;
    user_id: string;
    role: MemberRole;
    created_at: string;
    profiles:
      | {
          id: string;
          email: string;
          full_name: string | null;
        }
      | {
          id: string;
          email: string;
          full_name: string | null;
        }[]
      | null;
  }

  const adminClient = createServiceRoleClient();
  const queryResult = await adminClient
    .from("workspace_members")
    .select(`
      id,
      user_id,
      role,
      created_at,
      profiles (
        id,
        email,
        full_name
      )
    `)
    .eq("workspace_id", context.workspace.id)
    .order("created_at", { ascending: true });

  const rawMembers = queryResult.data as unknown as MemberQueryRow[] | null;
  const error = queryResult.error;

  if (error || !rawMembers) {
    throw new Error(error?.message || "Failed to fetch workspace members.");
  }

  const roleOrder: Record<MemberRole, number> = {
    owner: 1,
    manager: 2,
    member: 3,
  };

  const members: WorkspaceMemberItem[] = rawMembers.map((item) => {
    const prof = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
    return {
      id: item.id,
      userId: item.user_id,
      role: item.role as MemberRole,
      createdAt: item.created_at,
      profile: {
        email: prof?.email || "Unknown",
        fullName: prof?.full_name || null,
      },
    };
  });

  // Sort by role hierarchy (owner, manager, member), then by created_at
  members.sort((a, b) => {
    const rA = roleOrder[a.role] || 99;
    const rB = roleOrder[b.role] || 99;
    if (rA !== rB) return rA - rB;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return {
    members,
    currentUserRole: context.role,
    currentUserId: context.user.id,
  };
}

/**
 * Updates the role of a workspace member.
 * Strictly restricted to users with the 'owner' role.
 * Cannot demote the workspace owner or assign a second owner.
 */
export async function updateMemberRole(
  targetUserId: string,
  newRole: MemberRole
): Promise<void> {
  const { workspace, user } = await requireRole(["owner"]);

  if (newRole === "owner") {
    throw new ForbiddenError(
      "Cannot promote another member to owner directly. Exactly one owner is permitted per workspace."
    );
  }

  if (targetUserId === user.id) {
    throw new ForbiddenError(
      "The workspace owner cannot demote their own account."
    );
  }

  if (!["manager", "member"].includes(newRole)) {
    throw new Error(`Invalid role '${newRole}'. Permitted roles: manager, member.`);
  }

  const adminClient = createServiceRoleClient();

  // Verify the target member exists within this workspace
  const { data: targetMember, error: findError } = await adminClient
    .from("workspace_members")
    .select("id, role")
    .eq("workspace_id", workspace.id)
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (findError || !targetMember) {
    throw new NotFoundError("Target member does not exist in this workspace.");
  }

  const { error: updateError } = await adminClient
    .from("workspace_members")
    .update({ role: newRole })
    .eq("workspace_id", workspace.id)
    .eq("user_id", targetUserId);

  if (updateError) {
    throw new Error(updateError.message || "Failed to update member role.");
  }
}
