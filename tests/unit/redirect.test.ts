import { describe, it, expect } from "vitest";
import { getSafeRedirectUrl } from "@/lib/validation/redirect";

describe("Safe Redirect URL Helper", () => {
  it("allows valid same-origin relative paths", () => {
    expect(getSafeRedirectUrl("/dashboard")).toBe("/dashboard");
    expect(getSafeRedirectUrl("/projects")).toBe("/projects");
    expect(getSafeRedirectUrl("/projects/123/edit")).toBe("/projects/123/edit");
    expect(getSafeRedirectUrl("/settings?tab=team")).toBe("/settings?tab=team");
    expect(getSafeRedirectUrl("/projects?status=active#section")).toBe("/projects?status=active#section");
  });

  it("trims whitespace on valid relative paths", () => {
    expect(getSafeRedirectUrl("  /dashboard  ")).toBe("/dashboard");
    expect(getSafeRedirectUrl("/projects/abc  ")).toBe("/projects/abc");
  });

  it("rejects null, undefined, empty, and non-string inputs with default fallback", () => {
    expect(getSafeRedirectUrl(null)).toBe("/dashboard");
    expect(getSafeRedirectUrl(undefined)).toBe("/dashboard");
    expect(getSafeRedirectUrl("")).toBe("/dashboard");
    expect(getSafeRedirectUrl("   ")).toBe("/dashboard");
    expect(getSafeRedirectUrl(null, "/custom-fallback")).toBe("/custom-fallback");
  });

  it("blocks external absolute URLs", () => {
    expect(getSafeRedirectUrl("https://evil.com")).toBe("/dashboard");
    expect(getSafeRedirectUrl("http://attacker.org/steal")).toBe("/dashboard");
    expect(getSafeRedirectUrl("ftp://files.example.com")).toBe("/dashboard");
    expect(getSafeRedirectUrl("javascript:alert(1)")).toBe("/dashboard");
    expect(getSafeRedirectUrl("data:text/html,<script>alert(1)</script>")).toBe("/dashboard");
  });

  it("blocks protocol-relative URLs", () => {
    expect(getSafeRedirectUrl("//evil.com")).toBe("/dashboard");
    expect(getSafeRedirectUrl("//evil.com/dashboard")).toBe("/dashboard");
    expect(getSafeRedirectUrl("///evil.com")).toBe("/dashboard");
  });

  it("blocks Windows backslash directory separator bypasses", () => {
    expect(getSafeRedirectUrl("/\\evil.com")).toBe("/dashboard");
    expect(getSafeRedirectUrl("/path\\with\\backslashes")).toBe("/dashboard");
    expect(getSafeRedirectUrl("\\evil.com")).toBe("/dashboard");
  });

  it("blocks newline and carriage return header injection attempts", () => {
    expect(getSafeRedirectUrl("/dashboard\r\nSet-Cookie: stolen=true")).toBe("/dashboard");
    expect(getSafeRedirectUrl("/dashboard\nLocation: http://evil.com")).toBe("/dashboard");
    expect(getSafeRedirectUrl("/dashboard\0")).toBe("/dashboard");
  });

  it("respects custom fallback targets", () => {
    expect(getSafeRedirectUrl("https://evil.com", "/projects")).toBe("/projects");
    expect(getSafeRedirectUrl("", "/welcome")).toBe("/welcome");
  });
});

