"use client";

import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, Clock, CheckCircle2, XCircle, Ban, FileEdit } from "lucide-react";

export type ChangeRequestStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "withdrawn";

interface ChangeRequestStatusStepperProps {
  status: ChangeRequestStatus;
  currentVersion?: number | null;
  decidedAt?: string | null;
  decidedByActor?: string | null;
  className?: string;
}

interface StepInfo {
  id: string;
  number: number;
  label: string;
  sublabel: string;
  state: "completed" | "current" | "upcoming";
  tone?: "default" | "success" | "danger" | "neutral";
  icon?: React.ReactNode;
}

export function ChangeRequestStatusStepper({
  status,
  currentVersion = 1,
  decidedAt: _decidedAt,
  decidedByActor,
  className = "",
}: ChangeRequestStatusStepperProps) {
  const shouldReduceMotion = useReducedMotion();

  // Determine the 3 steps based on the current status
  const isDraft = status === "draft";
  const isPending = status === "pending_approval";
  const isApproved = status === "approved";
  const isRejected = status === "rejected";
  const isWithdrawn = status === "withdrawn";
  const isDecided = isApproved || isRejected || isWithdrawn;

  const steps: StepInfo[] = [
    {
      id: "draft",
      number: 1,
      label: "Scope Draft",
      sublabel: isDraft ? "Editing in progress" : `Draft authored (v${currentVersion})`,
      state: isDraft ? "current" : "completed",
      icon: isDraft ? <FileEdit className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5 stroke-[2.5]" />,
    },
    {
      id: "pending",
      number: 2,
      label: "Client Review",
      sublabel: isPending
        ? "Active link awaiting sign-off"
        : isDecided
        ? "Review concluded"
        : "Locked on publish",
      state: isPending ? "current" : isDecided ? "completed" : "upcoming",
      icon: isPending ? (
        <Clock className="w-3.5 h-3.5" />
      ) : isDecided ? (
        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
      ) : undefined,
    },
    {
      id: "decision",
      number: 3,
      label: isApproved
        ? "Approved"
        : isRejected
        ? "Rejected"
        : isWithdrawn
        ? "Withdrawn"
        : "Decision",
      sublabel: isApproved
        ? decidedByActor
          ? `Signed off by ${decidedByActor}`
          : "Scope locked into contract"
        : isRejected
        ? "Proposal declined"
        : isWithdrawn
        ? "Cancelled by agency"
        : "Awaiting final outcome",
      state: isDecided ? "current" : "upcoming",
      tone: isApproved ? "success" : isRejected ? "danger" : isWithdrawn ? "neutral" : "default",
      icon: isApproved ? (
        <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
      ) : isRejected ? (
        <XCircle className="w-4 h-4 stroke-[2.5]" />
      ) : isWithdrawn ? (
        <Ban className="w-4 h-4" />
      ) : undefined,
    },
  ];

  return (
    <nav
      aria-label="Change request progress"
      className={`w-full bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs ${className}`}
    >
      <ol className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-2 relative">
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          const nextStep = steps[idx + 1];
          const isConnectorFilled =
            step.state === "completed" && (nextStep?.state === "completed" || nextStep?.state === "current");

          return (
            <li
              key={step.id}
              className="relative flex items-center md:flex-col md:items-start"
              aria-current={step.state === "current" ? "step" : undefined}
            >
              {/* Vertical connector line for mobile */}
              {!isLast && (
                <div
                  className="md:hidden absolute left-4 top-8 h-full w-0.5 -ml-px bg-slate-200 z-0"
                  aria-hidden="true"
                >
                  <motion.div
                    className="w-full bg-indigo-600 origin-top h-full"
                    initial={shouldReduceMotion ? false : { scaleY: 0 }}
                    animate={{ scaleY: isConnectorFilled ? 1 : 0 }}
                    transition={{ duration: 0.35, ease: "easeInOut" }}
                  />
                </div>
              )}

              <div className="flex items-center w-full relative z-10">
                {/* Step Circle Indicator */}
                <div className="relative shrink-0 flex items-center justify-center">
                  {step.state === "current" && !shouldReduceMotion && (
                    <motion.span
                      className={`absolute -inset-1 rounded-full opacity-30 ${
                        step.tone === "success"
                          ? "bg-emerald-400 animate-ping"
                          : step.tone === "danger"
                          ? "bg-rose-400 animate-ping"
                          : "bg-indigo-400 animate-ping"
                      }`}
                      style={{ animationDuration: "2.5s" }}
                      aria-hidden="true"
                    />
                  )}

                  <motion.div
                    initial={shouldReduceMotion ? false : { scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      step.state === "completed"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : step.state === "current"
                        ? step.tone === "success"
                          ? "bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-xs"
                          : step.tone === "danger"
                          ? "bg-rose-600 text-white ring-4 ring-rose-100 shadow-xs"
                          : step.tone === "neutral"
                          ? "bg-slate-700 text-white ring-4 ring-slate-100 shadow-xs"
                          : "bg-indigo-600 text-white ring-4 ring-indigo-100 shadow-xs"
                        : "bg-slate-100 border border-slate-300 text-slate-500"
                    }`}
                  >
                    {step.icon || step.number}
                  </motion.div>
                </div>

                {/* Horizontal Connector Line for Desktop */}
                {!isLast && (
                  <div className="hidden md:block flex-1 h-0.5 mx-3 bg-slate-200 relative overflow-hidden rounded-full">
                    <motion.div
                      className="absolute inset-0 bg-indigo-600 origin-left"
                      initial={shouldReduceMotion ? false : { scaleX: 0 }}
                      animate={{ scaleX: isConnectorFilled ? 1 : 0 }}
                      transition={{ duration: 0.35, ease: "easeInOut" }}
                    />
                  </div>
                )}
              </div>

              {/* Step Labels */}
              <div className="ml-3 md:ml-0 md:mt-2.5 min-w-0">
                <span
                  className={`block text-xs font-bold tracking-tight ${
                    step.state === "current"
                      ? step.tone === "success"
                        ? "text-emerald-700"
                        : step.tone === "danger"
                        ? "text-rose-700"
                        : step.tone === "neutral"
                        ? "text-slate-800"
                        : "text-indigo-900"
                      : step.state === "completed"
                      ? "text-slate-900"
                      : "text-slate-400"
                  }`}
                >
                  {step.label}
                </span>
                <span className="block text-[11px] text-slate-500 truncate">
                  {step.sublabel}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
