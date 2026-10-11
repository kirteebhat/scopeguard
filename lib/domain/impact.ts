/**
 * Pure, framework-free impact and project rollup calculations for ScopeGuard.
 * Zero external dependencies. Zero floating-point arithmetic.
 * Strictly adheres to docs/04-calculation-rules.md.
 */

import { calculateHourlyCost } from "./money";

export interface ChangeRequestImpactInput {
  pricingMethod: "hourly" | "fixed";
  hours?: number | null;
  hourlyRateMinor?: number | null;
  fixedCostMinor?: number | null;
  proposedDeadline?: string | null;
  originalDeadline: string;
}

export interface ChangeRequestImpact {
  costMinor: number;
  proposedDeadline: string | null;
  originalDeadline: string;
  deltaDays: number;
}

export interface ProjectRollupInput {
  id: string;
  name: string;
  currency: string;
  budgetMinor: number;
  originalDeadline: string; // YYYY-MM-DD
}

export interface ApprovedVersionSnapshot {
  versionId: string;
  changeRequestId: string;
  versionNumber: number;
  costMinor: number;
  currency: string;
  proposedDeadline?: string | null;
  approvedAt?: string;
}

export interface PendingProposalSnapshot {
  changeRequestId: string;
  costMinor: number;
  currency: string;
  proposedDeadline?: string | null;
}

export interface ProjectFinancialRollup {
  projectId: string;
  currency: string;
  originalBudgetMinor: number;
  approvedExtraMinor: number;
  revisedBudgetMinor: number;
  pendingExtraMinor: number;
  originalDeadline: string;
  revisedDeadline: string;
  deltaDays: number;
  approvedVersionsCount: number;
}

export interface CurrencyMetricRollup {
  currency: string;
  originalBudgetMinor: number;
  approvedExtraMinor: number;
  revisedBudgetMinor: number;
  pendingExtraMinor: number;
  activeProjectCount: number;
  approvedChangesCount: number;
}

/**
 * Parses a YYYY-MM-DD date string to UTC midnight milliseconds.
 * Prevents daylight saving time shifts and timezone drift.
 */
export function parseDateToUtcMidnight(dateStr: string): number {
  if (typeof dateStr !== "string") {
    throw new Error("Date must be a string in YYYY-MM-DD format");
  }

  const parts = dateStr.trim().split("-").map((p) => parseInt(p, 10));
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    throw new Error(`Invalid date format: "${dateStr}". Expected YYYY-MM-DD.`);
  }

  const [year, month, day] = parts;
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`Date out of range: "${dateStr}".`);
  }

  return Date.UTC(year, month - 1, day);
}

/**
 * Calculates calendar day difference between a proposed deadline and a baseline deadline.
 *
 * Rules:
 *   - If proposedDeadline is null/undefined or <= baselineDeadline, deltaDays = 0.
 *   - Otherwise returns exact positive calendar days difference.
 */
export function calculateDeltaDays(
  proposedDeadline: string | null | undefined,
  baselineDeadline: string
): number {
  if (!proposedDeadline) {
    return 0;
  }

  const proposedUtc = parseDateToUtcMidnight(proposedDeadline);
  const baselineUtc = parseDateToUtcMidnight(baselineDeadline);

  if (proposedUtc <= baselineUtc) {
    return 0;
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((proposedUtc - baselineUtc) / msPerDay);
}

/**
 * Calculates a change request's financial cost, proposed deadline, and timeline delta.
 */
export function calculateChangeRequestImpact(
  input: ChangeRequestImpactInput
): ChangeRequestImpact {
  let costMinor = 0;

  if (input.pricingMethod === "hourly") {
    const hours = input.hours ?? 0;
    const rateMinor = input.hourlyRateMinor ?? 0;
    costMinor = calculateHourlyCost(hours, rateMinor);
  } else if (input.pricingMethod === "fixed") {
    const fixedCost = input.fixedCostMinor ?? 0;
    if (fixedCost < 0 || !Number.isInteger(fixedCost)) {
      throw new Error("Fixed cost in minor units must be a non-negative integer");
    }
    costMinor = fixedCost;
  } else {
    throw new Error(`Unsupported pricing method: "${input.pricingMethod}"`);
  }

  const deltaDays = calculateDeltaDays(input.proposedDeadline, input.originalDeadline);

  return {
    costMinor,
    proposedDeadline: input.proposedDeadline || null,
    originalDeadline: input.originalDeadline,
    deltaDays,
  };
}

/**
 * Calculates project totals rollup from immutable approved version snapshots.
 *
 * Strict Guarantees:
 *  1. Counting each approved VERSION exactly once (deduplicates duplicate version IDs).
 *  2. Deduplicates multiple approvals for the same changeRequestId to avoid double counting.
 *  3. Computes revised deadline = max(original_deadline, all approved proposed_deadlines).
 *  4. Enforces currency consistency across the project boundary.
 */
export function calculateProjectRollup(
  project: ProjectRollupInput,
  approvedVersions: ApprovedVersionSnapshot[],
  pendingProposals: PendingProposalSnapshot[] = []
): ProjectFinancialRollup {
  if (project.budgetMinor < 0 || !Number.isInteger(project.budgetMinor)) {
    throw new Error("Project budget minor units must be a non-negative integer");
  }

  const projectCurrency = project.currency.toUpperCase().trim();

  // Deduplicate approved versions: each approved version and change request counted at most once
  const seenVersionIds = new Set<string>();
  const seenChangeRequestIds = new Set<string>();
  const uniqueApprovedVersions: ApprovedVersionSnapshot[] = [];

  for (const v of approvedVersions) {
    if (seenVersionIds.has(v.versionId) || seenChangeRequestIds.has(v.changeRequestId)) {
      continue; // Duplicate record ignored to prevent double counting
    }

    if (v.currency.toUpperCase().trim() !== projectCurrency) {
      throw new Error(
        `Currency mismatch: Approved version ${v.versionId} has currency ${v.currency}, but project requires ${projectCurrency}.`
      );
    }

    if (v.costMinor < 0 || !Number.isInteger(v.costMinor)) {
      throw new Error(`Approved version ${v.versionId} has invalid cost minor units.`);
    }

    seenVersionIds.add(v.versionId);
    seenChangeRequestIds.add(v.changeRequestId);
    uniqueApprovedVersions.push(v);
  }

  // Sum approved extra minor units
  const approvedExtraMinor = uniqueApprovedVersions.reduce(
    (sum, v) => sum + v.costMinor,
    0
  );

  const revisedBudgetMinor = project.budgetMinor + approvedExtraMinor;

  // Deduplicate pending proposals (ignore any that are already approved)
  const seenPendingRequestIds = new Set<string>();
  let pendingExtraMinor = 0;

  for (const p of pendingProposals) {
    if (seenChangeRequestIds.has(p.changeRequestId)) {
      continue; // Already approved, do not count in pending
    }

    if (seenPendingRequestIds.has(p.changeRequestId)) {
      continue; // Duplicate pending proposal ignored
    }

    if (p.currency.toUpperCase().trim() !== projectCurrency) {
      throw new Error(
        `Currency mismatch: Pending proposal for ${p.changeRequestId} has currency ${p.currency}, but project requires ${projectCurrency}.`
      );
    }

    if (p.costMinor < 0 || !Number.isInteger(p.costMinor)) {
      throw new Error(`Pending proposal has invalid cost minor units.`);
    }

    seenPendingRequestIds.add(p.changeRequestId);
    pendingExtraMinor += p.costMinor;
  }

  // Revised deadline: latest among originalDeadline and all approved proposedDeadlines
  let latestDeadlineUtc = parseDateToUtcMidnight(project.originalDeadline);
  let revisedDeadline = project.originalDeadline;

  for (const v of uniqueApprovedVersions) {
    if (v.proposedDeadline) {
      const vUtc = parseDateToUtcMidnight(v.proposedDeadline);
      if (vUtc > latestDeadlineUtc) {
        latestDeadlineUtc = vUtc;
        revisedDeadline = v.proposedDeadline;
      }
    }
  }

  const deltaDays = calculateDeltaDays(revisedDeadline, project.originalDeadline);

  return {
    projectId: project.id,
    currency: projectCurrency,
    originalBudgetMinor: project.budgetMinor,
    approvedExtraMinor,
    revisedBudgetMinor,
    pendingExtraMinor,
    originalDeadline: project.originalDeadline,
    revisedDeadline,
    deltaDays,
    approvedVersionsCount: uniqueApprovedVersions.length,
  };
}

/**
 * Aggregates project rollups grouped strictly by currency.
 * Never sums across distinct currencies without foreign exchange conversion.
 */
export function calculateWorkspaceRollup(
  projectRollups: ProjectFinancialRollup[]
): CurrencyMetricRollup[] {
  const groups = new Map<string, CurrencyMetricRollup>();

  for (const p of projectRollups) {
    const cur = p.currency.toUpperCase().trim();
    const existing = groups.get(cur);

    if (existing) {
      existing.originalBudgetMinor += p.originalBudgetMinor;
      existing.approvedExtraMinor += p.approvedExtraMinor;
      existing.revisedBudgetMinor += p.revisedBudgetMinor;
      existing.pendingExtraMinor += p.pendingExtraMinor;
      existing.activeProjectCount += 1;
      existing.approvedChangesCount += p.approvedVersionsCount;
    } else {
      groups.set(cur, {
        currency: cur,
        originalBudgetMinor: p.originalBudgetMinor,
        approvedExtraMinor: p.approvedExtraMinor,
        revisedBudgetMinor: p.revisedBudgetMinor,
        pendingExtraMinor: p.pendingExtraMinor,
        activeProjectCount: 1,
        approvedChangesCount: p.approvedVersionsCount,
      });
    }
  }

  return Array.from(groups.values()).sort((a, b) => a.currency.localeCompare(b.currency));
}
