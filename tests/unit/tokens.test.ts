import { describe, it, expect } from "vitest";
import { generateApprovalToken, hashApprovalToken } from "@/lib/server/tokens";

describe("Approval Token Generator & Hasher", () => {
  it("generates URL-safe raw token with 43 characters and 64-character SHA-256 hash", () => {
    const { rawToken, tokenHash, expiresAt } = generateApprovalToken();

    // 32 bytes base64url = 43 characters
    expect(rawToken).toHaveLength(43);
    // Base64url characters only
    expect(rawToken).toMatch(/^[A-Za-z0-9_-]+$/);

    // SHA-256 hash is 64 hex characters
    expect(tokenHash).toHaveLength(64);
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);

    // Expiry is approximately 14 days in the future
    const diffDays = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(13.9);
    expect(diffDays).toBeLessThanOrEqual(14.1);
  });

  it("produces deterministic SHA-256 hashes", () => {
    const { rawToken, tokenHash } = generateApprovalToken();
    const computedHash = hashApprovalToken(rawToken);
    expect(computedHash).toBe(tokenHash);
  });

  it("generates unique tokens on subsequent calls", () => {
    const token1 = generateApprovalToken();
    const token2 = generateApprovalToken();

    expect(token1.rawToken).not.toBe(token2.rawToken);
    expect(token1.tokenHash).not.toBe(token2.tokenHash);
  });

  it("throws error when hashing an empty or invalid token", () => {
    expect(() => hashApprovalToken("")).toThrow("Invalid raw token");
    // @ts-expect-error test invalid parameter
    expect(() => hashApprovalToken(null)).toThrow("Invalid raw token");
  });
});
