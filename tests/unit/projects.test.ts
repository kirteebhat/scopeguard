import { describe, it, expect, vi } from "vitest";
import { createProjectSchema, updateProjectSchema } from "@/lib/validation/project";
import { parseDecimalToMinor, minorToDecimalString } from "@/lib/domain/money";
import { updateProject } from "@/lib/data/projects";
import { ForbiddenError } from "@/lib/data/errors";
import type { AuthContext, MemberRole } from "@/lib/data/auth-context";

function createMockContext(role: MemberRole): AuthContext {
  return {
    user: {
      id: "usr-1111-2222-3333",
      email: `${role}@example.com`,
      fullName: `Test ${role}`,
    },
    workspace: {
      id: "wks-aaaa-bbbb-cccc",
      name: "Acme Agency",
      slug: "acme-agency",
      plan: "free",
      createdAt: new Date().toISOString(),
    },
    role,
    supabase: {} as unknown as AuthContext["supabase"],
  };
}

describe("Project Validation Schemas & Financial Boundaries", () => {
  describe("createProjectSchema", () => {
    const validPayload = {
      name: "Mobile App Redesign",
      clientName: "Wayne Enterprises",
      description: "Complete UI overhaul and design system implementation",
      currency: "USD",
      budgetMinor: 5000000, // $50,000.00
      hourlyRateMinor: 15000, // $150.00/hr
      startDate: "2026-05-01",
      originalDeadline: "2026-08-01",
    };

    it("accepts valid project creation payload", () => {
      const result = createProjectSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Mobile App Redesign");
        expect(result.data.budgetMinor).toBe(5000000);
      }
    });

    it("rejects project name shorter than 2 characters", () => {
      const result = createProjectSchema.safeParse({
        ...validPayload,
        name: "A",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.name).toBeDefined();
      }
    });

    it("rejects client name shorter than 2 characters", () => {
      const result = createProjectSchema.safeParse({
        ...validPayload,
        clientName: " ",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.clientName).toBeDefined();
      }
    });

    it("rejects negative budget or hourly rate", () => {
      const negBudget = createProjectSchema.safeParse({
        ...validPayload,
        budgetMinor: -100,
      });
      expect(negBudget.success).toBe(false);

      const negRate = createProjectSchema.safeParse({
        ...validPayload,
        hourlyRateMinor: -50,
      });
      expect(negRate.success).toBe(false);
    });

    it("rejects non-integer minor unit amounts", () => {
      const floatBudget = createProjectSchema.safeParse({
        ...validPayload,
        budgetMinor: 1250.5,
      });
      expect(floatBudget.success).toBe(false);
    });

    it("rejects invalid 3-letter currency code", () => {
      const invalidCurrency = createProjectSchema.safeParse({
        ...validPayload,
        currency: "US",
      });
      expect(invalidCurrency.success).toBe(false);

      const numericCurrency = createProjectSchema.safeParse({
        ...validPayload,
        currency: "123",
      });
      expect(numericCurrency.success).toBe(false);
    });

    it("rejects invalid calendar dates or deadline earlier than start date", () => {
      const invalidDate = createProjectSchema.safeParse({
        ...validPayload,
        startDate: "2026-02-31", // Non-existent date
      });
      expect(invalidDate.success).toBe(false);

      const invertedDates = createProjectSchema.safeParse({
        ...validPayload,
        startDate: "2026-09-01",
        originalDeadline: "2026-08-01",
      });
      expect(invertedDates.success).toBe(false);
      if (!invertedDates.success) {
        expect(invertedDates.error.flatten().fieldErrors.originalDeadline).toContain(
          "Original deadline must be on or after the project start date"
        );
      }
    });
  });

  describe("updateProjectSchema", () => {
    it("allows valid partial updates", () => {
      const partial = updateProjectSchema.safeParse({
        name: "Renamed Project",
        status: "completed",
      });
      expect(partial.success).toBe(true);
      if (partial.success) {
        expect(partial.data.name).toBe("Renamed Project");
        expect(partial.data.status).toBe("completed");
      }
    });

    it("allows valid status enum values", () => {
      for (const status of ["active", "completed", "on_hold", "archived"] as const) {
        const result = updateProjectSchema.safeParse({ status });
        expect(result.success).toBe(true);
      }

      const invalidStatus = updateProjectSchema.safeParse({ status: "in_review" });
      expect(invalidStatus.success).toBe(false);
    });

    it("validates deadline >= start date when both provided in update", () => {
      const invalid = updateProjectSchema.safeParse({
        startDate: "2026-10-15",
        originalDeadline: "2026-10-01",
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe("Money conversions for project baseline inputs", () => {
    it("correctly converts decimal strings to minor units without floating-point error", () => {
      expect(parseDecimalToMinor("50000.00")).toBe(5000000);
      expect(parseDecimalToMinor("150.50")).toBe(15050);
      expect(parseDecimalToMinor("0.05")).toBe(5);
      expect(parseDecimalToMinor("0")).toBe(0);
    });

    it("correctly converts minor units back to two-decimal string representation", () => {
      expect(minorToDecimalString(5000000)).toBe("50000.00");
      expect(minorToDecimalString(15050)).toBe("150.50");
      expect(minorToDecimalString(5)).toBe("0.05");
      expect(minorToDecimalString(0)).toBe("0.00");
    });
  });
});

describe("Project Data Layer: Member Financial Modification Boundary", () => {
  it("throws ForbiddenError when a member attempts to modify contractual budget", async () => {
    const memberContext = createMockContext("member");

    // Mock createServiceRoleClient to return an existing project with budget 500000
    vi.mock("@/lib/supabase/service", () => ({
      createServiceRoleClient: () => ({
        from: (table: string) => {
          if (table === "projects") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: {
                        id: "proj-123",
                        workspace_id: "wks-aaaa-bbbb-cccc",
                        name: "Test Project",
                        client_name: "Client Corp",
                        status: "active",
                        currency: "USD",
                        budget_minor: 500000,
                        hourly_rate_minor: 15000,
                        start_date: "2026-01-01",
                        original_deadline: "2026-03-01",
                        created_by: "usr-admin",
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          return {};
        },
      }),
    }));

    // Attempt to modify budget as member
    await expect(
      updateProject(
        "proj-123",
        {
          budgetMinor: 800000, // Different from 500000
        },
        memberContext
      )
    ).rejects.toThrow(ForbiddenError);

    // Attempt to modify hourly rate as member
    await expect(
      updateProject(
        "proj-123",
        {
          hourlyRateMinor: 25000, // Different from 15000
        },
        memberContext
      )
    ).rejects.toThrow(ForbiddenError);

    // Attempt to modify currency as member
    await expect(
      updateProject(
        "proj-123",
        {
          currency: "EUR", // Different from USD
        },
        memberContext
      )
    ).rejects.toThrow(ForbiddenError);
  });
});

