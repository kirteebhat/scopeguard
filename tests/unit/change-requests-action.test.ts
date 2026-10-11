import { describe, it, expect } from "vitest";
import {
  clientChangeRequestFormSchema,
  createChangeRequestDraftSchema,
  updateChangeRequestDraftSchema,
} from "@/lib/validation/change-request";
import { parseDecimalToMinor, calculateHourlyCost, formatMinorToCurrency } from "@/lib/domain/money";

describe("Change Request Validation & Form Processing", () => {
  describe("clientChangeRequestFormSchema", () => {
    const testProjectId = "a0000000-0000-0000-0000-000000000001";

    const validHourlyData = {
      projectId: testProjectId,
      title: "Add Stripe Subscription Billing",
      description: "Implement recurrent subscription billing tiers, webhooks, and customer billing portal.",
      reason: "Client requested automated billing renewals.",
      pricingMethod: "hourly" as const,
      hours: "12.5",
      hourlyRate: "150.00",
      additionalDays: "5",
      proposedDeadline: "2026-11-15",
      internalNotes: "Estimate includes 2.5h buffer for Stripe webhook edge cases.",
    };

    it("accepts valid hourly form data with all fields", () => {
      const result = clientChangeRequestFormSchema.safeParse(validHourlyData);
      expect(result.success).toBe(true);
    });

    it("accepts valid fixed-fee form data", () => {
      const fixedData = {
        projectId: testProjectId,
        title: "Security & Penetration Audit",
        description: "Third-party OWASP compliance assessment and vulnerability remediation report.",
        reason: "Pre-launch investor compliance requirement.",
        pricingMethod: "fixed" as const,
        fixedCost: "3500.00",
        proposedDeadline: "2026-11-20",
        internalNotes: "Fixed quote from partner agency.",
      };
      const result = clientChangeRequestFormSchema.safeParse(fixedData);
      expect(result.success).toBe(true);
    });

    it("rejects hourly pricing without valid hours or rate", () => {
      const missingHours = {
        ...validHourlyData,
        hours: "",
      };
      const result1 = clientChangeRequestFormSchema.safeParse(missingHours);
      expect(result1.success).toBe(false);

      const negativeHours = {
        ...validHourlyData,
        hours: "-5.0",
      };
      const result2 = clientChangeRequestFormSchema.safeParse(negativeHours);
      expect(result2.success).toBe(false);

      const excessiveHours = {
        ...validHourlyData,
        hours: "15000",
      };
      const result3 = clientChangeRequestFormSchema.safeParse(excessiveHours);
      expect(result3.success).toBe(false);

      const missingRate = {
        ...validHourlyData,
        hourlyRate: "",
      };
      const result4 = clientChangeRequestFormSchema.safeParse(missingRate);
      expect(result4.success).toBe(false);
    });

    it("rejects fixed pricing without fixedCost", () => {
      const missingCost = {
        projectId: testProjectId,
        title: "Custom Data Migration",
        description: "Migrate legacy MySQL records into PostgreSQL schema.",
        pricingMethod: "fixed" as const,
        fixedCost: "",
      };
      const result = clientChangeRequestFormSchema.safeParse(missingCost);
      expect(result.success).toBe(false);
    });

    it("rejects titles and descriptions that are too short", () => {
      const shortTitle = {
        ...validHourlyData,
        title: "A",
      };
      expect(clientChangeRequestFormSchema.safeParse(shortTitle).success).toBe(false);

      const shortDesc = {
        ...validHourlyData,
        description: "Hi",
      };
      expect(clientChangeRequestFormSchema.safeParse(shortDesc).success).toBe(false);
    });

    it("rejects invalid calendar date formats for proposedDeadline", () => {
      const invalidDateFormat = {
        ...validHourlyData,
        proposedDeadline: "15-11-2026",
      };
      expect(clientChangeRequestFormSchema.safeParse(invalidDateFormat).success).toBe(false);

      const invalidDay = {
        ...validHourlyData,
        proposedDeadline: "2026-02-31", // Non-existent date
      };
      expect(clientChangeRequestFormSchema.safeParse(invalidDay).success).toBe(false);
    });

    it("handles optional deliverable UUID and converts empty string cleanly", () => {
      const withDeliverable = {
        ...validHourlyData,
        deliverableId: "550e8400-e29b-41d4-a716-446655440000",
      };
      expect(clientChangeRequestFormSchema.safeParse(withDeliverable).success).toBe(true);

      const withEmptyDeliverable = {
        ...validHourlyData,
        deliverableId: "",
      };
      expect(clientChangeRequestFormSchema.safeParse(withEmptyDeliverable).success).toBe(true);

      const withInvalidDeliverable = {
        ...validHourlyData,
        deliverableId: "invalid-uuid",
      };
      expect(clientChangeRequestFormSchema.safeParse(withInvalidDeliverable).success).toBe(false);
    });
  });

  describe("Server-side Schema Minor Unit Conversion", () => {
    it("parses decimal hours and rates accurately without floating point distortion", () => {
      const hours = 12.5;
      const rateMinor = parseDecimalToMinor("175.50"); // 17550 cents
      const calculatedCost = calculateHourlyCost(hours, rateMinor);

      // 12.5 * 17550 = 219375 cents = $2,193.75
      expect(calculatedCost).toBe(219375);
      expect(formatMinorToCurrency(calculatedCost, "USD")).toBe("$2,193.75");
    });

    it("converts fixedCost decimal to integer minor units", () => {
      const fixedCostMinor = parseDecimalToMinor("4999.99");
      expect(fixedCostMinor).toBe(499999);
      expect(formatMinorToCurrency(fixedCostMinor, "USD")).toBe("$4,999.99");
    });

    it("verifies createChangeRequestDraftSchema rejects negative minor units and invalid UUIDs", () => {
      const invalidCostDraft = {
        projectId: "550e8400-e29b-41d4-a716-446655440000",
        title: "Emergency Server Scaling",
        description: "Increase EC2 instances and set up autoscaling alarms.",
        pricingMethod: "fixed" as const,
        fixedCostMinor: -5000,
      };
      expect(createChangeRequestDraftSchema.safeParse(invalidCostDraft).success).toBe(false);

      const invalidProjectDraft = {
        ...invalidCostDraft,
        fixedCostMinor: 50000,
        projectId: "not-a-valid-uuid",
      };
      expect(createChangeRequestDraftSchema.safeParse(invalidProjectDraft).success).toBe(false);
    });

    it("verifies updateChangeRequestDraftSchema preserves partial updates", () => {
      const partialUpdate = {
        title: "Updated Scope for Mobile App",
        estimatedHours: 8.0,
      };
      const result = updateChangeRequestDraftSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });
  });
});
