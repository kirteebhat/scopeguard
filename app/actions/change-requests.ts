"use server";

import { revalidatePath } from "next/cache";
import {
  createChangeRequestDraft,
  updateChangeRequestDraft,
  publishChangeRequest,
  regenerateApprovalToken,
  reviseChangeRequest,
  withdrawChangeRequest,
  getChangeRequestById,
  CreateDraftData,
  UpdateDraftData,
} from "@/lib/data/change-requests";
import { generateApprovalToken } from "@/lib/server/tokens";
import { requireRole } from "@/lib/data/auth-context";
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

/**
 * Server action to publish a change request draft.
 *
 * CRITICAL SECURITY ARCHITECTURE:
 * - Token is generated on the server ONLY using crypto.randomBytes(32) (256 bits entropy).
 * - The raw token exists ONLY in volatile memory during generation and in this single response payload.
 * - The database stores ONLY the SHA-256 hash.
 * - The raw token is NEVER persisted to disk, NEVER logged, and CANNOT be retrieved again.
 * - Role check enforces owner or manager permission.
 */
export async function publishChangeRequestAction(
  changeRequestId: string
): Promise<
  ActionState<{
    shareUrl: string;
    rawToken: string;
    expiresAt: string;
    versionNumber: number;
  }>
> {
  try {
    await requireRole(["owner", "manager"]);

    // Generate cryptographic URL-safe approval token (14 days expiry)
    // Raw token exists strictly in memory; only SHA-256 hash is persisted
    const { rawToken, tokenHash, expiresAt } = generateApprovalToken(14);

    const { versionNumber } = await publishChangeRequest(
      changeRequestId,
      tokenHash,
      expiresAt.toISOString()
    );

    const changeRequest = await getChangeRequestById(changeRequestId);
    revalidatePath(`/projects/${changeRequest.projectId}`);
    revalidatePath(`/projects/${changeRequest.projectId}/changes`);
    revalidatePath(`/changes/${changeRequestId}`);

    return {
      success: true,
      data: {
        shareUrl: `/approve/${rawToken}`,
        rawToken,
        expiresAt: expiresAt.toISOString(),
        versionNumber,
      },
      message: `Change proposal published as Version ${versionNumber}.`,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to publish change request";
    return {
      success: false,
      message: errorMsg,
    };
  }
}

/**
 * Server action to revoke the active approval token for a pending version
 * and generate a fresh URL-safe token.
 *
 * The raw token exists strictly in volatile memory and in this single response payload.
 */
export async function regenerateApprovalTokenAction(
  changeRequestId: string
): Promise<
  ActionState<{
    shareUrl: string;
    rawToken: string;
    expiresAt: string;
  }>
> {
  try {
    await requireRole(["owner", "manager"]);

    // Generate fresh cryptographic token
    const { rawToken, tokenHash, expiresAt } = generateApprovalToken(14);

    await regenerateApprovalToken(
      changeRequestId,
      tokenHash,
      expiresAt.toISOString()
    );

    const changeRequest = await getChangeRequestById(changeRequestId);
    revalidatePath(`/changes/${changeRequestId}`);
    revalidatePath(`/projects/${changeRequest.projectId}/changes`);

    return {
      success: true,
      data: {
        shareUrl: `/approve/${rawToken}`,
        rawToken,
        expiresAt: expiresAt.toISOString(),
      },
      message: "New approval link generated. Previous link has been revoked.",
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error
        ? err.message
        : "Failed to regenerate approval link";
    return {
      success: false,
      message: errorMsg,
    };
  }
}

/**
 * Server action to revise a pending change request: revokes the active token
 * and reverts status to draft.
 */
export async function reviseChangeRequestAction(
  changeRequestId: string
): Promise<ActionState> {
  try {
    await requireRole(["owner", "manager"]);

    await reviseChangeRequest(changeRequestId);

    const changeRequest = await getChangeRequestById(changeRequestId);
    revalidatePath(`/changes/${changeRequestId}`);
    revalidatePath(`/projects/${changeRequest.projectId}/changes`);

    return {
      success: true,
      message: "Proposal reverted to draft. Previous approval link has been revoked.",
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to revise change request";
    return {
      success: false,
      message: errorMsg,
    };
  }
}

/**
 * Server action to withdraw a pending change request: revokes active token
 * and transitions status to 'withdrawn' (terminal).
 */
export async function withdrawChangeRequestAction(
  changeRequestId: string
): Promise<ActionState> {
  try {
    await requireRole(["owner", "manager"]);

    await withdrawChangeRequest(changeRequestId);

    const changeRequest = await getChangeRequestById(changeRequestId);
    revalidatePath(`/changes/${changeRequestId}`);
    revalidatePath(`/projects/${changeRequest.projectId}/changes`);

    return {
      success: true,
      message: "Proposal withdrawn. Active approval link has been revoked.",
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to withdraw change request";
    return {
      success: false,
      message: errorMsg,
    };
  }
}


