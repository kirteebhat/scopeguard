import { describe, it, expect, beforeEach } from "vitest";
import {
  fallbackProposalEmailStore,
  recordFallbackProposalEmailBegin,
  recordFallbackProposalEmailComplete,
  maskEmail,
} from "@/lib/data/proposal-emails";
import { isSchemaOrFunctionMissing } from "@/lib/data/invitations";

describe("Proposal Emails Fallback & Schema Resilience", () => {
  beforeEach(() => {
    fallbackProposalEmailStore.clear();
  });

  describe("Schema error detection for proposal emails", () => {
    it("detects missing begin_proposal_email function", () => {
      const err = {
        code: "PGRST202",
        message:
          "Could not find the function public.begin_proposal_email(p_attempt_key, p_change_request_id, p_personal_note_present, p_recipient_email, p_recipient_name) in the schema cache",
      };
      expect(isSchemaOrFunctionMissing(err)).toBe(true);
    });

    it("detects missing proposal_emails table", () => {
      const err = {
        code: "PGRST205",
        message: "Could not find the table 'public.proposal_emails' in the schema cache",
      };
      expect(isSchemaOrFunctionMissing(err)).toBe(true);
    });
  });

  describe("Fallback Proposal Emails Store", () => {
    const defaultParams = {
      workspaceId: "ws-1",
      changeRequestId: "cr-1",
      recipientEmail: "client@example.com",
      recipientName: "Jane Doe",
      sentBy: "user-1",
      senderName: "Admin User",
      attemptKey: "attempt-1",
      personalNotePresent: false,
    };

    it("records a queued proposal email and updates it to sent", () => {
      const id = recordFallbackProposalEmailBegin(defaultParams);
      expect(id).toBeDefined();

      const item = fallbackProposalEmailStore.get(id);
      expect(item).toBeDefined();
      expect(item?.status).toBe("queued");
      expect(item?.recipientEmail).toBe("client@example.com");

      recordFallbackProposalEmailComplete(id, "sent", "resend-msg-123", null);

      const updated = fallbackProposalEmailStore.get(id);
      expect(updated?.status).toBe("sent");
      expect(updated?.sentAt).toBeDefined();
    });

    it("enforces idempotency using attemptKey", () => {
      const id1 = recordFallbackProposalEmailBegin(defaultParams);
      const id2 = recordFallbackProposalEmailBegin(defaultParams);
      expect(id1).toBe(id2);
    });

    it("enforces 60-second cooldown per change request", () => {
      recordFallbackProposalEmailBegin(defaultParams);

      expect(() => {
        recordFallbackProposalEmailBegin({
          ...defaultParams,
          attemptKey: "attempt-2",
        });
      }).toThrow(/Cooldown active/i);
    });

    it("enforces hourly rate limit of 5 sends per change request", () => {
      const now = Date.now();
      // Pre-populate 5 records older than 60s but within the last hour
      for (let i = 1; i <= 5; i++) {
        fallbackProposalEmailStore.set(`mock-id-${i}`, {
          id: `mock-id-${i}`,
          workspaceId: "ws-1",
          changeRequestId: "cr-1",
          recipientEmail: `test${i}@example.com`,
          recipientName: null,
          sentBy: "user-1",
          senderName: "Admin",
          status: "sent",
          errorCode: null,
          personalNotePresent: false,
          sendAttemptKey: `mock-attempt-${i}`,
          sentAt: new Date(now - 120000).toISOString(),
          createdAt: new Date(now - (120000 + i * 1000)).toISOString(),
        });
      }

      expect(() => {
        recordFallbackProposalEmailBegin({
          ...defaultParams,
          attemptKey: "attempt-new",
        });
      }).toThrow(/Rate limit exceeded/i);
    });

    it("masks recipient email for privacy logs", () => {
      expect(maskEmail("client@acme.com")).toBe("c***@acme.com");
      expect(maskEmail("info@startup.io")).toBe("i***@startup.io");
    });
  });
});
