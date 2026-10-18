"use client";

import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { formatMinorToCurrency } from "@/lib/domain/money";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Calculator, TrendingUp, Calendar, AlertCircle } from "lucide-react";

interface LiveImpactPanelProps {
  pricingMethod: "hourly" | "fixed";
  hours: number;
  rateMinor: number;
  fixedCostMinor: number;
  costMinor: number;
  currency: string;
  originalBudgetMinor: number;
  approvedExtraMinor: number;
  originalDeadline: string;
  proposedDeadline: string | null;
  deltaDays: number;
}

export function LiveImpactPanel({
  pricingMethod,
  hours,
  rateMinor,
  costMinor,
  currency,
  originalBudgetMinor,
  approvedExtraMinor,
  originalDeadline,
  proposedDeadline,
  deltaDays,
}: LiveImpactPanelProps) {
  const shouldReduceMotion = useReducedMotion();
  const currentTotalMinor = originalBudgetMinor + approvedExtraMinor;
  const estimatedNewTotalMinor = currentTotalMinor + costMinor;

  const formattedRate = formatMinorToCurrency(rateMinor, currency);
  const formattedCost = formatMinorToCurrency(costMinor, currency);
  const formattedCurrentTotal = formatMinorToCurrency(currentTotalMinor, currency);
  const formattedNewTotal = formatMinorToCurrency(estimatedNewTotalMinor, currency);

  const formulaText =
    pricingMethod === "hourly"
      ? `${hours} h × ${formattedRate} = ${formattedCost}`
      : `Fixed scope charge = ${formattedCost}`;

  return (
    <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-white shadow-xs" id="liveImpactPanel">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Calculator className="w-4 h-4 text-indigo-600" />
            Live Impact Analysis
          </CardTitle>
          <Badge variant="warning" className="uppercase tracking-wider text-[10px]">
            Estimate (Unapproved)
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Transparent Formula Display */}
        <div className="p-3 bg-white rounded-lg border border-indigo-100/80 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
            Pricing Calculation
          </span>
          <p className="text-base font-bold text-indigo-950 font-mono mt-0.5" id="impactFormulaDisplay">
            <motion.span
              key={formulaText}
              initial={shouldReduceMotion ? false : { opacity: 0.5, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="inline-block"
            >
              {formulaText}
            </motion.span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Calculated with deterministic half-up rounding in integer minor units.
          </p>
        </div>

        {/* Budget & Timeline Effects */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Budget Impact */}
          <div className="p-3 bg-white rounded-lg border border-slate-200/80 space-y-1.5">
            <div className="flex items-center gap-1.5 text-slate-600 font-medium">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>Budget Effect</span>
            </div>
            <div className="flex justify-between items-center text-slate-500 text-[11px]">
              <span>Current Project Total:</span>
              <span className="font-semibold text-slate-700">{formattedCurrentTotal}</span>
            </div>
            <div className="flex justify-between items-center text-indigo-700 text-[11px] font-medium">
              <span>Proposed Addition:</span>
              <motion.span
                key={formattedCost}
                initial={shouldReduceMotion ? false : { opacity: 0.5, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                +{formattedCost}
              </motion.span>
            </div>
            <div className="pt-1.5 border-t border-slate-100 flex justify-between items-center font-bold text-slate-900">
              <span>Estimated Revised Total:</span>
              <motion.span
                key={formattedNewTotal}
                initial={shouldReduceMotion ? false : { opacity: 0.5, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="text-sm text-indigo-950"
              >
                {formattedNewTotal}
              </motion.span>
            </div>
          </div>

          {/* Timeline Impact */}
          <div className="p-3 bg-white rounded-lg border border-slate-200/80 space-y-1.5">
            <div className="flex items-center gap-1.5 text-slate-600 font-medium">
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              <span>Timeline Effect</span>
            </div>
            <div className="flex justify-between items-center text-slate-500 text-[11px]">
              <span>Baseline Deadline:</span>
              <span className="font-semibold text-slate-700">{originalDeadline}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500 text-[11px]">
              <span>Proposed Milestone:</span>
              <span className="font-semibold text-slate-700">
                {proposedDeadline || originalDeadline}
              </span>
            </div>
            <div className="pt-1.5 border-t border-slate-100 flex justify-between items-center font-bold text-slate-900">
              <span>Schedule Shift:</span>
              <motion.span
                key={deltaDays}
                initial={shouldReduceMotion ? false : { opacity: 0.5, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className={`text-xs px-2 py-0.5 rounded font-semibold inline-block ${
                  deltaDays > 0
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "text-slate-600"
                }`}
                id="impactDeltaDaysDisplay"
              >
                {deltaDays > 0 ? `+${deltaDays} calendar days` : "No schedule change"}
              </motion.span>
            </div>
          </div>
        </div>

        {/* Legal / Operational Notice */}
        <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/60 text-amber-900 text-[11px] flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong>Uncommitted Baseline:</strong> This calculation is for agency review and client proposal generation. Official project contract totals will only shift once approved by the client.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

