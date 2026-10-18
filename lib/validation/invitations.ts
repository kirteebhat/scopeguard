import { z } from "zod";
import { emailSchema } from "./auth";

export const invitationRoleSchema = z.enum(["manager", "member"], {
  errorMap: () => ({ message: "Role must be either Manager or Member" }),
});

export type InvitationRole = z.infer<typeof invitationRoleSchema>;

export const singleInvitationSchema = z.object({
  email: emailSchema,
  role: invitationRoleSchema,
});

export const bulkInvitationSchema = z.object({
  emails: z.string().min(1, "Please provide at least one email address"),
  role: invitationRoleSchema,
});

export const resendInvitationSchema = z.object({
  invitationId: z.string().uuid("Invalid invitation ID"),
});

export const revokeInvitationSchema = z.object({
  invitationId: z.string().uuid("Invalid invitation ID"),
});

export const acceptInvitationSchema = z.object({
  token: z
    .string()
    .min(10, "Invitation token is invalid or corrupted")
    .max(128, "Invitation token exceeds permitted length"),
});

export interface ParsedEmailEntry {
  email: string;
  isValid: boolean;
  error?: string;
}

export interface BulkParseResult {
  validEmails: string[];
  invalidEntries: ParsedEmailEntry[];
  totalParsed: number;
}

const MAX_BULK_INVITATIONS = 10;

/**
 * Parses raw text input containing one or multiple email addresses
 * separated by commas, newlines, semicolons, or spaces.
 * Trims, lowercases, validates, dedupes, and enforces max 10 emails.
 */
export function parseBulkEmails(rawInput: string): BulkParseResult {
  if (!rawInput || typeof rawInput !== "string") {
    return { validEmails: [], invalidEntries: [], totalParsed: 0 };
  }

  // Split on commas, newlines, semicolons, tabs, and multiple spaces
  const rawTokens = rawInput
    .split(/[\r\n,;\s]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  const seen = new Set<string>();
  const validEmails: string[] = [];
  const invalidEntries: ParsedEmailEntry[] = [];

  for (const token of rawTokens) {
    const normalized = token.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    const parseResult = emailSchema.safeParse(normalized);
    if (parseResult.success) {
      if (validEmails.length < MAX_BULK_INVITATIONS) {
        validEmails.push(parseResult.data);
      } else {
        invalidEntries.push({
          email: normalized,
          isValid: false,
          error: `Limit exceeded: maximum ${MAX_BULK_INVITATIONS} invitations allowed per batch`,
        });
      }
    } else {
      invalidEntries.push({
        email: token,
        isValid: false,
        error: "Invalid email format",
      });
    }
  }

  return {
    validEmails,
    invalidEntries,
    totalParsed: seen.size,
  };
}
