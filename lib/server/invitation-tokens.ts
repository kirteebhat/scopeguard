import crypto from "crypto";

export interface GeneratedInvitationToken {
  /** Raw bearer token string returned to caller in memory ONLY. Never persist this. */
  rawToken: string;
  /** SHA-256 hex digest (64 characters) safely stored in public.workspace_invitations. */
  tokenHash: string;
  /** Expiration timestamp (default: 7 days from generation). */
  expiresAt: Date;
}

const INVITATION_EXPIRY_DAYS = 7;

/**
 * Generates a cryptographically secure, URL-safe random invitation token
 * and its corresponding SHA-256 hex hash for database storage.
 *
 * @param expiryDays Number of days until token expires (defaults to 7)
 * @returns GeneratedInvitationToken containing rawToken, tokenHash, and expiresAt
 */
export function generateInvitationToken(
  expiryDays: number = INVITATION_EXPIRY_DAYS
): GeneratedInvitationToken {
  // 32 cryptographically secure random bytes = 256 bits entropy
  const buffer = crypto.randomBytes(32);
  const rawToken = buffer.toString("base64url");

  const tokenHash = hashInvitationToken(rawToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);

  return {
    rawToken,
    tokenHash,
    expiresAt,
  };
}

/**
 * Computes deterministic SHA-256 hex hash of an invitation token.
 * Used when looking up invitation records from incoming URLs.
 *
 * @param rawToken The raw token string from the URL parameter
 * @returns 64-character lowercase hex string
 */
export function hashInvitationToken(rawToken: string): string {
  if (!rawToken || typeof rawToken !== "string") {
    throw new Error("Invalid raw invitation token provided for hashing");
  }
  return crypto.createHash("sha256").update(rawToken.trim()).digest("hex");
}

/**
 * Constructs the canonical invitation acceptance URL.
 *
 * @param rawToken The raw bearer token string
 * @param baseUrl The application base URL (e.g. from NEXT_PUBLIC_APP_URL)
 * @returns Fully qualified invitation URL
 */
export function buildInvitationUrl(rawToken: string, baseUrl?: string): string {
  const origin = (baseUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001").replace(/\/+$/, "");
  return `${origin}/invite/${encodeURIComponent(rawToken)}`;
}
