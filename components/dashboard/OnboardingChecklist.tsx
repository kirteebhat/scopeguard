"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface OnboardingChecklistProps {
  hasProjects?: boolean;
  hasChanges?: boolean;
  className?: string;
}

export function OnboardingChecklist({
  hasProjects = false,
  hasChanges = false,
  className,
}: OnboardingChecklistProps) {
  const steps = [
    {
      id: "workspace",
      title: "Establish agency workspace",
      description: "Set up workspace profile, currency, and role boundaries.",
      completed: true,
      href: "/settings",
      actionLabel: "View Settings",
    },
    {
      id: "project",
      title: "Create first project baseline",
      description: "Define the client contract budget, billing rate, and agreed deadline.",
      completed: hasProjects,
      href: "/projects/new",
      actionLabel: "New Project",
    },
    {
      id: "deliverables",
      title: "Record agreed deliverables",
      description: "Log statement-of-work scope milestones to detect creep early.",
      completed: hasProjects,
      href: "/projects",
      actionLabel: "View Deliverables",
    },
    {
      id: "changes",
      title: "Publish change request proposal",
      description: "Calculate cost impact and generate client approval token link.",
      completed: hasChanges,
      href: hasProjects ? "/changes/new" : "/projects",
      actionLabel: "Draft Proposal",
    },
    {
      id: "team",
      title: "Invite agency team members",
      description: "Add managers and members with fine-grained workspace permissions.",
      completed: false,
      href: "/settings/team",
      actionLabel: "Manage Team",
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPct = Math.round((completedCount / steps.length) * 100);

  return (
    <Card className={cn("p-5 sm:p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Onboarding Checklist</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/60">
              {completedCount} of {steps.length} Completed
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Essential steps to protect your agency against scope drift
          </p>
        </div>

        {/* Mini progress bar */}
        <div className="w-full sm:w-48 space-y-1">
          <div className="flex justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <span>Progress</span>
            <span className="tabular-nums font-bold text-slate-800 dark:text-slate-200">{progressPct}%</span>
          </div>
          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-500 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
        {steps.map((item) => {
          return (
            <div
              key={item.id}
              className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 group"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 shrink-0">
                  {item.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                  )}
                </div>
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-xs font-semibold text-slate-900 dark:text-slate-200",
                      item.completed && "line-through text-slate-400 dark:text-slate-500"
                    )}
                  >
                    {item.title}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="shrink-0">
                <Link href={item.href}>
                  <Button
                    variant={item.completed ? "ghost" : "secondary"}
                    size="sm"
                    className="text-xs h-7 px-2.5"
                    rightIcon={<ArrowRight className="w-3 h-3" />}
                  >
                    {item.actionLabel}
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
