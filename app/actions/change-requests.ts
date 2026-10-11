"use server";

import { revalidatePath } from "next/cache";
import {
  createChangeRequestDraft,
  updateChangeRequestDraft,
  CreateDraftData,
  UpdateDraftData,
} from "@/lib/data/change-requests";
import {
  clientChangeRequestFormSchema,
  createChangeRequestDraftSchema,
  updateChangeRequestDraftSchema,
} from "@/lib/validation/change-request";
import { parseDecimalToMinor } from "@/lib/domain/money";
import type { ActionState } from "./auth";

/**
 * Server action to create a new change request draft.
 * Converts decimal string monetary fields to integer minor units safely.
 */
export async function createChangeRequestDraftAction(
  _prevState: ActionState<{ id: string }> | null,
  formData: FormData
): Promise<ActionState<{ id: string }>> {
  const rawData = {
    projectId: formData.get("projectId"),
    title: formData.get("title"),
    description: formData.get("description"),
    reason: formData.get("reason") || undefined,
    deliverableId: formData.get("deliverableId") || undefined,
    pricingMethod: formData.get("pricingMethod"),
    hours: formData.get("hours") || undefined,
    hourlyRate: formData.get("hourlyRate") || undefined,
    fixedCost: formData.get("fixedCost") || undefined,
    proposedDeadline: formData.get("proposedDeadline") || undefined,
    additionalDays: formData.get("additionalDays") || undefined,
    internalNotes: formData.get("internalNotes") || undefined,
  };

  const clientValidation = clientChangeRequestFormSchema.safeParse(rawData);
  if (!clientValidation.success) {
    return {
      success: false,
      fieldErrors: clientValidation.error.flatten().fieldErrors,
      message: "Please correct the errors in the form.",
    };
  }

  const {
    projectId,
    title,
    description,
    reason,
    deliverableId,
    pricingMethod,
    hours,
    hourlyRate,
    fixedCost,
    proposedDeadline,
    internalNotes,
  } = clientValidation.data;

  // Convert decimal currency values to minor units
  let estimatedHours: number | null = null;
  let hourlyRateMinor: number | null = null;
  let fixedCostMinor: number | null = null;

  try {
    if (pricingMethod === "hourly") {
      estimatedHours = hours ? parseFloat(hours) : 0;
      if (hourlyRate && hourlyRate.trim() !== "") {
        hourlyRateMinor = parseDecimalToMinor(hourlyRate);
      }
    } else if (pricingMethod === "fixed") {
      if (fixedCost && fixedCost.trim() !== "") {
        fixedCostMinor = parseDecimalToMinor(fixedCost);
      }
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Invalid monetary format";
    return {
      success: false,
      message: `Commercial terms error: ${errorMsg}`,
    };
  }

  // Validate server payload with domain schema
  const draftPayload: CreateDraftData = {
    projectId,
    title,
    description,
    reason: reason || null,
    deliverableId: deliverableId && deliverableId.trim() !== "" ? deliverableId : null,
    pricingMethod,
    estimatedHours,
    hourlyRateMinor,
    fixedCostMinor,
    proposedDeadline: proposedDeadline && proposedDeadline.trim() !== "" ? proposedDeadline : null,
    internalNotes: internalNotes || null,
  };

  const serverValidation = createChangeRequestDraftSchema.safeParse(draftPayload);
  if (!serverValidation.success) {
    return {
      success: false,
      fieldErrors: serverValidation.error.flatten().fieldErrors,
      message: "Server validation failed. Please check your inputs.",
    };
  }

  try {
    const newId = await createChangeRequestDraft(draftPayload);
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/changes`);
    revalidatePath(`/changes/${newId}`);

    return {
      success: true,
      data: { id: newId },
      message: "Change request draft created successfully.",
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create change request draft";
    return {
      success: false,
      message: errorMsg,
    };
  }
}

/**
 * Server action to update an existing change request draft.
 * Rejects modifications if the change request is not in 'draft' status.
 */
export async function updateChangeRequestDraftAction(
  changeRequestId: string,
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const rawData = {
    projectId: formData.get("projectId") || "00000000-0000-0000-0000-000000000000",
    title: formData.get("title"),
    description: formData.get("description"),
    reason: formData.get("reason") || undefined,
    deliverableId: formData.get("deliverableId") || undefined,
    pricingMethod: formData.get("pricingMethod"),
    hours: formData.get("hours") || undefined,
    hourlyRate: formData.get("hourlyRate") || undefined,
    fixedCost: formData.get("fixedCost") || undefined,
    proposedDeadline: formData.get("proposedDeadline") || undefined,
    additionalDays: formData.get("additionalDays") || undefined,
    internalNotes: formData.get("internalNotes") || undefined,
  };

  const clientValidation = clientChangeRequestFormSchema.safeParse(rawData);
  if (!clientValidation.success) {
    return {
      success: false,
      fieldErrors: clientValidation.error.flatten().fieldErrors,
      message: "Please correct the errors in the form.",
    };
  }

  const {
    title,
    description,
    reason,
    deliverableId,
    pricingMethod,
    hours,
    hourlyRate,
    fixedCost,
    proposedDeadline,
    internalNotes,
  } = clientValidation.data;

  let estimatedHours: number | null = null;
  let hourlyRateMinor: number | null = null;
  let fixedCostMinor: number | null = null;

  try {
    if (pricingMethod === "hourly") {
      estimatedHours = hours ? parseFloat(hours) : 0;
      if (hourlyRate && hourlyRate.trim() !== "") {
        hourlyRateMinor = parseDecimalToMinor(hourlyRate);
      }
    } else if (pricingMethod === "fixed") {
      if (fixedCost && fixedCost.trim() !== "") {
        fixedCostMinor = parseDecimalToMinor(fixedCost);
      }
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Invalid monetary format";
    return {
      success: false,
      message: `Commercial terms error: ${errorMsg}`,
    };
  }

  const updatePayload: UpdateDraftData = {
    title,
    description,
    reason: reason || null,
    deliverableId: deliverableId && deliverableId.trim() !== "" ? deliverableId : null,
    pricingMethod,
    estimatedHours,
    hourlyRateMinor,
    fixedCostMinor,
    proposedDeadline: proposedDeadline && proposedDeadline.trim() !== "" ? proposedDeadline : null,
    internalNotes: internalNotes || null,
  };

  const serverValidation = updateChangeRequestDraftSchema.safeParse(updatePayload);
  if (!serverValidation.success) {
    return {
      success: false,
      fieldErrors: serverValidation.error.flatten().fieldErrors,
      message: "Server validation failed. Please check your inputs.",
    };
  }

  try {
    await updateChangeRequestDraft(changeRequestId, updatePayload);
    revalidatePath(`/changes/${changeRequestId}`);

    return {
      success: true,
      message: "Draft saved successfully.",
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update change request draft";
    return {
      success: false,
      message: errorMsg,
    };
  }
}

