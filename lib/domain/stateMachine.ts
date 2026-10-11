/**
 * Pure, framework-free change request state machine for ScopeGuard.
 * Zero external dependencies.
 * Strictly encodes the state transition matrix and invariants from docs/02-state-machine.md.
 */

export type ChangeRequestStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "withdrawn";

export type StateMachineActor =
  | "owner"
  | "manager"
  | "member"
  | "client_link"
  | "not_authenticated";

export const TERMINAL_STATUSES: ReadonlySet<ChangeRequestStatus> = new Set([
  "approved",
  "rejected",
  "withdrawn",
]);

export const ALL_STATUSES: readonly ChangeRequestStatus[] = [
  "draft",
  "pending_approval",
  "approved",
  "rejected",
  "withdrawn",
] as const;

/**
 * Checks whether a given status is a terminal state.
 * Terminal states (approved, rejected, withdrawn) are permanently immutable.
 */
export function isTerminalState(status: ChangeRequestStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

/**
 * Returns an explicit error reason if a transition is prohibited,
 * or null if the transition is fully authorized.
 *
 * Encodes all rules and rationale from Section 3 & 4 of docs/02-state-machine.md.
 */
export function getTransitionError(
  fromState: ChangeRequestStatus | null | undefined,
  toState: ChangeRequestStatus,
  actor: StateMachineActor
): string | null {
  // 1. Unauthenticated actors are rejected unconditionally
  if (actor === "not_authenticated") {
    return "Unauthenticated users cannot perform any state transitions.";
  }

  // 2. Initial Creation: null -> toState
  if (fromState === null || fromState === undefined) {
    if (toState !== "draft") {
      return `New change requests must be initialized in 'draft' status; cannot create directly as '${toState}'.`;
    }
    if (actor !== "owner" && actor !== "manager" && actor !== "member") {
      return `Actor '${actor}' is not authorized to create change requests. Only workspace members, managers, or owners can create drafts.`;
    }
    return null; // Allowed
  }

  // 3. Terminal State Lockdown: No transitions out of approved, rejected, or withdrawn
  if (isTerminalState(fromState)) {
    switch (fromState) {
      case "approved":
        return "Cannot transition from terminal state 'approved'. Approved change orders represent legally and commercially settled agreements and are permanently locked.";
      case "rejected":
        return "Cannot transition from terminal state 'rejected'. Once a client declines, the proposal is closed. To propose altered terms, initiate a new change request.";
      case "withdrawn":
        return "Cannot transition from terminal state 'withdrawn'. Withdrawn proposals are permanently archived. Re-proposing requires a new change request.";
    }
  }

  // 4. Transitions FROM 'draft'
  if (fromState === "draft") {
    // draft -> draft (Update draft)
    if (toState === "draft") {
      if (actor === "owner" || actor === "manager" || actor === "member") {
        return null; // Allowed
      }
      return `Actor '${actor}' cannot edit draft proposals. Only workspace members can edit drafts.`;
    }

    // draft -> pending_approval (Publish proposal)
    if (toState === "pending_approval") {
      if (actor === "member") {
        return "Team members cannot publish proposals. Only workspace owners and managers can publish change requests.";
      }
      if (actor === "owner" || actor === "manager") {
        return null; // Allowed
      }
      return `Actor '${actor}' cannot publish proposals. Only workspace owners and managers can publish change requests.`;
    }

    // Direct jump from draft to decision (illegal)
    if (toState === "approved" || toState === "rejected") {
      return "A draft change request cannot be directly approved or rejected. It must first be published as a pending proposal.";
    }

    // draft -> withdrawn (illegal)
    if (toState === "withdrawn") {
      return "Draft change requests cannot be withdrawn; only published proposals awaiting approval can be withdrawn (drafts can be deleted or discarded).";
    }
  }

  // 5. Transitions FROM 'pending_approval'
  if (fromState === "pending_approval") {
    // pending_approval -> pending_approval (Re-issue link / token)
    if (toState === "pending_approval") {
      if (actor === "owner" || actor === "manager") {
        return null; // Allowed
      }
      return `Actor '${actor}' cannot re-issue approval tokens. Only workspace owners and managers can re-issue tokens.`;
    }

    // pending_approval -> draft (Revise proposal)
    if (toState === "draft") {
      if (actor === "owner" || actor === "manager") {
        return null; // Allowed
      }
      if (actor === "member") {
        return "Team members cannot revise pending proposals. Only workspace owners and managers can revise change requests.";
      }
      return `Actor '${actor}' cannot revise pending proposals. Only workspace owners and managers can revise change requests.`;
    }

    // pending_approval -> withdrawn (Withdraw proposal)
    if (toState === "withdrawn") {
      if (actor === "owner" || actor === "manager") {
        return null; // Allowed
      }
      return `Actor '${actor}' cannot withdraw proposals. Only workspace owners and managers can withdraw change requests.`;
    }

    // pending_approval -> approved (Client Approves)
    if (toState === "approved") {
      if (actor === "client_link") {
        return null; // Allowed
      }
      return `Internal workspace role '${actor}' cannot approve proposals. Only clients via an approval link (client_link) can approve a change request.`;
    }

    // pending_approval -> rejected (Client Rejects)
    if (toState === "rejected") {
      if (actor === "client_link") {
        return null; // Allowed
      }
      return `Internal workspace role '${actor}' cannot reject proposals. Only clients via an approval link (client_link) can reject a proposal. Workspace members should withdraw the proposal instead.`;
    }
  }

  // Catch-all for any undefined transition
  return `Transition from '${fromState}' to '${toState}' by actor '${actor}' is not permitted.`;
}

/**
 * Returns true if a state transition is permitted for the given actor, false otherwise.
 */
export function canTransition(
  fromState: ChangeRequestStatus | null | undefined,
  toState: ChangeRequestStatus,
  actor: StateMachineActor
): boolean {
  return getTransitionError(fromState, toState, actor) === null;
}

/**
 * Validates a transition and returns an object with `allowed` and optional `reason`.
 */
export function validateTransition(
  fromState: ChangeRequestStatus | null | undefined,
  toState: ChangeRequestStatus,
  actor: StateMachineActor
): { allowed: boolean; reason?: string } {
  const error = getTransitionError(fromState, toState, actor);
  if (error === null) {
    return { allowed: true };
  }
  return { allowed: false, reason: error };
}
