"use client";

import React from "react";
import {
  TrendingUp,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { formatMinorToCurrency } from "@/lib/domain/money";
import type { ProjectDetail } from "@/lib/data/projects";

interface ProjectImpactCardProps {
  project: ProjectDetail;
}

export function ProjectImpactCard({ project }: ProjectImpactCardProps) {
  const rollup = project.financialRollup;
  const currency = project.currency;
  const hasApprovedExtra = project.approvedExtraMinor > 0;
  const hasPending = project.pendingExtraMinor > 0;
  const hasExtendedDeadline = project.deltaDays > 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-5">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            Project Baseline & Scope Impact
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time financial and schedule rollup computed strictly from approved
            version snapshots.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {rollup.approvedVersionsCount} Approved Change
            {rollup.approvedVersionsCount === 1 ? "" : "s"}
          </span>

          {project.pendingRequestsCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
              <Clock className="w-3.5 h-3.5" />
              {project.pendingRequestsCount} Pending Estimate
              {project.pendingRequestsCount === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>

      {/* Financial Impact Breakdown: 3 Distinct Labeled Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-5">
        {/* Pillar 1: Original contract value */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span className="uppercase tracking-wider font-semibold text-[11px]">
              Original contract value
            </span>
            <DollarSign className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
            {formatMinorToCurrency(project.budgetMinor, currency)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Baseline statement of work
          </span>
        </div>

        {/* Pillar 2: Approved changes */}
        <div
          className={`rounded-xl border p-4 ${
            hasApprovedExtra
              ? "border-emerald-200 bg-emerald-50/40"
              : "border-slate-200 bg-slate-50/60"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span
              className={`uppercase tracking-wider font-semibold text-[11px] ${
                hasApprovedExtra ? "text-emerald-800" : "text-slate-600"
              }`}
            >
              Approved changes
            </span>
            <CheckCircle2
              className={`w-3.5 h-3.5 ${
                hasApprovedExtra ? "text-emerald-600" : "text-slate-400"
              }`}
            />
          </div>
          <p
            className={`text-xl sm:text-2xl font-bold mt-2 ${
              hasApprovedExtra ? "text-emerald-700" : "text-slate-700"
            }`}
          >
            +{formatMinorToCurrency(project.approvedExtraMinor, currency)}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {rollup.approvedVersionsCount} legally signed snapshot
            {rollup.approvedVersionsCount === 1 ? "" : "s"}
          </span>
        </div>

        {/* Pillar 3: Estimates (pending) */}
        <div
          className={`rounded-xl border p-4 ${
            hasPending
              ? "border-amber-200 bg-amber-50/40"
              : "border-slate-200 bg-slate-50/60"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span
              className={`uppercase tracking-wider font-semibold text-[11px] ${
                hasPending ? "text-amber-800" : "text-slate-600"
              }`}
            >
              Estimates (pending)
            </span>
            <Clock
              className={`w-3.5 h-3.5 ${
                hasPending ? "text-amber-600" : "text-slate-400"
              }`}
            />
          </div>
          <p
            className={`text-xl sm:text-2xl font-bold mt-2 ${
              hasPending ? "text-amber-700" : "text-slate-500"
            }`}
          >
            {hasPending ? `+${formatMinorToCurrency(project.pendingExtraMinor, currency)}` : "—"}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {project.pendingRequestsCount === 0
              ? "No pending proposals awaiting sign-off"
              : `${project.pendingRequestsCount} pending proposal awaiting client`}
          </span>
        </div>
      </div>

      {/* Revised Total & Timeline Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl bg-indigo-950 text-white p-4 sm:p-5">
        {/* Revised Estimated Total */}
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-indigo-300 block">
            Revised Estimated Total
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            {formatMinorToCurrency(project.revisedBudgetMinor, currency)}
          </div>
          <span className="text-[11px] text-indigo-300/80 mt-1 block">
            Contract baseline + all approved changes
          </span>
        </div>

        {/* Schedule Impact */}
        <div className="border-t md:border-t-0 md:border-l border-indigo-800/80 pt-3 md:pt-0 md:pl-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold text-indigo-300 mb-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>Project Delivery Schedule</span>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <div className="text-xs text-indigo-200">
                <span className="text-[10px] uppercase text-indigo-400 block">Original</span>
                <span className="font-semibold text-white">{project.originalDeadline}</span>
              </div>

              <ArrowRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />

              <div className="text-xs">
                <span className="text-[10px] uppercase text-indigo-400 block">Revised</span>
                <span className="font-bold text-white">
                  {project.revisedDeadline || project.originalDeadline}
                </span>
              </div>

              {hasExtendedDeadline && (
                <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-400/30">
                  +{project.deltaDays}d
                </span>
              )}
            </div>
          </div>

          <span className="text-[11px] text-indigo-300/70 mt-2 block">
            {hasExtendedDeadline
              ? `Extended by ${project.deltaDays} days via approved change requests.`
              : "On schedule for original contractual deadline."}
          </span>
        </div>
      </div>
    </div>
  );
}
