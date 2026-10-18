import { describe, it, expect } from "vitest";
import {
  loginSchema,
  signUpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";

describe("Authentication Zod Validation Schemas", () => {
  describe("loginSchema", () => {
    it("accepts valid email and password", () => {
      const res = loginSchema.safeParse({
        email: "agency@scopeguard.com",
        password: "SecretPassword123!",
      });
      expect(res.success).toBe(true);
    });

    it("accepts optional next path", () => {
      const res = loginSchema.safeParse({
        email: "agency@scopeguard.com",
        password: "SecretPassword123!",
        next: "/projects",
      });
      expect(res.success).toBe(true);
    });

    it("rejects invalid email formats", () => {
      const res = loginSchema.safeParse({
        email: "not-an-email",
        password: "SecretPassword123!",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toMatch(/valid email/i);
      }
    });

    it("rejects empty password", () => {
      const res = loginSchema.safeParse({
        email: "agency@scopeguard.com",
        password: "",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toMatch(/password is required/i);
      }
    });
  });

  describe("signUpSchema", () => {
    it("accepts valid signup input", () => {
      const res = signUpSchema.safeParse({
        fullName: "Jane Doe",
        workspaceName: "Acme Agency",
        email: "jane@acme.agency",
        password: "SecurePassword1",
      });
      expect(res.success).toBe(true);
    });

    it("rejects full name shorter than 2 characters", () => {
      const res = signUpSchema.safeParse({
        fullName: "J",
        workspaceName: "Acme Agency",
        email: "jane@acme.agency",
        password: "SecurePassword1",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].path).toContain("fullName");
      }
    });

    it("rejects workspace name shorter than 2 characters", () => {
      const res = signUpSchema.safeParse({
        fullName: "Jane Doe",
        workspaceName: "A",
        email: "jane@acme.agency",
        password: "SecurePassword1",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].path).toContain("workspaceName");
      }
    });

    it("rejects passwords under 8 characters", () => {
      const res = signUpSchema.safeParse({
        fullName: "Jane Doe",
        workspaceName: "Acme Agency",
        email: "jane@acme.agency",
        password: "Pass1",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues.some((i) => i.message.includes("8 characters"))).toBe(true);
      }
    });

    it("rejects passwords missing uppercase letters", () => {
      const res = signUpSchema.safeParse({
        fullName: "Jane Doe",
        workspaceName: "Acme Agency",
        email: "jane@acme.agency",
        password: "password123",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues.some((i) => i.message.includes("uppercase"))).toBe(true);
      }
    });

    it("rejects passwords missing numbers", () => {
      const res = signUpSchema.safeParse({
        fullName: "Jane Doe",
        workspaceName: "Acme Agency",
        email: "jane@acme.agency",
        password: "PasswordWithoutNumbers",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues.some((i) => i.message.includes("number"))).toBe(true);
      }
    });
  });

  describe("forgotPasswordSchema", () => {
    it("accepts valid email", () => {
      const res = forgotPasswordSchema.safeParse({
        email: "founder@agency.com",
      });
      expect(res.success).toBe(true);
    });

    it("rejects empty or invalid email", () => {
      expect(forgotPasswordSchema.safeParse({ email: "" }).success).toBe(false);
      expect(forgotPasswordSchema.safeParse({ email: "invalid-email" }).success).toBe(false);
    });

    it("normalizes email to trimmed lowercase", () => {
      const res = forgotPasswordSchema.safeParse({ email: "  FOUNDER@Agency.COM  " });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.email).toBe("founder@agency.com");
      }
    });
  });

  describe("email normalization across all auth schemas", () => {
    it("trims and lowercases emails across login, signup, and resend", () => {
      const login = loginSchema.safeParse({
        email: "  USER@Example.COM  ",
        password: "ValidPassword123",
      });
      expect(login.success).toBe(true);
      if (login.success) expect(login.data.email).toBe("user@example.com");

      const signup = signUpSchema.safeParse({
        fullName: "Test User",
        workspaceName: "Workspace",
        email: "  NEWUSER@Example.COM  ",
        password: "ValidPassword1",
      });
      expect(signup.success).toBe(true);
      if (signup.success) expect(signup.data.email).toBe("newuser@example.com");
    });
  });

  describe("resetPasswordSchema", () => {
    it("accepts matching strong passwords", () => {
      const res = resetPasswordSchema.safeParse({
        password: "NewPassword123!",
        confirmPassword: "NewPassword123!",
      });
      expect(res.success).toBe(true);
    });

    it("rejects mismatched passwords", () => {
      const res = resetPasswordSchema.safeParse({
        password: "NewPassword123!",
        confirmPassword: "DifferentPassword123!",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues.some((i) => i.message.includes("do not match"))).toBe(true);
      }
    });
  });
});

