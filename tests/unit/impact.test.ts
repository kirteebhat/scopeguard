import { describe, it, expect } from "vitest";
import {
  calculateDeltaDays,
  calculateChangeRequestImpact,
  calculateProjectRollup,
  calculateWorkspaceRollup,
  type ProjectRollupInput,
  type ApprovedVersionSnapshot,
  type PendingProposalSnapshot,
} from "@/lib/domain/impact";

describe("lib/domain/impact", () => {
  describe("calculateDeltaDays", () => {
    it("calculates positive calendar day differences", () => {
      expect(calculateDeltaDays("2026-06-15", "2026-06-01")).toBe(14);
      expect(calculateDeltaDays("2026-06-02", "2026-06-01")).toBe(1);
    });

    it("returns 0 if proposed deadline equals or is earlier than baseline deadline", () => {
      expect(calculateDeltaDays("2026-06-01", "2026-06-01")).toBe(0);
      expect(calculateDeltaDays("2026-05-15", "2026-06-01")).toBe(0);
    });

    it("returns 0 if proposed deadline is null or undefined", () => {
      expect(calculateDeltaDays(null, "2026-06-01")).toBe(0);
      expect(calculateDeltaDays(undefined, "2026-06-01")).toBe(0);
      expect(calculateDeltaDays("", "2026-06-01")).toBe(0);
    });

    it("handles leap year boundaries correctly", () => {
      // 2024 is a leap year (29 days in Feb)
      expect(calculateDeltaDays("2024-03-01", "2024-02-28")).toBe(2);
      // 2025 is a non-leap year (28 days in Feb)
      expect(calculateDeltaDays("2025-03-01", "2025-02-28")).toBe(1);
    });

    it("handles year transition boundaries correctly", () => {
      expect(calculateDeltaDays("2027-01-05", "2026-12-25")).toBe(11);
    });

    it("throws on invalid date string format", () => {
      expect(() => calculateDeltaDays("invalid", "2026-06-01")).toThrow(/invalid date/i);
      expect(() => calculateDeltaDays("2026-06-01", "not-a-date")).toThrow(/invalid date/i);
    });
  });

  describe("calculateChangeRequestImpact", () => {
    it("computes impact for hourly pricing with half-up rounding and deadline delta", () => {
      const impact = calculateChangeRequestImpact({
        pricingMethod: "hourly",
        hours: 12.5,
        hourlyRateMinor: 150000, // ₹1,500.00/hr in paise
        proposedDeadline: "2026-07-15",
        originalDeadline: "2026-07-01",
      });

      expect(impact.costMinor).toBe(1875000); // ₹18,750.00
      expect(impact.deltaDays).toBe(14);
      expect(impact.proposedDeadline).toBe("2026-07-15");
      expect(impact.originalDeadline).toBe("2026-07-01");
    });

    it("computes impact for fixed pricing", () => {
      const impact = calculateChangeRequestImpact({
        pricingMethod: "fixed",
        fixedCostMinor: 450000, // $4,500.00
        proposedDeadline: "2026-08-01",
        originalDeadline: "2026-08-01",
      });

      expect(impact.costMinor).toBe(450000);
      expect(impact.deltaDays).toBe(0);
      expect(impact.proposedDeadline).toBe("2026-08-01");
    });

    it("handles change requests with no proposed deadline extension", () => {
      const impact = calculateChangeRequestImpact({
        pricingMethod: "fixed",
        fixedCostMinor: 10000,
        proposedDeadline: null,
        originalDeadline: "2026-09-01",
      });

      expect(impact.costMinor).toBe(10000);
      expect(impact.deltaDays).toBe(0);
      expect(impact.proposedDeadline).toBeNull();
    });

    it("throws on invalid fixed costs or unsupported pricing methods", () => {
      expect(() =>
        calculateChangeRequestImpact({
          pricingMethod: "fixed",
          fixedCostMinor: -100,
          originalDeadline: "2026-09-01",
        })
      ).toThrow(/non-negative integer/i);

      expect(() =>
        calculateChangeRequestImpact({
          pricingMethod: "invalid" as unknown as "hourly",
          originalDeadline: "2026-09-01",
        })
      ).toThrow(/unsupported pricing method/i);
    });
  });

  describe("calculateProjectRollup", () => {
    const baseProject: ProjectRollupInput = {
      id: "proj-101",
      name: "E-Commerce Replatform",
      currency: "USD",
      budgetMinor: 5000000, // $50,000.00
      originalDeadline: "2026-09-01",
    };

    it("returns baseline project figures when there are no change requests", () => {
      const rollup = calculateProjectRollup(baseProject, []);

      expect(rollup.originalBudgetMinor).toBe(5000000);
      expect(rollup.approvedExtraMinor).toBe(0);
      expect(rollup.revisedBudgetMinor).toBe(5000000);
      expect(rollup.pendingExtraMinor).toBe(0);
      expect(rollup.originalDeadline).toBe("2026-09-01");
      expect(rollup.revisedDeadline).toBe("2026-09-01");
      expect(rollup.deltaDays).toBe(0);
      expect(rollup.approvedVersionsCount).toBe(0);
    });

    it("correctly rolls up multiple approved change requests and advances deadline", () => {
      const approved: ApprovedVersionSnapshot[] = [
        {
          versionId: "ver-1",
          changeRequestId: "cr-1",
          versionNumber: 1,
          costMinor: 250000, // $2,500.00
          currency: "USD",
          proposedDeadline: "2026-09-15",
        },
        {
          versionId: "ver-2",
          changeRequestId: "cr-2",
          versionNumber: 1,
          costMinor: 750000, // $7,500.00
          currency: "USD",
          proposedDeadline: "2026-10-01", // latest
        },
      ];

      const pending: PendingProposalSnapshot[] = [
        {
          changeRequestId: "cr-3",
          costMinor: 150000, // $1,500.00 unapproved
          currency: "USD",
          proposedDeadline: "2026-10-15",
        },
      ];

      const rollup = calculateProjectRollup(baseProject, approved, pending);

      expect(rollup.originalBudgetMinor).toBe(5000000);
      expect(rollup.approvedExtraMinor).toBe(1000000); // 2,500 + 7,500 = $10,000.00
      expect(rollup.revisedBudgetMinor).toBe(6000000); // $60,000.00
      expect(rollup.pendingExtraMinor).toBe(150000); // $1,500.00 (unapproved)
      expect(rollup.revisedDeadline).toBe("2026-10-01");
      expect(rollup.deltaDays).toBe(30); // Sep 1 to Oct 1 = 30 days
      expect(rollup.approvedVersionsCount).toBe(2);
    });

    it("does not regress deadline if approved request proposed earlier date", () => {
      const approved: ApprovedVersionSnapshot[] = [
        {
          versionId: "ver-1",
          changeRequestId: "cr-1",
          versionNumber: 1,
          costMinor: 50000,
          currency: "USD",
          proposedDeadline: "2026-08-15", // Earlier than original deadline (2026-09-01)
        },
      ];

      const rollup = calculateProjectRollup(baseProject, approved);

      expect(rollup.revisedDeadline).toBe("2026-09-01");
      expect(rollup.deltaDays).toBe(0);
    });

    it("PREVENTS DOUBLE COUNTING: duplicate version IDs and multiple approvals per request counted only once", () => {
      const approvedWithDuplicates: ApprovedVersionSnapshot[] = [
        {
          versionId: "ver-1",
          changeRequestId: "cr-1",
          versionNumber: 1,
          costMinor: 250000,
          currency: "USD",
          proposedDeadline: "2026-09-15",
        },
        // Exact same version passed twice (e.g. duplicate join row)
        {
          versionId: "ver-1",
          changeRequestId: "cr-1",
          versionNumber: 1,
          costMinor: 250000,
          currency: "USD",
          proposedDeadline: "2026-09-15",
        },
        // Different version ID but same parent changeRequestId (illegal duplicate approval)
        {
          versionId: "ver-1-alt",
          changeRequestId: "cr-1",
          versionNumber: 2,
          costMinor: 300000,
          currency: "USD",
          proposedDeadline: "2026-09-20",
        },
      ];

      const rollup = calculateProjectRollup(baseProject, approvedWithDuplicates);

      // Should count cr-1 exactly once ($2,500.00)
      expect(rollup.approvedExtraMinor).toBe(250000);
      expect(rollup.revisedBudgetMinor).toBe(5250000);
      expect(rollup.approvedVersionsCount).toBe(1);
    });

    it("PREVENTS DOUBLE COUNTING: excludes change request from pending if it is already approved", () => {
      const approved: ApprovedVersionSnapshot[] = [
        {
          versionId: "ver-1",
          changeRequestId: "cr-1",
          versionNumber: 1,
          costMinor: 200000,
          currency: "USD",
        },
      ];

      const pending: PendingProposalSnapshot[] = [
        // Same change request mistakenly in pending list
        {
          changeRequestId: "cr-1",
          costMinor: 200000,
          currency: "USD",
        },
        // Distinct pending change request
        {
          changeRequestId: "cr-2",
          costMinor: 100000,
          currency: "USD",
        },
      ];

      const rollup = calculateProjectRollup(baseProject, approved, pending);

      expect(rollup.approvedExtraMinor).toBe(200000);
      expect(rollup.pendingExtraMinor).toBe(100000); // cr-1 excluded from pending
    });

    it("ENFORCES MULTI-CURRENCY BOUNDARY: throws error if currency mismatches", () => {
      const mismatchedApproved: ApprovedVersionSnapshot[] = [
        {
          versionId: "ver-inr",
          changeRequestId: "cr-inr",
          versionNumber: 1,
          costMinor: 500000,
          currency: "INR", // Mismatched with USD baseProject
        },
      ];

      expect(() => calculateProjectRollup(baseProject, mismatchedApproved)).toThrow(
        /currency mismatch/i
      );

      const mismatchedPending: PendingProposalSnapshot[] = [
        {
          changeRequestId: "cr-eur",
          costMinor: 50000,
          currency: "EUR",
        },
      ];

      expect(() => calculateProjectRollup(baseProject, [], mismatchedPending)).toThrow(
        /currency mismatch/i
      );
    });
  });

  describe("calculateWorkspaceRollup", () => {
    it("groups workspace projects strictly by currency without cross-currency summation", () => {
      const projectRollups = [
        // USD Project 1
        {
          projectId: "p1",
          currency: "USD",
          originalBudgetMinor: 5000000,
          approvedExtraMinor: 1000000,
          revisedBudgetMinor: 6000000,
          pendingExtraMinor: 50000,
          originalDeadline: "2026-09-01",
          revisedDeadline: "2026-09-15",
          deltaDays: 14,
          approvedVersionsCount: 2,
        },
        // USD Project 2
        {
          projectId: "p2",
          currency: "USD",
          originalBudgetMinor: 2000000,
          approvedExtraMinor: 500000,
          revisedBudgetMinor: 2500000,
          pendingExtraMinor: 0,
          originalDeadline: "2026-10-01",
          revisedDeadline: "2026-10-01",
          deltaDays: 0,
          approvedVersionsCount: 1,
        },
        // INR Project 3
        {
          projectId: "p3",
          currency: "INR",
          originalBudgetMinor: 150000000, // ₹1,500,000.00
          approvedExtraMinor: 1875000, // ₹18,750.00
          revisedBudgetMinor: 151875000,
          pendingExtraMinor: 500000,
          originalDeadline: "2026-12-01",
          revisedDeadline: "2026-12-15",
          deltaDays: 14,
          approvedVersionsCount: 1,
        },
      ];

      const workspaceRollup = calculateWorkspaceRollup(projectRollups);

      expect(workspaceRollup).toHaveLength(2);

      const inrGroup = workspaceRollup.find((g) => g.currency === "INR");
      expect(inrGroup).toBeDefined();
      expect(inrGroup?.originalBudgetMinor).toBe(150000000);
      expect(inrGroup?.approvedExtraMinor).toBe(1875000);
      expect(inrGroup?.revisedBudgetMinor).toBe(151875000);
      expect(inrGroup?.activeProjectCount).toBe(1);
      expect(inrGroup?.approvedChangesCount).toBe(1);

      const usdGroup = workspaceRollup.find((g) => g.currency === "USD");
      expect(usdGroup).toBeDefined();
      expect(usdGroup?.originalBudgetMinor).toBe(7000000); // 5M + 2M
      expect(usdGroup?.approvedExtraMinor).toBe(1500000); // 1M + 0.5M
      expect(usdGroup?.revisedBudgetMinor).toBe(8500000);
      expect(usdGroup?.activeProjectCount).toBe(2);
      expect(usdGroup?.approvedChangesCount).toBe(3);
    });

    it("returns empty array when there are no projects", () => {
      expect(calculateWorkspaceRollup([])).toEqual([]);
    });
  });
});
