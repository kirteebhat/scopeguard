"use server";

import { revalidatePath } from "next/cache";
import { updateMemberRole } from "@/lib/data/members";
import { updateMemberRoleSchema } from "@/lib/validation/workspace";
import type { ActionState } from "./auth";

/**
 * Updates a team member's role within the active workspace.
 * Strictly guarded by requireRole(['owner']) inside the data layer.
 * Never accepts workspace_id from client parameters.
 */
export async function updateMemberRoleAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const rawData = {
    targetUserId: formData.get("targetUserId"),
    role: formData.get("role"),
  };

  const validated = updateMemberRoleSchema.safeParse(rawData);
  if (!validated.success) {
    return {
      success: false,
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  try {
    await updateMemberRole(validated.data.targetUserId, validated.data.role);
    revalidatePath("/settings/team");
    return {
      success: true,
      message: `Member role updated to ${validated.data.role}.`,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to update member role. Please try again.",
    };
  }
}

