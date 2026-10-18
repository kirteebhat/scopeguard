import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  sendProposalToClientAction,
  setProjectClientContactAction,
  fetchProposalEmailHistoryAction,
} from "@/app/actions/proposal-emails";
import { maskEmail } from "@/lib/data/proposal-emails";
import { buildApprovalUrl, generateApprovalToken, hashApprovalToken } from "@/lib/server/tokens";
import { renderProposalEmailHtml, renderProposalEmailText, escapeHtml } from "@/lib/email/templates/proposal";

describe("Proposal Email Actions & Helpers Integration Suite", () => {
  describe("Email Masking Utility (maskEmail)", () => {
    it("correctly masks client emails preserving first character and domain", () => {
      expect(maskEmail("client@acme.com")).toBe("c***@acme.com");
      expect(maskEmail("jonathan.miller@enterprise.co.uk")).toBe("j***@enterprise.co.uk");
      expect(maskEmail("a@b.com")).toBe("a***@b.com");
    });

    it("handles invalid or empty inputs gracefully without throwing", () => {
      expect(maskEmail("")).toBe("***@***");
      expect(maskEmail("notanemail")).toBe("***@***");
    });
  });

  describe("Token Engine & Approval URL Construction", () => {
    it("generates 32-byte URL-safe raw token and 64-char sha256 hash", () => {
      const { rawToken, tokenHash, expiresAt } = generateApprovalToken(14);
      expect(rawToken).toBeDefined();
      expect(rawToken.length).toBeGreaterThanOrEqual(40);
      expect(tokenHash).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(tokenHash)).toBe(true);

      // Verify 14 days expiration
      const diffDays = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(13.9);
      expect(diffDays).toBeLessThan(14.1);
    });

    it("builds absolute approval portal URL handling origins and trailing slashes", () => {
      const token = "sample_raw_token_xyz";
      expect(buildApprovalUrl(token, "https://scopeguard.agency/")).toBe(
        "https://scopeguard.agency/approve/sample_raw_token_xyz"
      );
      expect(buildApprovalUrl(token, "http://localhost:3001")).toBe(
        "http://localhost:3001/approve/sample_raw_token_xyz"
      );
    });
  });

  describe("sendProposalToClientAction - Validation & Security Boundaries", () => {
    it("rejects when input data fails Zod validation", async () => {
      const res = await sendProposalToClientAction({
        changeRequestId: "not-a-uuid",
        recipientEmail: "invalid-email",
        mode: "regenerate_link",
        attemptKey: "short",
      });

      expect(res.success).toBe(false);
      expect(res.fieldErrors).toBeDefined();
      expect(res.fieldErrors?.changeRequestId).toBeDefined();
      expect(res.fieldErrors?.recipientEmail).toBeDefined();
      expect(res.fieldErrors?.attemptKey).toBeDefined();
    });

    it("rejects use_current_link_from_publish mode if rawToken is omitted", async () => {
      const res = await sendProposalToClientAction({
        changeRequestId: "d8c9735b-d306-4074-b5a9-dc2ca2e64673",
        recipientEmail: "client@acme.com",
        mode: "use_current_link_from_publish",
        attemptKey: "attempt-key-12345",
      });

      expect(res.success).toBe(false);
      expect(res.fieldErrors?.rawToken).toBeDefined();
    });

    it("rejects personal notes containing HTML tags to prevent email client exploits", async () => {
      const res = await sendProposalToClientAction({
        changeRequestId: "d8c9735b-d306-4074-b5a9-dc2ca2e64673",
        recipientEmail: "client@acme.com",
        personalNote: "Hello <script>alert('hack')</script>",
        mode: "regenerate_link",
        attemptKey: "attempt-key-12345",
      });

      expect(res.success).toBe(false);
      expect(res.fieldErrors?.personalNote).toBeDefined();
      expect(res.fieldErrors?.personalNote?.[0]).toContain("HTML formatting is not permitted");
    });
  });

  describe("setProjectClientContactAction - Validation", () => {
    it("rejects invalid email addresses", async () => {
      const formData = new FormData();
      formData.append("projectId", "d8c9735b-d306-4074-b5a9-dc2ca2e64673");
      formData.append("contactName", "Alice");
      formData.append("contactEmail", "invalid-email-address");

      const res = await setProjectClientContactAction(null, formData);
      expect(res.success).toBe(false);
      expect(res.fieldErrors?.contactEmail).toBeDefined();
    });

    it("rejects invalid project UUID", async () => {
      const formData = new FormData();
      formData.append("projectId", "invalid-uuid");
      formData.append("contactEmail", "alice@acme.com");

      const res = await setProjectClientContactAction(null, formData);
      expect(res.success).toBe(false);
      expect(res.fieldErrors?.projectId).toBeDefined();
    });
  });

  describe("Template Security & Content Integrity", () => {
    it("guarantees HTML escaping for all user inputs in proposal emails", () => {
      const sample = {
        recipientName: "Jonathan <CEO>",
        senderName: "Alice & Bob",
        workspaceName: "Agency <Innovations>",
        projectName: "App \"Alpha\"",
        changeRequestTitle: "Feature <b>Test</b>",
        changeRequestDescription: "Line 1\nLine 2 <script>",
        additionalCostFormatted: "+$10,000.00",
        currency: "USD",
        versionNumber: 1,
        personalNote: "Note with <img src=x> and & symbols",
        reviewUrl: "http://localhost:3001/approve/token_123",
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      };

      const html = renderProposalEmailHtml(sample);

      // Verify no raw unescaped HTML tags from user input
      expect(html).not.toContain("<CEO>");
      expect(html).toContain("&lt;CEO&gt;");
      expect(html).not.toContain("<Innovations>");
      expect(html).toContain("&lt;Innovations&gt;");
      expect(html).not.toContain("<b>Test</b>");
      expect(html).toContain("&lt;b&gt;Test&lt;/b&gt;");
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
      expect(html).not.toContain("<img src=x>");
      expect(html).toContain("&lt;img src=x&gt;");
      expect(html).toContain("Alice &amp; Bob");
    });
  });
});
