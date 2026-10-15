"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 lg:pt-24 lg:pb-32 bg-linear-to-b from-slate-50 via-white to-slate-50 border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center space-y-6 sm:space-y-8">
          {/* Tag Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Scope Change Control for Software Agencies</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.12]">
            Stop Eating the Cost of <span className="text-indigo-600">Unapproved</span> Client Scope Creep
          </h1>

          {/* Supporting Copy */}
          <p className="text-base sm:text-lg lg:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
            When clients request “just one quick addition” over Slack, informal agreements lead to pushed release dates, eroded margins, and contested final invoices. ScopeGuard gives your team a frictionless way to draft change orders and secure client sign-off in 30 seconds.
          </p>

          {/* Primary & Secondary CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <Link href="/signup" className="w-full sm:w-auto">
              <Button
                variant="primary"
                size="lg"
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="w-full sm:w-auto font-semibold px-6 shadow-sm"
              >
                Create Workspace — Free
              </Button>
            </Link>

            <a href="#workflow-example" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto font-medium text-slate-700 hover:text-indigo-600"
              >
                See Interactive Approval Demo
              </Button>
            </a>
          </div>

          {/* Honest Value Props (No fake stats, no false guarantees) */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Clients approve on mobile without an account</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Immutable cryptographic version snapshots</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>No credit card required to start</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
