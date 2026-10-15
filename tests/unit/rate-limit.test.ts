import { describe, it, expect, beforeEach } from "vitest";
import {
  hashClientIp,
  getTokenHashPrefix,
  checkAndRecordApprovalAttempt,
  resetFallbackRateLimiter,
  MAX_ATTEMPTS_PER_IP,
  MAX_ATTEMPTS_PER_TOKEN,
} from "@/lib/server/rate-limit";

describe("Approval Rate Limiter Engine", () => {
  beforeEach(() => {
    resetFallbackRateLimiter();
  });

  it("hashes client IP addresses deterministically with salt", () => {
    const ip = "192.168.1.100";
    const hash1 = hashClientIp(ip);
    const hash2 = hashClientIp(ip);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
    expect(hash1).not.toContain(ip);
  });

  it("extracts a safe 12-character prefix from token hash", () => {
    const fakeHash = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
    const prefix = getTokenHashPrefix(fakeHash);
    expect(prefix).toBe("abcdef012345");
    expect(prefix).toHaveLength(12);
  });

  it("allows requests under the rate limit threshold", async () => {
    const ip = "10.0.0.1";
    const tokenHash = "1234567890123456789012345678901234567890123456789012345678901234";

    const res = await checkAndRecordApprovalAttempt(ip, tokenHash);
    expect(res.allowed).toBe(true);
    expect(res.message).toBeUndefined();
  });

  it("blocks requests once the token attempt limit is exceeded", async () => {
    const ip = "10.0.0.2";
    const tokenHash = "9999567890123456789012345678901234567890123456789012345678901234";

    for (let i = 0; i < MAX_ATTEMPTS_PER_TOKEN; i++) {
      const res = await checkAndRecordApprovalAttempt(ip, tokenHash);
      expect(res.allowed).toBe(true);
    }

    // 16th attempt should be blocked
    const throttled = await checkAndRecordApprovalAttempt(ip, tokenHash);
    expect(throttled.allowed).toBe(false);
    expect(throttled.message).toContain("Too many requests");
  });

  it("blocks requests once the IP attempt limit is exceeded", async () => {
    const ip = "10.0.0.3";

    for (let i = 0; i < MAX_ATTEMPTS_PER_IP; i++) {
      // Use different token hash each time so token limit isn't hit first
      const tokenHash = `token_${i}_${"0".repeat(60)}`;
      const res = await checkAndRecordApprovalAttempt(ip, tokenHash);
      expect(res.allowed).toBe(true);
    }

    // 31st attempt from same IP should be blocked
    const throttled = await checkAndRecordApprovalAttempt(ip, "another_new_token_hash_00000000000000000000000000000000000000000");
    expect(throttled.allowed).toBe(false);
    expect(throttled.message).toContain("Too many requests");
  });
});

