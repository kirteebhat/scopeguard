"use client";

import React, { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

export function LandingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "Do our clients need to create an account or log in to approve changes?",
      a: "No. Clients access their specific proposal via a cryptographically secure 14-day bearer token link. They can open it on any mobile or desktop browser, review the scope, cost, and deadline impact, and authorize the proposal with their name in under 30 seconds. Zero client onboarding friction.",
    },
    {
      q: "How does ScopeGuard calculate financial impact and deadlines?",
      a: "Monetary values are stored strictly as integer minor units (e.g., paise for INR, cents for USD) and calculated with deterministic half-up rounding. Project budgets and revised deadlines roll up exclusively from immutable approved version snapshots, ensuring that draft changes never distort reporting.",
    },
    {
      q: "What happens if a client wants adjustments to a pending proposal?",
      a: "Your agency team can click 'Revise'. Revising immediately revokes the active approval token so the obsolete link can no longer be decided upon. The proposal returns to draft mode, allowing you to edit hours or deliverables, and republishes as an immutable Version N+1 with a fresh token.",
    },
    {
      q: "Can clients ever see our internal agency notes or margin calculations?",
      a: "Never. Internal notes are protected by strict application and database access controls. When a proposal is published, the snapshot payload completely strips private notes, ensuring only client-relevant titles, descriptions, costs, and timeline deltas are visible.",
    },
    {
      q: "Does ScopeGuard replace Jira, Linear, or our invoicing software?",
      a: "No. ScopeGuard is purposefully focused on scope change authorization and contract baseline protection. You continue using Jira or Linear for day-to-day sprint tracking, and QuickBooks, Xero, or Stripe for final accounting invoices. ScopeGuard provides the client sign-off paper trail that validates your invoices.",
    },
    {
      q: "How does ScopeGuard handle multi-currency projects in one workspace?",
      a: "In accordance with accounting standards, ScopeGuard never combines or sums monetary values across different currencies without an exchange rate engine. Your dashboard and project rollups display approved totals grouped strictly by currency (e.g., USD, EUR, INR, GBP).",
    },
  ];

  return (
    <section id="faq" className="py-16 sm:py-24 bg-white border-b border-slate-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center space-y-4 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Frequently Asked Questions</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Common Questions & Answers
          </h2>

          <p className="text-base text-slate-600">
            Everything you need to know about ScopeGuard approval workflows, security boundaries, and accounting rules.
          </p>
        </div>

        {/* Accordion List */}
        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;

            return (
              <div key={idx} className="py-5 sm:py-6">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between text-left gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg p-1 group"
                  aria-expanded={isOpen}
                >
                  <span className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {faq.q}
                  </span>
                  <div
                    className={`w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 bg-indigo-50 text-indigo-600" : "text-slate-500"
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="mt-3.5 pr-8 text-sm text-slate-600 leading-relaxed animate-in fade-in duration-150">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

