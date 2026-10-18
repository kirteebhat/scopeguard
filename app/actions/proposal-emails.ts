"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/data/auth-context";
import { getChangeRequestById, regenerateApprovalToken } from "@/lib/data/change-requests";
import { setProjectClientContact } from "@/lib/data/projects";
import {
  listProposalEmails,
  recordFallbackProposalEmailBegin,
  recordFallbackProposalEmailComplete,
  type ProposalEmailHistoryItem,
} from "@/lib/data/proposal-emails";
import { isSchemaOrFunctionMissing } from "@/lib/data/invitations";
import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  sendProposalToClientSchema,
  setProjectClientContactSchema,
  type SendProposalToClientInput,
} from "@/lib/validation/proposal-email";
import { emailProvider } from "@/lib/email/resend";
import {
  renderProposalEmailSubject,
  renderProposalEmailHtml,
  renderProposalEmailText,
} from "@/lib/email/templates/proposal";
import { generateApprovalToken, buildApprovalUrl } from "@/lib/server/tokens";
import { formatMinorToCurrency } from "@/lib/domain/money";

export interface ProposalEmailActionResponse {
  success: boolean;
  status?: "sent" | "failed" | "not_configured";
  shareUrl?: string;
  rawToken?: string;
  message?: string;
  fieldErrors?: Record<string, string[]>;
}

/**
 * Server Action: Sends a proposal approval link to a client via email.
 *
 * Security & Integrity Guarantees:
 * 1. Only workspace Owners and Managers may send proposals.
 * 2. Raw approval tokens exist solely in memory and in the immediate client response;
 *    only the SHA-256 hash is persisted.
 * 3. Never includes internal notes in emails or activity logs.
 * 4. Recipient email is masked in activity logs and delivery logs.
 * 5. Rate limiting and 60-second cooldown enforced atomically at DB level.
 * 6. Always provides fallback shareUrl on provider failure or unconfigured state.
 */
export async function sendProposalToClientAction(
  input: SendProposalToClientInput
): Promise<ProposalEmailActionResponse> {
  const validation = sendProposalToClientSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      fieldErrors: validation.error.flatten().fieldErrors,
      message: "Please correct the highlighted fields.",
    };
  }

  const {
    changeRequestId,
    recipientEmail,
    recipientName,
    personalNote,
    sendCopyToMe,
    mode,
    rawToken: inputRawToken,
    attemptKey,
    saveAsProjectContact,
  } = validation.data;

  try {
    const { user, workspace } = await requireRole(["owner", "manager"]);
    const adminClient = createServiceRoleClient();

    // Fetch change request details
    const cr = await getChangeRequestById(changeRequestId);

    if (cr.status !== "pending_approval") {
      return {
        success: false,
        message: `Cannot send proposal: request status is '${cr.status}' (must be 'pending_approval').`,
      };
    }

    if (cr.project.workspaceId !== workspace.id) {
      return {
        success: false,
        message: "You do not have access to this change request.",
      };
    }

    // Resolve active version
    const activeVersion =
      cr.versions.find((v) => v.versionNumber === cr.currentVersion) ||
      cr.versions[cr.versions.length - 1];

    if (!activeVersion) {
      return {
        success: false,
        message: "No active version snapshot found for this change request.",
      };
    }

    // Resolve raw approval token & public URL
    let activeRawToken = "";
    let approvalUrl = "";

    if (mode === "use_current_link_from_publish") {
      if (!inputRawToken) {
        return {
          success: false,
          message: "Approval token is missing from publish response.",
        };
      }
      activeRawToken = inputRawToken;
      approvalUrl = buildApprovalUrl(activeRawToken);
    } else {
      // mode === 'regenerate_link'
      // Generate fresh token, revoking prior active token
      const { rawToken: freshToken, tokenHash, expiresAt } = generateApprovalToken(14);
      await regenerateApprovalToken(changeRequestId, tokenHash, expiresAt.toISOString());
      activeRawToken = freshToken;
      approvalUrl = buildApprovalUrl(activeRawToken);
    }

    // Optional: Save as project client contact
    if (saveAsProjectContact && cr.projectId) {
      try {
        await setProjectClientContact(
          cr.projectId,
          recipientName || null,
          recipientEmail
        );
      } catch (err: unknown) {
        console.warn("Non-fatal: failed to update project client contact", err);
      }
    }

    // Atomically begin delivery attempt in DB (cooldown + rate limiting)
    let emailId: string | null = null;
    let isFallback = false;

    try {
      const { data, error: beginErr } = await adminClient.rpc("begin_proposal_email", {
        p_change_request_id: changeRequestId,
        p_recipient_email: recipientEmail.trim().toLowerCase(),
        p_recipient_name: recipientName?.trim() || null,
        p_attempt_key: attemptKey,
        p_personal_note_present: !!(personalNote && personalNote.trim().length > 0),
      });

      if (!beginErr && data) {
        emailId = data;
      } else if (beginErr) {
        if (!isSchemaOrFunctionMissing(beginErr)) {
          return {
            success: false,
            message: beginErr.message || "Failed to initiate proposal delivery.",
          };
        }
        isFallback = true;
      }
    } catch (err: unknown) {
      if (!isSchemaOrFunctionMissing(err)) {
        return {
          success: false,
          message: err instanceof Error ? err.message : "Failed to initiate proposal delivery.",
        };
      }
      isFallback = true;
    }

    if (isFallback) {
      try {
        emailId = recordFallbackProposalEmailBegin({
          workspaceId: workspace.id,
          changeRequestId,
          recipientEmail: recipientEmail.trim().toLowerCase(),
          recipientName: recipientName?.trim() || null,
          sentBy: user.id,
          senderName: user.fullName || user.email || "Team Member",
          attemptKey,
          personalNotePresent: !!(personalNote && personalNote.trim().length > 0),
        });
      } catch (fbErr: unknown) {
        return {
          success: false,
          message: fbErr instanceof Error ? fbErr.message : "Failed to initiate proposal delivery.",
        };
      }
    }

    if (!emailId) {
      return {
        success: false,
        message: "Failed to initiate proposal delivery.",
      };
    }

    // Format email content
    const additionalCostFormatted = formatMinorToCurrency(
      activeVersion.costMinor,
      activeVersion.currency
    );

    const emailProps = {
      recipientName: recipientName?.trim() || null,
      senderName: user.fullName || user.email,
      workspaceName: workspace.name,
      projectName: cr.project.name,
      changeRequestTitle: activeVersion.title || cr.title,
      changeRequestDescription: activeVersion.description || cr.description,
      additionalCostFormatted,
      currency: activeVersion.currency,
      originalDeadline: cr.project.originalDeadline || null,
      proposedDeadline: activeVersion.proposedDeadline || null,
      versionNumber: activeVersion.versionNumber,
      personalNote: personalNote?.trim() || null,
      reviewUrl: approvalUrl,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    };

    const subject = renderProposalEmailSubject({
      workspaceName: workspace.name,
      projectName: cr.project.name,
      versionNumber: activeVersion.versionNumber,
    });
    const html = renderProposalEmailHtml(emailProps);
    const text = renderProposalEmailText(emailProps);

    // Check if email provider is configured
    if (emailProvider.isConfigured && !emailProvider.isConfigured()) {
      if (isFallback) {
        recordFallbackProposalEmailComplete(emailId, "failed", null, "provider_not_configured");
      } else {
        try {
          await adminClient.rpc("complete_proposal_email", {
            p_email_id: emailId,
            p_status: "failed",
            p_provider_message_id: null,
            p_error_code: "provider_not_configured",
          });
        } catch {
          // Ignore RPC completion failure if schema is unmigrated
        }
      }

      revalidatePath(`/changes/${changeRequestId}`);
      revalidatePath(`/projects/${cr.projectId}`);

      return {
        success: true,
        status: "not_configured",
        shareUrl: approvalUrl,
        rawToken: activeRawToken,
        message:
          "Email provider is not configured on this environment. The proposal link is active—copy and share it directly with your client.",
      };
    }

    // Dispatch email via provider
    const sendResult = await emailProvider.sendEmail({
      to: recipientEmail.trim().toLowerCase(),
      subject,
      html,
      text,
      replyTo: user.email,
      fromName: user.fullName ? `${user.fullName} via ScopeGuard` : `${workspace.name} via ScopeGuard`,
    });

    if (!sendResult.success) {
      if (isFallback) {
        recordFallbackProposalEmailComplete(
          emailId,
          "failed",
          null,
          sendResult.error || "delivery_error"
        );
      } else {
        try {
          await adminClient.rpc("complete_proposal_email", {
            p_email_id: emailId,
            p_status: "failed",
            p_provider_message_id: null,
            p_error_code: sendResult.error || "delivery_error",
          });
        } catch {
          // Ignore RPC completion failure if schema is unmigrated
        }
      }

      revalidatePath(`/changes/${changeRequestId}`);
      revalidatePath(`/projects/${cr.projectId}`);

      return {
        success: false,
        status: "failed",
        shareUrl: approvalUrl,
        rawToken: activeRawToken,
        message: `Email delivery failed (${sendResult.error || "unknown"}). You can still share the approval link manually.`,
      };
    }

    // Mark delivery as sent in DB and log activity
    if (isFallback) {
      recordFallbackProposalEmailComplete(emailId, "sent", sendResult.messageId || null, null);
    } else {
      try {
        await adminClient.rpc("complete_proposal_email", {
          p_email_id: emailId,
          p_status: "sent",
          p_provider_message_id: sendResult.messageId || null,
          p_error_code: null,
        });
      } catch {
        // Ignore RPC completion failure if schema is unmigrated
      }
    }

    // Optional: send copy to sender
    if (sendCopyToMe && user.email) {
      try {
        await emailProvider.sendEmail({
          to: user.email,
          subject: `[Copy] ${subject}`,
          html,
          text,
          fromName: "ScopeGuard",
        });
      } catch (copyErr) {
        console.warn("Non-fatal: failed to send confirmation copy to sender", copyErr);
      }
    }

    revalidatePath(`/changes/${changeRequestId}`);
    revalidatePath(`/projects/${cr.projectId}`);

    return {
      success: true,
      status: "sent",
      shareUrl: approvalUrl,
      rawToken: activeRawToken,
      message: `Proposal successfully sent to ${recipientEmail}.`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "An unexpected error occurred";
    return {
      success: false,
      message: errorMsg,
    };
  }
}

/**
 * Server Action: Updates primary client contact details for a project.
 */
export async function setProjectClientContactAction(
  _prevState: unknown,
  formData: FormData
): Promise<{ success: boolean; message: string; fieldErrors?: Record<string, string[]> }> {
  const projectId = formData.get("projectId") as string;
  const contactName = formData.get("contactName") as string;
  const contactEmail = formData.get("contactEmail") as string;

  const validated = setProjectClientContactSchema.safeParse({
    projectId,
    contactName: contactName || "",
    contactEmail: contactEmail || "",
  });

  if (!validated.success) {
    return {
      success: false,
      message: "Validation failed",
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  try {
    await setProjectClientContact(
      validated.data.projectId,
      validated.data.contactName || null,
      validated.data.contactEmail || null
    );

    revalidatePath(`/projects/${validated.data.projectId}`);
    revalidatePath(`/projects/${validated.data.projectId}/settings`);

    return {
      success: true,
      message: "Client contact information updated successfully.",
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to update client contact.",
    };
  }
}

/**
 * Server Action: Fetches delivery history of proposal emails for a change request.
 * Authorized: Owners and managers only.
 */
export async function fetchProposalEmailHistoryAction(
  changeRequestId: string
): Promise<{ success: boolean; data?: ProposalEmailHistoryItem[]; message?: string }> {
  try {
    const data = await listProposalEmails(changeRequestId);
    return { success: true, data };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to load proposal dispatch history.",
    };
  }
}
