"use server";

import { revalidatePath } from "next/cache";
import {
  createDeliverable,
  updateDeliverable,
  deleteDeliverable,
  type DeliverableStatus,
} from "@/lib/data/deliverables";
import type { ActionState } from "./auth";

/**
 * Server action to add a deliverable to a project.
 */
export async function createDeliverableAction(
  projectId: string,
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const title = formData.get("title")?.toString() || "";
  const description = formData.get("description")?.toString() || "";

  if (title.trim().length < 2) {
    return {
      success: false,
      fieldErrors: {
        title: ["Deliverable title must be at least 2 characters."],
      },
    };
  }

  try {
    await createDeliverable(projectId, {
      title,
      description: description.trim() || null,
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/settings`);

    return {
      success: true,
      message: "Deliverable added successfully.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to add deliverable.",
    };
  }
}

/**
 * Server action to update an existing deliverable.
 */
export async function updateDeliverableAction(
  deliverableId: string,
  projectId: string,
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const title = formData.get("title")?.toString();
  const description = formData.get("description")?.toString();
  const status = formData.get("status")?.toString() as DeliverableStatus | undefined;

  try {
    await updateDeliverable(deliverableId, projectId, {
      title,
      description,
      status,
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/settings`);

    return {
      success: true,
      message: "Deliverable updated successfully.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update deliverable.",
    };
  }
}

/**
 * Server action to delete a deliverable.
 */
export async function deleteDeliverableAction(
  deliverableId: string,
  projectId: string
): Promise<ActionState> {
  try {
    await deleteDeliverable(deliverableId, projectId);

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/settings`);

    return {
      success: true,
      message: "Deliverable removed successfully.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete deliverable.",
    };
  }
}

