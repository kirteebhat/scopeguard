import { describe, it, expect, vi } from "vitest";
import {
  requireRole,
  AuthContext,
  MemberRole,
} from "@/lib/data/auth-context";
import {
  UnauthorizedError,
  ForbiddenError,
  WorkspaceNotFoundError,
  NotFoundError,
} from "@/lib/data/errors";
import { updateWorkspaceAction } from "@/app/actions/workspace";
import { updateMemberRoleAction } from "@/app/actions/members";

// Helper to construct a mock AuthContext
function createMockContext(role: MemberRole, overrides?: Partial<AuthContext>): AuthContext {
  return {
    user: {
      id: "11111111-1111-4111-a111-111111111111",
      email: `${role}@scopeguard.dev`,
      fullName: `Test ${role}`,
    },
    workspace: {
      id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
      name: "Mock Agency Workspace",
      slug: "mock-agency",
      plan: "free",
      createdAt: new Date().toISOString(),
    },
    role,
    supabase: {} as unknown as AuthContext["supabase"],
    ...overrides,
  };
}

describe("Data Access Layer: Authorization Guard (requireRole)", () => {
  describe("Role: 'owner'", () => {
    const ownerContext = createMockContext("owner");

    it("allows owner access to owner-only operations", async () => {
      const result = await requireRole(["owner"], ownerContext);
      expect(result).toBe(ownerContext);
      expect(result.role).toBe("owner");
    });

    it("allows owner access to owner or manager operations", async () => {
      const result = await requireRole(["owner", "manager"], ownerContext);
      expect(result).toBe(ownerContext);
    });

    it("allows owner access to general member operations", async () => {
      const result = await requireRole(["owner", "manager", "member"], ownerContext);
      expect(result).toBe(ownerContext);
    });
  });

  describe("Role: 'manager'", () => {
    const managerContext = createMockContext("manager");

    it("allows manager access to manager-permitted operations", async () => {
      const result = await requireRole(["owner", "manager"], managerContext);
      expect(result).toBe(managerContext);
      expect(result.role).toBe("manager");
    });

    it("allows manager access to general member operations", async () => {
      const result = await requireRole(["owner", "manager", "member"], managerContext);
      expect(result).toBe(managerContext);
    });

    it("blocks manager from owner-only operations with typed ForbiddenError (403)", async () => {
      await expect(requireRole(["owner"], managerContext)).rejects.toThrowError(ForbiddenError);

      try {
        await requireRole(["owner"], managerContext);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenError);
        expect((err as ForbiddenError).statusCode).toBe(403);
        expect((err as ForbiddenError).message).toContain("Required role: owner, but your role is manager");
      }
    });
  });

  describe("Role: 'member'", () => {
    const memberContext = createMockContext("member");

    it("allows member access to general member operations", async () => {
      const result = await requireRole(["owner", "manager", "member"], memberContext);
      expect(result).toBe(memberContext);
      expect(result.role).toBe("member");
    });

    it("blocks member from owner-only operations with typed ForbiddenError (403)", async () => {
      await expect(requireRole(["owner"], memberContext)).rejects.toThrowError(ForbiddenError);
    });

    it("blocks member from manager operations with typed ForbiddenError (403)", async () => {
      await expect(requireRole(["owner", "manager"], memberContext)).rejects.toThrowError(ForbiddenError);

      try {
        await requireRole(["owner", "manager"], memberContext);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenError);
        expect((err as ForbiddenError).statusCode).toBe(403);
        expect((err as ForbiddenError).message).toContain("Required role: owner or manager, but your role is member");
      }
    });
  });

  describe("Single role argument variant", () => {
    it("handles single role passed without array", async () => {
      const ownerContext = createMockContext("owner");
      const result = await requireRole("owner", ownerContext);
      expect(result).toBe(ownerContext);
    });
  });

  describe("Typed Errors Integrity", () => {
    it("verifies statusCode and prototype of UnauthorizedError", () => {
      const err = new UnauthorizedError("Custom unauth message");
      expect(err).toBeInstanceOf(UnauthorizedError);
      expect(err).toBeInstanceOf(Error);
      expect(err.statusCode).toBe(401);
      expect(err.message).toBe("Custom unauth message");
      expect(err.name).toBe("UnauthorizedError");
    });

    it("verifies statusCode and prototype of ForbiddenError", () => {
      const err = new ForbiddenError("Custom forbidden message");
      expect(err).toBeInstanceOf(ForbiddenError);
      expect(err).toBeInstanceOf(Error);
      expect(err.statusCode).toBe(403);
      expect(err.name).toBe("ForbiddenError");
    });

    it("verifies statusCode and prototype of WorkspaceNotFoundError", () => {
      const err = new WorkspaceNotFoundError("No workspace");
      expect(err).toBeInstanceOf(WorkspaceNotFoundError);
      expect(err).toBeInstanceOf(Error);
      expect(err.statusCode).toBe(404);
      expect(err.name).toBe("WorkspaceNotFoundError");
    });

    it("verifies statusCode and prototype of NotFoundError", () => {
      const err = new NotFoundError("Resource missing");
      expect(err).toBeInstanceOf(NotFoundError);
      expect(err.statusCode).toBe(404);
      expect(err.name).toBe("NotFoundError");
    });
  });
});

describe("Server Actions: Untrusted Client Parameter Tamper Resistance", () => {
  it("rejects invalid role inputs in updateMemberRoleAction", async () => {
    const formData = new FormData();
    formData.append("targetUserId", "11111111-1111-4111-a111-111111111111");
    formData.append("role", "owner"); // Not allowed: owner role cannot be assigned via updateMemberRoleAction

    const result = await updateMemberRoleAction(null, formData);
    expect(result.success).toBe(false);
    expect(result.fieldErrors?.role).toBeDefined();
  });

  it("rejects non-uuid targetUserId in updateMemberRoleAction", async () => {
    const formData = new FormData();
    formData.append("targetUserId", "not-a-valid-uuid");
    formData.append("role", "manager");

    const result = await updateMemberRoleAction(null, formData);
    expect(result.success).toBe(false);
    expect(result.fieldErrors?.targetUserId).toBeDefined();
  });

  it("rejects invalid workspace names (too short) in updateWorkspaceAction", async () => {
    const formData = new FormData();
    formData.append("name", " ");

    const result = await updateWorkspaceAction(null, formData);
    expect(result.success).toBe(false);
    expect(result.fieldErrors?.name).toBeDefined();
  });
});

