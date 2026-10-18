import { describe, it, expect } from "vitest";
import {
  sendProposalToClientSchema,
  setProjectClientContactSchema,
} from "@/lib/validation/proposal-email";
import {
  renderProposalEmailSubject,
  renderProposalEmailText,
  renderProposalEmailHtml,
  escapeHtml,
} from "@/lib/email/templates/proposal";

describe("Proposal Email Validation & Template Engine", () => {
  describe("Zod Validation: sendProposalToClientSchema", () => {
    const validBase = {
      changeRequestId: "d8c9735b-d306-4074-b5a9-dc2ca2e64673",
      recipientEmail: "client@acmecorp.com",
      recipientName: "Alice Smith",
      personalNote: "Please review the updated scope details.",
      sendCopyToMe: true,
      attemptKey: "attempt-key-unique-12345",
      saveAsProjectContact: true,
    };

    it("accepts valid use_current_link_from_publish with rawToken", () => {
      const res = sendProposalToClientSchema.safeParse({
        ...validBase,
        mode: "use_current_link_from_publish",
        rawToken: "token_sample_in_memory_abcdef123456",
      });
      expect(res.success).toBe(true);
    });

    it("rejects use_current_link_from_publish when rawToken is missing or too short", () => {
      const resMissing = sendProposalToClientSchema.safeParse({
        ...validBase,
        mode: "use_current_link_from_publish",
      });
      expect(resMissing.success).toBe(false);

      const resShort = sendProposalToClientSchema.safeParse({
        ...validBase,
        mode: "use_current_link_from_publish",
        rawToken: "short",
      });
      expect(resShort.success).toBe(false);
    });

    it("accepts regenerate_link mode without requiring rawToken", () => {
      const res = sendProposalToClientSchema.safeParse({
        ...validBase,
        mode: "regenerate_link",
      });
      expect(res.success).toBe(true);
    });

    it("rejects personal notes containing HTML tags to prevent phishing/formatting corruption", () => {
      const withScript = sendProposalToClientSchema.safeParse({
        ...validBase,
        mode: "regenerate_link",
        personalNote: "Hello <script>alert(1)</script>",
      });
      expect(withScript.success).toBe(false);

      const withBold = sendProposalToClientSchema.safeParse({
        ...validBase,
        mode: "regenerate_link",
        personalNote: "Please check this <b>important</b> note",
      });
      expect(withBold.success).toBe(false);
    });

    it("rejects personal notes exceeding 500 characters", () => {
      const longNote = "A".repeat(501);
      const res = sendProposalToClientSchema.safeParse({
        ...validBase,
        mode: "regenerate_link",
        personalNote: longNote,
      });
      expect(res.success).toBe(false);
    });

    it("rejects invalid recipient email formats", () => {
      const res = sendProposalToClientSchema.safeParse({
        ...validBase,
        mode: "regenerate_link",
        recipientEmail: "not-an-email",
      });
      expect(res.success).toBe(false);
    });

    it("rejects invalid UUID for changeRequestId", () => {
      const res = sendProposalToClientSchema.safeParse({
        ...validBase,
        mode: "regenerate_link",
        changeRequestId: "not-a-uuid",
      });
      expect(res.success).toBe(false);
    });
  });

  describe("Zod Validation: setProjectClientContactSchema", () => {
    it("accepts valid name and email", () => {
      const res = setProjectClientContactSchema.safeParse({
        projectId: "d8c9735b-d306-4074-b5a9-dc2ca2e64673",
        contactName: "Jonathan Miller",
        contactEmail: "jonathan@acme.com",
      });
      expect(res.success).toBe(true);
    });

    it("accepts empty optional values", () => {
      const res = setProjectClientContactSchema.safeParse({
        projectId: "d8c9735b-d306-4074-b5a9-dc2ca2e64673",
        contactName: "",
        contactEmail: "",
      });
      expect(res.success).toBe(true);
    });

    it("rejects invalid email address when provided", () => {
      const res = setProjectClientContactSchema.safeParse({
        projectId: "d8c9735b-d306-4074-b5a9-dc2ca2e64673",
        contactName: "Jonathan",
        contactEmail: "invalid-email-string",
      });
      expect(res.success).toBe(false);
    });
  });

  describe("Email Template Rendering & Security Escaping", () => {
    const sampleProps = {
      recipientName: "Bob <Client>",
      senderName: "Sarah Connor & Partners",
      workspaceName: "Acme <Global> Studio",
      projectName: "Mobile App \"Beta\"",
      changeRequestTitle: "Add payment gateway & Apple Pay",
      changeRequestDescription: "Integration of Stripe Connect & Apple Pay SDK.\nIncludes 3DS2 support.",
      additionalCostFormatted: "+$5,000.00",
      currency: "USD",
      originalDeadline: "2026-11-01",
      proposedDeadline: "2026-11-15",
      versionNumber: 2,
      personalNote: "Hi Bob, this includes the payment flow updates & webhook handling.",
      reviewUrl: "http://localhost:3001/approve/token123_abc",
      expiresAt: new Date("2026-10-31T00:00:00Z"),
    };

    it("renders subject correctly", () => {
      const subject = renderProposalEmailSubject({
        projectName: "E-Commerce Replatform",
        workspaceName: "Apex Design",
        versionNumber: 1,
      });
      expect(subject).toBe("Scope Change Proposal: E-Commerce Replatform (v1) · Apex Design");
    });

    it("escapes all dynamic content in HTML to prevent XSS", () => {
      const html = renderProposalEmailHtml(sampleProps);

      // Verify recipient name is escaped
      expect(html).not.toContain("Bob <Client>");
      expect(html).toContain("Bob &lt;Client&gt;");

      // Verify workspace is escaped
      expect(html).not.toContain("Acme <Global> Studio");
      expect(html).toContain("Acme &lt;Global&gt; Studio");

      // Verify quotes in project name are escaped
      expect(html).not.toContain('Mobile App "Beta"');
      expect(html).toContain("Mobile App &quot;Beta&quot;");

      // Verify sender name is escaped
      expect(html).not.toContain("Sarah Connor & Partners");
      expect(html).toContain("Sarah Connor &amp; Partners");

      // Verify personal note is escaped and rendered with quote
      expect(html).toContain("Hi Bob, this includes the payment flow updates &amp; webhook handling.");

      // Verify link and CTA
      expect(html).toContain("http://localhost:3001/approve/token123_abc");
      expect(html).toContain("Review and respond &rarr;");

      // Verify commercial impact
      expect(html).toContain("+$5,000.00");
      expect(html).toContain("USD");
      expect(html).toContain("Version 2 Proposal");
    });

    it("renders plaintext equivalent correctly", () => {
      const text = renderProposalEmailText(sampleProps);

      expect(text).toContain("Hello Bob <Client>,");
      expect(text).toContain("Sarah Connor & Partners from Acme <Global> Studio has submitted a scope change proposal");
      expect(text).toContain("Mobile App \"Beta\"");
      expect(text).toContain("Version 2");
      expect(text).toContain("Commercial Impact: +$5,000.00 (USD)");
      expect(text).toContain("Proposed deadline is 2026-11-15");
      expect(text).toContain("http://localhost:3001/approve/token123_abc");
      expect(text).toContain("Hi Bob, this includes the payment flow updates & webhook handling.");
    });

    it("handles omitted recipient name and omitted personal note gracefully", () => {
      const minimalProps = {
        ...sampleProps,
        recipientName: null,
        personalNote: null,
      };

      const html = renderProposalEmailHtml(minimalProps);
      expect(html).toContain("Hello,");
      expect(html).not.toContain("Note from");

      const text = renderProposalEmailText(minimalProps);
      expect(text).toContain("Hello,");
      expect(text).not.toContain("Note from");
    });

    it("escapeHtml correctly escapes dangerous characters", () => {
      expect(escapeHtml("<script>alert('xss')</script>")).toBe(
        "&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;"
      );
      expect(escapeHtml('foo & "bar"')).toBe("foo &amp; &quot;bar&quot;");
    });
  });
});

