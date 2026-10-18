"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/data/auth-context";
import {
  createWorkspaceInvitation,
  resendWorkspaceInvitation,
  revokeWorkspaceInvitation,
  acceptWorkspaceInvitation,
} from "@/lib/data/invitations";
import {
  bulkInvitationSchema,
  parseBulkEmails,
  resendInvitationSchema,
  revokeInvitationSchema,
  acceptInvitationSchema,
} from "@/lib/validation/invitations";
import { emailProvider } from "@/lib/email/resend";
import {
  renderInvitationEmailSubject,
  renderInvitationEmailHtml,
  renderInvitationEmailText,
} from "@/lib/email/templates/invitation";

export interface InvitationDispatchResult {
  email: string;
  status: "sent" | "not_configured" | "already_member" | "already_invited" | "limit_reached" | "failed";
  inviteUrl?: string;
  message?: string;
}

export interface BulkInviteActionState {
  success?: boolean;
  message?: string;
  results?: InvitationDispatchResult[];
  fieldErrors?: Record<string, string[]>;
}

/**
 * Server Action: Sends single or bulk workspace invitations.
 * Evaluates role hierarchy, executes transactional DB inserts, and attempts email dispatch.
 */
export async function sendInvitationsAction(
  _prevState: BulkInviteActionState | null,
  formData: FormData
): Promise<BulkInviteActionState> {
  const rawEmails = formData.get("emails") as string;
  const rawRole = formData.get("role") as string;

  const validated = bulkInvitationSchema.safeParse({
    emails: rawEmails,
    role: rawRole,
  });

  if (!validated.success) {
    return {
      success: false,
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  const { emails: inputEmails, role } = validated.data;
  const parsed = parseBulkEmails(inputEmails);

  if (parsed.validEmails.length === 0) {
    return {
      success: false,
      message: "Please enter at least one valid email address.",
      fieldErrors: {
        emails: ["No valid email addresses found"],
      },
    };
  }

  const { workspace, user, role: callerRole } = await requireRole(["owner", "manager"]);

  // Role hierarchy check
  if (callerRole === "manager" && role !== "member") {
    return {
      success: false,
      message: "Permission denied: Managers are only authorized to invite Members.",
    };
  }

  const inviterName = user.fullName || user.email;
  const results: InvitationDispatchResult[] = [];

  // Add any initial invalid entries from parsing
  for (const invalid of parsed.invalidEntries) {
    results.push({
      email: invalid.email,
      status: "failed",
      message: invalid.error || "Invalid email format",
    });
  }

  for (const email of parsed.validEmails) {
    try {
      // 1. Create invitation in database
      const created = await createWorkspaceInvitation(email, role);

      // 2. Format email
      const emailProps = {
        inviterName,
        workspaceName: workspace.name,
        role,
        inviteUrl: created.inviteUrl,
        expiresAt: created.expiresAt,
      };

      const emailSubject = renderInvitationEmailSubject(emailProps);
      const emailHtml = renderInvitationEmailHtml(emailProps);
      const emailText = renderInvitationEmailText(emailProps);

      // 3. Dispatch via email provider
      const emailResult = await emailProvider.sendEmail({
        to: email,
        subject: emailSubject,
        html: emailHtml,
        text: emailText,
      });

      if (emailResult.status === "not_configured") {
        results.push({
          email,
          status: "not_configured",
          inviteUrl: created.inviteUrl,
          message: "Invitation created. Email service is unconfigured; please copy and share the link manually.",
        });
      } else if (emailResult.status === "sent") {
        results.push({
          email,
          status: "sent",
          inviteUrl: created.inviteUrl,
          message: "Invitation email sent successfully.",
        });
      } else {
        results.push({
          email,
          status: "failed",
          inviteUrl: created.inviteUrl,
          message: emailResult.error
            ? `Invitation created, but email dispatch failed: ${emailResult.error}`
            : "Invitation record created, but email dispatch failed. You can share the link manually.",
        });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes("already an active member")) {
        results.push({
          email,
          status: "already_member",
          message: "User is already an active member of this workspace.",
        });
      } else if (errMsg.includes("unique") || errMsg.includes("idx_workspace_invitations_active_email")) {
        results.push({
          email,
          status: "already_invited",
          message: "A pending invitation already exists for this email address.",
        });
      } else if (errMsg.includes("Daily invitation limit")) {
        results.push({
          email,
          status: "limit_reached",
          message: "Workspace limit reached (max 20 invitations per 24 hours).",
        });
      } else {
        results.push({
          email,
          status: "failed",
          message: errMsg || "Failed to create invitation.",
        });
      }
    }
  }

  revalidatePath("/settings/team");

  const successCount = results.filter((r) => r.status === "sent" || r.status === "not_configured").length;

  return {
    success: successCount > 0,
    results,
    message:
      successCount === parsed.validEmails.length
        ? `Successfully processed ${successCount} invitation${successCount > 1 ? "s" : ""}.`
        : `Processed ${parsed.validEmails.length} invitation${parsed.validEmails.length > 1 ? "s" : ""}: ${successCount} succeeded, ${parsed.validEmails.length - successCount} had warnings.`,
  };
}

export interface ResendActionState {
  success?: boolean;
  message?: string;
  inviteUrl?: string;
  status?: "sent" | "not_configured" | "failed";
}

/**
 * Server Action: Resends an existing pending invitation.
 */
export async function resendInvitationAction(
  _prevState: ResendActionState | null,
  formData: FormData
): Promise<ResendActionState> {
  const invitationId = formData.get("invitationId") as string;
  const validated = resendInvitationSchema.safeParse({ invitationId });

  if (!validated.success) {
    return {
      success: false,
      message: "Invalid invitation ID.",
    };
  }

  try {
    const { workspace, user } = await requireRole(["owner", "manager"]);
    const resent = await resendWorkspaceInvitation(validated.data.invitationId);

    const emailProps = {
      inviterName: user.fullName || user.email,
      workspaceName: workspace.name,
      role: resent.role,
      inviteUrl: resent.inviteUrl,
      expiresAt: resent.expiresAt,
    };

    const emailSubject = renderInvitationEmailSubject(emailProps);
    const emailHtml = renderInvitationEmailHtml(emailProps);
    const emailText = renderInvitationEmailText(emailProps);

    const emailResult = await emailProvider.sendEmail({
      to: resent.email,
      subject: emailSubject,
      html: emailHtml,
      text: emailText,
    });

    revalidatePath("/settings/team");

    if (emailResult.status === "not_configured") {
      return {
        success: true,
        status: "not_configured",
        inviteUrl: resent.inviteUrl,
        message: "New link generated. Email service is unconfigured; please copy and share the link manually.",
      };
    }

    if (emailResult.status === "sent") {
      return {
        success: true,
        status: "sent",
        inviteUrl: resent.inviteUrl,
        message: `Fresh invitation email sent to ${resent.email}.`,
      };
    }

    return {
      success: true,
      status: "failed",
      inviteUrl: resent.inviteUrl,
      message: emailResult.error
        ? `New link generated, but email dispatch failed: ${emailResult.error}`
        : "New link generated, but email dispatch failed. You can copy the link manually.",
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Failed to resend invitation.";
    return {
      success: false,
      message: errMsg,
    };
  }
}

export interface RevokeActionState {
  success?: boolean;
  message?: string;
}

/**
 * Server Action: Revokes a pending invitation.
 */
export async function revokeInvitationAction(
  _prevState: RevokeActionState | null,
  formData: FormData
): Promise<RevokeActionState> {
  const invitationId = formData.get("invitationId") as string;
  const validated = revokeInvitationSchema.safeParse({ invitationId });

  if (!validated.success) {
    return {
      success: false,
      message: "Invalid invitation ID.",
    };
  }

  try {
    await requireRole(["owner", "manager"]);
    await revokeWorkspaceInvitation(validated.data.invitationId);
    revalidatePath("/settings/team");
    return {
      success: true,
      message: "Invitation has been revoked.",
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to revoke invitation.",
    };
  }
}

export interface AcceptActionState {
  success?: boolean;
  message?: string;
}

/**
 * Server Action: Accepts a workspace invitation.
 * Supports direct call with token string or useActionState/form submission.
 */
export async function acceptInvitationAction(
  tokenOrPrevState: AcceptActionState | string | null,
  maybeFormData?: FormData
): Promise<AcceptActionState> {
  const token =
    typeof tokenOrPrevState === "string"
      ? tokenOrPrevState
      : (maybeFormData?.get("token") as string);

  const validated = acceptInvitationSchema.safeParse({ token });

  if (!validated.success) {
    return {
      success: false,
      message: "Invalid or malformed invitation link.",
    };
  }

  let redirectTarget: string | null = null;

  try {
    const result = await acceptWorkspaceInvitation(validated.data.token);
    if (result.success) {
      redirectTarget = "/dashboard";
    }
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Unable to accept invitation.",
    };
  }

  if (redirectTarget) {
    redirect(redirectTarget);
  }

  return { success: true };
}
