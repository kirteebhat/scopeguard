import { requireRole } from "./auth-context";
import { ForbiddenError, NotFoundError } from "./errors";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { isSchemaOrFunctionMissing } from "./invitations";

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

export interface FallbackProposalEmailRecord {
  id: string;
  workspaceId: string;
  changeRequestId: string;
  recipientEmail: string;
  recipientName: string | null;
  sentBy: string;
  senderName: string;
  status: "queued" | "sent" | "failed";
  errorCode: string | null;
  personalNotePresent: boolean;
  sendAttemptKey: string;
  sentAt: string | null;
  createdAt: string;
}

const globalForProposalEmails = globalThis as unknown as {
  fallbackProposalEmailStore?: Map<string, FallbackProposalEmailRecord>;
};

export const fallbackProposalEmailStore =
  globalForProposalEmails.fallbackProposalEmailStore ??
  new Map<string, FallbackProposalEmailRecord>();

if (process.env.NODE_ENV !== "production") {
  globalForProposalEmails.fallbackProposalEmailStore = fallbackProposalEmailStore;
}

export interface BeginProposalEmailFallbackParams {
  workspaceId: string;
  changeRequestId: string;
  recipientEmail: string;
  recipientName: string | null;
  sentBy: string;
  senderName: string;
  attemptKey: string;
  personalNotePresent: boolean;
}

export function recordFallbackProposalEmailBegin(
  params: BeginProposalEmailFallbackParams
): string {
  // 1. Idempotency Check: if attemptKey exists, return existing row id
  for (const record of fallbackProposalEmailStore.values()) {
    if (record.sendAttemptKey === params.attemptKey) {
      return record.id;
    }
  }

  // 2. Rate Limiting: Max 5 sends per change request per hour
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const sixtySecondsAgo = Date.now() - 60 * 1000;
  let recentCount = 0;
  let lastSentTime = 0;

  for (const record of fallbackProposalEmailStore.values()) {
    if (record.changeRequestId === params.changeRequestId) {
      const recordTime = new Date(record.createdAt).getTime();
      if (recordTime > oneHourAgo) {
        recentCount++;
      }
      if (recordTime > lastSentTime) {
        lastSentTime = recordTime;
      }
    }
  }

  if (recentCount >= 5) {
    throw new Error(
      "Rate limit exceeded: A maximum of 5 proposal emails can be sent per hour for this change request."
    );
  }

  if (lastSentTime > sixtySecondsAgo) {
    const waitSec = Math.ceil((60000 - (Date.now() - lastSentTime)) / 1000);
    throw new Error(
      `Cooldown active: Please wait at least ${waitSec} seconds between sending proposal emails.`
    );
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const newRecord: FallbackProposalEmailRecord = {
    id,
    workspaceId: params.workspaceId,
    changeRequestId: params.changeRequestId,
    recipientEmail: params.recipientEmail.toLowerCase().trim(),
    recipientName: params.recipientName,
    sentBy: params.sentBy,
    senderName: params.senderName,
    status: "queued",
    errorCode: null,
    personalNotePresent: params.personalNotePresent,
    sendAttemptKey: params.attemptKey,
    sentAt: null,
    createdAt: now,
  };

  fallbackProposalEmailStore.set(id, newRecord);
  return id;
}

export function recordFallbackProposalEmailComplete(
  emailId: string,
  status: "sent" | "failed",
  _providerMessageId?: string | null,
  errorCode?: string | null
): void {
  const record = fallbackProposalEmailStore.get(emailId);
  if (!record) return;

  record.status = status;
  record.errorCode = errorCode || null;
  record.sentAt = new Date().toISOString();
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

  try {
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

    if (!emailsError && emails) {
      if (emails.length === 0) {
        const fallbackItems = getFallbackProposalEmailsForRequest(changeRequestId, context.workspace.id);
        if (fallbackItems.length > 0) return fallbackItems;
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

    if (emailsError && !isSchemaOrFunctionMissing(emailsError)) {
      throw new Error(emailsError.message || "Failed to load proposal dispatch history");
    }
  } catch (err: unknown) {
    if (!isSchemaOrFunctionMissing(err)) {
      throw err;
    }
  }

  // Fallback: Read from in-memory fallbackProposalEmailStore
  return getFallbackProposalEmailsForRequest(changeRequestId, context.workspace.id);
}

function getFallbackProposalEmailsForRequest(
  changeRequestId: string,
  workspaceId: string
): ProposalEmailHistoryItem[] {
  const list: ProposalEmailHistoryItem[] = [];
  for (const record of fallbackProposalEmailStore.values()) {
    if (record.changeRequestId === changeRequestId && record.workspaceId === workspaceId) {
      list.push({
        id: record.id,
        changeRequestId: record.changeRequestId,
        recipientEmailMasked: maskEmail(record.recipientEmail),
        recipientName: record.recipientName,
        senderId: record.sentBy,
        senderName: record.senderName || "Team Member",
        status: record.status,
        errorCode: record.errorCode,
        personalNotePresent: record.personalNotePresent,
        sentAt: record.sentAt,
        createdAt: record.createdAt,
      });
    }
  }
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
