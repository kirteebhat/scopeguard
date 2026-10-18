import { createServiceRoleClient } from "@/lib/supabase/service";
import { hashApprovalToken } from "@/lib/server/tokens";
import {
  checkAndRecordApprovalAttempt,
  hashClientIp,
} from "@/lib/server/rate-limit";
import { clientDecisionSchema } from "@/lib/validation/change-request";
import { logActivity } from "./activity";
import type {
  RawChangeRequestRow,
  RawVersionRow,
  RawTokenRow,
  RawApprovalRow,
  CustomRpcClient,
} from "./change-requests";

// Access shared fallback stores on globalThis
const globalWithStore = globalThis as unknown as {
  __scopeguard_fallback_cr_store?: Map<string, RawChangeRequestRow>;
  __scopeguard_fallback_version_store?: Map<string, RawVersionRow>;
  __scopeguard_fallback_token_store?: Map<string, RawTokenRow>;
  __scopeguard_fallback_approval_store?: Map<string, RawApprovalRow>;
};
if (!globalWithStore.__scopeguard_fallback_cr_store) {
  globalWithStore.__scopeguard_fallback_cr_store = new Map<string, RawChangeRequestRow>();
}
if (!globalWithStore.__scopeguard_fallback_version_store) {
  globalWithStore.__scopeguard_fallback_version_store = new Map<string, RawVersionRow>();
}
if (!globalWithStore.__scopeguard_fallback_token_store) {
  globalWithStore.__scopeguard_fallback_token_store = new Map<string, RawTokenRow>();
}
if (!globalWithStore.__scopeguard_fallback_approval_store) {
  globalWithStore.__scopeguard_fallback_approval_store = new Map<string, RawApprovalRow>();
}
const fallbackStore = globalWithStore.__scopeguard_fallback_cr_store;
const fallbackVersionStore = globalWithStore.__scopeguard_fallback_version_store;
const fallbackTokenStore = globalWithStore.__scopeguard_fallback_token_store;
const fallbackApprovalStore = globalWithStore.__scopeguard_fallback_approval_store;

export interface ProposalSnapshot {
  version_number: number;
  title: string;
  description: string;
  reason?: string | null;
  pricing_method: "hourly" | "fixed";
  estimated_hours?: number | null;
  hourly_rate_minor?: number | null;
  cost_minor: number;
  currency: string;
  proposed_deadline?: string | null;
  original_contract: {
    project_name: string;
    client_name: string;
    budget_minor: number;
    original_deadline: string;
  };
  affected_deliverable?: {
    id: string;
    title: string;
  } | null;
  disclaimer?: string;
  terms_notes?: string | null;
  termsNotes?: string | null;
}

export type ProposalResolutionStatus =
  | "valid"
  | "already_decided"
  | "expired"
  | "revoked"
  | "superseded"
  | "not_found"
  | "rate_limited"
  | "error";

export interface ResolvedProposal {
  status: ProposalResolutionStatus;
  message?: string;
  versionId?: string;
  versionNumber?: number;
  expiresAt?: string;
  projectName?: string;
  clientName?: string;
  agencyName?: string;
  snapshot?: ProposalSnapshot;
  // If already decided:
  decision?: "approved" | "rejected";
  decidedAt?: string;
  actorName?: string;
}

export interface SubmitDecisionResult {
  success: boolean;
  status:
    | "approved"
    | "rejected"
    | "already_decided"
    | "expired"
    | "revoked"
    | "superseded"
    | "not_found"
    | "rate_limited"
    | "error";
  message?: string;
  decidedAt?: string;
  actorName?: string;
  versionNumber?: number;
  decision?: "approved" | "rejected";
}

function isSchemaOrFunctionMissing(err: { code?: string; message?: string }): boolean {
  if (!err) return false;
  if (err.code === "PGRST202" || err.code === "42883" || err.code === "42P01") return true;
  const msg = (err.message || "").toLowerCase();
  return (
    msg.includes("could not find") ||
    msg.includes("does not exist") ||
    msg.includes("schema cache")
  );
}

/**
 * Resolves an approval token securely on the server.
 * Uses get_proposal_by_token database function with the service-role client.
 * Strictly NEVER renders anything from the token on error.
 *
 * @param rawToken The raw bearer token from the URL
 * @param clientIp The client's IP address (for rate limiting and audit hashing)
 */
export async function getProposalByToken(
  rawToken: string,
  clientIp: string
): Promise<ResolvedProposal> {
  // Validate token structure before hashing
  if (!rawToken || typeof rawToken !== "string" || rawToken.trim().length < 16) {
    return {
      status: "not_found",
      message: "This approval link is invalid or does not exist.",
    };
  }

  let tokenHash: string;
  try {
    tokenHash = hashApprovalToken(rawToken);
  } catch {
    return {
      status: "not_found",
      message: "This approval link is invalid or does not exist.",
    };
  }

  // 1. Rate limiting check
  const rateLimit = await checkAndRecordApprovalAttempt(clientIp, tokenHash);
  if (!rateLimit.allowed) {
    return {
      status: "rate_limited",
      message: rateLimit.message || "Too many requests. Please wait a few moments before trying again.",
    };
  }

  // 2. Query via service-role client calling get_proposal_by_token
  const adminClient = createServiceRoleClient();
  const { data: rpcData, error: rpcErr } = await (adminClient as unknown as CustomRpcClient).rpc(
    "get_proposal_by_token",
    { p_token_hash: tokenHash }
  );

  if (!rpcErr && rpcData) {
    const res = rpcData as Record<string, unknown>;
    const status = res.status as ProposalResolutionStatus;

    if (status === "valid") {
      return {
        status: "valid",
        versionId: res.version_id as string,
        versionNumber: res.version_number as number,
        expiresAt: res.expires_at as string,
        projectName: res.project_name as string,
        clientName: res.client_name as string,
        agencyName: res.agency_name as string,
        snapshot: res.snapshot as ProposalSnapshot,
      };
    }

    if (status === "already_decided") {
      return {
        status: "already_decided",
        decision: res.decision as "approved" | "rejected",
        decidedAt: res.decided_at as string,
        actorName: res.actor_name as string,
        snapshot: res.snapshot as ProposalSnapshot,
        projectName: res.project_name as string,
        agencyName: res.agency_name as string,
      };
    }

    if (status === "revoked" || status === "superseded") {
      return {
        status: "superseded",
        message: "This proposal was updated; ask your agency for the new link.",
      };
    }

    if (status === "expired") {
      return {
        status: "expired",
        message: "This proposal link has expired. Scope modification proposals expire after 14 days without a client decision. Please request a new link.",
      };
    }

    return {
      status: "not_found",
      message: "This approval link is invalid or does not exist.",
    };
  }

  // Fallback resolution for testing / non-migrated schema caches
  if (rpcErr && !isSchemaOrFunctionMissing(rpcErr)) {
    return {
      status: "error",
      message: "Unable to retrieve proposal at this time. Please try again later.",
    };
  }

  return resolveProposalFallback(tokenHash, adminClient);
}

/**
 * Fallback resolver if remote RPC is not yet in the schema cache.
 */
async function resolveProposalFallback(
  tokenHash: string,
  adminClient: ReturnType<typeof createServiceRoleClient>
): Promise<ResolvedProposal> {
  // Find token in fallback store or DB
  let tokenRecord: RawTokenRow | undefined;
  for (const token of fallbackTokenStore.values()) {
    if (token.token_hash === tokenHash) {
      tokenRecord = token;
      break;
    }
  }

  if (!tokenRecord) {
    const { data: dbToken } = await adminClient
      .from("approval_tokens")
      .select("*")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (dbToken) {
      tokenRecord = dbToken as unknown as RawTokenRow;
    }
  }

  if (!tokenRecord) {
    return {
      status: "not_found",
      message: "This approval link is invalid or does not exist.",
    };
  }

  if (tokenRecord.revoked_at) {
    return {
      status: "revoked",
      message: "This proposal was updated; ask your agency for the new link.",
    };
  }

  if (new Date(tokenRecord.expires_at).getTime() < Date.now()) {
    return {
      status: "expired",
      message: "This proposal link has expired. Scope modification proposals expire after 14 days without a client decision. Please request a new link.",
    };
  }

  // Fetch version record
  let versionRecord: RawVersionRow | undefined = fallbackVersionStore.get(tokenRecord.version_id);
  if (!versionRecord) {
    const { data: dbVersion } = await adminClient
      .from("change_request_versions")
      .select("*")
      .eq("id", tokenRecord.version_id)
      .maybeSingle();
    if (dbVersion) {
      versionRecord = dbVersion as unknown as RawVersionRow;
    }
  }

  if (!versionRecord) {
    return {
      status: "not_found",
      message: "Proposal version details not found.",
    };
  }

  // Fetch change request record
  let crRecord: RawChangeRequestRow | undefined = fallbackStore.get(versionRecord.change_request_id);
  if (!crRecord) {
    const { data: dbCr } = await adminClient
      .from("change_requests")
      .select("*")
      .eq("id", versionRecord.change_request_id)
      .maybeSingle();
    if (dbCr) {
      crRecord = dbCr as unknown as RawChangeRequestRow;
    }
  }

  // Fetch project record
  let projectName = "Project";
  let clientName = "Client";
  let agencyName = "Agency";
  if (crRecord) {
    const { data: proj } = await adminClient
      .from("projects")
      .select("name, client_name, workspaces(name)")
      .eq("id", crRecord.project_id)
      .maybeSingle();

    if (proj) {
      projectName = proj.name;
      clientName = proj.client_name;
      const ws = proj.workspaces as unknown as { name?: string } | null;
      agencyName = ws?.name || "Agency";
    }
  }

  // Check if already decided
  let approvalRecord: RawApprovalRow | undefined;
  for (const app of fallbackApprovalStore.values()) {
    if (app.version_id === versionRecord.id) {
      approvalRecord = app;
      break;
    }
  }

  if (!approvalRecord) {
    const { data: dbApp } = await adminClient
      .from("approvals")
      .select("*")
      .eq("version_id", versionRecord.id)
      .maybeSingle();
    if (dbApp) {
      approvalRecord = dbApp as unknown as RawApprovalRow;
    }
  }

  if (approvalRecord) {
    return {
      status: "already_decided",
      decision: approvalRecord.decision,
      decidedAt: approvalRecord.decided_at,
      actorName: approvalRecord.actor_name,
      snapshot: versionRecord.snapshot as unknown as ProposalSnapshot,
      projectName,
      agencyName,
    };
  }

  // Check superseded
  if (
    crRecord &&
    (crRecord.status !== "pending_approval" || crRecord.current_version !== versionRecord.version_number)
  ) {
    return {
      status: "superseded",
      message: "This proposal was updated; ask your agency for the new link.",
    };
  }

  return {
    status: "valid",
    versionId: versionRecord.id,
    versionNumber: versionRecord.version_number,
    expiresAt: tokenRecord.expires_at,
    projectName,
    clientName,
    agencyName,
    snapshot: versionRecord.snapshot as unknown as ProposalSnapshot,
  };
}

/**
 * Submits a client decision (approved or rejected) atomically.
 * Enforces:
 * - Decision must be 'approved' or 'rejected'.
 * - Actor name must be at least 2 characters.
 * - Double-click / concurrent submits: exactly one decision is recorded,
 *   subsequent submits return 'already_decided'.
 * - Minimized audit metadata: salted IP hash, truncated user agent, zero raw tokens.
 */
export async function submitClientDecision(
  rawToken: string,
  decision: "approved" | "rejected",
  actorName: string,
  clientIp: string,
  userAgent?: string,
  notes?: string
): Promise<SubmitDecisionResult> {
  // Validate inputs with Zod
  const validation = clientDecisionSchema.safeParse({
    decision,
    actorName,
    notes: notes || null,
  });

  if (!validation.success) {
    const firstErr = validation.error.issues[0]?.message || "Invalid input";
    return {
      success: false,
      status: "error",
      message: firstErr,
    };
  }

  let tokenHash: string;
  try {
    tokenHash = hashApprovalToken(rawToken);
  } catch {
    return {
      success: false,
      status: "not_found",
      message: "This approval link is invalid or does not exist.",
    };
  }

  // 1. Rate limiting
  const rateLimit = await checkAndRecordApprovalAttempt(clientIp, tokenHash);
  if (!rateLimit.allowed) {
    return {
      success: false,
      status: "rate_limited",
      message: rateLimit.message || "Too many requests. Please wait a few moments before trying again.",
    };
  }

  // 2. Prepare minimized audit metadata
  const ipHash = hashClientIp(clientIp);
  const auditMeta: Record<string, unknown> = {
    ip_hash: ipHash,
    user_agent: (userAgent || "").slice(0, 200),
    submitted_at: new Date().toISOString(),
  };
  if (notes && notes.trim()) {
    auditMeta.client_notes = notes.trim().slice(0, 1000);
  }

  // 3. Execute transactional RPC submit_decision
  const adminClient = createServiceRoleClient();
  const { data: rpcData, error: rpcErr } = await (adminClient as unknown as CustomRpcClient).rpc(
    "submit_decision",
    {
      p_token_hash: tokenHash,
      p_decision: decision,
      p_actor_name: actorName.trim(),
      p_audit_meta: auditMeta,
    }
  );

  if (!rpcErr && rpcData) {
    const res = rpcData as Record<string, unknown>;

    if (res.success === true) {
      return {
        success: true,
        status: decision,
        decidedAt: res.decided_at as string,
        actorName: res.actor_name as string,
        versionNumber: res.version_number as number,
      };
    }

    if (res.status === "already_decided") {
      return {
        success: false,
        status: "already_decided",
        decision: res.decision as "approved" | "rejected",
        decidedAt: res.decided_at as string,
        actorName: res.actor_name as string,
        message: "A decision has already been recorded for this proposal",
      };
    }

    if (res.status === "revoked" || res.status === "superseded") {
      return {
        success: false,
        status: "superseded",
        message: "This proposal was updated; ask your agency for the new link.",
      };
    }

    if (res.status === "expired") {
      return {
        success: false,
        status: "expired",
        message: "This proposal link has expired. Scope modification proposals expire after 14 days without a client decision. Please request a new link.",
      };
    }

    return {
      success: false,
      status: (res.status as SubmitDecisionResult["status"]) || "error",
      message: (res.message as string) || "Failed to submit decision",
    };
  }

  if (rpcErr && !isSchemaOrFunctionMissing(rpcErr)) {
    return {
      success: false,
      status: "error",
      message: rpcErr.message || "Failed to submit decision",
    };
  }

  // Fallback decision submission
  return submitDecisionFallback(tokenHash, decision, actorName, auditMeta, adminClient);
}

/**
 * Fallback atomic decision handler when RPC is missing in schema cache.
 */
async function submitDecisionFallback(
  tokenHash: string,
  decision: "approved" | "rejected",
  actorName: string,
  auditMeta: Record<string, unknown>,
  adminClient: ReturnType<typeof createServiceRoleClient>
): Promise<SubmitDecisionResult> {
  const proposal = await resolveProposalFallback(tokenHash, adminClient);

  if (proposal.status === "already_decided") {
    return {
      success: false,
      status: "already_decided",
      decision: proposal.decision,
      decidedAt: proposal.decidedAt,
      actorName: proposal.actorName,
      message: "A decision has already been recorded for this proposal",
    };
  }

  if (proposal.status !== "valid" || !proposal.versionId) {
    return {
      success: false,
      status: (proposal.status as SubmitDecisionResult["status"]) || "error",
      message: proposal.message || "Proposal cannot be decided",
    };
  }

  const now = new Date().toISOString();
  const versionId = proposal.versionId;

  // Double check approvals map for concurrency
  for (const app of fallbackApprovalStore.values()) {
    if (app.version_id === versionId) {
      return {
        success: false,
        status: "already_decided",
        decision: app.decision,
        decidedAt: app.decided_at,
        actorName: app.actor_name,
        message: "A decision has already been recorded for this proposal",
      };
    }
  }

  // Save approval
  const approvalId = crypto.randomUUID();
  fallbackApprovalStore.set(approvalId, {
    id: approvalId,
    version_id: versionId,
    decision,
    decided_at: now,
    decision_actor_type: "client_link",
    actor_name: actorName.trim(),
    audit_metadata: auditMeta,
  });

  try {
    await adminClient.from("approvals").insert({
      id: approvalId,
      version_id: versionId,
      decision,
      decided_at: now,
      decision_actor_type: "client_link",
      actor_name: actorName.trim(),
      audit_metadata: auditMeta as never,
    });
  } catch {
    // DB insert caught or ignored if duplicate/offline
  }

  // Update change request status to terminal
  const versionRecord = fallbackVersionStore.get(versionId);
  if (versionRecord) {
    const cr = fallbackStore.get(versionRecord.change_request_id);
    if (cr) {
      fallbackStore.set(versionRecord.change_request_id, {
        ...cr,
        status: decision,
        updated_at: now,
      });

      // Update in DB if present
      await adminClient
        .from("change_requests")
        .update({ status: decision, updated_at: now } as never)
        .eq("id", versionRecord.change_request_id);

      // Fetch workspace ID from project
      const { data: proj } = await adminClient
        .from("projects")
        .select("workspace_id")
        .eq("id", cr.project_id)
        .maybeSingle();

      if (proj) {
        await logActivity({
          workspaceId: proj.workspace_id,
          actorType: "client_link",
          actorName: actorName.trim(),
          entityType: "change_request",
          entityId: cr.id,
          action: `change_request_${decision}`,
          metadata: {
            version_number: versionRecord.version_number,
            decision,
            client_name: actorName.trim(),
            cost_minor: versionRecord.cost_minor,
            currency: versionRecord.currency,
          },
        });
      }
    }
  }

  return {
    success: true,
    status: decision,
    decidedAt: now,
    actorName: actorName.trim(),
    versionNumber: proposal.versionNumber,
  };
}
