"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  CheckCircle2,
  Lock,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Smartphone,
  Laptop,
  FileEdit,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export type WorkflowStep = "draft" | "pending" | "client";

interface LandingWorkflowExampleProps {
  defaultTab?: "agency" | "client";
}

export function LandingWorkflowExample({ defaultTab = "agency" }: LandingWorkflowExampleProps = {}) {
  const shouldReduceMotion = useReducedMotion();
  const [activeStep, setActiveStep] = useState<WorkflowStep>(
    defaultTab === "client" ? "client" : "pending"
  );
  const [clientDecision, setClientDecision] = useState<"idle" | "approved" | "rejected">("idle");
  const [clientName, setClientName] = useState("Rachel Green (VP Product)");

  const handleReset = () => {
    setClientDecision("idle");
    setClientName("Rachel Green (VP Product)");
    setActiveStep("draft");
  };

  const steps = [
    {
      id: "draft" as WorkflowStep,
      number: "1",
      title: "Draft Scope",
      icon: <FileEdit className="w-4 h-4" />,
      badge: "Draft",
    },
    {
      id: "pending" as WorkflowStep,
      number: "2",
      title: "Pending Approval",
      icon: <Laptop className="w-4 h-4" />,
      badge: "Active Token",
    },
    {
      id: "client" as WorkflowStep,
      number: "3",
      title: "Client Sign-Off",
      icon: <Smartphone className="w-4 h-4" />,
      badge: clientDecision === "approved" ? "Approved" : "Live Portal",
    },
  ];

  return (
    <section id="workflow-example" className="py-16 sm:py-24 bg-slate-50/80 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Live Demonstration</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            See the Approval Workflow in Action
          </h2>

          <p className="text-base sm:text-lg text-slate-600">
            Experience the complete 3-step lifecycle: from draft scope creation, to tokenized client link generation, to mobile client sign-off.
          </p>

          {/* Clearly labeled as an example */}
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium max-w-xl mx-auto">
            ⚡ Clearly labeled illustrative example · Built with real ScopeGuard React components, not a static mockup or fake screenshot.
          </div>
        </div>

        {/* 3-Step Lifecycle Stepper Switcher */}
        <div className="flex justify-center mb-8">
          <div
            role="tablist"
            aria-label="Change request lifecycle steps"
            className="inline-flex p-1.5 rounded-2xl bg-white border border-slate-200 shadow-2xs max-w-full overflow-x-auto"
          >
            {steps.map((step) => {
              const isActive = activeStep === step.id;
              return (
                <button
                  key={step.id}
                  role="tab"
                  id={step.id === "draft" ? "agency-tab-btn" : step.id === "client" ? "client-tab-btn" : undefined}
                  aria-selected={isActive}
                  type="button"
                  onClick={() => setActiveStep(step.id)}
                  className={`flex items-center gap-2 px-3 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 shrink-0 ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {step.icon}
                    <span>{step.number}. {step.title}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive Example Canvas with AnimatePresence */}
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            {activeStep === "draft" ? (
              /* STEP 1: DRAFT SCOPE */
              <motion.div
                key="step-draft"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="space-y-5"
              >
                <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white">
                  <div className="p-4 sm:p-6 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-indigo-400 font-semibold block">
                        Step 1 · Scope Authoring
                      </span>
                      <h3 className="text-base sm:text-lg font-bold text-white mt-0.5">
                        Apex Engineering Studio · Cloud Logistics Platform
                      </h3>
                    </div>
                    <Badge variant="default" className="bg-slate-800 text-slate-200 border-slate-700">
                      Draft (Editing)
                    </Badge>
                  </div>

                  <CardContent className="p-5 sm:p-8 space-y-6">
                    {/* Proposal Identification */}
                    <div className="space-y-4">
                      <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                          Proposal Title
                        </span>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-bold text-slate-900">
                          Multi-Currency Stripe & Adyen Payment Gateway
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                            Estimated Effort
                          </span>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800">
                            20.0 hours
                          </div>
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                            Billing Rate
                          </span>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800">
                            ₹2,500.00 / hour
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Live Impact Breakdown */}
                    <div className="p-4 sm:p-5 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                          Live Impact Breakdown
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white text-indigo-700 border border-indigo-200">
                          20.0 hrs × ₹2,500.00/hr
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <div className="p-3 bg-white rounded-lg border border-slate-200/60">
                          <span className="text-xs text-slate-600 block">Project Contract Budget</span>
                          <div className="text-sm font-semibold text-slate-900 mt-0.5">
                            ₹500,000.00 → <span className="text-emerald-700 font-bold">₹550,000.00</span>
                          </div>
                          <span className="text-[11px] text-emerald-700 font-medium block">
                            +₹50,000.00 estimated scope increase
                          </span>
                        </div>

                        <div className="p-3 bg-white rounded-lg border border-slate-200/60">
                          <span className="text-xs text-slate-600 block">Project Delivery Timeline</span>
                          <div className="text-sm font-semibold text-slate-900 mt-0.5">
                            15 Nov 2026 → <span className="text-amber-800 font-bold">30 Nov 2026</span>
                          </div>
                          <span className="text-[11px] text-amber-800 font-medium block">
                            +15 calendar days delivery shift
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Private Internal Notes Isolation Proof */}
                    <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 space-y-1.5">
                      <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                        <Lock className="w-3.5 h-3.5 text-amber-700" />
                        <span>Private Agency Internal Notes (Strictly Protected)</span>
                      </div>
                      <p className="text-xs text-amber-800 leading-relaxed font-mono">
                        “Subcontractor cost is ₹30,000. Margin is ₹20,000. Requires Stripe India KYC approval before sandbox release.”
                      </p>
                      <span className="text-[11px] text-amber-700 italic block pt-1">
                        🛡️ Security Rule 1.1: Stripped before generating version snapshots. Never sent to client browser.
                      </span>
                    </div>

                    {/* Step Navigation CTA */}
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-slate-500">
                        Ready to lock scope and notify the client?
                      </span>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setActiveStep("pending")}
                        rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                      >
                        Publish &amp; Generate Link →
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : activeStep === "pending" ? (
              /* STEP 2: PENDING APPROVAL (LOCKED PROPOSAL & TOKEN) */
              <motion.div
                key="step-pending"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="space-y-5"
              >
                <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white">
                  <div className="p-4 sm:p-6 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-indigo-400 font-semibold block">
                        Step 2 · Proposal Published
                      </span>
                      <h3 className="text-base sm:text-lg font-bold text-white mt-0.5">
                        Apex Engineering Studio · Cloud Logistics Platform
                      </h3>
                    </div>
                    <Badge variant="pending" showIcon>
                      Pending Client Approval
                    </Badge>
                  </div>

                  <CardContent className="p-5 sm:p-8 space-y-6">
                    {/* Proposal Metadata */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                      <div>
                        <h4 className="text-lg font-bold text-slate-900">
                          Multi-Currency Stripe &amp; Adyen Payment Gateway
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                          Version 1 · Created for Deliverable:{" "}
                          <span className="font-semibold text-slate-700">Checkout &amp; Invoicing</span>
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-slate-600 font-medium block">Proposed Charge</span>
                        <span className="text-2xl font-extrabold text-slate-900 font-mono">
                          ₹50,000.00
                        </span>
                      </div>
                    </div>

                    {/* Impact Calculation Panel */}
                    <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Live Impact Breakdown
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                          20.0 hrs × ₹2,500.00/hr
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div className="p-3 bg-white rounded-lg border border-slate-200/60">
                          <span className="text-xs text-slate-600 block">Project Contract Budget</span>
                          <div className="text-sm font-semibold text-slate-900 mt-0.5">
                            ₹500,000.00 → <span className="text-emerald-700 font-bold">₹550,000.00</span>
                          </div>
                          <span className="text-[11px] text-emerald-700 font-medium block">
                            +₹50,000.00 estimated scope increase
                          </span>
                        </div>

                        <div className="p-3 bg-white rounded-lg border border-slate-200/60">
                          <span className="text-xs text-slate-600 block">Project Delivery Timeline</span>
                          <div className="text-sm font-semibold text-slate-900 mt-0.5">
                            15 Nov 2026 → <span className="text-amber-800 font-bold">30 Nov 2026</span>
                          </div>
                          <span className="text-[11px] text-amber-800 font-medium block">
                            +15 calendar days delivery shift
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Private Internal Notes Isolation Proof */}
                    <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 space-y-1.5">
                      <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                        <Lock className="w-3.5 h-3.5 text-amber-700" />
                        <span>Private Agency Internal Notes (Strictly Protected)</span>
                      </div>
                      <p className="text-xs text-amber-800 leading-relaxed font-mono">
                        “Subcontractor cost is ₹30,000. Margin is ₹20,000. Requires Stripe India KYC approval before sandbox release.”
                      </p>
                      <span className="text-[11px] text-amber-700 italic block pt-1">
                        🛡️ Security Rule 1.1: Stripped before generating version snapshots. Never sent to client browser.
                      </span>
                    </div>

                    {/* Generated Link Notice */}
                    <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                      <div>
                        <span className="font-bold text-indigo-950 block">Cryptographic Approval Token</span>
                        <span className="font-mono text-indigo-700 break-all text-[11px]">
                          https://scopeguard.app/approve/sec_9f8a31e84...
                        </span>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setActiveStep("client")}
                        rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                      >
                        Open Client Portal →
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              /* STEP 3: CLIENT PORTAL & DECISION */
              <motion.div
                key="step-client"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="space-y-5"
              >
                <Card className="rounded-2xl border-slate-200 shadow-md overflow-hidden bg-white">
                  {/* Clean, Non-Branded Client Header */}
                  <div className="p-5 sm:p-6 bg-slate-900 text-white">
                    <div className="flex items-center justify-between text-xs text-slate-300 pb-2 border-b border-slate-800">
                      <span className="font-medium">Apex Engineering Studio</span>
                      <span className="font-mono text-[11px] text-indigo-300">Proposal Version 1</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-extrabold text-white mt-3">
                      Scope Change Proposal: Cloud Logistics Platform
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Please review the requested changes and impact on your delivery schedule and budget.
                    </p>
                  </div>

                  <CardContent className="p-5 sm:p-8 space-y-6">
                    {/* Client Context Details */}
                    <div className="space-y-3">
                      <h4 className="text-base font-bold text-slate-900">
                        Multi-Currency Stripe &amp; Adyen Payment Gateway
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        Integration of international payment rails supporting automated recurring billing in USD, EUR, and INR, with webhook handling for failed authorizations.
                      </p>
                    </div>

                    {/* Client Financial Impact Badge */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                        <span className="text-xs font-medium text-slate-500 block">
                          Estimated Additional Cost
                        </span>
                        <div className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
                          ₹50,000.00
                        </div>
                        <span className="text-[11px] text-slate-500 block mt-1">
                          Estimated cost for 20.0 technical hours
                        </span>
                      </div>

                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                        <span className="text-xs font-medium text-slate-500 block">
                          Revised Delivery Date
                        </span>
                        <div className="text-2xl font-extrabold text-slate-900 mt-1">
                          30 Nov 2026
                        </div>
                        <span className="text-[11px] text-amber-800 block mt-1 font-semibold">
                          +15 days from original deadline (15 Nov)
                        </span>
                      </div>
                    </div>

                    {/* Interactive Decision Form */}
                    <div className="p-5 rounded-2xl border border-indigo-100 bg-indigo-50/30 space-y-4">
                      <h5 className="text-sm font-bold text-slate-900">
                        Client Authorization Sign-Off
                      </h5>

                      {clientDecision === "idle" ? (
                        <div className="space-y-4">
                          <div>
                            <label
                              htmlFor="client-name-input"
                              className="block text-xs font-medium text-slate-700 mb-1"
                            >
                              Approver Full Name (Required for audit receipt)
                            </label>
                            <input
                              id="client-name-input"
                              type="text"
                              value={clientName}
                              onChange={(e) => setClientName(e.target.value)}
                              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder="Enter your name"
                            />
                          </div>

                          <div className="flex flex-wrap items-center gap-3 pt-1">
                            <Button
                              variant="primary"
                              size="md"
                              disabled={!clientName.trim()}
                              onClick={() => setClientDecision("approved")}
                              leftIcon={<CheckCircle2 className="w-4 h-4" />}
                              className="bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-500"
                            >
                              Approve Proposal (₹50,000.00)
                            </Button>

                            <Button
                              variant="outline"
                              size="md"
                              onClick={() => setClientDecision("rejected")}
                              className="text-rose-700 border-rose-300 hover:bg-rose-50 hover:border-rose-400"
                            >
                              Decline Proposal
                            </Button>
                          </div>

                          <p className="text-[11px] text-slate-500 italic">
                            🔒 Secure token authentication. Approving creates an immutable audit record and atomically updates project totals.
                          </p>
                        </div>
                      ) : clientDecision === "approved" ? (
                        /* Approved Receipt State with Definitive Stroke Draw Checkmark */
                        <motion.div
                          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.25, ease: "easeOut" }}
                          className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-950 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5 font-bold text-sm text-emerald-900">
                              <svg
                                className="w-6 h-6 text-emerald-600"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <motion.circle
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  initial={shouldReduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
                                  animate={{ pathLength: 1 }}
                                  transition={{ duration: 0.4, ease: "easeOut" }}
                                />
                                <motion.path
                                  d="m9 12 2 2 4-4"
                                  initial={shouldReduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
                                  animate={{ pathLength: 1 }}
                                  transition={{ duration: 0.35, delay: shouldReduceMotion ? 0 : 0.2, ease: "easeOut" }}
                                />
                              </svg>
                              <span>Decision Recorded: Approved</span>
                            </div>
                            <button
                              type="button"
                              onClick={handleReset}
                              className="text-xs text-emerald-800 hover:text-emerald-950 underline flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" /> Reset Demo
                            </button>
                          </div>
                          <p className="text-xs leading-relaxed text-emerald-800">
                            Approved by <span className="font-semibold">{clientName}</span> on 02 Nov 2026 at 14:32 UTC.
                          </p>
                          <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-[11px] font-mono text-emerald-900">
                            <span>Receipt: rec_a7e4b9...</span>
                            <span className="font-bold">Project budget updated: ₹550,000.00</span>
                          </div>
                        </motion.div>
                      ) : (
                        /* Declined Receipt State */
                        <motion.div
                          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.25, ease: "easeOut" }}
                          className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-950 space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-rose-900">
                              Decision Recorded: Declined
                            </span>
                            <button
                              type="button"
                              onClick={handleReset}
                              className="text-xs text-rose-800 hover:text-rose-950 underline flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" /> Reset Demo
                            </button>
                          </div>
                          <p className="text-xs text-rose-800">
                            Declined by <span className="font-semibold">{clientName}</span>. Project budget and baseline deadline remain unchanged.
                          </p>
                        </motion.div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
