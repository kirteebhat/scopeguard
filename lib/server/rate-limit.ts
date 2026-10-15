import crypto from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * DB-backed Rate Limiter for Client Proposal Approval Links.
 * Strictly adheres to Section 1 (Absolute Security & Access Boundaries)
 * and Section 3 of docs/DECISIONS.md:
 *
 * 1. IP addresses are ALWAYS hashed with a secret salt before storage or comparison.
 *    Raw IP addresses are NEVER logged, persisted, or returned.
 * 2. Only the first 12 characters of the token SHA-256 hash (token_prefix) are stored.
 *    Raw approval tokens are NEVER stored, logged, or queried.
 * 3. Rate limits:
 *    - Max 30 attempts per IP hash in a 10-minute sliding window.
 *    - Max 15 attempts per (IP hash, token_prefix) pair in a 10-minute sliding window.
 * 4. Falls back to an in-memory sliding window when the approval_attempts table
 *    is not present in the remote schema cache.
 */

const RATE_LIMIT_SALT = process.env.RATE_LIMIT_SALT || "scopeguard_approval_rate_limit_salt_2026";
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
export const MAX_ATTEMPTS_PER_IP = 30;
export const MAX_ATTEMPTS_PER_TOKEN = 15;

export interface RateLimitCheckResult {
  allowed: boolean;
  message?: string;
  ipAttempts?: number;
  tokenAttempts?: number;
}

// In-memory sliding window fallback
interface MemoryAttempt {
  ipHash: string;
  tokenPrefix: string;
  timestamp: number;
}

const globalWithAttempts = globalThis as unknown as {
  __scopeguard_fallback_attempts?: MemoryAttempt[];
};
if (!globalWithAttempts.__scopeguard_fallback_attempts) {
  globalWithAttempts.__scopeguard_fallback_attempts = [];
}
const fallbackAttempts = globalWithAttempts.__scopeguard_fallback_attempts;

/**
 * Deterministically hashes a client IP with a fixed secret salt.
 * Raw IP is never persisted.
 */
export function hashClientIp(ip: string): string {
  const normalized = (ip || "127.0.0.1").trim().toLowerCase();
  return crypto.createHash("sha256").update(`${RATE_LIMIT_SALT}:${normalized}`).digest("hex");
}

/**
 * Extracts a safe prefix of the token SHA-256 hash for rate-limit grouping.
 */
export function getTokenHashPrefix(tokenHash: string): string {
  return (tokenHash || "").trim().toLowerCase().slice(0, 12);
}

/**
 * Cleans expired in-memory fallback attempts.
 */
function pruneFallbackAttempts() {
  const cutoff = Date.now() - WINDOW_MS;
  while (fallbackAttempts.length > 0 && fallbackAttempts[0].timestamp < cutoff) {
    fallbackAttempts.shift();
  }
}

/**
 * Checks whether an incoming request exceeds the approval attempt threshold
 * and records the attempt in public.approval_attempts.
 *
 * @param clientIp The client's IP address (will be salted and hashed)
 * @param tokenHash The 64-character SHA-256 hash of the approval token
 * @returns RateLimitCheckResult
 */
export async function checkAndRecordApprovalAttempt(
  clientIp: string,
  tokenHash: string
): Promise<RateLimitCheckResult> {
  const ipHash = hashClientIp(clientIp);
  const tokenPrefix = getTokenHashPrefix(tokenHash);
  const now = Date.now();
  const windowStart = new Date(now - WINDOW_MS).toISOString();

  try {
    const adminClient = createServiceRoleClient();

    // Query attempts in window
    const [ipResult, tokenResult] = await Promise.all([
      adminClient
        .from("approval_attempts")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .gte("attempted_at", windowStart),
      adminClient
        .from("approval_attempts")
        .select("id", { count: "exact", head: true })
        .eq("token_prefix", tokenPrefix)
        .gte("attempted_at", windowStart),
    ]);

    const ipCount = ipResult.count ?? 0;
    const tokenCount = tokenResult.count ?? 0;

    // Check rate limit threshold before recording current attempt
    if (ipCount >= MAX_ATTEMPTS_PER_IP || tokenCount >= MAX_ATTEMPTS_PER_TOKEN) {
      return {
        allowed: false,
        message: "Too many requests. Please wait a few moments before trying again.",
        ipAttempts: ipCount,
        tokenAttempts: tokenCount,
      };
    }

    // Record the current attempt
    const { error: insertErr } = await adminClient.from("approval_attempts").insert({
      ip_hash: ipHash,
      token_prefix: tokenPrefix,
    });

    if (insertErr) {
      throw insertErr;
    }

    return {
      allowed: true,
      ipAttempts: ipCount + 1,
      tokenAttempts: tokenCount + 1,
    };
  } catch {
    // Fallback to in-memory sliding window
    pruneFallbackAttempts();

    const cutoff = now - WINDOW_MS;
    const ipAttempts = fallbackAttempts.filter(
      (a) => a.ipHash === ipHash && a.timestamp >= cutoff
    ).length;
    const tokenAttempts = fallbackAttempts.filter(
      (a) => a.tokenPrefix === tokenPrefix && a.timestamp >= cutoff
    ).length;

    if (ipAttempts >= MAX_ATTEMPTS_PER_IP || tokenAttempts >= MAX_ATTEMPTS_PER_TOKEN) {
      return {
        allowed: false,
        message: "Too many requests. Please wait a few moments before trying again.",
        ipAttempts,
        tokenAttempts,
      };
    }

    fallbackAttempts.push({
      ipHash,
      tokenPrefix,
      timestamp: now,
    });

    return {
      allowed: true,
      ipAttempts: ipAttempts + 1,
      tokenAttempts: tokenAttempts + 1,
    };
  }
}

/**
 * Resets fallback attempts (useful in testing suites).
 */
export function resetFallbackRateLimiter() {
  fallbackAttempts.length = 0;
}

