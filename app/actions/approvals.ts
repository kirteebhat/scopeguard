"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { submitClientDecision, type SubmitDecisionResult } from "@/lib/data/approvals";

export interface SubmitDecisionActionInput {
  token: string;
  decision: "approved" | "rejected";
  actorName: string;
  notes?: string;
}

/**
 * Public server action for client proposal decision submission.
 * Enforces:
 * - Public access (NO agency authentication required).
 * - Extracts client IP and user agent safely for salted audit hashing.
 * - Raw token is NEVER logged or stored.
 * - Double-click / concurrent submits: exactly one decision is recorded,
 *   subsequent submits return calm 'already_decided'.
 */
export async function submitClientDecisionAction(
  input: SubmitDecisionActionInput
): Promise<SubmitDecisionResult> {
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  const realIp = headersList.get("x-real-ip");
  const clientIp = forwardedFor?.split(",")[0]?.trim() || realIp || "127.0.0.1";
  const userAgent = headersList.get("user-agent") || undefined;

  const result = await submitClientDecision(
    input.token,
    input.decision,
    input.actorName,
    clientIp,
    userAgent,
    input.notes
  );

  revalidatePath(`/approve/${input.token}`);
  return result;
}

