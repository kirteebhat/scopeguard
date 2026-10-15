"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Lock,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Smartphone,
  Laptop,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export function LandingWorkflowExample({ defaultTab = "agency" }: { defaultTab?: "agency" | "client" } = {}) {
  const [activeTab, setActiveTab] = useState<"agency" | "client">(defaultTab);
  const [clientDecision, setClientDecision] = useState<"idle" | "approved" | "rejected">("idle");
  const [clientName, setClientName] = useState("Rachel Green (VP Product)");

  const handleReset = () => {
    setClientDecision("idle");
    setClientName("Rachel Green (VP Product)");
  };

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
            This live interactive component demonstrates exactly what your team creates and what your client experiences on their phone.
          </p>

          {/* Clearly labeled as an example */}
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium max-w-xl mx-auto">
            ⚡ Clearly labeled illustrative example · Built with real ScopeGuard React components, not a static mockup or fake screenshot.
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex p-1.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <button
              id="agency-tab-btn"
              type="button"
              onClick={() => setActiveTab("agency")}
              className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === "agency"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Laptop className="w-4 h-4" />
              <span>1. Agency Proposal View</span>
            </button>

            <button
              id="client-tab-btn"
              type="button"
              onClick={() => setActiveTab("client")}
              className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === "client"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>2. Client Approval View (/approve/[token])</span>
            </button>
          </div>
        </div>

        {/* Interactive Example Canvas */}
        <div className="max-w-4xl mx-auto">
          {activeTab === "agency" ? (
            /* TAB 1: AGENCY VIEW */
            <div className="space-y-5 animate-in fade-in duration-200">
              <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white">
                <div className="p-4 sm:p-6 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-indigo-400 font-semibold block">
                      ScopeGuard Agency Workspace
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
                        Multi-Currency Stripe & Adyen Payment Gateway
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Version 1 · Created for Deliverable:{" "}
                        <span className="font-semibold text-slate-700">Checkout & Invoicing</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Proposed Charge</span>
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
                        <span className="text-xs text-slate-500 block">Project Contract Budget</span>
                        <div className="text-sm font-semibold text-slate-900 mt-0.5">
                          ₹500,000.00 → <span className="text-emerald-600 font-bold">₹550,000.00</span>
                        </div>
                        <span className="text-[11px] text-emerald-600 block">+₹50,000.00 estimated scope increase</span>
                      </div>

                      <div className="p-3 bg-white rounded-lg border border-slate-200/60">
                        <span className="text-xs text-slate-500 block">Project Delivery Timeline</span>
                        <div className="text-sm font-semibold text-slate-900 mt-0.5">
                          15 Nov 2026 → <span className="text-amber-600 font-bold">30 Nov 2026</span>
                        </div>
                        <span className="text-[11px] text-amber-600 block">+15 calendar days delivery shift</span>
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
                      onClick={() => setActiveTab("client")}
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    >
                      View Client Portal
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            /* TAB 2: CLIENT VIEW */
            <div className="space-y-5 animate-in fade-in duration-200">
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
                      Multi-Currency Stripe & Adyen Payment Gateway
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
                      <span className="text-[11px] text-amber-600 block mt-1 font-medium">
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
                      /* Approved Receipt State */
                      <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-950 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
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
                        <p className="text-[11px] text-emerald-700 font-mono">
                          Receipt ID: rec_a7e4b9... · Project revised budget updated to ₹550,000.00.
                        </p>
                      </div>
                    ) : (
                      /* Declined Receipt State */
                      <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-950 space-y-2.5">
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
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
