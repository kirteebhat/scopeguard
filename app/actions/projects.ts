"use server";

import { revalidatePath } from "next/cache";
import { createProject, updateProject, type ProjectStatus } from "@/lib/data/projects";
import { createProjectSchema, updateProjectSchema } from "@/lib/validation/project";
import { parseDecimalToMinor } from "@/lib/domain/money";
import type { ActionState } from "./auth";

/**
 * Server action to create a new project.
 * Guarded on the server by requireRole(['owner', 'manager']) within createProject.
 */
export async function createProjectAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const name = formData.get("name")?.toString() || "";
  const clientName = formData.get("clientName")?.toString() || "";
  const description = formData.get("description")?.toString() || "";
  const currency = formData.get("currency")?.toString() || "USD";
  const budgetStr = formData.get("budget")?.toString() || "0";
  const hourlyRateStr = formData.get("hourlyRate")?.toString() || "0";
  const startDate = formData.get("startDate")?.toString() || "";
  const originalDeadline = formData.get("originalDeadline")?.toString() || "";

  // Deliverables passed as JSON string or multi-inputs
  let deliverables: Array<{ title: string; description?: string }> = [];
  const deliverablesJson = formData.get("deliverablesJson")?.toString();
  if (deliverablesJson) {
    try {
      deliverables = JSON.parse(deliverablesJson);
    } catch {
      // Ignored if malformed
    }
  }

  // Convert decimal strings to minor units using domain logic
  let budgetMinor = 0;
  let hourlyRateMinor = 0;

  try {
    budgetMinor = parseDecimalToMinor(budgetStr);
  } catch (err) {
    return {
      success: false,
      fieldErrors: {
        budgetMinor: [err instanceof Error ? err.message : "Invalid budget format"],
      },
    };
  }

  try {
    hourlyRateMinor = parseDecimalToMinor(hourlyRateStr);
  } catch (err) {
    return {
      success: false,
      fieldErrors: {
        hourlyRateMinor: [err instanceof Error ? err.message : "Invalid hourly rate format"],
      },
    };
  }

  const clientContactName = formData.get("clientContactName")?.toString();
  const clientContactEmail = formData.get("clientContactEmail")?.toString();

  const rawPayload = {
    name,
    clientName,
    clientContactName: clientContactName?.trim() || null,
    clientContactEmail: clientContactEmail?.trim() || null,
    description: description.trim() || null,
    currency,
    budgetMinor,
    hourlyRateMinor,
    startDate,
    originalDeadline,
  };

  const validated = createProjectSchema.safeParse(rawPayload);
  if (!validated.success) {
    return {
      success: false,
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  let newProjectId: string;

  try {
    const created = await createProject({
      ...validated.data,
      deliverables,
    });
    newProjectId = created.id;
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create project.",
    };
  }

  revalidatePath("/projects");
  return {
    success: true,
    data: { id: newProjectId },
  };
}

/**
 * Server action to update an existing project.
 * Strict role check: 'member' accounts cannot modify financial fields.
 */
export async function updateProjectAction(
  projectId: string,
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const name = formData.get("name")?.toString();
  const clientName = formData.get("clientName")?.toString();
  const clientContactName = formData.get("clientContactName")?.toString();
  const clientContactEmail = formData.get("clientContactEmail")?.toString();
  const description = formData.get("description")?.toString();
  const status = formData.get("status")?.toString() as ProjectStatus | undefined;
  const currency = formData.get("currency")?.toString();
  const budgetStr = formData.get("budget")?.toString();
  const hourlyRateStr = formData.get("hourlyRate")?.toString();
  const startDate = formData.get("startDate")?.toString();
  const originalDeadline = formData.get("originalDeadline")?.toString();

  const updateData: {
    name?: string;
    clientName?: string;
    clientContactName?: string | null;
    clientContactEmail?: string | null;
    description?: string | null;
    status?: ProjectStatus;
    currency?: string;
    budgetMinor?: number;
    hourlyRateMinor?: number;
    startDate?: string;
    originalDeadline?: string;
  } = {};

  if (name !== undefined) updateData.name = name;
  if (clientName !== undefined) updateData.clientName = clientName;
  if (clientContactName !== undefined) updateData.clientContactName = clientContactName.trim() || null;
  if (clientContactEmail !== undefined) updateData.clientContactEmail = clientContactEmail.trim() || null;
  if (description !== undefined) updateData.description = description.trim() || null;
  if (status !== undefined) updateData.status = status;
  if (startDate !== undefined) updateData.startDate = startDate;
  if (originalDeadline !== undefined) updateData.originalDeadline = originalDeadline;

  if (currency !== undefined && currency.trim() !== "") {
    updateData.currency = currency.toUpperCase().trim();
  }

  if (budgetStr !== undefined && budgetStr.trim() !== "") {
    try {
      updateData.budgetMinor = parseDecimalToMinor(budgetStr);
    } catch (err) {
      return {
        success: false,
        fieldErrors: {
          budgetMinor: [err instanceof Error ? err.message : "Invalid budget format"],
        },
      };
    }
  }

  if (hourlyRateStr !== undefined && hourlyRateStr.trim() !== "") {
    try {
      updateData.hourlyRateMinor = parseDecimalToMinor(hourlyRateStr);
    } catch (err) {
      return {
        success: false,
        fieldErrors: {
          hourlyRateMinor: [err instanceof Error ? err.message : "Invalid hourly rate format"],
        },
      };
    }
  }

  const validated = updateProjectSchema.safeParse(updateData);
  if (!validated.success) {
    return {
      success: false,
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  try {
    await updateProject(projectId, validated.data);
    revalidatePath("/projects");
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/settings`);

    return {
      success: true,
      message: "Project updated successfully.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update project.",
    };
  }
}

