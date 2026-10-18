/**
 * Pure domain logic for authentication email normalization and Supabase signup result classification.
 * Zero external framework or database dependencies; 100% unit-testable.
 */

export type SignUpClassification =
  | "new_account_confirmed"
  | "new_account_unconfirmed"
  | "existing_account_confirmed"
  | "existing_account_unconfirmed"
  | "rate_limited"
  | "error";

export interface SignUpAuthResponseInput {
  user?: {
    id?: string;
    identities?: Array<unknown> | null;
    email_confirmed_at?: string | null;
  } | null;
  session?: unknown | null;
  error?: {
    message: string;
    status?: number;
  } | null;
  // Optional flag from admin/profile check when identities is empty
  accountConfirmed?: boolean;
}

/**
 * Normalizes an email address by trimming surrounding whitespace and converting to lowercase.
 */
export function normalizeEmail(email: string): string {
  if (!email) return "";
  return email.trim().toLowerCase();
}

/**
 * Classifies the outcome of a Supabase auth.signUp call per the official Supabase Auth specifications:
 *
 * 1. Rate-limited: Error contains "rate limit" or status 429.
 * 2. Error: Other API errors.
 * 3. Session present: Immediate confirmed session (e.g. email confirmation disabled).
 * 4. User present with empty identities array: Supabase obfuscated response for ALREADY REGISTERED email.
 *    - If account is known to be confirmed: 'existing_account_confirmed'
 *    - If unconfirmed: 'existing_account_unconfirmed'
 * 5. User present with non-empty identities array: Brand new unconfirmed account awaiting email verification.
 */
export function classifySignUpResult(input: SignUpAuthResponseInput): SignUpClassification {
  const { user, session, error, accountConfirmed } = input;

  if (error) {
    const msg = error.message.toLowerCase();
    if (error.status === 429 || msg.includes("rate limit") || msg.includes("too many requests")) {
      return "rate_limited";
    }
    return "error";
  }

  if (session) {
    return "new_account_confirmed";
  }

  if (user) {
    // Supabase returns an obfuscated user with an empty identities array for already registered emails
    if (Array.isArray(user.identities) && user.identities.length === 0) {
      if (accountConfirmed || user.email_confirmed_at) {
        return "existing_account_confirmed";
      }
      return "existing_account_unconfirmed";
    }

    return "new_account_unconfirmed";
  }

  return "error";
}

