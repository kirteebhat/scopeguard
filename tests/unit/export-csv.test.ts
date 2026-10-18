import { describe, it, expect } from "vitest";
import { escapeCsvCell, generateProjectChangesCsv } from "@/lib/domain/exportCsv";
import type { ChangeRequestItem } from "@/lib/data/change-requests";

describe("CSV Export Domain Logic", () => {
  describe("escapeCsvCell", () => {
    it("handles null and undefined gracefully", () => {
      expect(escapeCsvCell(null)).toBe("");
      expect(escapeCsvCell(undefined)).toBe("");
    });

    it("leaves standard alphanumeric text unaltered", () => {
      expect(escapeCsvCell("Frontend Redesign")).toBe("Frontend Redesign");
      expect(escapeCsvCell(1234)).toBe("1234");
    });

    it("wraps cells with commas or quotes in double quotes and escapes internal quotes", () => {
      expect(escapeCsvCell("Scope, Addition")).toBe('"Scope, Addition"');
      expect(escapeCsvCell('Phase 2: "Urgent" Revision')).toBe('"Phase 2: ""Urgent"" Revision"');
    });

    it("protects against CSV injection attacks (=, +, -, @)", () => {
      expect(escapeCsvCell("=SUM(A1:A10)")).toBe("'=SUM(A1:A10)");
      expect(escapeCsvCell("+cmd|' /C calc'!A0")).toBe("'+cmd|' /C calc'!A0");
      expect(escapeCsvCell("@dangerous")).toBe("'@dangerous");
      expect(escapeCsvCell("-100")).toBe("'-100");
    });
  });

  describe("generateProjectChangesCsv", () => {
    const mockChanges: ChangeRequestItem[] = [
      {
        id: "cr-101",
        projectId: "proj-1",
        title: "Add Stripe Payments Integration",
        description: "Implement checkout workflow with webhook listeners",
        reason: "Client request",
        affectedDeliverableId: "deliv-1",
        deliverableTitle: "Payment Gateway",
        pricingMethod: "hourly",
        estimatedHours: 20,
        hourlyRateMinor: 10000, // 100.00
        costMinor: 200000, // 2,000.00
        proposedDeadline: "2026-11-15",
        internalNotes: "CONFIDENTIAL: Client might push back on hours; keep margin buffer",
        status: "approved",
        currentVersion: 1,
        createdAt: "2026-10-18T10:00:00Z",
        updatedAt: "2026-10-18T11:00:00Z",
        createdBy: "user-1",
      },
      {
        id: "cr-102",
        projectId: "proj-1",
        title: "Export Feature, Extended",
        description: "Add CSV and PDF export capability",
        reason: null,
        affectedDeliverableId: null,
        deliverableTitle: null,
        pricingMethod: "fixed",
        estimatedHours: null,
        hourlyRateMinor: null,
        costMinor: 50000,
        proposedDeadline: null,
        internalNotes: "DO NOT SHARE: Agency contractor cost is 30,000",
        status: "draft",
        currentVersion: null,
        createdAt: "2026-10-18T12:00:00Z",
        updatedAt: "2026-10-18T12:00:00Z",
        createdBy: "user-1",
      },
    ];

    it("generates correct CSV headers and data rows", () => {
      const csv = generateProjectChangesCsv(mockChanges, {
        projectName: "Acme Web App",
        clientName: "Acme Corp",
        currency: "USD",
      });

      const lines = csv.split("\r\n");
      expect(lines.length).toBe(3); // Header + 2 data rows

      // Check header row
      expect(lines[0]).toContain("Change ID,Title,Deliverable,Status,Version,Pricing Method");

      // Check first data row
      expect(lines[1]).toContain("cr-101");
      expect(lines[1]).toContain("Add Stripe Payments Integration");
      expect(lines[1]).toContain("approved");
      expect(lines[1]).toContain("v1");

      // Check second data row (with comma in title escaping)
      expect(lines[2]).toContain("cr-102");
      expect(lines[2]).toContain('"Export Feature, Extended"');
      expect(lines[2]).toContain("draft");
      expect(lines[2]).toContain("Draft");
    });

    it("NEVER leaks confidential internal notes into CSV output", () => {
      const csv = generateProjectChangesCsv(mockChanges, {
        projectName: "Acme Web App",
        clientName: "Acme Corp",
        currency: "USD",
      });

      expect(csv).not.toContain("CONFIDENTIAL");
      expect(csv).not.toContain("DO NOT SHARE");
      expect(csv).not.toContain("keep margin buffer");
      expect(csv).not.toContain("Agency contractor cost");
    });
  });
});
