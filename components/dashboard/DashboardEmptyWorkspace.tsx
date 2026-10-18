"use client";

import React from "react";
import Link from "next/link";
import { Plus, ShieldCheck, Circle, ArrowRight, Layers, FileText } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function DashboardEmptyWorkspace() {
  const steps = [
    {
      step: 1,
      title: "Create your first project baseline",
      description: "Define the client contract budget, currency, billing rate, and agreed deadline.",
      actionLabel: "Create Project",
      href: "/projects/new",
      icon: Plus,
      badge: "Start Here",
      badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-100",
    },
    {
      step: 2,
      title: "Add statement-of-work deliverables",
      description: "Record the core agreed deliverables so scope creep can be flagged instantly.",
      actionLabel: "View Projects",
      href: "/projects",
      icon: Layers,
      badge: "Step 2",
      badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
    },
    {
      step: 3,
      title: "Draft and publish a change request",
      description: "When scope expands, calculate cost and deadline impact, then share an approval link.",
      actionLabel: "Draft Change",
      href: "/projects",
      icon: FileText,
      badge: "Step 3",
      badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome & First-Run Header */}
      <Card className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
            <ShieldCheck className="w-3.5 h-3.5" />
            First-Run Onboarding
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome to ScopeGuard
          </h2>

          <p className="text-sm text-slate-600 leading-relaxed">
            Protect your agency from unbilled scope creep. Complete these quick steps to establish your first client contract baseline and send seamless client approval links.
          </p>

          <div className="pt-2">
            <Link href="/projects/new">
              <Button
                variant="primary"
                size="md"
                leftIcon={<Plus className="w-4 h-4" />}
                className="font-semibold shadow-xs"
                id="emptyStateCreateProjectButton"
              >
                Create your first project
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Interactive Step-by-Step Checklist */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Getting Started Checklist
          </h3>
          <span className="text-xs font-medium text-slate-500">
            0 of 3 completed
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.step}
                className="hover:border-indigo-200 hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                    <Circle className="w-4 h-4 text-slate-300" />
                  </div>
                  <CardTitle className="text-sm font-bold text-slate-900 pt-2 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    {item.title}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 leading-relaxed pt-1">
                    {item.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0">
                  <Link href={item.href} className="block w-full">
                    <Button
                      variant={item.step === 1 ? "primary" : "outline"}
                      size="sm"
                      className="w-full justify-between text-xs"
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    >
                      {item.actionLabel}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
