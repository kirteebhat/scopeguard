import crypto from "crypto";

/**
 * Token generation & hashing engine for client approval links.
 * Strictly adheres to Section 1 (Absolute Security & Access Boundaries)
 * and Section 3 (Client Approval Tokens & Security) of docs/DECISIONS.md.
 *
 * CRITICAL SECURITY ARCHITECTURE:
 * 1. Raw approval tokens are generated using crypto.randomBytes(32) (256 bits entropy)
 *    and encoded with URL-safe base64url characters.
 * 2. The raw token exists ONLY in volatile memory during generation and in the single
 *    response payload returned to the authenticated agency user.
 * 3. The raw token is NEVER persisted in plaintext, NEVER written to disk, and NEVER logged.
 * 4. Only the cryptographic SHA-256 hex hash (token_hash, exactly 64 characters) is stored
 *    in the database (public.approval_tokens).
 * 5. Because only the hash is stored, a lost link cannot be retrieved from the database.
 *    The agency user must use "Revoke and generate new link" to create a fresh token.
 */

export interface GeneratedApprovalToken {
  /** Raw bearer token string returned to the caller in memory. NEVER persist this. */
  rawToken: string;
  /** SHA-256 hex digest (64 characters) to be safely persisted in the database. */
  tokenHash: string;
  /** Expiration timestamp (default: 14 days from generation). */
  expiresAt: Date;
}

const TOKEN_EXPIRY_DAYS = 14;

/**
 * Generates a cryptographically secure, URL-safe random approval token
 * and its corresponding SHA-256 hash for database storage.
 *
 * @param expiryDays Number of days until token expiration (defaults to 14)
 * @returns GeneratedApprovalToken containing rawToken, tokenHash, and expiresAt
 */
export function generateApprovalToken(expiryDays: number = TOKEN_EXPIRY_DAYS): GeneratedApprovalToken {
  // 32 cryptographically secure random bytes = 256 bits of entropy
  const buffer = crypto.randomBytes(32);
  // URL-safe base64 encoding (A-Z, a-z, 0-9, -, _)
  const rawToken = buffer.toString("base64url");

  // Compute SHA-256 hash for storage
  const tokenHash = hashApprovalToken(rawToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);

  return {
    rawToken,
    tokenHash,
    expiresAt,
  };
}

/**
 * Computes the deterministic SHA-256 hex hash of an approval token.
 * Used when verifying incoming client bearer tokens against public.approval_tokens.
 *
 * @param rawToken The raw token string provided in the URL parameter
 * @returns 64-character lowercase hex string
 */
export function hashApprovalToken(rawToken: string): string {
  if (!rawToken || typeof rawToken !== "string") {
    throw new Error("Invalid raw token provided for hashing");
  }
  return crypto.createHash("sha256").update(rawToken.trim()).digest("hex");
}

