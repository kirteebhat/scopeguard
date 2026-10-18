import { requireRole } from "./auth-context";
import { ForbiddenError, NotFoundError } from "./errors";
import { createServiceRoleClient } from "@/lib/supabase/service";

export interface ProposalEmailHistoryItem {
  id: string;
  changeRequestId: string;
  recipientEmailMasked: string;
  recipientName: string | null;
  senderId: string;
  senderName: string | null;
  status: "queued" | "sent" | "failed";
  errorCode: string | null;
  personalNotePresent: boolean;
  sentAt: string | null;
  createdAt: string;
}

/**
 * Masks an email address to protect recipient privacy in activity and history logs.
 * e.g. "jonathan@acme.com" -> "j***@acme.com"
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "***@***";
  const [local, domain] = email.split("@");
  return `${local.charAt(0)}***@${domain}`;
}

/**
 * Lists the proposal dispatch history for a given change request.
 * Strictly restricted to Workspace Owners and Managers.
 * Members are denied access.
 */
export async function listProposalEmails(
  changeRequestId: string
): Promise<ProposalEmailHistoryItem[]> {
  const context = await requireRole(["owner", "manager"]);
  const adminClient = createServiceRoleClient();

  // Verify change request belongs to current workspace
  const { data: cr, error: crError } = await adminClient
    .from("change_requests")
    .select("id, projects!inner(workspace_id)")
    .eq("id", changeRequestId)
    .maybeSingle();

  if (crError || !cr) {
    throw new NotFoundError("Change request not found");
  }

  const project = cr.projects as unknown as { workspace_id: string } | null;
  if (!project || project.workspace_id !== context.workspace.id) {
    throw new ForbiddenError("You do not have access to this change request");
  }

  // Fetch proposal emails for this change request
  const { data: emails, error: emailsError } = await adminClient
    .from("proposal_emails")
    .select(`
      id,
      change_request_id,
      recipient_email,
      recipient_name,
      sent_by,
      status,
      error_code,
      personal_note_present,
      sent_at,
      created_at
    `)
    .eq("change_request_id", changeRequestId)
    .order("created_at", { ascending: false });

  if (emailsError) {
    throw new Error(emailsError.message || "Failed to load proposal dispatch history");
  }

  if (!emails || emails.length === 0) {
    return [];
  }

  // Fetch sender names from profiles
  const senderIds = Array.from(
    new Set(emails.map((e) => e.sent_by).filter((id): id is string => !!id))
  );

  const userMap = new Map<string, string>();
  if (senderIds.length > 0) {
    const { data: profilesData } = await adminClient
      .from("profiles")
      .select("id, full_name, email")
      .in("id", senderIds);

    if (profilesData) {
      for (const p of profilesData) {
        userMap.set(p.id, p.full_name || p.email);
      }
    }
  }

  return emails.map((row) => ({
    id: row.id,
    changeRequestId: row.change_request_id,
    recipientEmailMasked: maskEmail(row.recipient_email),
    recipientName: row.recipient_name,
    senderId: row.sent_by || "",
    senderName: (row.sent_by ? userMap.get(row.sent_by) : null) || "Team Member",
    status: row.status as "queued" | "sent" | "failed",
    errorCode: row.error_code,
    personalNotePresent: row.personal_note_present,
    sentAt: row.sent_at,
    createdAt: row.created_at,
  }));
}
