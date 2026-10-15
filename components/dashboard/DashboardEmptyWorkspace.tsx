"use client";

import React from "react";
import Link from "next/link";
import { Plus, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function DashboardEmptyWorkspace() {
  return (
    <div className="space-y-6">
      {/* Hero Welcome Card */}
      <Card className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xs overflow-hidden relative">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
            <ShieldCheck className="w-3.5 h-3.5" />
            Workspace Active
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Stop Scope Creep from Eating Your Agency Profit Margins
          </h2>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            ScopeGuard establishes contract baseline budgets, delivers automated impact calculations for new feature requests, and generates tamper-proof one-click approval links for your clients.
          </p>

          <div className="pt-2">
            <Link href="/projects/new">
              <Button
                variant="primary"
                size="lg"
                leftIcon={<Plus className="w-4 h-4" />}
                className="font-semibold shadow-sm"
              >
                Create your first project
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* 3 Step ScopeGuard Workflow */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-2.5 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
            1
          </div>
          <h3 className="text-sm font-bold text-slate-900">
            Define Contract Baseline
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Record original project budget, contract deadline, hourly billing rate, and key agreed deliverables.
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-2.5 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm">
            2
          </div>
          <h3 className="text-sm font-bold text-slate-900">
            Draft Scope Change Orders
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            When requirements expand, draft change requests with live financial calculations and schedule impact deltas.
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-2.5 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
            3
          </div>
          <h3 className="text-sm font-bold text-slate-900">
            Send Frictionless Client Approval
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Publish cryptographic approval links. Clients review and approve on mobile in one click with zero login required.
          </p>
        </div>
      </div>
    </div>
  );
}
