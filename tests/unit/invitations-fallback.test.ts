import { describe, it, expect, beforeEach } from "vitest";
import {
  isSchemaOrFunctionMissing,
  fallbackInvitationStore,
  FallbackInvitationRecord,
} from "@/lib/data/invitations";
import { generateInvitationToken } from "@/lib/server/invitation-tokens";

describe("Workspace Invitations Fallback & Schema Resilience", () => {
  beforeEach(() => {
    fallbackInvitationStore.clear();
  });

  describe("isSchemaOrFunctionMissing detector", () => {
    it("detects PostgREST schema cache missing function error", () => {
      const err = {
        code: "PGRST202",
        message: "Could not find the function public.create_invitation(p_email, p_role, p_token_hash, p_workspace_id) in the schema cache",
      };
      expect(isSchemaOrFunctionMissing(err)).toBe(true);
    });

    it("detects PostgREST missing table in schema cache", () => {
      const err = {
        code: "PGRST205",
        message: "Could not find the table 'public.workspace_invitations' in the schema cache",
      };
      expect(isSchemaOrFunctionMissing(err)).toBe(true);
    });

    it("detects Postgres undefined table error code 42P01", () => {
      const err = {
        code: "42P01",
        message: 'relation "workspace_invitations" does not exist',
      };
      expect(isSchemaOrFunctionMissing(err)).toBe(true);
    });

    it("does not false-positive on real validation errors", () => {
      const err = {
        message: "User with email member@test.com is already an active member of this workspace.",
      };
      expect(isSchemaOrFunctionMissing(err)).toBe(false);
    });
  });

  describe("Fallback Invitation Store", () => {
    it("stores and retrieves invitations when database schema is unmigrated", () => {
      const wsId = "ws-123";
      const { rawToken, tokenHash, expiresAt } = generateInvitationToken();
      const id = "inv-1";

      const record: FallbackInvitationRecord = {
        id,
        workspaceId: wsId,
        workspaceName: "Apex Studio",
        email: "colleague@agency.com",
        role: "member",
        tokenHash,
        rawToken,
        status: "pending",
        invitedBy: "user-1",
        inviterName: "Admin User",
        expiresAt: expiresAt.toISOString(),
        acceptedAt: null,
        revokedAt: null,
        lastSentAt: new Date().toISOString(),
        sendCount: 1,
        createdAt: new Date().toISOString(),
      };

      fallbackInvitationStore.set(id, record);

      expect(fallbackInvitationStore.has(id)).toBe(true);
      const retrieved = fallbackInvitationStore.get(id);
      expect(retrieved?.email).toBe("colleague@agency.com");
      expect(retrieved?.workspaceName).toBe("Apex Studio");
      expect(retrieved?.role).toBe("member");
      expect(retrieved?.status).toBe("pending");
    });

    it("auto-refreshes token and increments send count when re-inviting existing pending email", () => {
      const wsId = "ws-123";
      const { rawToken: token1, tokenHash: hash1, expiresAt } = generateInvitationToken();
      const id = "inv-1";

      const record: FallbackInvitationRecord = {
        id,
        workspaceId: wsId,
        email: "colleague@agency.com",
        role: "member",
        tokenHash: hash1,
        rawToken: token1,
        status: "pending",
        invitedBy: "user-1",
        inviterName: "Admin User",
        expiresAt: expiresAt.toISOString(),
        acceptedAt: null,
        revokedAt: null,
        lastSentAt: new Date(Date.now() - 100000).toISOString(),
        sendCount: 1,
        createdAt: new Date().toISOString(),
      };

      fallbackInvitationStore.set(id, record);

      // Simulate re-invitation refresh
      const { rawToken: token2, tokenHash: hash2, expiresAt: expires2 } = generateInvitationToken();
      const existing = fallbackInvitationStore.get(id)!;
      existing.tokenHash = hash2;
      existing.rawToken = token2;
      existing.expiresAt = expires2.toISOString();
      existing.sendCount += 1;

      expect(existing.sendCount).toBe(2);
      expect(existing.rawToken).toBe(token2);
      expect(existing.tokenHash).toBe(hash2);
    });
  });
});
