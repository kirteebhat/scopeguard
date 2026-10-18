import { formatMinorToCurrency } from "./money";
import type { ChangeRequestItem } from "@/lib/data/change-requests";

/**
 * Escapes a cell value conforming to RFC 4180 with CSV Injection protection.
 */
export function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }

  let str = String(value);

  // Security: Prevent CSV formula injection in spreadsheet viewers
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // If the cell contains quotes, commas, or newlines, wrap in quotes and escape quotes
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

export interface CsvExportOptions {
  projectName: string;
  clientName: string;
  currency: string;
}

/**
 * Formats a project's change request history into standard, safe CSV.
 * STRICT SECURITY GUARANTEE: Does NOT include internal notes under any circumstance.
 */
export function generateProjectChangesCsv(
  changes: ChangeRequestItem[],
  options: CsvExportOptions
): string {
  const headers = [
    "Change ID",
    "Title",
    "Deliverable",
    "Status",
    "Version",
    "Pricing Method",
    "Estimated Hours",
    "Hourly Rate",
    "Additional Cost Minor",
    "Formatted Cost",
    "Currency",
    "Proposed Deadline",
    "Scope Description",
    "Created Date",
  ];

  const rows = changes.map((cr) => {
    const formattedRate = cr.hourlyRateMinor
      ? formatMinorToCurrency(cr.hourlyRateMinor, options.currency)
      : "";
    const formattedCost = formatMinorToCurrency(cr.costMinor, options.currency);

    return [
      escapeCsvCell(cr.id),
      escapeCsvCell(cr.title),
      escapeCsvCell(cr.deliverableTitle || "Unlinked"),
      escapeCsvCell(cr.status),
      escapeCsvCell(cr.currentVersion ? `v${cr.currentVersion}` : "Draft"),
      escapeCsvCell(cr.pricingMethod),
      escapeCsvCell(cr.estimatedHours ?? ""),
      escapeCsvCell(formattedRate),
      escapeCsvCell(cr.costMinor),
      escapeCsvCell(formattedCost),
      escapeCsvCell(options.currency),
      escapeCsvCell(cr.proposedDeadline || "No deadline shift"),
      escapeCsvCell(cr.description),
      escapeCsvCell(cr.createdAt ? new Date(cr.createdAt).toISOString().split("T")[0] : ""),
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\r\n");
}

