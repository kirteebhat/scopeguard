"use client";

import React from "react";
import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "motion/react";
import {
  FolderKanban,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Coins,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { CountUp } from "@/components/motion/CountUp";
import type { DashboardMetrics } from "@/lib/data/dashboard";

interface DashboardMetricsGridProps {
  metrics: DashboardMetrics;
}

export function DashboardMetricsGrid({ metrics }: DashboardMetricsGridProps) {
  const shouldReduceMotion = useReducedMotion();
  const hasMultipleCurrencies = metrics.approvedChargesByCurrency.length > 1;

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.06,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: shouldReduceMotion ? 1 : 0, y: shouldReduceMotion ? 0 : 8 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: shouldReduceMotion ? 0 : 0.22, ease: "easeOut" },
    },
  };

  return (
    <div className="space-y-5">
      {/* 4 Counter Cards with Staggered Entrance */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
      >
        {/* Active Projects */}
        <motion.div variants={itemVariants}>
          <Link
            href="/projects"
            className="group block focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-2xl h-full"
          >
            <Card hoverLift className="h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Active Projects
                </CardTitle>
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                  <FolderKanban className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    <CountUp value={metrics.activeProjectsCount} />
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-0.5 group-hover:text-indigo-600 transition-colors">
                    View <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {metrics.totalProjectsCount} total{" "}
                  {metrics.totalProjectsCount === 1 ? "project" : "projects"} in workspace
                </p>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        {/* Pending Client Approvals */}
        <motion.div variants={itemVariants}>
          <Card hoverLift className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Pending Approvals
              </CardTitle>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                <CountUp value={metrics.pendingApprovalsCount} />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Awaiting client approval decision
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Approved Change Requests */}
        <motion.div variants={itemVariants}>
          <Card hoverLift className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Approved Changes
              </CardTitle>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                <CountUp value={metrics.approvedChangesCount} />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Client-accepted scope expansions
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Rejected Change Requests */}
        <motion.div variants={itemVariants}>
          <Card hoverLift className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Rejected Changes
              </CardTitle>
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <XCircle className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                <CountUp value={metrics.rejectedChangesCount} />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Declined client scope proposals
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Approved Additional Scope Charges Card (Multi-Currency Compliant) */}
      <Card className="overflow-hidden border-slate-200">
        <div className="p-5 sm:p-6 bg-linear-to-r from-slate-50 via-white to-indigo-50/20">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Approved Additional Scope Charges
                </h3>
                <p className="text-xs text-slate-500">
                  Computed exclusively from immutable snapshots of accepted change requests
                </p>
              </div>
            </div>

            {hasMultipleCurrencies && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                <Coins className="w-3.5 h-3.5" />
                Multi-currency workspace
              </span>
            )}
          </div>

          <div className="mt-4">
            {metrics.approvedChargesByCurrency.length === 0 ? (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  $0.00
                </span>
                <span className="text-xs text-slate-400">
                  (0 approved scope expansions recorded)
                </span>
              </div>
            ) : !hasMultipleCurrencies ? (
              /* Single Currency Display */
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {metrics.approvedChargesByCurrency[0].formatted}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {metrics.approvedChargesByCurrency[0].currency}
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  {metrics.approvedChargesByCurrency[0].approvedCount} approved{" "}
                  {metrics.approvedChargesByCurrency[0].approvedCount === 1 ? "change" : "changes"}
                </span>
              </div>
            ) : (
              /* Multi-Currency Grouped Breakdown: One line per currency, NEVER summed across currencies */
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {metrics.approvedChargesByCurrency.map((item) => (
                    <div
                      key={item.currency}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                            {item.currency}
                          </span>
                          <span className="text-xs text-slate-500">
                            {item.approvedCount} approved
                          </span>
                        </div>
                        <div className="text-lg font-bold text-slate-900 mt-1">
                          {item.formatted}
                        </div>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 opacity-80" />
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 italic">
                  Note: Per accounting rules, monetary amounts in distinct currencies are grouped separately and never combined without foreign exchange conversion.
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
