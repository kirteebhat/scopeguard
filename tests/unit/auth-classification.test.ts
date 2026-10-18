import { describe, it, expect } from "vitest";
import { normalizeEmail, classifySignUpResult } from "@/lib/domain/authClassification";

describe("Authentication Pure Domain Logic Suite", () => {
  describe("normalizeEmail", () => {
    it("lowercases uppercase email addresses", () => {
      expect(normalizeEmail("Alex.Rivera@Example.COM")).toBe("alex.rivera@example.com");
    });

    it("trims leading and trailing whitespace and tabs", () => {
      expect(normalizeEmail("  user@domain.org\t ")).toBe("user@domain.org");
    });

    it("handles empty or falsy strings safely", () => {
      expect(normalizeEmail("")).toBe("");
    });
  });

  describe("classifySignUpResult", () => {
    it("detects case (a): brand new email awaiting confirmation (identities array non-empty)", () => {
      const result = classifySignUpResult({
        user: {
          id: "123",
          identities: [{ id: "identity-1" }],
          email_confirmed_at: null,
        },
        session: null,
        error: null,
      });

      expect(result).toBe("new_account_unconfirmed");
    });

    it("detects case (a2): brand new email automatically confirmed with active session", () => {
      const result = classifySignUpResult({
        user: {
          id: "123",
          identities: [{ id: "identity-1" }],
          email_confirmed_at: "2026-10-18T10:00:00Z",
        },
        session: { access_token: "mock-token" },
        error: null,
      });

      expect(result).toBe("new_account_confirmed");
    });

    it("detects case (b): existing unconfirmed account (empty identities, unconfirmed)", () => {
      const result = classifySignUpResult({
        user: {
          id: "obfuscated-123",
          identities: [],
          email_confirmed_at: null,
        },
        session: null,
        error: null,
        accountConfirmed: false,
      });

      expect(result).toBe("existing_account_unconfirmed");
    });

    it("detects case (c): existing confirmed account (empty identities, confirmed)", () => {
      const result = classifySignUpResult({
        user: {
          id: "obfuscated-123",
          identities: [],
          email_confirmed_at: null,
        },
        session: null,
        error: null,
        accountConfirmed: true, // discovered via admin / database verification
      });

      expect(result).toBe("existing_account_confirmed");
    });

    it("detects case (c2): existing confirmed account with email_confirmed_at present", () => {
      const result = classifySignUpResult({
        user: {
          id: "obfuscated-123",
          identities: [],
          email_confirmed_at: "2026-09-01T12:00:00Z",
        },
        session: null,
        error: null,
      });

      expect(result).toBe("existing_account_confirmed");
    });

    it("detects case (d): rate limited response via status 429", () => {
      const result = classifySignUpResult({
        user: null,
        session: null,
        error: {
          message: "Too Many Requests",
          status: 429,
        },
      });

      expect(result).toBe("rate_limited");
    });

    it("detects case (d2): rate limited response via error message text", () => {
      const result = classifySignUpResult({
        user: null,
        session: null,
        error: {
          message: "Email rate limit exceeded for this IP",
        },
      });

      expect(result).toBe("rate_limited");
    });

    it("detects case (e): generic network or database error", () => {
      const result = classifySignUpResult({
        user: null,
        session: null,
        error: {
          message: "Database connection failed",
          status: 500,
        },
      });

      expect(result).toBe("error");
    });
  });
});

