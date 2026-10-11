"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createWorkspace, updateWorkspaceName } from "@/lib/data/workspaces";
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
} from "@/lib/validation/workspace";
import type { ActionState } from "./auth";

/**
 * Creates an initial workspace during user onboarding.
 * Never trusts workspace_id or role from the browser.
 */
export async function createWorkspaceAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const rawData = {
    name: formData.get("name"),
  };

  const validated = createWorkspaceSchema.safeParse(rawData);
  if (!validated.success) {
    return {
      success: false,
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  try {
    await createWorkspace(validated.data.name);
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to create workspace. Please try again.",
    };
  }

  redirect("/dashboard");
}

/**
 * Updates the current workspace's name.
 * Strictly guarded by requireRole(['owner']) inside the data layer.
 * Never accepts workspace_id or user role from client parameters.
 */
export async function updateWorkspaceAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  // Deliberately ignores any workspace_id passed in formData
  const rawData = {
    name: formData.get("name"),
  };

  const validated = updateWorkspaceSchema.safeParse(rawData);
  if (!validated.success) {
    return {
      success: false,
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  try {
    await updateWorkspaceName(validated.data.name);
    revalidatePath("/settings");
    return {
      success: true,
      message: "Workspace details updated successfully.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to update workspace. Please try again.",
    };
  }
}

