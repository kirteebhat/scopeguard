import { describe, it, expect } from "vitest";
import {
  canTransition,
  getTransitionError,
  validateTransition,
  isTerminalState,
  TERMINAL_STATUSES,
  ALL_STATUSES,
  type ChangeRequestStatus,
  type StateMachineActor,
} from "@/lib/domain/stateMachine";

describe("lib/domain/stateMachine", () => {
  describe("isTerminalState", () => {
    it("identifies approved, rejected, and withdrawn as terminal", () => {
      expect(isTerminalState("approved")).toBe(true);
      expect(isTerminalState("rejected")).toBe(true);
      expect(isTerminalState("withdrawn")).toBe(true);
    });

    it("identifies draft and pending_approval as non-terminal", () => {
      expect(isTerminalState("draft")).toBe(false);
      expect(isTerminalState("pending_approval")).toBe(false);
    });
  });

  describe("Permitted State Transitions (Table 3 from doc 02)", () => {
    it("1. Create change request: null -> draft by owner, manager, or member", () => {
      expect(canTransition(null, "draft", "owner")).toBe(true);
      expect(canTransition(null, "draft", "manager")).toBe(true);
      expect(canTransition(null, "draft", "member")).toBe(true);
      expect(getTransitionError(null, "draft", "owner")).toBeNull();
      expect(getTransitionError(null, "draft", "manager")).toBeNull();
      expect(getTransitionError(null, "draft", "member")).toBeNull();
    });

    it("2. Update draft: draft -> draft by owner, manager, or member", () => {
      expect(canTransition("draft", "draft", "owner")).toBe(true);
      expect(canTransition("draft", "draft", "manager")).toBe(true);
      expect(canTransition("draft", "draft", "member")).toBe(true);
      expect(getTransitionError("draft", "draft", "owner")).toBeNull();
    });

    it("3. Publish proposal: draft -> pending_approval by owner or manager", () => {
      expect(canTransition("draft", "pending_approval", "owner")).toBe(true);
      expect(canTransition("draft", "pending_approval", "manager")).toBe(true);
      expect(getTransitionError("draft", "pending_approval", "owner")).toBeNull();
      expect(getTransitionError("draft", "pending_approval", "manager")).toBeNull();
    });

    it("4. Re-issue link: pending_approval -> pending_approval by owner or manager", () => {
      expect(canTransition("pending_approval", "pending_approval", "owner")).toBe(true);
      expect(canTransition("pending_approval", "pending_approval", "manager")).toBe(true);
      expect(getTransitionError("pending_approval", "pending_approval", "owner")).toBeNull();
    });

    it("5. Revise proposal: pending_approval -> draft by owner or manager", () => {
      expect(canTransition("pending_approval", "draft", "owner")).toBe(true);
      expect(canTransition("pending_approval", "draft", "manager")).toBe(true);
      expect(getTransitionError("pending_approval", "draft", "owner")).toBeNull();
    });

    it("6. Withdraw proposal: pending_approval -> withdrawn by owner or manager", () => {
      expect(canTransition("pending_approval", "withdrawn", "owner")).toBe(true);
      expect(canTransition("pending_approval", "withdrawn", "manager")).toBe(true);
      expect(getTransitionError("pending_approval", "withdrawn", "owner")).toBeNull();
    });

    it("7. Submit Client Approval: pending_approval -> approved by client_link ONLY", () => {
      expect(canTransition("pending_approval", "approved", "client_link")).toBe(true);
      expect(getTransitionError("pending_approval", "approved", "client_link")).toBeNull();
    });

    it("8. Submit Client Rejection: pending_approval -> rejected by client_link ONLY", () => {
      expect(canTransition("pending_approval", "rejected", "client_link")).toBe(true);
      expect(getTransitionError("pending_approval", "rejected", "client_link")).toBeNull();
    });
  });

  describe("Disallowed / Rejected State Transitions (Section 4 from doc 02)", () => {
    it("blocks members from publishing proposals: draft -> pending_approval", () => {
      expect(canTransition("draft", "pending_approval", "member")).toBe(false);
      const error = getTransitionError("draft", "pending_approval", "member");
      expect(error).toMatch(/team members cannot publish proposals/i);
    });

    it("blocks direct jump from draft to approved or rejected by any actor", () => {
      const actors: StateMachineActor[] = ["owner", "manager", "member", "client_link"];
      for (const actor of actors) {
        expect(canTransition("draft", "approved", actor)).toBe(false);
        expect(canTransition("draft", "rejected", actor)).toBe(false);
        expect(getTransitionError("draft", "approved", actor)).toMatch(
          /draft.*cannot be directly approved or rejected/i
        );
      }
    });

    it("blocks draft -> withdrawn (drafts must be discarded/deleted, not withdrawn)", () => {
      const actors: StateMachineActor[] = ["owner", "manager", "member"];
      for (const actor of actors) {
        expect(canTransition("draft", "withdrawn", actor)).toBe(false);
        expect(getTransitionError("draft", "withdrawn", actor)).toMatch(
          /draft.*cannot be withdrawn/i
        );
      }
    });

    it("blocks internal workspace roles (owner, manager, member) from approving pending proposals", () => {
      expect(canTransition("pending_approval", "approved", "owner")).toBe(false);
      expect(canTransition("pending_approval", "approved", "manager")).toBe(false);
      expect(canTransition("pending_approval", "approved", "member")).toBe(false);

      const error = getTransitionError("pending_approval", "approved", "owner");
      expect(error).toMatch(/internal workspace role.*cannot approve/i);
      expect(error).toMatch(/only clients via an approval link/i);
    });

    it("blocks internal workspace roles (owner, manager, member) from rejecting pending proposals", () => {
      expect(canTransition("pending_approval", "rejected", "owner")).toBe(false);
      expect(canTransition("pending_approval", "rejected", "manager")).toBe(false);
      expect(canTransition("pending_approval", "rejected", "member")).toBe(false);

      const error = getTransitionError("pending_approval", "rejected", "manager");
      expect(error).toMatch(/internal workspace role.*cannot reject/i);
    });

    it("blocks members from revising pending proposals: pending_approval -> draft", () => {
      expect(canTransition("pending_approval", "draft", "member")).toBe(false);
      expect(getTransitionError("pending_approval", "draft", "member")).toMatch(
        /team members cannot revise/i
      );
    });

    it("blocks members from withdrawing pending proposals: pending_approval -> withdrawn", () => {
      expect(canTransition("pending_approval", "withdrawn", "member")).toBe(false);
      expect(getTransitionError("pending_approval", "withdrawn", "member")).toMatch(
        /only workspace owners and managers can withdraw/i
      );
    });

    it("blocks client_link from revising or withdrawing proposals", () => {
      expect(canTransition("pending_approval", "draft", "client_link")).toBe(false);
      expect(canTransition("pending_approval", "withdrawn", "client_link")).toBe(false);
      expect(canTransition("pending_approval", "pending_approval", "client_link")).toBe(false);
    });

    it("TERMINAL STATE LOCKDOWN: blocks ALL transitions out of 'approved'", () => {
      const allActors: StateMachineActor[] = [
        "owner",
        "manager",
        "member",
        "client_link",
        "not_authenticated",
      ];

      for (const toState of ALL_STATUSES) {
        for (const actor of allActors) {
          expect(canTransition("approved", toState, actor)).toBe(false);
          const error = getTransitionError("approved", toState, actor);
          expect(error).not.toBeNull();
        }
      }

      const specificError = getTransitionError("approved", "draft", "owner");
      expect(specificError).toMatch(/cannot transition from terminal state 'approved'/i);
      expect(specificError).toMatch(/permanently locked/i);
    });

    it("TERMINAL STATE LOCKDOWN: blocks ALL transitions out of 'rejected'", () => {
      const allActors: StateMachineActor[] = [
        "owner",
        "manager",
        "member",
        "client_link",
        "not_authenticated",
      ];

      for (const toState of ALL_STATUSES) {
        for (const actor of allActors) {
          expect(canTransition("rejected", toState, actor)).toBe(false);
          const error = getTransitionError("rejected", toState, actor);
          expect(error).not.toBeNull();
        }
      }

      const specificError = getTransitionError("rejected", "draft", "owner");
      expect(specificError).toMatch(/cannot transition from terminal state 'rejected'/i);
    });

    it("TERMINAL STATE LOCKDOWN: blocks ALL transitions out of 'withdrawn'", () => {
      const allActors: StateMachineActor[] = [
        "owner",
        "manager",
        "member",
        "client_link",
        "not_authenticated",
      ];

      for (const toState of ALL_STATUSES) {
        for (const actor of allActors) {
          expect(canTransition("withdrawn", toState, actor)).toBe(false);
          const error = getTransitionError("withdrawn", toState, actor);
          expect(error).not.toBeNull();
        }
      }

      const specificError = getTransitionError("withdrawn", "draft", "owner");
      expect(specificError).toMatch(/cannot transition from terminal state 'withdrawn'/i);
    });

    it("blocks ALL transitions by not_authenticated actor", () => {
      for (const fromState of ALL_STATUSES) {
        for (const toState of ALL_STATUSES) {
          expect(canTransition(fromState, toState, "not_authenticated")).toBe(false);
          const error = getTransitionError(fromState, toState, "not_authenticated");
          expect(error).toMatch(/unauthenticated users cannot perform any state transitions/i);
        }
      }
      expect(canTransition(null, "draft", "not_authenticated")).toBe(false);
    });

    it("blocks initial creation into any state other than 'draft'", () => {
      const nonDraftStatuses: ChangeRequestStatus[] = [
        "pending_approval",
        "approved",
        "rejected",
        "withdrawn",
      ];

      for (const target of nonDraftStatuses) {
        expect(canTransition(null, target, "owner")).toBe(false);
        const error = getTransitionError(null, target, "owner");
        expect(error).toMatch(/must be initialized in 'draft' status/i);
      }
    });

    it("blocks initial creation by client_link", () => {
      expect(canTransition(null, "draft", "client_link")).toBe(false);
      const error = getTransitionError(null, "draft", "client_link");
      expect(error).toMatch(/not authorized to create change requests/i);
    });
  });

  describe("validateTransition helper", () => {
    it("returns { allowed: true } when permitted", () => {
      const result = validateTransition("draft", "pending_approval", "owner");
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("returns { allowed: false, reason } when blocked", () => {
      const result = validateTransition("draft", "pending_approval", "member");
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/team members cannot publish proposals/i);
    });
  });
});
