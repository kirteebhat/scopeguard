import { describe, it, expect } from "vitest";
import {
  createProjectSchema,
  updateProjectSchema,
  createDeliverableSchema,
  updateDeliverableSchema,
  createChangeRequestDraftSchema,
  updateChangeRequestDraftSchema,
  publishChangeRequestSchema,
  clientDecisionSchema,
} from "@/lib/validation";

describe("lib/validation domain schemas", () => {
  describe("createProjectSchema & updateProjectSchema", () => {
    const validProject = {
      name: "Acme Mobile App",
      clientName: "Acme Corp",
      description: "Next-gen consumer mobile app redesign",
      budgetMinor: 5000000, // $50,000.00
      currency: "USD",
      hourlyRateMinor: 15000, // $150.00/hr
      startDate: "2026-06-01",
      originalDeadline: "2026-09-01",
    };

    it("accepts valid project payload", () => {
      const result = createProjectSchema.safeParse(validProject);
      expect(result.success).toBe(true);
    });

    it("rejects project names that are too short or too long", () => {
      expect(createProjectSchema.safeParse({ ...validProject, name: "A" }).success).toBe(false);
      expect(createProjectSchema.safeParse({ ...validProject, name: "   " }).success).toBe(false);
      expect(
        createProjectSchema.safeParse({ ...validProject, name: "x".repeat(101) }).success
      ).toBe(false);
    });

    it("rejects client names that are too short", () => {
      expect(
        createProjectSchema.safeParse({ ...validProject, clientName: "X" }).success
      ).toBe(false);
    });

    it("rejects negative budgets and floating-point budgets", () => {
      expect(
        createProjectSchema.safeParse({ ...validProject, budgetMinor: -1 }).success
      ).toBe(false);
      expect(
        createProjectSchema.safeParse({ ...validProject, budgetMinor: 50000.5 }).success
      ).toBe(false);
    });

    it("rejects absurdly large budgets", () => {
      expect(
        createProjectSchema.safeParse({
          ...validProject,
          budgetMinor: 1_000_000_000_000_001,
        }).success
      ).toBe(false);
    });

    it("rejects negative hourly rates and absurd rates", () => {
      expect(
        createProjectSchema.safeParse({ ...validProject, hourlyRateMinor: -500 }).success
      ).toBe(false);
      expect(
        createProjectSchema.safeParse({ ...validProject, hourlyRateMinor: 100_000_001 }).success
      ).toBe(false);
    });

    it("validates currency format strictly", () => {
      expect(createProjectSchema.safeParse({ ...validProject, currency: "US" }).success).toBe(
        false
      );
      expect(createProjectSchema.safeParse({ ...validProject, currency: "USDD" }).success).toBe(
        false
      );
      expect(createProjectSchema.safeParse({ ...validProject, currency: "123" }).success).toBe(
        false
      );
    });

    it("rejects invalid date formats and non-existent calendar dates", () => {
      expect(
        createProjectSchema.safeParse({ ...validProject, startDate: "2026/06/01" }).success
      ).toBe(false);
      expect(
        createProjectSchema.safeParse({ ...validProject, startDate: "2026-02-31" }).success
      ).toBe(false);
      expect(
        createProjectSchema.safeParse({ ...validProject, originalDeadline: "2026-04-31" }).success
      ).toBe(false);
    });

    it("REJECTS DEADLINE BEFORE START DATE", () => {
      const invalidDates = {
        ...validProject,
        startDate: "2026-06-15",
        originalDeadline: "2026-06-01", // 14 days before start!
      };

      const result = createProjectSchema.safeParse(invalidDates);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toMatch(/original deadline must be on or after/i);
      }
    });

    it("allows originalDeadline to equal startDate", () => {
      const sameDay = {
        ...validProject,
        startDate: "2026-06-01",
        originalDeadline: "2026-06-01",
      };
      expect(createProjectSchema.safeParse(sameDay).success).toBe(true);
    });

    it("validates updateProjectSchema with partial fields", () => {
      expect(updateProjectSchema.safeParse({ name: "Updated Name" }).success).toBe(true);
      expect(updateProjectSchema.safeParse({ budgetMinor: -100 }).success).toBe(false);
      expect(
        updateProjectSchema.safeParse({
          startDate: "2026-08-01",
          originalDeadline: "2026-07-01",
        }).success
      ).toBe(false);
    });
  });

  describe("createDeliverableSchema & updateDeliverableSchema", () => {
    const validDeliverable = {
      projectId: "a0000000-0000-0000-0000-000000000001",
      title: "Homepage Wireframes",
      description: "Low-fidelity wireframes for desktop and mobile",
      estimatedHours: 25,
      status: "pending" as const,
    };

    it("accepts valid deliverable payload", () => {
      expect(createDeliverableSchema.safeParse(validDeliverable).success).toBe(true);
    });

    it("rejects short or empty titles", () => {
      expect(createDeliverableSchema.safeParse({ ...validDeliverable, title: "A" }).success).toBe(
        false
      );
      expect(
        createDeliverableSchema.safeParse({ ...validDeliverable, title: "   " }).success
      ).toBe(false);
    });

    it("rejects negative or absurd hours", () => {
      expect(
        createDeliverableSchema.safeParse({ ...validDeliverable, estimatedHours: -1 }).success
      ).toBe(false);
      expect(
        createDeliverableSchema.safeParse({ ...validDeliverable, estimatedHours: 10001 }).success
      ).toBe(false);
    });

    it("rejects invalid project UUID", () => {
      expect(
        createDeliverableSchema.safeParse({ ...validDeliverable, projectId: "not-a-uuid" }).success
      ).toBe(false);
    });
  });

  describe("createChangeRequestDraftSchema & updateChangeRequestDraftSchema", () => {
    const validDraft = {
      projectId: "a0000000-0000-0000-0000-000000000001",
      title: "Add Stripe Checkout",
      description: "Implement multi-currency credit card processing and webhooks",
      pricingMethod: "hourly" as const,
      estimatedHours: 16.5,
      hourlyRateMinor: 15000,
      proposedDeadline: "2026-10-15",
    };

    it("accepts valid hourly draft", () => {
      expect(createChangeRequestDraftSchema.safeParse(validDraft).success).toBe(true);
    });

    it("accepts valid fixed-fee draft", () => {
      const fixedDraft = {
        projectId: "a0000000-0000-0000-0000-000000000001",
        title: "Brand Style Guide",
        description: "Comprehensive color palette, typography, and logo usage guidelines",
        pricingMethod: "fixed" as const,
        fixedCostMinor: 250000, // $2,500.00
      };
      expect(createChangeRequestDraftSchema.safeParse(fixedDraft).success).toBe(true);
    });

    it("rejects draft title and description that are too short", () => {
      expect(
        createChangeRequestDraftSchema.safeParse({ ...validDraft, title: "A" }).success
      ).toBe(false);
      expect(
        createChangeRequestDraftSchema.safeParse({ ...validDraft, description: "Tiny" }).success
      ).toBe(false);
    });

    it("rejects negative hours, rate, or fixed cost", () => {
      expect(
        createChangeRequestDraftSchema.safeParse({ ...validDraft, estimatedHours: -2 }).success
      ).toBe(false);
      expect(
        createChangeRequestDraftSchema.safeParse({ ...validDraft, hourlyRateMinor: -100 }).success
      ).toBe(false);
      expect(
        createChangeRequestDraftSchema.safeParse({
          ...validDraft,
          pricingMethod: "fixed",
          fixedCostMinor: -50,
        }).success
      ).toBe(false);
    });

    it("rejects absurdly large hours or costs", () => {
      expect(
        createChangeRequestDraftSchema.safeParse({ ...validDraft, estimatedHours: 20000 }).success
      ).toBe(false);
      expect(
        createChangeRequestDraftSchema.safeParse({
          ...validDraft,
          pricingMethod: "fixed",
          fixedCostMinor: 2_000_000_000_000,
        }).success
      ).toBe(false);
    });
  });

  describe("publishChangeRequestSchema", () => {
    const validHourlyPublish = {
      changeRequestId: "b0000000-0000-0000-0000-000000000001",
      title: "Search Autocomplete Feature",
      description: "Elasticsearch backed fuzzy search with keyboard navigation",
      pricingMethod: "hourly" as const,
      estimatedHours: 20,
      hourlyRateMinor: 15000,
      projectStartDate: "2026-06-01",
      proposedDeadline: "2026-09-15",
    };

    const validFixedPublish = {
      changeRequestId: "b0000000-0000-0000-0000-000000000001",
      title: "Security Audit",
      description: "Third-party penetration testing and compliance report",
      pricingMethod: "fixed" as const,
      fixedCostMinor: 500000,
      projectStartDate: "2026-06-01",
      proposedDeadline: "2026-08-01",
    };

    it("accepts valid hourly publish payload", () => {
      expect(publishChangeRequestSchema.safeParse(validHourlyPublish).success).toBe(true);
    });

    it("accepts valid fixed publish payload", () => {
      expect(publishChangeRequestSchema.safeParse(validFixedPublish).success).toBe(true);
    });

    it("rejects hourly publishing when hours or rate are missing", () => {
      const missingHours = { ...validHourlyPublish, estimatedHours: null };
      const missingRate = { ...validHourlyPublish, hourlyRateMinor: null };

      expect(publishChangeRequestSchema.safeParse(missingHours).success).toBe(false);
      expect(publishChangeRequestSchema.safeParse(missingRate).success).toBe(false);
    });

    it("rejects fixed publishing when fixed cost is missing", () => {
      const missingFixed = { ...validFixedPublish, fixedCostMinor: null };
      expect(publishChangeRequestSchema.safeParse(missingFixed).success).toBe(false);
    });

    it("REJECTS PROPOSED DEADLINE BEFORE PROJECT START DATE", () => {
      const invalidDeadline = {
        ...validHourlyPublish,
        projectStartDate: "2026-07-01",
        proposedDeadline: "2026-06-15", // Before start date!
      };

      const result = publishChangeRequestSchema.safeParse(invalidDeadline);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toMatch(
          /proposed deadline must be on or after project start date/i
        );
      }
    });

    it("accepts proposed deadline matching or after project start date", () => {
      const matchingDate = {
        ...validHourlyPublish,
        projectStartDate: "2026-07-01",
        proposedDeadline: "2026-07-01",
      };
      expect(publishChangeRequestSchema.safeParse(matchingDate).success).toBe(true);
    });
  });

  describe("clientDecisionSchema", () => {
    it("accepts approved decision with valid actor name", () => {
      const validApproval = {
        decision: "approved",
        actorName: "Sarah Connor",
        notes: "Approved as discussed in yesterday's call.",
      };
      expect(clientDecisionSchema.safeParse(validApproval).success).toBe(true);
    });

    it("accepts rejected decision with valid actor name", () => {
      const validRejection = {
        decision: "rejected",
        actorName: "John Smith",
        notes: "Budget exhausted for this quarter.",
      };
      expect(clientDecisionSchema.safeParse(validRejection).success).toBe(true);
    });

    it("rejects decisions other than approved or rejected", () => {
      expect(
        clientDecisionSchema.safeParse({ decision: "pending", actorName: "John Smith" }).success
      ).toBe(false);
      expect(
        clientDecisionSchema.safeParse({ decision: "withdrawn", actorName: "John Smith" }).success
      ).toBe(false);
      expect(
        clientDecisionSchema.safeParse({ decision: "accept", actorName: "John Smith" }).success
      ).toBe(false);
    });

    it("rejects actor name shorter than 2 characters", () => {
      expect(
        clientDecisionSchema.safeParse({ decision: "approved", actorName: "J" }).success
      ).toBe(false);
      expect(
        clientDecisionSchema.safeParse({ decision: "approved", actorName: "   " }).success
      ).toBe(false);
    });

    it("rejects actor name longer than 100 characters", () => {
      expect(
        clientDecisionSchema.safeParse({ decision: "approved", actorName: "A".repeat(101) }).success
      ).toBe(false);
    });
  });
});
