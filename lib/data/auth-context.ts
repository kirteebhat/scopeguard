import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { Database } from "@/lib/supabase/database.types";
import {
  UnauthorizedError,
  ForbiddenError,
  WorkspaceNotFoundError,
} from "./errors";

export type MemberRole = Database["public"]["Enums"]["member_role"];

export interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
}

export interface AuthWorkspace {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: string;
}

export interface AuthContext {
  user: AuthUser;
  workspace: AuthWorkspace;
  role: MemberRole;
  supabase: Awaited<ReturnType<typeof createClient>>;
}

/**
 * Resolves the authenticated Supabase user without requiring an active workspace.
 * Throws UnauthorizedError if unauthenticated.
 */
export async function requireAuthUser(): Promise<{
  user: AuthUser;
  supabase: Awaited<ReturnType<typeof createClient>>;
}> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new UnauthorizedError("You must be logged in to access this resource.");
  }

  return {
    user: {
      id: user.id,
      email: user.email || "",
      fullName:
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        null,
    },
    supabase,
  };
}

/**
 * Resolves the authenticated user, their active workspace, and workspace role.
 * Resolves strictly from server-side session cookies.
 *
 * Throws UnauthorizedError if unauthenticated.
 * Throws WorkspaceNotFoundError if user has no workspace membership.
 */
export async function getAuthenticatedContext(): Promise<AuthContext> {
  const { user, supabase } = await requireAuthUser();

  interface WorkspaceMemberQueryRow {
    workspace_id: string;
    role: MemberRole;
    workspaces:
      | {
          id: string;
          name: string;
          slug: string;
          plan: string;
          created_at: string;
        }
      | {
          id: string;
          name: string;
          slug: string;
          plan: string;
          created_at: string;
        }[]
      | null;
  }

  // Resolve user's active workspace membership via server data access
  const adminClient = createServiceRoleClient();
  const queryResult = await adminClient
    .from("workspace_members")
    .select(`
      workspace_id,
      role,
      workspaces (
        id,
        name,
        slug,
        plan,
        created_at
      )
    `)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const member = queryResult.data as unknown as WorkspaceMemberQueryRow | null;
  const memberError = queryResult.error;

  if (memberError || !member || !member.workspaces) {
    throw new WorkspaceNotFoundError("No active workspace found for user.");
  }

  // Handle relation whether returned as single object or array
  const wsData = Array.isArray(member.workspaces)
    ? member.workspaces[0]
    : member.workspaces;

  if (!wsData) {
    throw new WorkspaceNotFoundError("Workspace record is missing.");
  }

  return {
    user,
    workspace: {
      id: wsData.id,
      name: wsData.name,
      slug: wsData.slug,
      plan: wsData.plan,
      createdAt: wsData.created_at,
    },
    role: member.role as MemberRole,
    supabase,
  };
}

/**
 * Helper for Server Component layouts and pages.
 * Resolves context, automatically redirecting for missing session or workspace.
 */
export async function getWorkspaceContextOrRedirect(): Promise<AuthContext> {
  try {
    return await getAuthenticatedContext();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect("/login");
    }
    if (error instanceof WorkspaceNotFoundError) {
      redirect("/onboarding");
    }
    if (error instanceof ForbiddenError) {
      redirect("/unauthorized");
    }
    throw error;
  }
}

/**
 * Reusable role guard for Server Actions and data access functions.
 * Evaluates whether the authenticated user holds one of the required roles.
 *
 * Throws UnauthorizedError if unauthenticated.
 * Throws WorkspaceNotFoundError if no workspace exists.
 * Throws ForbiddenError if the resolved role is not permitted.
 *
 * Server actions must NEVER trust workspace_id or role from the browser.
 *
 * @param allowedRoles Single role or array of allowed roles (e.g. ['owner', 'manager'])
 * @param customContext Optional context override (used in unit tests / mocks)
 */
export async function requireRole(
  allowedRoles: MemberRole | MemberRole[],
  customContext?: AuthContext
): Promise<AuthContext> {
  const context = customContext ?? (await getAuthenticatedContext());
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  if (!roles.includes(context.role)) {
    throw new ForbiddenError(
      `Access denied. Required role: ${roles.join(" or ")}, but your role is ${context.role}.`
    );
  }

  return context;
}
