import { describe, it, expect } from "vitest";
import {
  parseBulkEmails,
  singleInvitationSchema,
  bulkInvitationSchema,
  acceptInvitationSchema,
} from "@/lib/validation/invitations";
import {
  generateInvitationToken,
  hashInvitationToken,
  buildInvitationUrl,
} from "@/lib/server/invitation-tokens";
import {
  renderInvitationEmailSubject,
  renderInvitationEmailHtml,
  renderInvitationEmailText,
} from "@/lib/email/templates/invitation";

describe("Team Invitations Validation & Token Engine", () => {
  describe("Bulk Email Parser (parseBulkEmails)", () => {
    it("parses single email cleanly", () => {
      const res = parseBulkEmails("test@agency.com");
      expect(res.validEmails).toEqual(["test@agency.com"]);
      expect(res.invalidEntries).toHaveLength(0);
      expect(res.totalParsed).toBe(1);
    });

    it("parses multiple emails separated by commas, newlines, and spaces", () => {
      const input = `
        lead@agency.com, dev@agency.com
        pm@agency.com; designer@agency.com
        finance@agency.com
      `;
      const res = parseBulkEmails(input);
      expect(res.validEmails).toEqual([
        "lead@agency.com",
        "dev@agency.com",
        "pm@agency.com",
        "designer@agency.com",
        "finance@agency.com",
      ]);
      expect(res.invalidEntries).toHaveLength(0);
      expect(res.totalParsed).toBe(5);
    });

    it("deduplicates case-insensitively and trims whitespace", () => {
      const input = "Lead@Agency.com, lead@agency.com,   LEAD@AGENCY.COM  ";
      const res = parseBulkEmails(input);
      expect(res.validEmails).toEqual(["lead@agency.com"]);
      expect(res.totalParsed).toBe(1);
    });

    it("captures invalid email syntax into invalidEntries without failing valid ones", () => {
      const input = "valid@agency.com, not-an-email, another@valid.com, missing-domain@.com";
      const res = parseBulkEmails(input);
      expect(res.validEmails).toEqual(["valid@agency.com", "another@valid.com"]);
      expect(res.invalidEntries).toHaveLength(2);
      expect(res.invalidEntries[0].email).toBe("not-an-email");
      expect(res.invalidEntries[1].email).toBe("missing-domain@.com");
    });

    it("enforces maximum 10 invitations per batch", () => {
      const emails = Array.from({ length: 15 }, (_, i) => `user${i + 1}@agency.com`).join(", ");
      const res = parseBulkEmails(emails);
      expect(res.validEmails).toHaveLength(10);
      expect(res.invalidEntries).toHaveLength(5);
      expect(res.invalidEntries[0].error).toContain("Limit exceeded");
    });

    it("returns empty result on empty or blank string", () => {
      expect(parseBulkEmails("").validEmails).toHaveLength(0);
      expect(parseBulkEmails("   \n\t  ").validEmails).toHaveLength(0);
    });
  });

  describe("Zod Validation Schemas", () => {
    it("validates single invitation schema", () => {
      const valid = singleInvitationSchema.safeParse({
        email: "alex@agency.com",
        role: "manager",
      });
      expect(valid.success).toBe(true);

      const invalidRole = singleInvitationSchema.safeParse({
        email: "alex@agency.com",
        role: "owner", // Owner cannot be invited
      });
      expect(invalidRole.success).toBe(false);
    });

    it("validates bulk invitation schema", () => {
      const valid = bulkInvitationSchema.safeParse({
        emails: "dev@agency.com, pm@agency.com",
        role: "member",
      });
      expect(valid.success).toBe(true);

      const empty = bulkInvitationSchema.safeParse({
        emails: "",
        role: "member",
      });
      expect(empty.success).toBe(false);
    });

    it("validates accept invitation token schema", () => {
      expect(acceptInvitationSchema.safeParse({ token: "valid_token_string_here_123" }).success).toBe(true);
      expect(acceptInvitationSchema.safeParse({ token: "short" }).success).toBe(false);
    });
  });

  describe("Token Generation & Hashing", () => {
    it("generates 32-byte URL-safe base64url token with 64-char hex hash", () => {
      const { rawToken, tokenHash, expiresAt } = generateInvitationToken(7);
      expect(rawToken).toBeDefined();
      expect(rawToken.length).toBeGreaterThanOrEqual(40);
      // URL-safe checks
      expect(rawToken).not.toContain("+");
      expect(rawToken).not.toContain("/");
      expect(rawToken).not.toContain("=");

      expect(tokenHash).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(tokenHash)).toBe(true);

      // Verify expiresAt is ~7 days in the future
      const now = new Date().getTime();
      const diffDays = (expiresAt.getTime() - now) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(6.9);
      expect(diffDays).toBeLessThan(7.1);
    });

    it("deterministically computes identical SHA-256 hash for identical raw token", () => {
      const token = "my_fixed_sample_invitation_token_12345";
      const hash1 = hashInvitationToken(token);
      const hash2 = hashInvitationToken(token);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it("builds correct invitation URL", () => {
      const url = buildInvitationUrl("abc_123", "http://localhost:3001");
      expect(url).toBe("http://localhost:3001/invite/abc_123");
    });
  });

  describe("Email Templates Rendering & HTML Escaping", () => {
    const sampleProps = {
      inviterName: "Sarah Connor <CEO>",
      workspaceName: "Cyberdyne Systems & Co",
      role: "manager" as const,
      inviteUrl: "http://localhost:3001/invite/sample_token_abc",
      expiresAt: new Date("2026-10-25T12:00:00Z"),
    };

    it("renders subject correctly", () => {
      const subject = renderInvitationEmailSubject(sampleProps);
      expect(subject).toBe("Sarah Connor <CEO> invited you to join Cyberdyne Systems & Co on ScopeGuard");
    });

    it("escapes dynamic inputs in HTML to prevent XSS", () => {
      const html = renderInvitationEmailHtml(sampleProps);
      // Verify < and > in inviterName are escaped
      expect(html).not.toContain("<CEO>");
      expect(html).toContain("&lt;CEO&gt;");

      // Verify & in workspaceName is escaped
      expect(html).not.toContain("Systems & Co");
      expect(html).toContain("Systems &amp; Co");

      // Verify button and link are rendered
      expect(html).toContain("http://localhost:3001/invite/sample_token_abc");
      expect(html).toContain("Accept Invitation &rarr;");
      expect(html).toContain("What is ScopeGuard?");
    });

    it("renders plaintext equivalent correctly", () => {
      const text = renderInvitationEmailText(sampleProps);
      expect(text).toContain("Sarah Connor <CEO> has invited you to join Cyberdyne Systems & Co");
      expect(text).toContain("http://localhost:3001/invite/sample_token_abc");
      expect(text).toContain("Manager");
      expect(text).toContain("ScopeGuard protects agency profit margins");
    });
  });

  describe("singleInvitationSchema & acceptInvitationSchema", () => {
    it("accepts valid single invitation with manager and member roles", () => {
      const res1 = singleInvitationSchema.safeParse({ email: "team@agency.com", role: "member" });
      expect(res1.success).toBe(true);

      const res2 = singleInvitationSchema.safeParse({ email: "lead@agency.com", role: "manager" });
      expect(res2.success).toBe(true);
    });

    it("rejects illegal owner role in single invitation", () => {
      const res = singleInvitationSchema.safeParse({ email: "team@agency.com", role: "owner" });
      expect(res.success).toBe(false);
    });

    it("accepts valid token in acceptInvitationSchema", () => {
      const res = acceptInvitationSchema.safeParse({ token: "valid_cryptographic_token_32chars" });
      expect(res.success).toBe(true);
    });

    it("rejects short, empty, or missing tokens in acceptInvitationSchema", () => {
      expect(acceptInvitationSchema.safeParse({ token: "" }).success).toBe(false);
      expect(acceptInvitationSchema.safeParse({ token: "tiny" }).success).toBe(false);
      expect(acceptInvitationSchema.safeParse({}).success).toBe(false);
    });
  });
});
