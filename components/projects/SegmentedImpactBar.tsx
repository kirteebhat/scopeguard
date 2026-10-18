"use client";

import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { formatMinorToCurrency } from "@/lib/domain/money";
import { cn } from "@/lib/utils";

export interface SegmentedImpactBarProps {
  baselineAmount: number;
  approvedAmount?: number;
  pendingAmount?: number;
  currency?: string;
  className?: string;
  showLegend?: boolean;
  compact?: boolean;
}

/**
 * SegmentedImpactBar
 * Visualizes Baseline Contract Budget (indigo), Approved Scope (emerald),
 * and Pending Proposals (amber striped) with smooth animated fill.
 */
export function SegmentedImpactBar({
  baselineAmount,
  approvedAmount = 0,
  pendingAmount = 0,
  currency = "USD",
  className,
  showLegend = true,
  compact = false,
}: SegmentedImpactBarProps) {
  const shouldReduce = useReducedMotion();

  const total = Math.max(baselineAmount + approvedAmount + pendingAmount, 1);
  const baselinePct = (baselineAmount / total) * 100;
  const approvedPct = (approvedAmount / total) * 100;
  const pendingPct = (pendingAmount / total) * 100;

  const duration = shouldReduce ? 0 : 0.6;
  const ease = [0.16, 1, 0.3, 1] as const;

  return (
    <div className={cn("w-full space-y-2.5", className)}>
      {/* Visual Multi-Segment Bar */}
      <div
        role="progressbar"
        aria-label="Budget Breakdown"
        aria-valuemin={0}
        aria-valuenow={baselineAmount + approvedAmount}
        aria-valuemax={total}
        className={cn(
          "flex w-full overflow-hidden rounded-full bg-slate-100 p-0.5 shadow-inner dark:bg-slate-800",
          compact ? "h-2.5" : "h-3.5"
        )}
      >
        {/* Baseline segment */}
        {baselinePct > 0 && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${baselinePct}%` }}
            transition={{ duration, ease }}
            className="h-full rounded-l-full bg-indigo-600 transition-colors dark:bg-indigo-500"
            title={`Baseline: ${formatMinorToCurrency(baselineAmount, currency)} (${baselinePct.toFixed(1)}%)`}
          />
        )}

        {/* Approved Extra Scope segment */}
        {approvedPct > 0 && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${approvedPct}%` }}
            transition={{ duration, ease, delay: shouldReduce ? 0 : 0.15 }}
            className={cn(
              "h-full bg-emerald-500 transition-colors dark:bg-emerald-400",
              baselinePct === 0 && "rounded-l-full",
              pendingPct === 0 && "rounded-r-full"
            )}
            title={`Approved: +${formatMinorToCurrency(approvedAmount, currency)} (+${approvedPct.toFixed(1)}%)`}
          />
        )}

        {/* Pending Review Scope segment */}
        {pendingPct > 0 && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pendingPct}%` }}
            transition={{ duration, ease, delay: shouldReduce ? 0 : 0.3 }}
            className="h-full rounded-r-full bg-amber-400 bg-[linear-gradient(45deg,rgba(255,255,255,0.25)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.25)_50%,rgba(255,255,255,0.25)_75%,transparent_75%,transparent)] bg-[length:12px_12px] transition-colors dark:bg-amber-500"
            title={`Pending: +${formatMinorToCurrency(pendingAmount, currency)} (+${pendingPct.toFixed(1)}%)`}
          />
        )}
      </div>

      {/* Legend & Amounts */}
      {showLegend && (
        <div className="flex flex-wrap items-center justify-between gap-y-1.5 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {/* Baseline legend */}
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-500" />
              <span>Baseline:</span>
              <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-200">
                {formatMinorToCurrency(baselineAmount, currency)}
              </span>
            </div>

            {/* Approved legend */}
            {approvedAmount > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                <span>Approved:</span>
                <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  +{formatMinorToCurrency(approvedAmount, currency)}
                </span>
              </div>
            )}

            {/* Pending legend */}
            {pendingAmount > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400 dark:bg-amber-500" />
                <span>Pending:</span>
                <span className="font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                  +{formatMinorToCurrency(pendingAmount, currency)}
                </span>
              </div>
            )}
          </div>

          <div className="font-medium tabular-nums text-slate-700 dark:text-slate-300">
            Total:{" "}
            <span className="font-bold text-slate-900 dark:text-white">
              {formatMinorToCurrency(baselineAmount + approvedAmount, currency)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
